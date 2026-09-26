import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { registrationSettings, teams, scoreEvents, taskSubmissions } from '@/lib/db/schema'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateBombDefusalSchema = z.object({
  bombDefusalLink: z.string().url().optional(),
  scores: z.array(
    z.object({
      teamId: z.string().uuid(),
      points: z.number().int().min(0),
    })
  ).optional(),
})

/**
 * GET /api/admin/bomb-defusal
 * Task 3 (Bomb Defusal) is an external site, scored by admin manual entry —
 * same pattern as /api/admin/quiz, but with no "declare results" step, since
 * teams finish the external site at different times rather than all at once.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])

    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    const allTeams = await db.select().from(teams)
    const allScoreEvents = await db.select().from(scoreEvents)
    const allSubmissions = await db.select().from(taskSubmissions).where(eq(taskSubmissions.taskNumber, 3))

    const t3Scores = allScoreEvents.filter((e) => e.taskNumber === 3)
    const scoreMap = new Map<string, number>()
    for (const s of t3Scores) {
      scoreMap.set(s.teamId, (scoreMap.get(s.teamId) ?? 0) + s.points)
    }

    const completedSet = new Set(allSubmissions.map((s) => s.teamId))

    const teamList = allTeams.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      points: scoreMap.get(t.id) ?? 0,
      completed: completedSet.has(t.id),
    }))

    return NextResponse.json({
      bombDefusalLink: settings?.bombDefusalLink ?? 'https://vedant-jadhav-23.github.io/BombDefusalTask/',
      teams: teamList,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])
    const body = await req.json()
    const parsed = updateBombDefusalSchema.parse(body)

    // 1. Update bomb defusal link if provided
    if (parsed.bombDefusalLink) {
      await db
        .insert(registrationSettings)
        .values({ id: 1, bombDefusalLink: parsed.bombDefusalLink })
        .onConflictDoUpdate({
          target: registrationSettings.id,
          set: { bombDefusalLink: parsed.bombDefusalLink },
        })
    }

    // 2. Save scores if provided. Each save records the score event AND marks
    // the team's Task 3 submission complete, which immediately unlocks Task 4
    // for that specific team (no separate "declare results" step needed,
    // since teams finish the external site at different times).
    if (parsed.scores && parsed.scores.length > 0) {
      for (const s of parsed.scores) {
        await recordScoreEvent({
          teamId: s.teamId,
          taskNumber: 3,
          eventType: 'TASK_3_BOMB_DEFUSAL',
          points: s.points,
          reason: 'Bomb Defusal Score (manual entry)',
          idempotencyKey: `bomb-defusal-t3-${s.teamId}`,
          createdBy: session.staffId,
        })

        await db
          .insert(taskSubmissions)
          .values({
            teamId: s.teamId,
            taskNumber: 3,
            submittedBy: session.staffId,
          })
          .onConflictDoNothing({
            target: [taskSubmissions.teamId, taskSubmissions.taskNumber],
          })
      }
    }

    return NextResponse.json({ success: true, message: 'Bomb Defusal scores updated successfully' })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
