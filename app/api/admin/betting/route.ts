import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { bets, teams, registrationSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const toggleBettingSchema = z.object({
  bettingOpen: z.boolean(),
})

export async function GET(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])

    const allBets = await db.select().from(bets)
    const allTeams = await db.select().from(teams)
    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))

    const teamMap = new Map<string, { code: string; name: string }>()
    for (const t of allTeams) {
      teamMap.set(t.id, { code: t.code, name: t.name })
    }

    const betsList = allBets.map((b) => ({
      id: b.id,
      teamId: b.teamId,
      teamCode: teamMap.get(b.teamId)?.code ?? 'UNKNOWN',
      teamName: teamMap.get(b.teamId)?.name ?? 'Unknown Team',
      predictedRank: b.predictedRank,
      placedAt: b.placedAt,
    }))

    return NextResponse.json({
      bettingOpen: settings?.bettingOpen ?? false,
      round1Declared: settings?.round1Declared ?? false,
      totalBets: betsList.length,
      bets: betsList,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])
    const body = await req.json()
    const parsed = toggleBettingSchema.parse(body)

    await db
      .insert(registrationSettings)
      .values({ id: 1, bettingOpen: parsed.bettingOpen })
      .onConflictDoUpdate({
        target: registrationSettings.id,
        set: { bettingOpen: parsed.bettingOpen },
      })

    return NextResponse.json({
      success: true,
      bettingOpen: parsed.bettingOpen,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
