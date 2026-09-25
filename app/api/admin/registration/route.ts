import { db } from '../../../../lib/db/client'
import { registrationSettings, auditLog } from '../../../../lib/db/schema'
import { requireSessionAndRole } from '../../../../lib/auth/guard'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { assertSameOrigin } from '../../../../lib/security/csrf'

const regSchema = z.object({
  action: z.enum(['lock', 'unlock', 'approve-late']),
  playerId: z.string().uuid().optional()
})

export async function POST(req: Request) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])
    assertSameOrigin(req)
    
    const body = regSchema.parse(await req.json())
    
    await db.transaction(async (tx) => {
      if (body.action === 'lock') {
        await tx.update(registrationSettings).set({ isOpen: false, lockedAt: new Date(), lockedBy: session.staffId }).where(eq(registrationSettings.id, 1))
      } else if (body.action === 'unlock') {
        await tx.update(registrationSettings).set({ isOpen: true, lockedAt: null, lockedBy: null }).where(eq(registrationSettings.id, 1))
      } else if (body.action === 'approve-late') {
        // Late approval Logic in another module, just log it here
      }
      
      await tx.insert(auditLog).values({
        actorId: session.staffId,
        actorRole: session.role,
        action: `REGISTRATION_${body.action.toUpperCase()}`,
        targetType: 'settings',
        targetId: '1'
      })
    })
    
    return Response.json({ ok: true })
  } catch (err: any) {
    if (err.status) return new Response(err.message, { status: err.status })
    return new Response(err.message, { status: 400 })
  }
}
