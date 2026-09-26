import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { taskGates, teams } from '@/lib/db/schema'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const gateActionSchema = z.object({
  taskNumber: z.number().int().min(1).max(4),
  action: z.enum(['open', 'close']),
  teamId: z.string().uuid().optional(), // omit to apply to every team at once
})

/**
 * GET /api/admin/task-gate
 * Admin-only. Returns every team plus the current gate state per task, so
 * the admin UI can render open/close controls and reflect the last action
 * taken (lib/gating.ts's canEnterTask fails OPEN when no gate row exists,
 * so "no row" and "explicitly open" are both reported as open here).
 */
export async function GET(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])

    const allTeams = await db.select().from(teams)
    const allGates = await db.select().from(taskGates)

    // Per-task summary for the "apply to all teams" toggle UI: a task is
    // shown closed only if every team currently has an explicit
    // closed-without-opened gate row (i.e. the last "close all" fully took
    // effect for every team); otherwise shown open, matching canEnterTask's
    // fail-open default for any team missing a row.
    const taskStates = [1, 2, 3, 4].map((taskNumber) => {
      const rows = allGates.filter((g) => g.taskNumber === taskNumber)
      const closedTeamIds = new Set(
        rows.filter((g) => g.closedAt && !g.openedAt).map((g) => g.teamId)
      )
      const allClosed = allTeams.length > 0 && allTeams.every((t) => closedTeamIds.has(t.id))
      return { taskNumber, closed: allClosed }
    })

    return NextResponse.json({
      teams: allTeams.map((t) => ({ id: t.id, code: t.code, name: t.name })),
      taskStates,
      gates: allGates.map((g) => ({
        teamId: g.teamId,
        taskNumber: g.taskNumber,
        openedAt: g.openedAt,
        closedAt: g.closedAt,
      })),
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

/**
 * POST /api/admin/task-gate
 * Admin-only. Opens or closes a task gate, checked by lib/gating.ts's
 * canEnterTask on every real task route. Omit teamId to apply to every team
 * at once (the realistic operational use case: "pause task 3 for
 * everyone mid-event"); pass teamId to target a single team.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])
    const body = await req.json()
    const parsed = gateActionSchema.parse(body)

    const teamIds = parsed.teamId
      ? [parsed.teamId]
      : (await db.select({ id: teams.id }).from(teams)).map((t) => t.id)

    for (const teamId of teamIds) {
      const values =
        parsed.action === 'open'
          ? { openedAt: new Date(), closedAt: null, openedBy: session.staffId }
          : { openedAt: null, closedAt: new Date(), openedBy: session.staffId }

      await db
        .insert(taskGates)
        .values({ teamId, taskNumber: parsed.taskNumber, ...values })
        .onConflictDoUpdate({
          target: [taskGates.teamId, taskGates.taskNumber],
          set: values,
        })
    }

    return NextResponse.json({
      success: true,
      action: parsed.action,
      taskNumber: parsed.taskNumber,
      teamsAffected: teamIds.length,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
