import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { bets, teams, registrationSettings } from '@/lib/db/schema'
import { getLeaderboard } from '@/lib/scoring/ledger'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { eq, inArray } from 'drizzle-orm'

/** GET — list all bets with team info */
export async function GET(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])

    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    const allBets = await db.select().from(bets)
    const allTeams = await db.select().from(teams)
    const teamMap = new Map(allTeams.map((t) => [t.id, t]))

    const betsWithTeams = allBets.map((b) => {
      const team = teamMap.get(b.teamId)
      return {
        teamId: b.teamId,
        teamCode: team?.code ?? '?',
        teamName: team?.name ?? '?',
        predictedRank: b.predictedRank,
        placedAt: b.placedAt,
      }
    })

    return NextResponse.json({
      bettingOpen: settings?.bettingOpen ?? false,
      betsSettled: settings?.betsSettled ?? false,
      bets: betsWithTeams,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

/** POST — toggle bettingOpen */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])
    const body = await req.json()
    const { bettingOpen } = body as { bettingOpen: boolean }

    await db
      .insert(registrationSettings)
      .values({ id: 1, bettingOpen: bettingOpen ?? false })
      .onConflictDoUpdate({
        target: registrationSettings.id,
        set: { bettingOpen: bettingOpen ?? false },
      })

    return NextResponse.json({ success: true, bettingOpen })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
