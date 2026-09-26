import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { createGameSession } from '@/lib/game/t4-engine'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const sessionCreateSchema = z.object({
  sessionNumber: z.number().int().min(1).max(2).optional(),
  isBlankMode: z.boolean().optional(),
})

/**
 * POST /api/tasks/4/session
 * Admin-only: creates a new Task 4 shuffling session. Shuffles all
 * checked-in players into cross-team tables of 6, assigning exactly one
 * imposter per table with a real word (or BLANK, per session mode).
 */
export async function POST(request: NextRequest) {
  try {
    await requireSessionAndRole(request, db, ['admin'])

    const body = await request.json().catch(() => ({}))
    const parsed = sessionCreateSchema.parse(body)

    const result = await createGameSession(parsed.sessionNumber, parsed.isBlankMode ?? false)

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Task 4 session creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start Task 4 session' },
      { status: 400 }
    )
  }
}
