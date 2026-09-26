import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { getPlayerGameView } from '@/lib/game/t4-engine'
import { db } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks/4/state
 * Returns the player's table assignment and game state.
 * Does NOT expose word or isImposter for other players.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    if (!session.playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 401 })
    }

    const gameState = await getPlayerGameView(session.playerId)
    if (!gameState) {
      return NextResponse.json({ active: true, assigned: false, message: 'You are not assigned to a table yet.' })
    }

    return NextResponse.json({ active: true, assigned: true, ...gameState })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Task 4 state error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
