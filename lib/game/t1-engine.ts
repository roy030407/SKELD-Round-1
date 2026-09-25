// lib/game/t1-engine.ts
// Task 1 Imposter Word Game Engine

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
import { eq, and, sql } from 'drizzle-orm'
import { SCORING_CONFIG } from '@/lib/scoring/config'
import { recordScoreEvent } from '@/lib/scoring/ledger'

export const CREWMATE_COLORS = ['red', 'blue', 'cyan', 'yellow', 'green', 'purple'] as const
export type CrewmateColor = (typeof CREWMATE_COLORS)[number]

export interface ShuffledPlayer {
  playerId: string
  teamId: string
  name: string
}

/**
 * Shuffle an array in-place (Fisher-Yates).
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
 * Partition players from multiple teams into tables of 6,
 * ensuring no two players from the same team share a table.
 */
export function partitionPlayersIntoTables(
  teamPlayerMap: Map<string, ShuffledPlayer[]>
): ShuffledPlayer[][] {
  const teamIds = Array.from(teamPlayerMap.keys())
  if (teamIds.length < 6) return []

  // Copy queues of players per team
  const queues = new Map<string, ShuffledPlayer[]>()
  for (const [tId, pList] of teamPlayerMap.entries()) {
    queues.set(tId, [...pList])
  }

  const tables: ShuffledPlayer[][] = []

  // While at least 6 teams have available players
  while (true) {
    const eligibleTeams = Array.from(queues.keys()).filter(
      (tId) => (queues.get(tId)?.length ?? 0) > 0
    )

    if (eligibleTeams.length < 6) break

    // Pick 6 random teams
    const chosenTeams = shuffleArray(eligibleTeams).slice(0, 6)
    const table: ShuffledPlayer[] = []

    for (const tId of chosenTeams) {
      const player = queues.get(tId)!.shift()!
      table.push(player)
    }

    tables.push(table)
  }

  return tables
}

/**
 * Initialize a new Game Session (Session 1 or 2) with tables and role/word assignments.
 */
export async function createGameSession(sessionNumber: number, isBlankMode: boolean = false) {
  // 1. Fetch checked-in players
  const allCheckIns = await db.select().from(checkIns)
  const checkedInIds = new Set(allCheckIns.map((c) => c.playerId))

  const allPlayers = await db.select().from(players)
  const eligible = allPlayers.filter((p) => checkedInIds.has(p.id))

  const teamMap = new Map<string, ShuffledPlayer[]>()
  for (const p of eligible) {
    if (!teamMap.has(p.teamId)) teamMap.set(p.teamId, [])
    teamMap.get(p.teamId)!.push({
      playerId: p.id,
      teamId: p.teamId,
      name: p.firstName,
    })
  }

  const partitionedTables = partitionPlayersIntoTables(teamMap)
  if (partitionedTables.length === 0) {
    throw new Error('Not enough checked-in teams to form tables (minimum 6 teams required)')
  }

  // 2. Fetch words
  const allWords = await db.select().from(words).where(eq(words.isActive, true))
  const wordPairs = allWords.length > 0
    ? allWords
    : [{ category: 'Campus', crewWord: 'Library', imposterWord: 'Bookstore' }]

  // 3. Create Session in DB
  const [session] = await db
    .insert(gameSessions)
    .values({
      sessionNumber,
      status: 'active',
    })
    .returning()

  // 4. Create Tables and assign players
  for (let i = 0; i < partitionedTables.length; i++) {
    const tablePlayers = partitionedTables[i]!
    const randomWord = wordPairs[Math.floor(Math.random() * wordPairs.length)]!

    const [table] = await db
      .insert(gameTables)
      .values({
        gameSessionId: session.id,
        tableNumber: i + 1,
      })
      .returning()

    // Pick 1 random imposter
    const imposterIndex = Math.floor(Math.random() * 6)
    const shuffledColors = shuffleArray([...CREWMATE_COLORS])

    for (let pIdx = 0; pIdx < tablePlayers.length; pIdx++) {
      const p = tablePlayers[pIdx]!
      const isImposter = pIdx === imposterIndex
      const assignedWord = isImposter
        ? (isBlankMode ? 'BLANK' : randomWord.imposterWord)
        : randomWord.crewWord

      await db.insert(gameTablePlayers).values({
        tableId: table.id,
        playerId: p.playerId,
        originalTeamId: p.teamId,
        word: assignedWord,
        isImposter,
        crewmateColor: shuffledColors[pIdx]!,
      })
    }
  }

  return { sessionId: session.id, tablesCount: partitionedTables.length }
}

/**
 * Returns player-facing game state for Task 1:
 * Strictly hides words and imposter identity of other players!
 */
