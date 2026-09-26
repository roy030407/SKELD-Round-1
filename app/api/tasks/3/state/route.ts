import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { canEnterTask } from '@/lib/gating'
import { db } from '@/lib/db/client'
import { registrationSettings, taskSubmissions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/tasks/3/state
 * Task 3 (Bomb Defusal) is an external, standalone site (no in-app puzzle,
 * mirrors Task 1's external-quiz-link pattern). Returns the link plus whether
 * this team's completion has already been recorded by an admin.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!session.teamId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    const gateCheck = await canEnterTask(session.teamId, 3)
    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 403 })
    }

    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    const [submission] = await db
      .select()
      .from(taskSubmissions)
      .where(and(eq(taskSubmissions.teamId, session.teamId), eq(taskSubmissions.taskNumber, 3)))

    return NextResponse.json({
      bombDefusalLink: settings?.bombDefusalLink ?? 'https://vedant-jadhav-23.github.io/BombDefusalTask/',
      completed: !!submission,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
