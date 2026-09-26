import { db } from '../../../../lib/db/client'
import { teams, players, registrationSettings, auditLog } from '../../../../lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { rateLimit } from '../../../../lib/security/rate-limit'
import { assertSameOrigin } from '../../../../lib/security/csrf'
import { generatePlayerCode } from '../../../../lib/registration/player-code'
import { createSession, sealSessionId } from '../../../../lib/auth/session'
import { checkInPlayer } from '../../../../lib/gating'
import { cookies } from 'next/headers'
import { z } from 'zod'

const registerSchema = z.object({
  firstName: z.string().min(1),
  // Real NITW roll numbers carry letters in the tail (e.g. 24MAB0A29), which
  // the previous /^[0-9]{2}[A-Z]{3}[0-9]{4}$/ rejected outright - no actual
  // student could register. Roll format is not a security boundary here, so
  // accept any reasonable alphanumeric roll and normalise case/whitespace so
  // it matches at login.
  rollNumber: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{4,20}$/, 'Enter your roll number, e.g. 24MAB0A29')),
  // Team codes are seeded as an exact "SKELD-01" format, but a phone
  // keyboard will happily produce "skeld-01", "skeld 01", or a stray
  // trailing space - all real, all currently failing the exact-match lookup
  // below with the same unhelpful "Team not found" regardless of cause.
  teamCode: z.string().transform((s) => s.trim().toUpperCase()),
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
        
      // Exact match first (cheap, covers the common case), then fall back to
      // a punctuation-insensitive match - a phone keyboard will happily
      // produce "SKELD01" or "SKELD 01" for a team actually coded
      // "SKELD-01", and there are only ever ~25 teams, so scanning all of
      // them to compare normalised forms costs nothing.
      const exactMatch = await tx.select().from(teams).where(eq(teams.code, body.teamCode))
      let team: (typeof exactMatch)[number] | undefined = exactMatch[0]
      if (!team) {
        const normalize = (s: string) => s.replace(/[^A-Z0-9]/g, '')
        const target = normalize(body.teamCode)
        const allTeams = await tx.select().from(teams)
        team = allTeams.find((t) => normalize(t.code) === target)
      }
      if (!team) throw new Error(`Team code "${body.teamCode}" not found. Double-check it with your organizer.`)
        
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
      
      return { playerCode, teamName: team.name, playerId: player.id, teamId: team.id, isLeader: player.isLeader }
    })

    // Registering in person at the venue IS arriving, so treat it as
    // check-in and log the player straight into their own session instead
    // of making them copy a code, then go log in, then confirm a separate
    // "check in" button - three steps for something that already happened
    // the moment they filled this form out on their own phone.
    await checkInPlayer(result.playerId)

    const session = await db.transaction(async (tx) =>
      createSession(tx, { playerId: result.playerId, role: result.isLeader ? 'leader' : 'player', teamId: result.teamId })
    )
    const token = await sealSessionId(session.id)
    const c = await cookies()
    c.set('session', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 12 * 60 * 60 })

    return Response.json({ playerCode: result.playerCode, teamName: result.teamName })
  } catch (err: any) {
    return new Response(err.message, { status: 400 })
  }
}
