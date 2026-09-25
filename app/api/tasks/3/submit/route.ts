import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { taskSubmissions, teams } from '@/lib/db/schema'
import { canEnterTask } from '@/lib/gating'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { LOGIC_GATE_STAGES } from '@/lib/game/logic-gates-data'
import { z } from 'zod'

const defusalSchema = z.object({
  stageInputs: z.record(z.string(), z.record(z.string(), z.number().int().min(0).max(1))),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req, db)
    requireRole(session, ['leader', 'admin', 'player'])

    if (!session.teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = defusalSchema.parse(body)

    // Check gating: must have completed task 2
    const gateCheck = await canEnterTask(session.teamId, 3)
    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 403 })
    }

    // Verify all 5 stages
    for (const stage of LOGIC_GATE_STAGES) {
      const inputs = parsed.stageInputs[stage.stageNumber.toString()]
      if (!inputs) {
        return NextResponse.json(
          { error: `Stage ${stage.stageNumber} inputs missing.` },
          { status: 400 }
        )
      }
      const typedInputs: Record<string, 0 | 1> = {}
      for (const [k, v] of Object.entries(inputs)) {
        typedInputs[k] = v === 1 ? 1 : 0
      }
      if (!stage.verify(typedInputs)) {
        return NextResponse.json(
          { error: `Logic Gate Stage ${stage.stageNumber} is incorrectly configured. Bomb unstable!` },
          { status: 400 }
        )
      }
    }

    // Insert task submission
    const [submission] = await db
      .insert(taskSubmissions)
      .values({
        teamId: session.teamId,
        taskNumber: 3,
        submissionData: JSON.stringify({ defusedAt: new Date().toISOString() }),
        submittedBy: session.playerId ?? session.staffId,
      })
      .onConflictDoNothing({
        target: [taskSubmissions.teamId, taskSubmissions.taskNumber],
      })
      .returning()

    if (!submission) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        message: 'Task 3 was already successfully defused by your team!',
      })
    }

    // Rank-based points (fastest team gets N, next gets N-1, etc.)
    const existing = await db.select().from(taskSubmissions)
    const taskSubmits = existing.filter((s) => s.taskNumber === 3)
    const rank = taskSubmits.length

    const allTeams = await db.select().from(teams)
    const totalTeams = Math.max(allTeams.length, 25)
    const points = Math.max(1, totalTeams - rank + 1)

    await recordScoreEvent({
      teamId: session.teamId,
      taskNumber: 3,
      eventType: 'TASK_3_DEFUSAL',
      points,
      reason: `Task 3: Defused in Rank #${rank}`,
      idempotencyKey: `t3-${session.teamId}`,
      createdBy: session.playerId ?? session.staffId,
    })

    return NextResponse.json({
      success: true,
      rank,
      points,
      message: `BOMB DEFUSED! Your team stabilized the core at Rank #${rank} and earned ${points} points!`,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
