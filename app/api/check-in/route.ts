import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { checkInPlayer, getTeamCheckInStatus } from '@/lib/gating'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const checkInSchema = z.object({
  targetPlayerId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    const body = await request.json().catch(() => ({}))
    const parsed = checkInSchema.safeParse(body)

    let playerIdToCheckIn: string
    let checkedInBy: string | undefined

    if (session.role === 'admin' || session.role === 'monitor') {
      if (!parsed.data?.targetPlayerId) {
        return NextResponse.json(
          { error: 'Staff must provide targetPlayerId to check in a player' },
          { status: 400 }
        )
      }
      playerIdToCheckIn = parsed.data.targetPlayerId
      checkedInBy = session.staffId ?? undefined
    } else {
      // Player checks in themselves
      if (!session.playerId) {
        return NextResponse.json({ error: 'Player ID missing from session' }, { status: 401 })
      }
      playerIdToCheckIn = session.playerId
    }

    const result = await checkInPlayer(playerIdToCheckIn, checkedInBy)
    
    let teamStatus = null
    if (session.teamId) {
      teamStatus = await getTeamCheckInStatus(session.teamId)
    }

    return NextResponse.json({
      success: true,
      message: result.alreadyCheckedIn ? 'Player was already checked in' : 'Player checked in successfully',
      teamStatus,
    })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
