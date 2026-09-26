import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { canEnterTask } from '@/lib/gating'
import { validateMasterSentence } from '@/lib/game/cipher-data'
import { submitTaskWithRank } from '@/lib/scoring/ledger'
import { z } from 'zod'

const schema = z.object({
  assembledSentence: z.string().min(1),
})

/**
 * POST /api/tasks/2/submit
 * Any team member may submit the assembled sentence (no leader restriction —
 * matches PROJECT.md, which only names Task 4/betting as leader-only).
 * Validates against master, awards rank-based points.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!session.teamId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    const gateCheck = await canEnterTask(session.teamId, 2)
    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 403 })
    }

    const body = await req.json()
    const parsed = schema.parse(body)

    if (!validateMasterSentence(parsed.assembledSentence)) {
      return NextResponse.json({ correct: false, error: 'Incorrect sentence. Try again.' }, { status: 200 })
    }

    // Rank-based scoring, race-safe (serialized via advisory lock in a transaction).
    const result = await submitTaskWithRank({
      teamId: session.teamId,
      taskNumber: 2,
      submittedBy: session.playerId ?? null,
      submissionData: parsed.assembledSentence,
      eventType: 'TASK_2_CIPHER',
      idempotencyKey: `task2-cipher-${session.teamId}`,
      reasonPrefix: 'Cipher completed',
    })

    if (result.alreadySubmitted) {
      return NextResponse.json({ error: 'Task 2 already submitted by your team.' }, { status: 409 })
    }

    return NextResponse.json({ correct: true, rank: result.rank, points: result.points })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
