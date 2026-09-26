import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { registrationSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ visible: z.boolean() })

/**
 * GET/POST /api/admin/leaderboard-visibility
 * Admin-only toggle for whether the projector (/display, role=display) shows
 * live standings or a holding screen. Lets admin reveal results at a chosen
 * moment instead of the projector updating continuously through the event.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])
    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    return NextResponse.json({ visible: settings?.leaderboardVisible ?? false })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])
    const { visible } = bodySchema.parse(await req.json())

    await db
      .insert(registrationSettings)
      .values({ id: 1, leaderboardVisible: visible })
      .onConflictDoUpdate({
        target: registrationSettings.id,
        set: { leaderboardVisible: visible },
      })

    return NextResponse.json({ success: true, visible })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
