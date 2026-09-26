import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/guard'
import { db } from '@/lib/db/client'
import { votes, gameTablePlayers, players, teams } from '@/lib/db/schema'
import { recordScoreEvent } from '@/lib/scoring/ledger'
import { eq, and, count } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  tableId: z.string().uuid(),
  targetPlayerId: z.string().uuid(),
  round: z.number().int().min(1).max(2),
})

/**
 * POST /api/tasks/4/vote
 * Cast a vote in the shuffling imposter game.
 * After all 6 players vote, resolves the round.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req)
    if (!session.playerId) {
      return NextResponse.json({ error: 'Not a player session' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = schema.parse(body)

    // Insert vote (unique constraint: one vote per player per round per table)
    const voteInsert = await db
      .insert(votes)
      .values({
        gameTableId: parsed.tableId,
        voterPlayerId: session.playerId,
        targetPlayerId: parsed.targetPlayerId,
        round: parsed.round,
      })
      .onConflictDoNothing({ target: [votes.gameTableId, votes.voterPlayerId, votes.round] })
      .returning()

    if (!voteInsert.length) {
      return NextResponse.json({ error: 'You have already voted this round.' }, { status: 409 })
    }

    // Check if all players have voted this round
    const [{ value: voteCount }] = await db
      .select({ value: count() })
      .from(votes)
      .where(and(eq(votes.gameTableId, parsed.tableId), eq(votes.round, parsed.round)))

    const tableSlots = await db
      .select()
      .from(gameTablePlayers)
      .where(eq(gameTablePlayers.tableId, parsed.tableId))

    const allVoted = Number(voteCount) >= tableSlots.length

    if (!allVoted) {
      return NextResponse.json({ voteRecorded: true, allVoted: false })
    }

    // Tally votes and resolve round
    const roundVotes = await db
      .select()
      .from(votes)
      .where(and(eq(votes.gameTableId, parsed.tableId), eq(votes.round, parsed.round)))

    const tally = new Map<string, number>()
    for (const v of roundVotes) {
      tally.set(v.targetPlayerId, (tally.get(v.targetPlayerId) ?? 0) + 1)
    }

    const maxVotes = Math.max(...tally.values())
    const topVoted = [...tally.entries()].filter(([, c]) => c === maxVotes).map(([id]) => id)

    // Find the imposter in this table
    const imposterSlot = tableSlots.find((s) => s.isImposter)

    let gameOver = false
    let winner: 'crewmates' | 'imposter' | null = null

    if (topVoted.length === 1 && imposterSlot && topVoted[0] === imposterSlot.playerId) {
      // Imposter caught
      gameOver = true
      winner = 'crewmates'
    } else if (parsed.round >= 2) {
      // Max rounds reached — imposter survives
      gameOver = true
      winner = 'imposter'
    }

    if (gameOver && imposterSlot) {
      if (winner === 'crewmates') {
        // Award crewmate points to all crewmate original teams
        for (const slot of tableSlots) {
          if (!slot.isImposter) {
            await recordScoreEvent({
              teamId: slot.originalTeamId,
              taskNumber: 4,
              eventType: 'TASK_4_CREWMATE_WIN',
              points: 5,
              idempotencyKey: `t4-crew-${parsed.tableId}-${slot.playerId}`,
              reason: 'Crewmate: Imposter caught in Task 4',
            })
          }
        }
      } else {
        // Award imposter team points
        await recordScoreEvent({
          teamId: imposterSlot.originalTeamId,
          taskNumber: 4,
          eventType: 'TASK_4_IMPOSTER_WIN',
          points: 10,
          idempotencyKey: `t4-imp-${parsed.tableId}`,
          reason: 'Imposter survived both rounds in Task 4',
        })
      }
    }

    return NextResponse.json({
      voteRecorded: true,
      allVoted: true,
      result: gameOver ? { gameOver: true, winner } : null,
    })
  } catch (err: any) {
    if (err.status) return new NextResponse(err.message, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
