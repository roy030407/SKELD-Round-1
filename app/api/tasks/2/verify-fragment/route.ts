import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { DEFAULT_CIPHER_MISSION, normalizeSentence } from '@/lib/game/cipher-data'
import { z } from 'zod'

const verifySchema = z.object({
  playerIndex: z.number().int().min(1).max(6),
  answer: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    await requireSession(req, db)
    const body = await req.json()
    const parsed = verifySchema.parse(body)

    const fragment = DEFAULT_CIPHER_MISSION.fragments.find((f) => f.playerIndex === parsed.playerIndex)
    if (!fragment) {
      return NextResponse.json({ error: 'Fragment not found' }, { status: 404 })
    }

    const isMatch = normalizeSentence(parsed.answer) === normalizeSentence(fragment.decryptedText)

    if (isMatch) {
      return NextResponse.json({
        correct: true,
        decryptedText: fragment.decryptedText,
        message: `✓ Decryption verified! Your fragment is: "${fragment.decryptedText}". Report this to your Team Leader!`,
      })
    } else {
      return NextResponse.json({
        correct: false,
        message: 'Incorrect decryption. Check your cipher shift/pattern and try again.',
      })
    }
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
