// lib/gating.ts
// Server-enforced check-in verification and task gating

import { db } from '@/lib/db/client'
import { checkIns, players, taskGates, taskSubmissions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export interface TeamCheckInStatus {
  totalPlayers: number
  checkedInCount: number
  isFullyCheckedIn: boolean
  players: Array<{
    id: string
    name: string
    playerCode: string
    isCheckedIn: boolean
    checkedInAt: Date | null
  }>
}

/**
 * Check in an individual player.
 */
export async function checkInPlayer(playerId: string, checkedInBy?: string) {
  const [existing] = await db
    .select()
    .from(checkIns)
    .where(eq(checkIns.playerId, playerId))

  if (existing) {
    return { success: true, alreadyCheckedIn: true, checkIn: existing }
  }

  const [created] = await db
    .insert(checkIns)
    .values({
      playerId,
      checkedInBy: checkedInBy ?? null,
    })
    .returning()

  return { success: true, alreadyCheckedIn: false, checkIn: created }
}

/**
 * Query check-in status for a team.
 */
export async function getTeamCheckInStatus(teamId: string): Promise<TeamCheckInStatus> {
  const teamPlayers = await db
    .select()
    .from(players)
    .where(eq(players.teamId, teamId))

  if (teamPlayers.length === 0) {
    return {
      totalPlayers: 0,
      checkedInCount: 0,
      isFullyCheckedIn: false,
      players: [],
    }
  }

  const allCheckIns = await db.select().from(checkIns)
  const checkedInMap = new Map<string, Date>()
  for (const c of allCheckIns) {
    if (c.checkedInAt) {
      checkedInMap.set(c.playerId, c.checkedInAt)
    }
  }

  const playerStatuses = teamPlayers.map((p) => {
    const checkedInAt = checkedInMap.get(p.id) ?? null
    return {
      id: p.id,
      name: p.firstName,
      playerCode: p.playerCode,
      isCheckedIn: checkedInAt !== null,
      checkedInAt,
    }
  })

  const checkedInCount = playerStatuses.filter((p) => p.isCheckedIn).length
  // Fully checked in requires all registered players (minimum 6 per requirements)
  const isFullyCheckedIn = teamPlayers.length >= 6 && checkedInCount === teamPlayers.length

  return {
    totalPlayers: teamPlayers.length,
    checkedInCount,
    isFullyCheckedIn,
    players: playerStatuses,
  }
}

/**
 * Check if a team is authorized to enter a given task.
 * 
 * Server gating rules:
 * - Task 1: requires team fully checked in (6/6) and Task 1 gate open
 * - Task 2: requires Task 1 completion and Task 2 gate open
 * - Task 3: requires Task 2 submission and Task 3 gate open
 * - Task 4: requires Task 3 submission and Task 4 gate open
 */
export async function canEnterTask(
  teamId: string,
  taskNumber: number
): Promise<{ allowed: boolean; reason?: string }> {
  if (taskNumber < 1 || taskNumber > 4) {
    return { allowed: false, reason: 'Invalid task number' }
  }

  // 1. Check check-in status
  const checkInStatus = await getTeamCheckInStatus(teamId)
  if (!checkInStatus.isFullyCheckedIn) {
    return {
      allowed: false,
      reason: `Team has ${checkInStatus.checkedInCount}/${checkInStatus.totalPlayers} players checked in. All 6 must be checked in to enter tasks.`,
    }
  }

  // 2. Check previous task completions
  if (taskNumber > 1) {
    const prevTask = taskNumber - 1
    const [prevSubmission] = await db
      .select()
      .from(taskSubmissions)
      .where(
        and(
          eq(taskSubmissions.teamId, teamId),
          eq(taskSubmissions.taskNumber, prevTask)
        )
      )

    if (!prevSubmission) {
      return {
        allowed: false,
        reason: `Task ${prevTask} has not been completed yet.`,
      }
    }
  }

  // 3. Check admin task gate
  const [gate] = await db
    .select()
    .from(taskGates)
    .where(
      and(
        eq(taskGates.teamId, teamId),
        eq(taskGates.taskNumber, taskNumber)
      )
    )

  if (gate && gate.closedAt && !gate.openedAt) {
    return { allowed: false, reason: `Task ${taskNumber} is currently closed by the organizers.` }
  }

  return { allowed: true }
}
