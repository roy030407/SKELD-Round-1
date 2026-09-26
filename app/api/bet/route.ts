import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { bets, registrationSettings, teams, players } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const betSchema = z.object({
  predictedRank: z.number().int().min(1).max(25),
})

/** GET — return whether this team has placed a bet and current betting status */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)

    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    const bettingOpen = settings?.bettingOpen ?? false
    const round1Declared = settings?.round1Declared ?? false

    if (!session.teamId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    const [existing] = await db.select().from(bets).where(eq(bets.teamId, session.teamId))

    return NextResponse.json({
      bettingOpen,
      round1Declared,
      bet: existing ? { predictedRank: existing.predictedRank, placedAt: existing.placedAt } : null,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

/** POST — place a rank bet (leader only, once per team, betting must be open) */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!['leader', 'player'].includes(session.role)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    if (!session.teamId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = betSchema.parse(body)

    // Gate: betting must be open
    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    if (!settings?.bettingOpen) {
      return NextResponse.json({ error: 'Betting is not open yet. Wait for Round 1 results.' }, { status: 403 })
    }

    // Insert (unique constraint on teamId prevents double-bet)
    const result = await db
      .insert(bets)
      .values({
        teamId: session.teamId,
        predictedRank: parsed.predictedRank,
      })
      .onConflictDoNothing({ target: bets.teamId })
      .returning()

    if (!result.length) {
      return NextResponse.json({ error: 'Your team has already placed a bet.' }, { status: 409 })
    }

    return NextResponse.json({ success: true, predictedRank: parsed.predictedRank })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
