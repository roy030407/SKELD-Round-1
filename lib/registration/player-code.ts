import { players, teams } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Player codes are globally unique (players.player_code has a UNIQUE
 * constraint), so they must encode the team, not just the player's index
 * within it. A purely per-team counter produced "P001" for the first player
 * of EVERY team, so only the very first team in the whole event could
 * register before hitting a unique violation.
 *
 * Format: P<teamDigits><indexDigits>, e.g. team SKELD-07's 3rd player -> P0703.
 * Retries on collision so concurrent registrations in the same team (two
 * phones submitting at once) don't both claim the same index.
 */
export async function generatePlayerCode(tx: any, teamId: string): Promise<string> {
  const [team] = await tx.select({ code: teams.code }).from(teams).where(eq(teams.id, teamId))

  // "SKELD-07" -> "07". Falls back to a slice of the uuid for any team whose
  // code doesn't carry a number, so we never silently produce a duplicate.
  const teamDigits = (team?.code?.match(/(\d+)\s*$/)?.[1] ?? '').padStart(2, '0')
  const prefix = teamDigits || teamId.replace(/-/g, '').slice(0, 4).toUpperCase()

  const existing = await tx
    .select({ playerCode: players.playerCode })
    .from(players)
    .where(eq(players.teamId, teamId))

  const taken = new Set(existing.map((p: { playerCode: string }) => p.playerCode))

  for (let i = existing.length + 1; i <= existing.length + 50; i++) {
    const candidate = `P${prefix}${i.toString().padStart(2, '0')}`
    if (taken.has(candidate)) continue

    const [clash] = await tx
      .select({ playerCode: players.playerCode })
      .from(players)
      .where(eq(players.playerCode, candidate))

    if (!clash) return candidate
  }

  throw new Error('Could not allocate a player code for this team')
}
