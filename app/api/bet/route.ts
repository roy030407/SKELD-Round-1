import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { bets, registrationSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const placeBetSchema = z.object({
  predictedRank: z.number().int().min(1).max(25),
})

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req, db)
    if (!session.teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    const [existingBet] = await db.select().from(bets).where(eq(bets.teamId, session.teamId))

    return NextResponse.json({
      round1Declared: settings?.round1Declared ?? false,
      bettingOpen: settings?.bettingOpen ?? false,
      currentBet: existingBet ? existingBet.predictedRank : null,
      placedAt: existingBet ? existingBet.placedAt : null,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req, db)
    if (!session.teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    if (!settings?.round1Declared) {
      return NextResponse.json(
        { error: 'Betting is locked until Round 1 Quiz results are declared by organizers.' },
        { status: 403 }
      )
    }

    if (!settings?.bettingOpen) {
      return NextResponse.json(
        { error: 'Betting has been closed by organizers for this phase.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = placeBetSchema.parse(body)

    const [newBet] = await db
      .insert(bets)
      .values({
        teamId: session.teamId,
        predictedRank: parsed.predictedRank,
      })
      .onConflictDoUpdate({
        target: bets.teamId,
        set: {
          predictedRank: parsed.predictedRank,
          placedAt: new Date(),
        },
      })
      .returning()

    return NextResponse.json({
      success: true,
      predictedRank: newBet.predictedRank,
      message: `Bet recorded! Your team predicted Rank #${newBet.predictedRank}.`,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
