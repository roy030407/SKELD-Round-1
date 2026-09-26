import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { taskSubmissions, teams } from '@/lib/db/schema'
import { validateMasterSentence } from '@/lib/game/cipher-data'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { eq, count } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  assembledSentence: z.string().min(1),
})

/**
 * POST /api/tasks/2/submit
 * Leader submits assembled sentence. Validates against master, awards rank-based points.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!session.teamId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = schema.parse(body)

    if (!validateMasterSentence(parsed.assembledSentence)) {
      return NextResponse.json({ correct: false, error: 'Incorrect sentence. Try again.' }, { status: 200 })
    }

    // Rank-based scoring: count existing submissions for task 2
    const [{ value: existingCount }] = await db
      .select({ value: count() })
      .from(taskSubmissions)
      .where(eq(taskSubmissions.taskNumber, 2))

    const rank = Number(existingCount) + 1
    const totalTeams = 25
    const points = Math.max(1, totalTeams - rank + 1)

    // Record submission (idempotent — unique constraint on teamId+taskNumber)
    const insertResult = await db
      .insert(taskSubmissions)
      .values({
        teamId: session.teamId,
        taskNumber: 2,
        submittedBy: session.playerId ?? null,
        submissionData: parsed.assembledSentence,
      })
      .onConflictDoNothing({ target: [taskSubmissions.teamId, taskSubmissions.taskNumber] })
      .returning()

    if (!insertResult.length) {
      return NextResponse.json({ error: 'Task 2 already submitted by your team.' }, { status: 409 })
    }

    // Record score event
    await recordScoreEvent({
      teamId: session.teamId,
      taskNumber: 2,
      eventType: 'TASK_2_CIPHER',
      points,
      idempotencyKey: `task2-cipher-${session.teamId}`,
      reason: `Cipher completed at rank #${rank}`,
    })

    return NextResponse.json({ correct: true, rank, points })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
