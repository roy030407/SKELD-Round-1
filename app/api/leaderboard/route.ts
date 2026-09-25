import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/scoring/ledger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const leaderboard = await getLeaderboard()
    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to compute leaderboard' },
      { status: 500 }
    )
  }
}
