import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireRole } from '@/lib/auth/guard'
import { createGameSession } from '@/lib/game/t1-engine'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const sessionCreateSchema = z.object({
  sessionNumber: z.number().int().min(1).max(2),
  isBlankMode: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request, db)
    requireRole(session, ['admin'])

    const body = await request.json().catch(() => ({}))
    const parsed = sessionCreateSchema.parse(body)

    const result = await createGameSession(
      parsed.sessionNumber,
      parsed.isBlankMode ?? false
    )

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    if (error.status) {
      return new NextResponse(error.message, { status: error.status })
    }
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start game session' },
      { status: 400 }
    )
  }
}
