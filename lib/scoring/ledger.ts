// lib/scoring/ledger.ts
// Append-only score event logging and derived leaderboard generation

import { db } from '@/lib/db/client'
import { scoreEvents, teams, bets, taskSubmissions } from '@/lib/db/schema'
import { eq, sql, count } from 'drizzle-orm'
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

export interface SubmitTaskWithRankInput {
  teamId: string
  taskNumber: number
  eventType: string
  idempotencyKey: string
  reasonPrefix: string
  submittedBy?: string | null
  submissionData?: string | null
  totalTeams?: number
}

export type SubmitTaskWithRankResult =
  | { alreadySubmitted: true }
  | { alreadySubmitted: false; rank: number; points: number }

/**
 * Atomically assign a rank-based score for a task submission and record the
 * submission row, closing the read-then-write race that existed between
 * "count existing submissions" and "insert this team's submission" (two
 * teams submitting concurrently could otherwise both read the same count and
 * be awarded the same rank/points).
 *
 * A Postgres advisory lock scoped to the task number serializes all
 * submissions for that task within a single transaction, guaranteeing each
 * team's rank is assigned strictly in submission order.
 */
export async function submitTaskWithRank(input: SubmitTaskWithRankInput): Promise<SubmitTaskWithRankResult> {
  const totalTeams = input.totalTeams ?? 25

  const outcome = await db.transaction(async (tx) => {
    // Serialize all rank assignment for this specific task number. The lock
    // is automatically released at transaction end (commit or rollback).
    await tx.execute(sql`SELECT pg_advisory_xact_lock(920000, ${input.taskNumber})`)

    const [{ value: existingCount }] = await tx
      .select({ value: count() })
      .from(taskSubmissions)
      .where(eq(taskSubmissions.taskNumber, input.taskNumber))

    const rank = Number(existingCount) + 1
    const points = Math.max(1, totalTeams - rank + 1)

    const insertResult = await tx
      .insert(taskSubmissions)
      .values({
        teamId: input.teamId,
        taskNumber: input.taskNumber,
        submittedBy: input.submittedBy ?? null,
        submissionData: input.submissionData ?? null,
      })
      .onConflictDoNothing({ target: [taskSubmissions.teamId, taskSubmissions.taskNumber] })
      .returning()

    if (!insertResult.length) {
      return { alreadySubmitted: true as const }
    }

    return { alreadySubmitted: false as const, rank, points }
  })

  if (outcome.alreadySubmitted) {
    return outcome
  }

  await recordScoreEvent({
    teamId: input.teamId,
    taskNumber: input.taskNumber,
    eventType: input.eventType,
    points: outcome.points,
    idempotencyKey: input.idempotencyKey,
    reason: `${input.reasonPrefix} at rank #${outcome.rank}`,
    createdBy: input.submittedBy ?? null,
  })

  return outcome
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
