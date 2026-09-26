import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { gameSessions, gameTables, gameTablePlayers, votes, players } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/tasks/4/state
 * Returns the player's table assignment and game state.
 * Does NOT expose word or isImposter for other players.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!session.playerId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    // Find active session
    const [activeSession] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.status, 'active'))

    if (!activeSession) {
      return NextResponse.json({ active: false, message: 'Task 4 not started yet' })
    }

    // Find this player's table assignment
    const [mySlot] = await db
      .select()
      .from(gameTablePlayers)
      .where(eq(gameTablePlayers.playerId, session.playerId))

    if (!mySlot) {
      return NextResponse.json({ active: true, assigned: false, message: 'You are not assigned to a table yet.' })
    }

    // Get all players at this table (without revealing others' roles/words)
    const tableSlots = await db
      .select()
      .from(gameTablePlayers)
      .where(eq(gameTablePlayers.tableId, mySlot.tableId))

    const allVotes = await db
      .select()
      .from(votes)
      .where(eq(votes.gameTableId, mySlot.tableId))

    const [table] = await db
      .select()
      .from(gameTables)
      .where(eq(gameTables.id, mySlot.tableId))

    // Get player names
    const playerIds = tableSlots.map((s) => s.playerId)
    const allPlayers = await db.select().from(players)
    const playerMap = new Map(allPlayers.map((p) => [p.id, p]))

    const myVotes = allVotes.filter((v) => v.voterPlayerId === session.playerId)
    const currentRound = myVotes.length + 1

    const playersInTable = tableSlots.map((slot) => {
      const p = playerMap.get(slot.playerId)
      const isYou = slot.playerId === session.playerId
      return {
        id: slot.playerId,
        name: p?.firstName ?? 'Player',
        color: slot.crewmateColor,
        isYou,
        hasVoted: allVotes.some((v) => v.voterPlayerId === slot.playerId && v.round === currentRound),
        // Only reveal your own role/word
        yourWord: isYou ? (slot.word ?? null) : undefined,
        isImposter: isYou ? slot.isImposter : undefined,
      }
    })

    return NextResponse.json({
      active: true,
      assigned: true,
      tableNumber: table.tableNumber,
      tableId: mySlot.tableId,
      currentRound,
      players: playersInTable,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
