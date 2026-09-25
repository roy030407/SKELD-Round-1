import { db } from '../../../../../lib/db/client'
import { auditLog } from '../../../../../lib/db/schema'
import { requireSessionAndRole } from '../../../../../lib/auth/guard'
import { revokeAllForPlayer } from '../../../../../lib/auth/session'
import { z } from 'zod'
import { assertSameOrigin } from '../../../../../lib/security/csrf'

const revokeSchema = z.object({
  targetPlayerId: z.string().uuid()
})

export async function POST(req: Request) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])
    assertSameOrigin(req)
    
    const body = revokeSchema.parse(await req.json())
    
    await db.transaction(async (tx) => {
      await revokeAllForPlayer(tx, body.targetPlayerId)
      
      await tx.insert(auditLog).values({
        actorId: session.staffId,
        actorRole: session.role,
        action: 'REVOKE_SESSION',
        targetType: 'player',
        targetId: body.targetPlayerId
      })
    })
    
    return Response.json({ ok: true })
  } catch (err: any) {
    if (err.status) return new Response(err.message, { status: err.status })
    return new Response(err.message, { status: 400 })
  }
}
