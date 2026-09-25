import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { createT4GameSession } from '@/lib/game/t4-engine'

export async function POST(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])
    const result = await createT4GameSession()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
