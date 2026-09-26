import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/scoring/ledger'
import { requireSession } from '@/lib/auth/guard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Server is the sole authority on who sees the full leaderboard: a real,
    // valid session is required (no unauthenticated access), and the
    // client-supplied `?source=projector` bypass has been removed entirely —
    // the projector view is authorized exclusively via a real `display` role
    // session, same as staff.
    const session = await requireSession(req)

    const isStaff = ['admin', 'monitor', 'display'].includes(session.role)

    const fullLeaderboard = await getLeaderboard()

    // Only staff (admin/monitor) or the display role (projector screen) get
    // the full live leaderboard.
    if (isStaff) {
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
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to compute leaderboard' },
      { status: 500 }
    )
  }
}
