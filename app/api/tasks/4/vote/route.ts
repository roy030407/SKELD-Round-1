import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { castVoteT4 } from '@/lib/game/t4-engine'
import { z } from 'zod'

const voteSchema = z.object({
  tableId: z.string().uuid(),
  targetPlayerId: z.string().uuid(),
  round: z.number().int().min(1).max(2),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req, db)
    if (!session.playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = voteSchema.parse(body)

    const result = await castVoteT4(
      parsed.tableId,
      session.playerId,
      parsed.targetPlayerId,
      parsed.round
    )

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
