import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { getTeamCheckInStatus } from '@/lib/gating'
import { db } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    const { searchParams } = new URL(request.url)
    const targetTeamId = searchParams.get('teamId') || session.teamId

    if (!targetTeamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // Non-staff can only see their own team's check-in status
    if (session.role !== 'admin' && session.role !== 'monitor' && targetTeamId !== session.teamId) {
      return NextResponse.json({ error: 'Unauthorized to view other teams' }, { status: 403 })
    }

    const status = await getTeamCheckInStatus(targetTeamId)
    return NextResponse.json({ status })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Check-in status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