export async function getPlayerGameView(playerId: string) {
  const [membership] = await db
    .select()
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.playerId, playerId))

  if (!membership) return null

  const [table] = await db
    .select()
    .from(gameTables)
    .where(eq(gameTables.id, membership.tableId))

  const allTablePlayers = await db
    .select()
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.tableId, membership.tableId))

  const playerRecords = await db.select().from(players)
  const nameMap = new Map(playerRecords.map((p) => [p.id, p.firstName]))

  // Get current votes for this table
  const tableVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.gameTableId, membership.tableId))

  const round1Votes = tableVotes.filter((v) => v.round === 1)
  const round2Votes = tableVotes.filter((v) => v.round === 2)
  const currentRound = round1Votes.length < 6 ? 1 : 2

  // Mask other players' words and imposter flags
  const otherPlayers = allTablePlayers.map((tp) => ({
    id: tp.playerId,
    name: nameMap.get(tp.playerId) ?? 'Crewmate',
    color: tp.crewmateColor as CrewmateColor,
    isYou: tp.playerId === playerId,
    hasVoted: tableVotes.some(
      (v) => v.voterPlayerId === tp.playerId && v.round === currentRound
    ),
  }))

  return {
    tableId: table.id,
    tableNumber: table.tableNumber,
    yourColor: membership.crewmateColor as CrewmateColor,
    yourWord: membership.word,
    isImposter: membership.isImposter,
    currentRound,
    players: otherPlayers,
  }
}

/**
 * Cast a vote during Task 1.
 * Resolves outcomes upon round completion.
 */
export async function castVote(
  gameTableId: string,
  voterPlayerId: string,
  targetPlayerId: string,
  round: number
) {
  // Check if voter already voted in this round
  const [existingVote] = await db
    .select()
    .from(votes)
    .where(
      and(
        eq(votes.gameTableId, gameTableId),
        eq(votes.voterPlayerId, voterPlayerId),
        eq(votes.round, round)
      )
    )

  if (existingVote) {
    throw new Error('Player has already voted in this round')
  }

  // Insert vote
  await db.insert(votes).values({
    gameTableId,
    voterPlayerId,
    targetPlayerId,
    round,
  })

  // Check if all votes are in for this round
  const tablePlayers = await db
    .select()
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.tableId, gameTableId))

  const currentRoundVotes = await db
    .select()
    .from(votes)
    .where(and(eq(votes.gameTableId, gameTableId), eq(votes.round, round)))

  // Round 1 expects 6 votes, Round 2 expects 5 votes (1 eliminated)
  const expectedVotes = round === 1 ? 6 : 5

  if (currentRoundVotes.length >= expectedVotes) {
    // Resolve round outcome
    const voteCounts = new Map<string, number>()
    for (const v of currentRoundVotes) {
      voteCounts.set(v.targetPlayerId, (voteCounts.get(v.targetPlayerId) ?? 0) + 1)
    }

    // Find most voted player
    let maxVotes = 0
    let accusedPlayerId: string | null = null
    for (const [pId, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count
        accusedPlayerId = pId
      }
    }

    const imposterPlayer = tablePlayers.find((tp) => tp.isImposter)!
    const isImposterCaught = accusedPlayerId === imposterPlayer.playerId

    if (isImposterCaught) {
      // Imposter caught! Crewmates win!
      for (const tp of tablePlayers) {
        if (!tp.isImposter) {
          await recordScoreEvent({
            teamId: tp.originalTeamId,
            taskNumber: 1,
            eventType: 'crewmate_win',
            points: SCORING_CONFIG.task1.crewmatePoints,
            reason: `Task 1: Crewmates caught imposter in Round ${round}`,
            idempotencyKey: `t1-${gameTableId}-${tp.originalTeamId}`,
          })
        }
      }
      // Mark task 1 complete for all participating teams
      for (const tp of tablePlayers) {
        await db
          .insert(taskSubmissions)
          .values({ teamId: tp.originalTeamId, taskNumber: 1 })
          .onConflictDoNothing()
      }
      return { roundComplete: true, gameOver: true, winner: 'crewmates' }
    } else if (round === 1) {
      // Accused was a crewmate in Round 1 -> proceed to Round 2
      return { roundComplete: true, gameOver: false, nextRound: 2, eliminatedPlayerId: accusedPlayerId }
    } else {
      // Round 2 ended and imposter was NOT caught -> Imposter survives and wins!
      await recordScoreEvent({
        teamId: imposterPlayer.originalTeamId,
        taskNumber: 1,
        eventType: 'imposter_win',
        points: SCORING_CONFIG.task1.imposterPoints,
        reason: 'Task 1: Imposter survived both voting rounds',
        idempotencyKey: `t1-${gameTableId}-${imposterPlayer.originalTeamId}`,
      })
      // Mark task 1 complete for all participating teams
      for (const tp of tablePlayers) {
        await db
          .insert(taskSubmissions)
          .values({ teamId: tp.originalTeamId, taskNumber: 1 })
          .onConflictDoNothing()
      }
      return { roundComplete: true, gameOver: true, winner: 'imposter' }
    }
  }

  return { roundComplete: false, votesCount: currentRoundVotes.length, expectedVotes }
}
