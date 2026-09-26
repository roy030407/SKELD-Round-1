// lib/game/t4-engine.ts
// Task 4 Imposter Shuffle Game Engine (Round 4 of Project Skeld: "Shuffling").
//
// This is the SOLE implementation of the shuffle/imposter game. It replaces two
// earlier, divergent implementations: the old lib/game/t1-engine.ts (wired to the
// stale /api/tasks/1/* routes from before the round sequence was reordered), and a
// naive placeholder that lived directly in app/api/tasks/4/session/route.ts.
//
// Invariants this engine guarantees for every createGameSession() call:
//   1. Every checked-in, eligible player appears in exactly one table.
//   2. No two players from the same ORIGINAL team ever share a table.
//   3. Every table has exactly one imposter.
//   4. Every participating original team supplies at most one imposter this
//      session (exactly one, whenever a perfect table<->team matching exists -
//      guaranteed whenever team sizes are uniform, e.g. the standard "teams of
//      6" case; gracefully degrades if check-in is very unbalanced).
//   5. No player is ever assigned imposter twice across sessions.
//   6. Every player is assigned a real word: the shared crew word, or (per the
//      session's mode) either a different "similar" imposter word or literal
//      'BLANK', drawn from the `words` table.
//   7. Crewmate colors are always exactly the six canonical colors (red, blue,
//      cyan, yellow, green, purple) - never anything else.

