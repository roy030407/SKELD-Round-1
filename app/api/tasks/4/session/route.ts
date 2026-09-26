import { NextRequest, NextResponse } from 'next/server'
import { requireSessionAndRole } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { gameSessions, gameTables, gameTablePlayers, players, teams } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/tasks/4/session
 * Admin-only: creates a new Task 4 shuffling session.
 * Shuffles all checked-in players into cross-team tables of 6.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSessionAndRole(req, db, ['admin'])

    // Get all players across all teams
    const allPlayers = await db.select().from(players)
    if (allPlayers.length < 6) {
      return NextResponse.json({ error: 'Need at least 6 players to create tables.' }, { status: 400 })
    }

    // Fisher-Yates shuffle
    const shuffled = [...allPlayers]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Create a new game session
    const [gameSession] = await db
      .insert(gameSessions)
      .values({ sessionNumber: 1, status: 'active' })
      .returning()

    // Partition into tables of 6
    const tableSize = 6
    const tableCount = Math.floor(shuffled.length / tableSize)
    const createdTables = []

    for (let t = 0; t < tableCount; t++) {
      const [table] = await db
        .insert(gameTables)
        .values({ gameSessionId: gameSession.id, tableNumber: t + 1 })
        .returning()

      const tablePlayers = shuffled.slice(t * tableSize, (t + 1) * tableSize)

      // One player per table is imposter
      const imposterIndex = Math.floor(Math.random() * tableSize)
      const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']

      for (let i = 0; i < tablePlayers.length; i++) {
        const p = tablePlayers[i]
        await db.insert(gameTablePlayers).values({
          tableId: table.id,
          playerId: p.id,
          originalTeamId: p.teamId,
          isImposter: i === imposterIndex,
          crewmateColor: colors[i],
          word: null,
        })
      }

      createdTables.push({ tableId: table.id, tableNumber: t + 1, playerCount: tablePlayers.length })
    }

    return NextResponse.json({
      success: true,
      sessionId: gameSession.id,
      tables: createdTables,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
