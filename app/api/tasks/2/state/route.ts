import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { players, teams } from '@/lib/db/schema'
import { CIPHER_FRAGMENTS } from '@/lib/game/cipher-data'
import { eq } from 'drizzle-orm'
import { canEnterTask } from '@/lib/gating'

/**
 * GET /api/tasks/2/state
 * Returns the player's assigned cipher fragment based on their position in the team.
 * P001 → fragment[0], P002 → fragment[1], ..., P006 → fragment[5]
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!session.playerId || !session.teamId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    // This endpoint hands out the actual cipher text, so it needs the same
    // gate as /submit - without it a team could read and pre-solve their
    // fragments before Task 2 was opened.
    const gate = await canEnterTask(session.teamId, 2)
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 403 })
    }

    // Fragment assignment is by the player's position within their own team,
    // ordered by registration. It deliberately does NOT parse the player code:
    // codes encode the team as well as the member (e.g. P1203 for SKELD-12's
    // third member), so digit-extraction produced 1203 and clamped every
    // member of every team onto the same final fragment.
    const roster = await db
      .select({ id: players.id, playerCode: players.playerCode })
      .from(players)
      .where(eq(players.teamId, session.teamId))
      .orderBy(players.registeredAt, players.id)

    const position = roster.findIndex((p) => p.id === session.playerId)
    if (position === -1) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const player = roster[position]
    const fragmentIndex = position % CIPHER_FRAGMENTS.length

    const frag = CIPHER_FRAGMENTS[fragmentIndex]

    return NextResponse.json({
      fragmentIndex: frag.fragmentIndex,
      encrypted: frag.encrypted,
      cipherName: frag.cipherName,
      clue: frag.clue,
      playerCode: player.playerCode,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
