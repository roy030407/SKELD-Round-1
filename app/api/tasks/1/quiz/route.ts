import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { registrationSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** Public GET — returns current quiz link + lifecycle flags */
export async function GET(req: NextRequest) {
  try {
    await requireSession(req)
    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))

    return NextResponse.json({
      quizLink: settings?.quizLink ?? 'https://kahoot.it',
      round1Declared: settings?.round1Declared ?? false,
      bettingOpen: settings?.bettingOpen ?? false,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
