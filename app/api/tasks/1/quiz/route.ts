import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { registrationSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [settings] = await db.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
    return NextResponse.json({
      quizLink: settings?.quizLink ?? 'https://kahoot.it',
      round1Declared: settings?.round1Declared ?? false,
      bettingOpen: settings?.bettingOpen ?? false,
    })
  } catch (error) {
    return NextResponse.json(
      { quizLink: 'https://kahoot.it', round1Declared: false, bettingOpen: false },
      { status: 200 }
    )
  }
}
