// lib/scoring/ledger.ts
// Append-only score event logging and derived leaderboard generation

import { db } from '@/lib/db/client'
import { scoreEvents, teams, bets } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { TeamScoreSummary, rankTeams, RankedTeam } from '@/lib/ranking'

export interface RecordScoreInput {
  teamId: string
  taskNumber?: number | null
  eventType: string
  points: number
  idempotencyKey?: string | null
  reason?: string | null
  createdBy?: string | null
}

/**
 * Append a new score event to the append-only ledger.
 * If idempotencyKey is provided, subsequent duplicate calls will be ignored.
 */
export async function recordScoreEvent(input: RecordScoreInput) {
  return await db
    .insert(scoreEvents)
    .values({
      teamId: input.teamId,
      taskNumber: input.taskNumber ?? null,
      eventType: input.eventType,
      points: input.points,
      idempotencyKey: input.idempotencyKey ?? null,
      reason: input.reason ?? null,
      createdBy: input.createdBy ?? null,
    })
    .onConflictDoNothing({ target: scoreEvents.idempotencyKey })
    .returning()
}

/**
 * Derive full TeamScoreSummary array for all teams by aggregating the score ledger.
 */
export async function getTeamScoreSummaries(): Promise<TeamScoreSummary[]> {
  const allTeams = await db.select().from(teams)
  if (allTeams.length === 0) return []

  const events = await db.select().from(scoreEvents)
  const allBets = await db.select().from(bets)

  const betByTeam = new Map<string, number>()
  for (const b of allBets) {
    betByTeam.set(b.teamId, b.predictedRank)
  }

  // Aggregate by teamId
  const summaryMap = new Map<string, {
    t1: number
    t2: number
    t3: number
    t4: number
    bet: number
    hasWinningBet: boolean
  }>()

  for (const t of allTeams) {
    summaryMap.set(t.id, {
      t1: 0,
      t2: 0,
      t3: 0,
      t4: 0,
      bet: 0,
      hasWinningBet: false,
    })
  }

  for (const ev of events) {
    const entry = summaryMap.get(ev.teamId)
    if (!entry) continue

    if (ev.taskNumber === 1) entry.t1 += ev.points
    else if (ev.taskNumber === 2) entry.t2 += ev.points
    else if (ev.taskNumber === 3) entry.t3 += ev.points
    else if (ev.taskNumber === 4) entry.t4 += ev.points
    else if (ev.eventType === 'bet_bonus') {
      entry.bet += ev.points
      if (ev.points > 0) entry.hasWinningBet = true
    } else if (ev.eventType === 'bet_penalty') {
      entry.bet += ev.points
    } else {
      // General admin adjustments add to total
      entry.t1 += ev.points
    }
  }

  const summaries: TeamScoreSummary[] = allTeams.map((t) => {
    const s = summaryMap.get(t.id)!
    const totalPoints = s.t1 + s.t2 + s.t3 + s.t4 + s.bet
    return {
      teamId: t.id,
      teamCode: t.code,
      teamName: t.name,
      task1Points: s.t1,
      task2Points: s.t2,
      task3Points: s.t3,
      task4Points: s.t4,
      betBonus: s.bet,
      hasWinningBet: s.hasWinningBet,
      totalPoints,
    }
  })

  return summaries
}

/**
 * Returns current ranked leaderboard computed from the append-only ledger.
 */
export async function getLeaderboard(): Promise<RankedTeam[]> {
  const summaries = await getTeamScoreSummaries()
  return rankTeams(summaries)
}
