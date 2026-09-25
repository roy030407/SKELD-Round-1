// lib/game/t4-engine.ts
// Task 4 Imposter Word Game Engine (Shuffling Round)

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

  const queues = new Map<string, ShuffledPlayer[]>()
  for (const [tId, pList] of teamPlayerMap.entries()) {
    queues.set(tId, [...pList])
  }

  const tables: ShuffledPlayer[][] = []

  while (true) {
    const availableTeams = Array.from(queues.entries()).filter(([_, q]) => q.length > 0)
    if (availableTeams.length < 6) break

    // Sort teams by remaining players descending
    availableTeams.sort((a, b) => b[1].length - a[1].length)

    // Pick 1 player from each of the first 6 teams
    const currentTable: ShuffledPlayer[] = []
    for (let i = 0; i < 6; i++) {
      const [tId, q] = availableTeams[i]!
      currentTable.push(q.shift()!)
    }
    tables.push(currentTable)
  }

  return tables
}

/**
 * Initialize a new Task 4 Imposter Game Session.
 */
export async function createT4GameSession(): Promise<{
  sessionId: string
  totalTables: number
  totalPlayers: number
}> {
  const allCheckIns = await db.select().from(checkIns)
  const checkedInPlayerIds = new Set(allCheckIns.map((c) => c.playerId))

  const allPlayers = await db.select().from(players)
  const eligiblePlayers = allPlayers.filter((p) => checkedInPlayerIds.has(p.id))

  const teamPlayerMap = new Map<string, ShuffledPlayer[]>()
  for (const p of eligiblePlayers) {
    if (!teamPlayerMap.has(p.teamId)) {
      teamPlayerMap.set(p.teamId, [])
    }
    teamPlayerMap.get(p.teamId)!.push({
      playerId: p.id,
      teamId: p.teamId,
      name: p.firstName,
    })
  }

  for (const [tId, pList] of teamPlayerMap.entries()) {
    teamPlayerMap.set(tId, shuffleArray(pList))
  }

  const tablePartitions = partitionPlayersIntoTables(teamPlayerMap)
  if (tablePartitions.length === 0) {
    throw new Error('Not enough checked-in players across distinct teams to form a table of 6.')
  }

  const allWordPairs = await db.select().from(words).where(eq(words.isActive, true))
  if (allWordPairs.length === 0) {
    throw new Error('No active word pairs found in database. Run seed:words.')
  }
  const shuffledWords = shuffleArray(allWordPairs)

  const [session] = await db
    .insert(gameSessions)
    .values({
      sessionNumber: 4,
      status: 'active',
    })
    .returning()

  let totalPlayersCount = 0

  for (let i = 0; i < tablePartitions.length; i++) {
    const tablePlayers = tablePartitions[i]!
    const wordPair = shuffledWords[i % shuffledWords.length]!

    const [table] = await db
      .insert(gameTables)
      .values({
        gameSessionId: session.id,
        tableNumber: i + 1,
      })
      .returning()

    const imposterIndex = Math.floor(Math.random() * 6)
    const shuffledColors = shuffleArray([...CREWMATE_COLORS])

    for (let pIdx = 0; pIdx < 6; pIdx++) {
      const sp = tablePlayers[pIdx]!
      const isImposter = pIdx === imposterIndex
      const assignedWord = isImposter ? wordPair.imposterWord : wordPair.crewWord
      const color = shuffledColors[pIdx]!

      await db.insert(gameTablePlayers).values({
        tableId: table.id,
        playerId: sp.playerId,
        originalTeamId: sp.teamId,
        word: assignedWord,
        isImposter,
        crewmateColor: color,
      })
      totalPlayersCount++
    }
  }

  return {
    sessionId: session.id,
    totalTables: tablePartitions.length,
    totalPlayers: totalPlayersCount,
  }
}

/**
 * Get current Game State for a player in Task 4.
 */