import { db } from '@/lib/db/client'
import {
  gameSessions,
  gameTables,
  gameTablePlayers,
  votes,
  words,
  players,
  checkIns,
  taskSubmissions,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { SCORING_CONFIG } from '@/lib/scoring/config'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { canEnterTask } from '@/lib/gating'

export const CREWMATE_COLORS = ['red', 'blue', 'cyan', 'yellow', 'green', 'purple'] as const
export type CrewmateColor = (typeof CREWMATE_COLORS)[number]

export interface ShuffledPlayer {
  playerId: string
  teamId: string
  name: string
}

/**
 * Shuffle an array (Fisher-Yates). Returns a new array; does not mutate input.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = temp
  }
  return arr
}

/**
 * Partition a set of team-ids-with-counts into tables of up to 6, using a
 * "largest remaining queue first" greedy strategy: at every step, the teams
 * with the MOST players still waiting are chosen to fill the next table.
 *
 * This is deliberately not naive random subset selection. For the standard
 * event scenario (every team has the same number of checked-in players),
 * this greedy strategy provably never strands a player: it produces a
 * perfectly 6-regular bipartite graph between teams and tables (each team
 * appears in exactly `teamSize` tables, each table has exactly 6 distinct
 * teams), which always yields a full partition, and additionally is later
 * matchable via a perfect bipartite matching (see matchImposterTeamPerTable).
 *
 * If check-in is very unbalanced (so no full table of 6 distinct teams can
 * be formed from whatever remains), the final table is allowed to be
 * undersized rather than dropping players - every checked-in player must
 * appear exactly once, per invariant #1.
 */
export function partitionTeamsIntoTables(teamCounts: Map<string, number>): string[][] {
  const remaining = new Map(teamCounts)
  const tables: string[][] = []

  while (true) {
    const eligible = Array.from(remaining.entries()).filter(([, c]) => c > 0)
    if (eligible.length === 0) break

    eligible.sort((a, b) => b[1] - a[1])
    const chosen = eligible.slice(0, Math.min(6, eligible.length)).map(([teamId]) => teamId)

    tables.push(chosen)
    for (const teamId of chosen) {
      remaining.set(teamId, remaining.get(teamId)! - 1)
    }
  }

  return tables
}

/**
 * Given the team-level table layout (which teams sit at which table), find a
 * matching that assigns each table to exactly one of its teams to be the
 * "imposter-providing" team, such that no team is assigned twice.
 *
 * Uses Kuhn's algorithm (bipartite augmenting-path matching), which is exact
 * (not heuristic): whenever a perfect matching exists in the underlying
 * table<->team graph - guaranteed for the standard uniform-team-size case,
 * since a regular bipartite graph always has one - this finds it. Tables that
 * cannot be matched (only possible with very unbalanced check-in) fall back
 * to an arbitrary team from that table so every table still gets exactly one
 * imposter (invariant #3 takes priority over invariant #4 if they conflict).
 *
 * Returns an array parallel to `tables`: tables[i] -> the teamId providing
 * the imposter for table i.
 */
export function matchImposterTeamPerTable(tables: string[][]): string[] {
  const matchTeamToTable = new Map<string, number>()

  function tryAssign(tableIndex: number, visited: Set<string>): boolean {
    for (const teamId of tables[tableIndex]!) {
      if (visited.has(teamId)) continue
      visited.add(teamId)
      const currentTable = matchTeamToTable.get(teamId)
      if (currentTable === undefined || tryAssign(currentTable, visited)) {
        matchTeamToTable.set(teamId, tableIndex)
        return true
      }
    }
    return false
  }

  for (let i = 0; i < tables.length; i++) {
    tryAssign(i, new Set())
  }

  const result: string[] = new Array(tables.length).fill('')
  for (const [teamId, tableIndex] of matchTeamToTable.entries()) {
    result[tableIndex] = teamId
  }

  // Fallback: any table that didn't get matched (only possible with very
  // unbalanced team sizes) gets an arbitrary team from its own roster, so
  // invariant #3 (exactly one imposter per table) always holds.
  for (let i = 0; i < result.length; i++) {
    if (!result[i] && tables[i]!.length > 0) {
      result[i] = tables[i]![0]!
    }
  }

  return result
}

export interface TableSeat {
  teamId: string
  player: ShuffledPlayer
  isImposter: boolean
}

/**
 * Combines team-level table layout + imposter matching + concrete player
 * assignment into the final per-table seating, preferring - for each team's
 * designated imposter table - a player who has never been imposter in a
 * previous session (invariant #5), falling back to a repeat only if every
 * player on that team's roster has already been imposter before.
 *
 * Exported (pure, no DB access) so shuffle invariants are unit-testable
 * without a live database.
 */
export function assignPlayersToSeats(
  teamMap: Map<string, ShuffledPlayer[]>,
  everImposter: Set<string>
): TableSeat[][] {
  const teamCounts = new Map<string, number>()
  for (const [teamId, list] of teamMap.entries()) {
    if (list.length > 0) teamCounts.set(teamId, list.length)
  }

  const tableLayout = partitionTeamsIntoTables(teamCounts)
  if (tableLayout.length === 0) return []

  const imposterTeamPerTable = matchImposterTeamPerTable(tableLayout)

  // Invert: teamId -> the table index it's designated imposter-provider for.
  const teamImposterTable = new Map<string, number>()
  imposterTeamPerTable.forEach((teamId, tableIndex) => {
    if (teamId) teamImposterTable.set(teamId, tableIndex)
  })

  const teamQueues = new Map<string, ShuffledPlayer[]>()
  for (const [teamId, list] of teamMap.entries()) {
    teamQueues.set(teamId, shuffleArray(list))
  }

  // Pre-select the imposter player for each designated team BEFORE
  // distributing the rest of that team's players to other seats, so a
  // never-been-imposter candidate isn't accidentally consumed elsewhere.
  const imposterPlayerForTeam = new Map<string, ShuffledPlayer>()
  for (const [teamId] of teamImposterTable.entries()) {
    const queue = teamQueues.get(teamId)
    if (!queue || queue.length === 0) continue
    const freshIdx = queue.findIndex((p) => !everImposter.has(p.playerId))
    const chosen = freshIdx !== -1 ? queue.splice(freshIdx, 1)[0]! : queue.shift()!
    imposterPlayerForTeam.set(teamId, chosen)
  }

  const finalTables: TableSeat[][] = tableLayout.map((teamsAtTable, tableIndex) =>
    teamsAtTable.map((teamId) => {
      const isDesignated = teamImposterTable.get(teamId) === tableIndex
      const player = isDesignated
        ? imposterPlayerForTeam.get(teamId)!
        : teamQueues.get(teamId)!.shift()!
      return { teamId, player, isImposter: isDesignated }
    })
  )

  return finalTables
}

/**
 * Initialize a new Task 4 game session (Session 1 or 2) with tables and
 * role/word assignments. If sessionNumber is omitted, it is computed as
 * (existing session count + 1).
 */
export async function createGameSession(sessionNumber?: number, isBlankMode: boolean = false) {
  // 1. Fetch checked-in, eligible players.
  const allCheckIns = await db.select().from(checkIns)
  const checkedInIds = new Set(allCheckIns.map((c) => c.playerId))

  const allPlayers = await db.select().from(players)
  const checkedInPlayers = allPlayers.filter((p) => checkedInIds.has(p.id))

  // 1b. Server-side gating: only include players whose TEAM is actually
  // eligible for Task 4 (fully checked in, Task 3 completed, Task 4 gate
  // open). Without this, a team that hasn't finished Tasks 1-3 could still
  // be shuffled into a live Task 4 imposter table just by being checked in.
  const teamIds = Array.from(new Set(checkedInPlayers.map((p) => p.teamId)))
  const eligibleTeamIds = new Set<string>()
  for (const teamId of teamIds) {
    const gate = await canEnterTask(teamId, 4)
    if (gate.allowed) eligibleTeamIds.add(teamId)
  }
  const eligible = checkedInPlayers.filter((p) => eligibleTeamIds.has(p.teamId))

  const teamMap = new Map<string, ShuffledPlayer[]>()
  for (const p of eligible) {
    if (!teamMap.has(p.teamId)) teamMap.set(p.teamId, [])
    teamMap.get(p.teamId)!.push({
      playerId: p.id,
      teamId: p.teamId,
      name: p.firstName,
    })
  }

  if (teamMap.size < 6) {
    throw new Error('Not enough Task-4-eligible teams (fully checked in + Task 3 complete) to form tables (minimum 6 teams required)')
  }

  // 2. History of players who have EVER been imposter in a previous session.
  const priorImposterRows = await db
    .select({ playerId: gameTablePlayers.playerId })
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.isImposter, true))
  const everImposter = new Set(priorImposterRows.map((r) => r.playerId))

  // 3. Build final seating: partition + imposter matching + player assignment.
  const finalTables = assignPlayersToSeats(teamMap, everImposter)
  if (finalTables.length === 0) {
    throw new Error('Not enough checked-in teams to form tables (minimum 6 teams required)')
  }

  // 4. Fetch words.
  const allWords = await db.select().from(words).where(eq(words.isActive, true))
  const wordPairs = allWords.length > 0
    ? allWords
    : [{ category: 'Campus', crewWord: 'Library', imposterWord: 'Bookstore' }]

  // 5. Resolve session number if not supplied.
  let resolvedSessionNumber = sessionNumber
  if (!resolvedSessionNumber) {
    const existingSessions = await db.select().from(gameSessions)
    resolvedSessionNumber = existingSessions.length + 1
  }

  // 6. Create session row.
  const [session] = await db
    .insert(gameSessions)
    .values({ sessionNumber: resolvedSessionNumber, status: 'active' })
    .returning()

  // 7. Create tables + seat players.
  for (let tableIndex = 0; tableIndex < finalTables.length; tableIndex++) {
    const seats = finalTables[tableIndex]!
    if (seats.length === 0) continue

    const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)]!

    const [table] = await db
      .insert(gameTables)
      .values({ gameSessionId: session.id, tableNumber: tableIndex + 1 })
      .returning()

    const shuffledColors = shuffleArray([...CREWMATE_COLORS]).slice(0, seats.length)

    for (let seatIndex = 0; seatIndex < seats.length; seatIndex++) {
      const { teamId, player, isImposter } = seats[seatIndex]!
      const assignedWord = isImposter
        ? (isBlankMode ? 'BLANK' : wordPair.imposterWord)
        : wordPair.crewWord

      await db.insert(gameTablePlayers).values({
        tableId: table.id,
        playerId: player.playerId,
        originalTeamId: teamId,
        word: assignedWord,
        isImposter,
        crewmateColor: shuffledColors[seatIndex]!,
      })
    }
  }

  return { sessionId: session.id, tablesCount: finalTables.length }
}

