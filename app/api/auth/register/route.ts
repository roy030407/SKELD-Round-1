import { db } from '../../../../lib/db/client'
import { teams, players, registrationSettings, auditLog } from '../../../../lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { rateLimit } from '../../../../lib/security/rate-limit'
import { assertSameOrigin } from '../../../../lib/security/csrf'
import { generatePlayerCode } from '../../../../lib/registration/player-code'
import { z } from 'zod'

const registerSchema = z.object({
  firstName: z.string().min(1),
  rollNumber: z.string().regex(/^[0-9]{2}[A-Z]{3}[0-9]{4}$/),
  teamCode: z.string(),
  email: z.string().email()
})

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json())
    assertSameOrigin(req)
    const ip = (req.headers.get('x-forwarded-for') || 'ip').split(',')[0].trim()
    // See the note in the player login route: 5/min per IP meant only the
    // first five people on the venue WiFi could ever register.
    await rateLimit(db, `register:roll:${body.rollNumber}`, 5)
    await rateLimit(db, `register:ip:${ip}`, 400)
    
    const result = await db.transaction(async (tx) => {
      const [settings] = await tx.select().from(registrationSettings).where(eq(registrationSettings.id, 1))
      if (settings && !settings.isOpen) throw new Error('Registration is closed')
        
      const [team] = await tx.select().from(teams).where(eq(teams.code, body.teamCode))
      if (!team) throw new Error('Team not found')
        
      const members = await tx.select().from(players).where(eq(players.teamId, team.id))
      if (members.length >= 6) throw new Error('Team is full')
        
      const exists = await tx.select().from(players).where(and(eq(players.teamId, team.id), eq(players.rollNumber, body.rollNumber)))
      if (exists.length > 0) throw new Error('Roll number already registered')
        
      const playerCode = await generatePlayerCode(tx, team.id)
      
      // The first person to register for a team becomes its leader. Betting
      // is leader-only, and nothing else ever set this flag, so without it
      // no team could place a bet at all. Admin can reassign later via
      // /api/admin/teams/[teamId]/leader.
      const [player] = await tx.insert(players).values({
        teamId: team.id,
        playerCode,
        firstName: body.firstName,
        rollNumber: body.rollNumber,
        email: body.email,
        isLeader: members.length === 0
      }).returning()
      
      await tx.insert(auditLog).values({
        action: 'REGISTER_PLAYER',
        targetType: 'player',
        targetId: player.id,
        newValue: player
      })
      
      return { playerCode, teamName: team.name }
    })
    
    return Response.json(result)
  } catch (err: any) {
    return new Response(err.message, { status: 400 })
  }
}
