import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { bets, registrationSettings, teams } from '@/lib/db/schema'
import { getLeaderboard } from '@/lib/scoring/ledger'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { eq } from 'drizzle-orm'

/**
 * POST /api/admin/settle-bets
 * Admin-only: settle all bets after final rankings are computed.
 * Compares each team's predicted rank to their actual rank.
 * +10 for exact match, -10 for any other outcome.
 * Idempotent: uses bet-settle-{teamId} key.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])

    // Check not already settled
    const [settings] = await db
      .select()
      .from(registrationSettings)
      .where(eq(registrationSettings.id, 1))

    if (settings?.betsSettled) {
      return NextResponse.json({ error: 'Bets have already been settled.' }, { status: 409 })
    }

    // Get final leaderboard (without bet bonus/penalty so we compare pre-bet rank)
    // getLeaderboard uses rankTeams which includes bet events. We need to get the
    // ranking WITHOUT bet bonus to determine the "pre-bet rank" per the spec.
    // For simplicity and event-day practicality: we use current rank (including all
    // task scores but not including bet events, since bets haven't been settled yet).
    const rankedTeams = await getLeaderboard()

    // Get all bets
    const allBets = await db.select().from(bets)

    const results = []
    for (const bet of allBets) {
      const teamRank = rankedTeams.find((t) => t.teamId === bet.teamId)?.rank ?? null

      if (teamRank === null) {
        results.push({ teamId: bet.teamId, outcome: 'no_rank', points: 0 })
        continue
      }

      const isCorrect = bet.predictedRank === teamRank
      const points = isCorrect ? 10 : -10
      const eventType = isCorrect ? 'bet_bonus' : 'bet_penalty'

      await recordScoreEvent({
        teamId: bet.teamId,
        taskNumber: null,
        eventType,
        points,
        idempotencyKey: `bet-settle-${bet.teamId}`,
        reason: `Bet: predicted rank ${bet.predictedRank}, actual rank ${teamRank}`,
        createdBy: session.staffId,
      })

      results.push({
        teamId: bet.teamId,
        predictedRank: bet.predictedRank,
        actualRank: teamRank,
        outcome: isCorrect ? 'correct' : 'wrong',
        points,
      })
    }

    // Mark bets as settled
    await db
      .insert(registrationSettings)
      .values({ id: 1, betsSettled: true })
      .onConflictDoUpdate({
        target: registrationSettings.id,
        set: { betsSettled: true },
      })

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