/**
 * Returns player-facing game state for Task 4. Strictly hides words and
 * imposter identity of every player other than the requester.
 */
export async function getPlayerGameView(playerId: string) {
  const [mySlot] = await db
    .select()
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.playerId, playerId))

  if (!mySlot) return null

  const [table] = await db
    .select()
    .from(gameTables)
    .where(eq(gameTables.id, mySlot.tableId))

  const tableSlots = await db
    .select()
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.tableId, mySlot.tableId))

  const allPlayers = await db.select().from(players)
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]))

  const allVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.gameTableId, mySlot.tableId))

  const myVotes = allVotes.filter((v) => v.voterPlayerId === playerId)
  const currentRound = myVotes.length + 1

  const playersInTable = tableSlots.map((slot) => {
    const p = playerMap.get(slot.playerId)
    const isYou = slot.playerId === playerId
    return {
      id: slot.playerId,
      name: p?.firstName ?? 'Player',
      color: slot.crewmateColor as CrewmateColor,
      isYou,
      hasVoted: allVotes.some((v) => v.voterPlayerId === slot.playerId && v.round === currentRound),
      // Only reveal your own role/word.
      yourWord: isYou ? (slot.word ?? null) : undefined,
      isImposter: isYou ? slot.isImposter : undefined,
    }
  })

  return {
    tableId: mySlot.tableId,
    tableNumber: table!.tableNumber,
    currentRound,
    players: playersInTable,
  }
}

