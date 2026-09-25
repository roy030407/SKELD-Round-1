import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { taskSubmissions, teams } from '@/lib/db/schema'
import { canEnterTask } from '@/lib/gating'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { z } from 'zod'

const submitSchema = z.object({
  taskNumber: z.number().int().min(2).max(4),
  proof: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    requireRole(session, ['leader', 'admin'])

    if (!session.teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = submitSchema.parse(body)

    // Check if team is eligible for this task
    const gateCheck = await canEnterTask(session.teamId, parsed.taskNumber)
    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 403 })
    }

    // Insert submission
    const [submission] = await db
      .insert(taskSubmissions)
      .values({
        teamId: session.teamId,
        taskNumber: parsed.taskNumber,
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
        message: `Task ${parsed.taskNumber} was already submitted by your team`,
      })
    }

    // For Tasks 2 and 3, rank is based on submission speed:
    // Count existing submissions for this task to determine rank
    const existing = await db.select().from(taskSubmissions)
    const taskSubmits = existing.filter((s) => s.taskNumber === parsed.taskNumber)
    const rank = taskSubmits.length

    // All registered teams N
    const allTeams = await db.select().from(teams)
    const n = Math.max(allTeams.length, 1)
    const pointsAwarded = Math.max(1, n - rank + 1)

    await recordScoreEvent({
      teamId: session.teamId,
      taskNumber: parsed.taskNumber,
      eventType: `task_${parsed.taskNumber}_completion`,
      points: pointsAwarded,
      reason: `Task ${parsed.taskNumber} finished at rank #${rank}`,
      idempotencyKey: `task-${parsed.taskNumber}-${session.teamId}`,
      createdBy: session.playerId ?? session.staffId,
    })

    return NextResponse.json({
      success: true,
      taskNumber: parsed.taskNumber,
      rank,
      points: pointsAwarded,
    })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Task submission error:', error)
    return NextResponse.json({ error: error.message || 'Submission failed' }, { status: 400 })
  }
}
