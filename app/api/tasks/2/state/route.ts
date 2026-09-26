import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { players, teams } from '@/lib/db/schema'
import { CIPHER_FRAGMENTS } from '@/lib/game/cipher-data'
import { eq } from 'drizzle-orm'

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

    // Get this player's record to determine their position (player code suffix)
    const [player] = await db.select().from(players).where(eq(players.id, session.playerId))
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    // playerCode format: P001..P006 → extract number 1..6 → index 0..5
    const codeNum = parseInt(player.playerCode.replace(/\D/g, ''), 10)
    const fragmentIndex = Math.max(0, Math.min(5, codeNum - 1))

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
