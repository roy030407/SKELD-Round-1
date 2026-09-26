import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { registrationSettings, teams, scoreEvents, taskSubmissions } from '@/lib/db/schema'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateQuizSchema = z.object({
  quizLink: z.string().url().optional(),
  scores: z.array(
    z.object({
      teamId: z.string().uuid(),
      points: z.number().int().min(0),
    })
  ).optional(),
  declareResults: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])

    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    const allTeams = await db.select().from(teams)
    const allScoreEvents = await db.select().from(scoreEvents)

    const t1Scores = allScoreEvents.filter((e) => e.taskNumber === 1)
    const scoreMap = new Map<string, number>()
    for (const s of t1Scores) {
      scoreMap.set(s.teamId, (scoreMap.get(s.teamId) ?? 0) + s.points)
    }

    const teamList = allTeams.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      points: scoreMap.get(t.id) ?? 0,
    }))

    return NextResponse.json({
      quizLink: settings?.quizLink ?? 'https://wayground.com/join?gc=940315&source=liveDashboard',
      round1Declared: settings?.round1Declared ?? false,
      bettingOpen: settings?.bettingOpen ?? false,
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
    const parsed = updateQuizSchema.parse(body)

    // 1. Update quiz link if provided
    if (parsed.quizLink) {
      await db
        .insert(registrationSettings)
        .values({ id: 1, quizLink: parsed.quizLink })
        .onConflictDoUpdate({
          target: registrationSettings.id,
          set: { quizLink: parsed.quizLink },
        })
    }

    // 2. Save scores if provided
    if (parsed.scores && parsed.scores.length > 0) {
      for (const s of parsed.scores) {
        // Record score event for Task 1
        await recordScoreEvent({
          teamId: s.teamId,
          taskNumber: 1,
          eventType: 'TASK_1_QUIZ',
          points: s.points,
          reason: 'Round 1 Quiz Score',
          idempotencyKey: `quiz-r1-${s.teamId}`,
          createdBy: session.staffId,
        })

        // Also mark task 1 submitted so gating allows task 2
        await db
          .insert(taskSubmissions)
          .values({
            teamId: s.teamId,
            taskNumber: 1,
            submittedBy: session.staffId,
          })
          .onConflictDoNothing({
            target: [taskSubmissions.teamId, taskSubmissions.taskNumber],
          })
      }
    }

    // 3. Declare results and open betting if requested
    if (parsed.declareResults) {
      await db
        .insert(registrationSettings)
        .values({
          id: 1,
          round1Declared: true,
          bettingOpen: true,
        })
        .onConflictDoUpdate({
          target: registrationSettings.id,
          set: {
            round1Declared: true,
            bettingOpen: true,
          },
        })
    }

    return NextResponse.json({ success: true, message: 'Round 1 Quiz state updated successfully' })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
