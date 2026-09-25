import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { getPlayerGameView } from '@/lib/game/t1-engine'
import { db } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    if (!session.playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 401 })
    }

    const gameState = await getPlayerGameView(session.playerId)
    if (!gameState) {
      return NextResponse.json({ active: false, message: 'Game session not yet started for you.' })
    }

    return NextResponse.json({ active: true, gameState })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Task 1 state error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
