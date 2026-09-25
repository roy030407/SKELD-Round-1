import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { kahootStaging, teams } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const nicknameSchema = z.object({
  nickname: z.string().min(2).max(40),
})

// POST: Leader submits their Kahoot screen nickname
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    requireRole(session, ['leader', 'admin'])

    if (!session.teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = nicknameSchema.parse(body)

    const [staging] = await db
      .insert(kahootStaging)
      .values({
        teamId: session.teamId,
        kahootNickname: parsed.nickname,
      })
      .returning()

    return NextResponse.json({ success: true, staging })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Kahoot nickname staging error:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit nickname' }, { status: 400 })
  }
}

// GET: Admin/Monitor views all staged Kahoot nicknames
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    requireRole(session, ['admin', 'monitor'])

    const allStaging = await db.select().from(kahootStaging)
    const allTeams = await db.select().from(teams)
    const teamMap = new Map(allTeams.map((t) => [t.id, t]))

    const list = allStaging.map((s) => ({
      id: s.id,
      nickname: s.kahootNickname,
      matched: s.matchedByAdmin,
      team: s.teamId ? teamMap.get(s.teamId) : null,
    }))

    return NextResponse.json({ stagingList: list })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
