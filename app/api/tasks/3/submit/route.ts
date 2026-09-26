import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { taskSubmissions } from '@/lib/db/schema'
import { LOGIC_GATE_STAGES } from '@/lib/game/logic-gates-data'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { eq, count } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  stages: z.array(
    z.object({
      stageIndex: z.number().int().min(0).max(4),
      inputs: z.record(z.string(), z.union([z.literal(0), z.literal(1)])),
    })
  ).length(5),
})

/**
 * POST /api/tasks/3/submit
 * Verifies all 5 logic gate stages simultaneously.
 * Fastest team wins most points (rank-based).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!session.teamId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = schema.parse(body)

    // Verify all stages
    const results = parsed.stages.map((s) => {
      const stage = LOGIC_GATE_STAGES[s.stageIndex]
      return {
        stageIndex: s.stageIndex,
        correct: stage ? stage.verify(s.inputs as Record<string, 0 | 1>) : false,
      }
    })

    const allCorrect = results.every((r) => r.correct)
    if (!allCorrect) {
      const wrong = results.filter((r) => !r.correct).map((r) => r.stageIndex + 1)
      return NextResponse.json({
        correct: false,
        error: `Stages ${wrong.join(', ')} are incorrect. Re-check your gate logic.`,
        stageResults: results,
      })
    }

    // Rank-based scoring
    const [{ value: existingCount }] = await db
      .select({ value: count() })
      .from(taskSubmissions)
      .where(eq(taskSubmissions.taskNumber, 3))

    const rank = Number(existingCount) + 1
    const totalTeams = 25
    const points = Math.max(1, totalTeams - rank + 1)

    // Idempotent insertion
    const insertResult = await db
      .insert(taskSubmissions)
      .values({
        teamId: session.teamId,
        taskNumber: 3,
        submittedBy: session.playerId ?? null,
      })
      .onConflictDoNothing({ target: [taskSubmissions.teamId, taskSubmissions.taskNumber] })
      .returning()

    if (!insertResult.length) {
      return NextResponse.json({ error: 'Task 3 already submitted by your team.' }, { status: 409 })
    }

    await recordScoreEvent({
      teamId: session.teamId,
      taskNumber: 3,
      eventType: 'TASK_3_BOMB_DEFUSAL',
      points,
      idempotencyKey: `task3-bomb-${session.teamId}`,
      reason: `Bomb defused at rank #${rank}`,
    })

    return NextResponse.json({ correct: true, rank, points, stageResults: results })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
