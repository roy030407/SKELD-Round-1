import { db } from '../../../../lib/db/client'
import { requireSession } from '../../../../lib/auth/guard'
import { revokeSession } from '../../../../lib/auth/session'
import { assertSameOrigin } from '../../../../lib/security/csrf'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const session = await requireSession(req, db)
    await db.transaction(async (tx) => {
      await revokeSession(tx, session.id)
    })
    
    const c = await cookies()
    c.delete('session')
    return Response.json({ ok: true })
  } catch (err: any) {
    return new Response(err.message, { status: 401 })
  }
}
