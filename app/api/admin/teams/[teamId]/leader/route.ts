import { db } from '../../../../../../lib/db/client'
import { players, auditLog } from '../../../../../../lib/db/schema'
import { requireSessionAndRole } from '../../../../../../lib/auth/guard'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { assertSameOrigin } from '../../../../../../lib/security/csrf'

const setLeaderSchema = z.object({
  playerId: z.string().uuid()
})

export async function POST(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])
    assertSameOrigin(req)
    
    const body = setLeaderSchema.parse(await req.json())
    const { teamId } = await params
    
    await db.transaction(async (tx) => {
      // Unset all leaders in team
      await tx.update(players)
        .set({ isLeader: false })
        .where(eq(players.teamId, teamId))
        
      // Set new leader
      const [updated] = await tx.update(players)
        .set({ isLeader: true })
        .where(and(eq(players.id, body.playerId), eq(players.teamId, teamId)))
        .returning()
        
      if (!updated) throw new Error('Player not found or not in team')
        
      await tx.insert(auditLog).values({
        actorId: session.staffId,
        actorRole: session.role,
        action: 'SET_LEADER',
        targetType: 'player',
        targetId: body.playerId,
        newValue: updated
      })
    })
    
    return Response.json({ ok: true })
  } catch (err: any) {
    if (err.status) return new Response(err.message, { status: err.status })
    return new Response(err.message, { status: 400 })
  }
}
