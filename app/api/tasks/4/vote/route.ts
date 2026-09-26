import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { canEnterTask } from '@/lib/gating'
import { castVote } from '@/lib/game/t4-engine'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const voteSchema = z.object({
  tableId: z.string().uuid(),
  targetPlayerId: z.string().uuid(),
  round: z.number().int().min(1).max(2),
})

/**
 * POST /api/tasks/4/vote
 * Cast a vote in the Task 4 shuffling imposter game. Once every player at
 * the table has voted, resolves the round (or the whole game).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    if (!session.playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 401 })
    }
    if (session.teamId) {
      const gateCheck = await canEnterTask(session.teamId, 4)
      if (!gateCheck.allowed) {
        return NextResponse.json({ error: gateCheck.reason }, { status: 403 })
      }
    }

    const body = await request.json()
    const parsed = voteSchema.parse(body)

    const result = await castVote(parsed.tableId, session.playerId, parsed.targetPlayerId, parsed.round)

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Task 4 vote casting error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cast vote' },
      { status: 400 }
    )
  }
}
