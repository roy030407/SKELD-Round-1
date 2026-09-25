import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole } from '@/lib/auth/guard'
import { canEnterTask } from '@/lib/gating'
import { db } from '@/lib/db/client'
import { taskGates } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const gateActionSchema = z.object({
  taskNumber: z.number().int().min(1).max(4),
  action: z.enum(['open', 'close']),
  teamId: z.string().uuid().optional(),
})

// GET /api/tasks/gate?taskNumber=1 - check if user's team can enter
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    if (!session.teamId) {
      return NextResponse.json({ error: 'Player has no assigned team' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const taskNum = parseInt(searchParams.get('taskNumber') ?? '1', 10)

    const result = await canEnterTask(session.teamId, taskNum)
    return NextResponse.json(result)
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Task gate check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tasks/gate - Admin opens or closes task gates
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    requireRole(session, ['admin'])

    const body = await request.json()
    const parsed = gateActionSchema.parse(body)

    if (parsed.action === 'open') {
      // Open gate
      if (parsed.teamId) {
        await db
          .insert(taskGates)
          .values({
            teamId: parsed.teamId,
            taskNumber: parsed.taskNumber,
            openedAt: new Date(),
            openedBy: session.staffId,
          })
          .onConflictDoUpdate({
            target: [taskGates.teamId, taskGates.taskNumber],
            set: { openedAt: new Date(), closedAt: null, openedBy: session.staffId },
          })
      }
    } else {
      // Close gate
      if (parsed.teamId) {
        await db
          .insert(taskGates)
          .values({
            teamId: parsed.teamId,
            taskNumber: parsed.taskNumber,
            closedAt: new Date(),
            openedBy: session.staffId,
          })
          .onConflictDoUpdate({
            target: [taskGates.teamId, taskGates.taskNumber],
            set: { closedAt: new Date(), openedAt: null },
          })
      }
    }

    return NextResponse.json({ success: true, action: parsed.action, taskNumber: parsed.taskNumber })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Task gate control error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
