import { db } from '../../../../lib/db/client'
import { teams, players } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '../../../../lib/security/rate-limit'

export async function GET(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'ip'
    await rateLimit(db, `team-lookup:${ip}`, 400)
    
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    if (!code) throw new Error('Code required')
      
    const [team] = await db.select().from(teams).where(eq(teams.code, code))
    if (!team) return new Response('Not found', { status: 404 })
      
    const members = await db.select().from(players).where(eq(players.teamId, team.id))
    
    return Response.json({ team: { id: team.id, name: team.name, memberCount: members.length } })
  } catch (err: any) {
    return new Response(err.message, { status: 400 })
  }
}
