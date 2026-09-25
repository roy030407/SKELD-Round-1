import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { castVote } from '@/lib/game/t1-engine'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const voteSchema = z.object({
  tableId: z.string().uuid(),
  targetPlayerId: z.string().uuid(),
  round: z.number().int().min(1).max(2),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    if (!session.playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = voteSchema.parse(body)

    const result = await castVote(
      parsed.tableId,
      session.playerId,
      parsed.targetPlayerId,
      parsed.round
    )

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Vote casting error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cast vote' },
      { status: 400 }
    )
  }
}
