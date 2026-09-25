import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { players, taskSubmissions } from '@/lib/db/schema'
import { DEFAULT_CIPHER_MISSION } from '@/lib/game/cipher-data'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req, db)
    if (!session.teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // 1. Get all players for this team ordered by playerCode
    const teamPlayers = await db
      .select()
      .from(players)
      .where(eq(players.teamId, session.teamId))

    teamPlayers.sort((a, b) => a.playerCode.localeCompare(b.playerCode))

    // 2. Identify caller's index (1 to 6)
    const myIndex = teamPlayers.findIndex((p) => p.id === session.playerId)
    const playerIndex = myIndex !== -1 ? (myIndex % 6) + 1 : 1

    // 3. Get fragment for this player
    const fragment = DEFAULT_CIPHER_MISSION.fragments.find((f) => f.playerIndex === playerIndex) || DEFAULT_CIPHER_MISSION.fragments[0]

    // 4. Check if team already submitted task 2
    const [submission] = await db
      .select()
      .from(taskSubmissions)
      .where(
        and(
          eq(taskSubmissions.teamId, session.teamId),
          eq(taskSubmissions.taskNumber, 2)
        )
      )

    return NextResponse.json({
      missionName: DEFAULT_CIPHER_MISSION.name,
      playerIndex,
      isLeader: session.role === 'leader',
      fragment: {
        playerIndex: fragment.playerIndex,
        cipherType: fragment.cipherType,
        clue: fragment.clue,
        encryptedText: fragment.encryptedText,
      },
      totalFragments: DEFAULT_CIPHER_MISSION.fragments.length,
      isCompleted: !!submission,
      submittedAt: submission?.submittedAt ?? null,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
