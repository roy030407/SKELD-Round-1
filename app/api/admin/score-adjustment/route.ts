import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { teams, scoreEvents } from '@/lib/db/schema'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { getLeaderboard } from '@/lib/scoring/ledger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  teamId: z.string().uuid(),
  points: z.number().int().refine((n) => n !== 0, 'Adjustment must be non-zero'),
  reason: z.string().min(1, 'A reason is required for every manual adjustment'),
})

/**
 * GET /api/admin/score-adjustment
 * Admin-only. Every team with current totals plus the manual-adjustment
 * history, so admin can see what's already been added before adjusting again.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])

    const [allTeams, leaderboard, allEvents] = await Promise.all([
      db.select().from(teams),
      getLeaderboard(),
      db.select().from(scoreEvents),
    ])

    const totals = new Map(leaderboard.map((t) => [t.teamId, t.totalPoints]))
    const teamList = allTeams.map((t) => ({ id: t.id, code: t.code, name: t.name, totalPoints: totals.get(t.id) ?? 0 }))

    const manual = allEvents
      .filter((e) => e.eventType === 'MANUAL_ADJUSTMENT')
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 50)
      .map((e) => ({
        id: e.id,
        teamId: e.teamId,
        teamCode: allTeams.find((t) => t.id === e.teamId)?.code ?? '?',
        points: e.points,
        reason: e.reason,
        createdAt: e.createdAt,
      }))

    return NextResponse.json({ teams: teamList, history: manual })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

/**
 * POST /api/admin/score-adjustment
 * Admin-only. Appends a manual correction to the score ledger - it does NOT
 * overwrite anything (there is nothing to overwrite: totals are always
 * summed live from score_events). Positive or negative points, e.g. to
 * correct a mis-entered task score after the fact.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])
    const body = bodySchema.parse(await req.json())

    await recordScoreEvent({
      teamId: body.teamId,
      taskNumber: null,
      eventType: 'MANUAL_ADJUSTMENT',
      points: body.points,
      reason: body.reason,
      createdBy: session.staffId ?? null,
      // Deliberately no idempotencyKey: each adjustment is its own distinct,
      // intentional action, not a retried request that should be deduped.
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