export async function getPlayerT4GameState(playerId: string) {
  const [tablePlayer] = await db
    .select()
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.playerId, playerId))

  if (!tablePlayer) return null

  const [table] = await db
    .select()
    .from(gameTables)
    .where(eq(gameTables.id, tablePlayer.tableId))

  if (!table) return null

  const peers = await db
    .select({
      playerId: gameTablePlayers.playerId,
      crewmateColor: gameTablePlayers.crewmateColor,
      isImposter: gameTablePlayers.isImposter,
      originalTeamId: gameTablePlayers.originalTeamId,
    })
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.tableId, table.id))

  const allPlayers = await db.select().from(players)
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]))

  const peerList = peers.map((p) => ({
    playerId: p.playerId,
    name: playerMap.get(p.playerId)?.firstName ?? 'Unknown',
    crewmateColor: p.crewmateColor,
  }))

  const existingVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.gameTableId, table.id))

  const round1Votes = existingVotes.filter((v) => v.round === 1)
  const round2Votes = existingVotes.filter((v) => v.round === 2)
  const currentRound = round1Votes.length >= 6 ? 2 : 1

  return {
    tableId: table.id,
    tableNumber: table.tableNumber,
    assignedWord: tablePlayer.word,
    crewmateColor: tablePlayer.crewmateColor,
    isImposter: tablePlayer.isImposter,
    currentRound,
    players: peerList,
    votesCount: currentRound === 1 ? round1Votes.length : round2Votes.length,
  }
}

/**
 * Cast a vote in Task 4.
 */
export async function castVoteT4(
  gameTableId: string,
  voterPlayerId: string,
  targetPlayerId: string,
  round: number
) {
  await db.insert(votes).values({
    gameTableId,
    voterPlayerId,
    targetPlayerId,
    round,
  })

  const tablePlayers = await db
    .select()
    .from(gameTablePlayers)
    .where(eq(gameTablePlayers.tableId, gameTableId))

  const currentRoundVotes = await db
    .select()
    .from(votes)
    .where(and(eq(votes.gameTableId, gameTableId), eq(votes.round, round)))

  const expectedVotes = round === 1 ? 6 : 5

  if (currentRoundVotes.length >= expectedVotes) {
    const voteCounts = new Map<string, number>()
    for (const v of currentRoundVotes) {
      voteCounts.set(v.targetPlayerId, (voteCounts.get(v.targetPlayerId) ?? 0) + 1)
    }

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
      for (const tp of tablePlayers) {
        if (!tp.isImposter) {
          await recordScoreEvent({
            teamId: tp.originalTeamId,
            taskNumber: 4,
            eventType: 'crewmate_win',
            points: SCORING_CONFIG.task4.crewmatePoints,
            reason: `Task 4: Crewmates caught imposter in Round ${round}`,
            idempotencyKey: `t4-${gameTableId}-${tp.originalTeamId}`,
          })
        }
      }
      for (const tp of tablePlayers) {
        await db
          .insert(taskSubmissions)
          .values({ teamId: tp.originalTeamId, taskNumber: 4 })
          .onConflictDoNothing()
      }
      return { roundComplete: true, gameOver: true, winner: 'crewmates' }
    } else if (round === 1) {
      return { roundComplete: true, gameOver: false, nextRound: 2, eliminatedPlayerId: accusedPlayerId }
    } else {
      await recordScoreEvent({
        teamId: imposterPlayer.originalTeamId,
        taskNumber: 4,
        eventType: 'imposter_win',
        points: SCORING_CONFIG.task4.imposterPoints,
        reason: 'Task 4: Imposter survived both voting rounds',
        idempotencyKey: `t4-${gameTableId}-${imposterPlayer.originalTeamId}`,
      })
      for (const tp of tablePlayers) {
        await db
          .insert(taskSubmissions)
          .values({ teamId: tp.originalTeamId, taskNumber: 4 })
          .onConflictDoNothing()
      }
      return { roundComplete: true, gameOver: true, winner: 'imposter' }
    }
  }

  return { roundComplete: false, votesCount: currentRoundVotes.length, expectedVotes }
}