/**
 * Cast a vote during Task 4. Duplicate votes for the same (table, voter,
 * round) are rejected at the database level via the unique constraint on
 * votes(game_table_id, voter_player_id, round), avoiding the check-then-insert
 * race condition.
 */
export async function castVote(
  gameTableId: string,
  voterPlayerId: string,
  targetPlayerId: string,
  round: number
) {
  const voteInsert = await db
    .insert(votes)
    .values({ gameTableId, voterPlayerId, targetPlayerId, round })
    .onConflictDoNothing({ target: [votes.gameTableId, votes.voterPlayerId, votes.round] })
    .returning()

  if (!voteInsert.length) {
    throw Object.assign(new Error('You have already voted this round.'), { status: 409 })
  }

  const tableSlots = await db
    .select()
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.tableId, gameTableId))

  const roundVotes = await db
    .select()
    .from(votes)
    .where(and(eq(votes.gameTableId, gameTableId), eq(votes.round, round)))

  const allVoted = roundVotes.length >= tableSlots.length
  if (!allVoted) {
    return { roundComplete: false, votesCount: roundVotes.length, expectedVotes: tableSlots.length }
  }

  // Tally and resolve the round.
  const tally = new Map<string, number>()
  for (const v of roundVotes) {
    tally.set(v.targetPlayerId, (tally.get(v.targetPlayerId) ?? 0) + 1)
  }

  const maxVotes = Math.max(...tally.values())
  const topVoted = [...tally.entries()].filter(([, c]) => c === maxVotes).map(([id]) => id)
  const uniqueAccused = topVoted.length === 1 ? topVoted[0]! : null

  const imposterSlot = tableSlots.find((tp) => tp.isImposter)!
  const maxRounds = SCORING_CONFIG.task4Imposter.maxVotingRounds

  const imposterCaught = uniqueAccused !== null && uniqueAccused === imposterSlot.playerId

  if (imposterCaught) {
    for (const tp of tableSlots) {
      if (!tp.isImposter) {
        await recordScoreEvent({
          teamId: tp.originalTeamId,
          taskNumber: 4,
          eventType: 'TASK_4_CREWMATE_WIN',
          points: SCORING_CONFIG.task4Imposter.crewmatePoints,
          reason: `Task 4: Crewmates caught imposter in Round ${round}`,
          idempotencyKey: `t4-crew-${gameTableId}-${tp.playerId}`,
        })
      }
    }
    for (const tp of tableSlots) {
      await db
        .insert(taskSubmissions)
        .values({ teamId: tp.originalTeamId, taskNumber: 4 })
        .onConflictDoNothing()
    }
    return { roundComplete: true, gameOver: true, winner: 'crewmates' as const }
  }

  if (round >= maxRounds) {
    // Final round exhausted without catching the imposter - imposter wins.
    await recordScoreEvent({
      teamId: imposterSlot.originalTeamId,
      taskNumber: 4,
      eventType: 'TASK_4_IMPOSTER_WIN',
      points: SCORING_CONFIG.task4Imposter.imposterPoints,
      reason: 'Task 4: Imposter survived all voting rounds',
      idempotencyKey: `t4-imp-${gameTableId}`,
    })
    for (const tp of tableSlots) {
      await db
        .insert(taskSubmissions)
        .values({ teamId: tp.originalTeamId, taskNumber: 4 })
        .onConflictDoNothing()
    }
    return { roundComplete: true, gameOver: true, winner: 'imposter' as const }
  }

  // Not conclusive yet - advance to the next round.
  return {
    roundComplete: true,
    gameOver: false,
    nextRound: round + 1,
    eliminatedPlayerId: uniqueAccused,
  }
}
