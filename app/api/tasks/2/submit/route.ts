import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { taskSubmissions, teams } from '@/lib/db/schema'
import { canEnterTask } from '@/lib/gating'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { validateMasterSentence } from '@/lib/game/cipher-data'
import { z } from 'zod'

const submitCipherSchema = z.object({
  sentence: z.string().min(5),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req, db)
    requireRole(session, ['leader', 'admin'])

    if (!session.teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = submitCipherSchema.parse(body)

    // Check gating: must have completed task 1
    const gateCheck = await canEnterTask(session.teamId, 2)
    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 403 })
    }

    // Verify sentence
    const isCorrect = validateMasterSentence(parsed.sentence)
    if (!isCorrect) {
      return NextResponse.json(
        { error: 'Assembled transmission invalid. Ensure all 6 crew fragments are in the proper sequence.' },
        { status: 400 }
      )
    }

    // Insert task submission
    const [submission] = await db
      .insert(taskSubmissions)
      .values({
        teamId: session.teamId,
        taskNumber: 2,
        submissionData: parsed.sentence.trim(),
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
        message: 'Task 2 was already successfully completed by your team!',
      })
    }

    // Rank-based points
    const existing = await db.select().from(taskSubmissions)
    const taskSubmits = existing.filter((s) => s.taskNumber === 2)
    const rank = taskSubmits.length

    const allTeams = await db.select().from(teams)
    const totalTeams = Math.max(allTeams.length, 25)
    const points = Math.max(1, totalTeams - rank + 1)

    await recordScoreEvent({
      teamId: session.teamId,
      taskNumber: 2,
      eventType: 'TASK_2_CIPHER',
      points,
      reason: `Task 2: Deciphered in Rank #${rank}`,
      idempotencyKey: `t2-${session.teamId}`,
      createdBy: session.playerId ?? session.staffId,
    })

    return NextResponse.json({
      success: true,
      rank,
      points,
      message: `Transmission accepted! Your team finished Rank #${rank} and earned ${points} points!`,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
