import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { getPlayerT4GameState } from '@/lib/game/t4-engine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req, db)
    if (!session.playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
    }

    const gameState = await getPlayerT4GameState(session.playerId)
    if (!gameState) {
      return NextResponse.json({
        active: false,
        message: 'No active Task 4 shuffling table found for this player. Mission Control must initiate shuffling session.',
      })
    }

    return NextResponse.json({ active: true, gameState })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
