import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { canEnterTask } from '@/lib/gating'
import { validateFragment } from '@/lib/game/cipher-data'
import { z } from 'zod'

const schema = z.object({
  fragmentIndex: z.number().int().min(0).max(5),
  attempt: z.string().min(1),
})

/**
 * POST /api/tasks/2/verify-fragment
 * Validates a player's decryption attempt for their fragment.
 * Returns { correct: true/false } — does NOT reveal the answer.
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

    const correct = validateFragment(parsed.fragmentIndex, parsed.attempt)

    return NextResponse.json({ correct })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
