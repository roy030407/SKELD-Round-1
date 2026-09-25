import { db } from '../../../../../lib/db/client'
import { staffAccounts } from '../../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '../../../../../lib/security/rate-limit'
import { assertSameOrigin } from '../../../../../lib/security/csrf'
import { verifyPassword } from '../../../../../lib/auth/password'
import { createSession, sealSessionId, revokeAllForStaff } from '../../../../../lib/auth/session'
import { z } from 'zod'
import { cookies } from 'next/headers'

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
})

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json())
    assertSameOrigin(req)
    const ip = req.headers.get('x-forwarded-for') || 'ip'
    await rateLimit(db, `login-staff:${ip}`, 10)
    
    const token = await db.transaction(async (tx) => {
      const [staff] = await tx.select().from(staffAccounts).where(eq(staffAccounts.username, body.username))
      if (!staff) throw new Error('Invalid credentials')
        
      const valid = await verifyPassword(body.password, staff.passwordHash)
      if (!valid) throw new Error('Invalid credentials')
      
      await revokeAllForStaff(tx, staff.id)
      const session = await createSession(tx, {
        staffId: staff.id,
        role: staff.role
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
