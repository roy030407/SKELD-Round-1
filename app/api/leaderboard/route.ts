import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard, getTeamScoreSummaries } from '@/lib/scoring/ledger'
import { cookies } from 'next/headers'
import { openSessionId, loadSession } from '@/lib/auth/session'
import { db } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const c = await cookies()
    const token = c.get('session')?.value
    let session: any = null
    if (token) {
      const sid = await openSessionId(token)
      if (sid) {
        session = await loadSession(db, sid)
      }
    }

    const isStaff = session && ['admin', 'monitor', 'display'].includes(session.role)
    const url = new URL(req.url)
    const isProjector = url.searchParams.get('source') === 'projector'

    const fullLeaderboard = await getLeaderboard()

    // If staff or projector display, provide the full live leaderboard
    if (isStaff || isProjector) {
      return NextResponse.json({
        leaderboard: fullLeaderboard,
        hiddenForPlayers: false,
      })
    }

    // For personal player devices: conceal other teams' ranks & standings
    let myTeamStats: any = null
    if (session?.teamId) {
      myTeamStats = fullLeaderboard.find((t) => t.teamId === session.teamId) || null
    }

    return NextResponse.json({
      hiddenForPlayers: true,
      message: 'CLASSIFIED: Live leaderboard is displayed exclusively on the NAB Main Auditorium Projector Screen.',
      myTeam: myTeamStats
        ? {
            teamCode: myTeamStats.teamCode,
            teamName: myTeamStats.teamName,
            totalPoints: myTeamStats.totalPoints,
            task1Points: myTeamStats.task1Points,
            task2Points: myTeamStats.task2Points,
            task3Points: myTeamStats.task3Points,
            task4Points: myTeamStats.task4Points,
            betBonus: myTeamStats.betBonus,
          }
        : null,
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to compute leaderboard' },
      { status: 500 }
    )
  }
}
