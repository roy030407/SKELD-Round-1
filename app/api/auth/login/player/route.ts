import { db } from '../../../../../lib/db/client'
import { players, teams } from '../../../../../lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { rateLimit } from '../../../../../lib/security/rate-limit'
import { assertSameOrigin } from '../../../../../lib/security/csrf'
import { createSession, sealSessionId, revokeAllForPlayer } from '../../../../../lib/auth/session'
import { z } from 'zod'
import { cookies } from 'next/headers'

const loginSchema = z.object({
  playerCode: z.string(),
  rollNumber: z.string()
})

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json())
    assertSameOrigin(req)
    const ip = req.headers.get('x-forwarded-for') || 'ip'
    await rateLimit(db, `login:${ip}`, 10)
    
    const token = await db.transaction(async (tx) => {
      const [player] = await tx.select().from(players).where(and(eq(players.playerCode, body.playerCode), eq(players.rollNumber, body.rollNumber)))
      if (!player) throw new Error('Invalid credentials')
      
      await revokeAllForPlayer(tx, player.id)
      const session = await createSession(tx, {
        playerId: player.id,
        role: player.isLeader ? 'leader' : 'player',
        teamId: player.teamId
      })
      return sealSessionId(session.id)
    })
    
    const c = await cookies()
    c.set('session', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 12 * 60 * 60 })
    return Response.json({ ok: true })
  } catch (err: any) {
    return new Response(err.message, { status: 401 })
  }
}
