import { db } from '../../../../lib/db/client'
import { teams, auditLog } from '../../../../lib/db/schema'
import { requireSessionAndRole } from '../../../../lib/auth/guard'
import { z } from 'zod'
import { count } from 'drizzle-orm'
import { assertSameOrigin } from '../../../../lib/security/csrf'

const createTeamSchema = z.object({
  name: z.string().min(2).max(50)
})

export async function POST(req: Request) {
  try {
    const session = await requireSessionAndRole(req, db, ['admin'])
    assertSameOrigin(req)
    
    const body = createTeamSchema.parse(await req.json())
    
    const result = await db.transaction(async (tx) => {
      const [teamsCount] = await tx.select({ count: count() }).from(teams)
      const nextNum = (teamsCount.count + 1).toString().padStart(2, '0')
      const code = `SKELD-${nextNum}`
      
      const [team] = await tx.insert(teams).values({
        code,
        name: body.name,
        createdBy: session.staffId
      }).returning()
      
      await tx.insert(auditLog).values({
        actorId: session.staffId,
        actorRole: session.role,
        action: 'CREATE_TEAM',
        targetType: 'team',
        targetId: team.id,
        newValue: team
      })
      
      return team
    })
    
    return Response.json({ team: result })
  } catch (err: any) {
    if (err.status) return new Response(err.message, { status: err.status })
    return new Response(err.message, { status: 400 })
  }
}

export async function GET(req: Request) {
  try {
    await requireSessionAndRole(req, db, ['admin'])
    const allTeams = await db.select().from(teams)
    return Response.json({ teams: allTeams })
  } catch (err: any) {
    if (err.status) return new Response(err.message, { status: err.status })
    return new Response(err.message, { status: 400 })
  }
}
