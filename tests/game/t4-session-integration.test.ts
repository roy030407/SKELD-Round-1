import { test, expect, afterAll } from 'vitest'
import { db } from '../../lib/db/client'
import { teams, players, checkIns, gameTables, gameTablePlayers } from '../../lib/db/schema'
import { createGameSession, CREWMATE_COLORS } from '../../lib/game/t4-engine'
import { eq, inArray } from 'drizzle-orm'

// This is a REAL integration test: it inserts real rows, calls the actual
// createGameSession() (which performs real DB writes), then asserts the
// shuffle invariants hold on the LIVE persisted output - not just on the
// pure functions in isolation. It requires a real, reachable database, so it
// is skipped (same convention as tests/db/rls-enabled.test.ts) whenever only
// placeholder/dummy credentials are configured.
const hasRealDb =
  !!process.env.DIRECT_URL &&
  !process.env.DIRECT_URL.includes('dummy') &&
  !process.env.DIRECT_URL.includes('xxxx')

const TEST_TEAM_COUNT = 8
const PLAYERS_PER_TEAM = 6
const testTeamIds: string[] = []
const testPlayerIds: string[] = []

test.skipIf(!hasRealDb)(
  'createGameSession() produces a live table/player layout satisfying every shuffle invariant',
  async () => {
    // Arrange: create real teams + players + check-ins.
    for (let t = 0; t < TEST_TEAM_COUNT; t++) {
      const [team] = await db
        .insert(teams)
        .values({ code: `T4TEST-${t}-${Date.now()}`, name: `T4 Test Team ${t}` })
        .returning()
      testTeamIds.push(team!.id)

      for (let p = 0; p < PLAYERS_PER_TEAM; p++) {
        const [player] = await db
          .insert(players)
          .values({
            teamId: team!.id,
            playerCode: `T4TEST-${t}-${p}-${Date.now()}`,
            firstName: `Player${t}${p}`,
            rollNumber: `RN${t}${p}`,
          })
          .returning()
        testPlayerIds.push(player!.id)
        await db.insert(checkIns).values({ playerId: player!.id })
      }
    }

    // Act: run the real engine against the real DB.
    const result = await createGameSession(undefined, false)
    expect(result.tablesCount).toBeGreaterThan(0)

    // Assert: pull back everything this session created and check invariants
    // against the actual persisted rows (not the in-memory return value).
    const sessionTables = await db
      .select()
      .from(gameTables)
      .where(eq(gameTables.gameSessionId, result.sessionId))
    const tableIds = sessionTables.map((t) => t.id)

    const seatedPlayers = await db
      .select()
      .from(gameTablePlayers)
      .where(inArray(gameTablePlayers.tableId, tableIds))

    const ourSeats = seatedPlayers.filter((s) => testPlayerIds.includes(s.playerId))

    // Invariant 1: every one of our checked-in test players appears exactly once.
    const seatedTestPlayerIds = ourSeats.map((s) => s.playerId)
    expect(new Set(seatedTestPlayerIds).size).toBe(seatedTestPlayerIds.length)
    expect(seatedTestPlayerIds.length).toBe(TEST_TEAM_COUNT * PLAYERS_PER_TEAM)

    // Invariant 2 & 3: per table, no two seats share an original team, and
    // exactly one imposter.
    const byTable = new Map<string, typeof ourSeats>()
    for (const seat of ourSeats) {
      if (!byTable.has(seat.tableId)) byTable.set(seat.tableId, [])
      byTable.get(seat.tableId)!.push(seat)
    }
    for (const seats of byTable.values()) {
      const teamIdsAtTable = seats.map((s) => s.originalTeamId)
      expect(new Set(teamIdsAtTable).size).toBe(teamIdsAtTable.length)
      expect(seats.filter((s) => s.isImposter)).toHaveLength(1)
    }

    // Invariant 4: each of our teams supplies at most one imposter this session.
    const imposterTeamCounts = new Map<string, number>()
    for (const seat of ourSeats) {
      if (seat.isImposter) {
        imposterTeamCounts.set(seat.originalTeamId, (imposterTeamCounts.get(seat.originalTeamId) ?? 0) + 1)
      }
    }
    for (const count of imposterTeamCounts.values()) {
      expect(count).toBe(1)
    }

    // Invariant 6/7: every seat has a real word (or BLANK) and a canonical color.
    for (const seat of ourSeats) {
      expect(seat.word).toBeTruthy()
      expect(CREWMATE_COLORS).toContain(seat.crewmateColor)
      expect(seat.crewmateColor).not.toBe('orange')
    }
  }
)

afterAll(async () => {
  if (!hasRealDb || testPlayerIds.length === 0) return
  // Clean up everything this test created.
  await db.delete(gameTablePlayers).where(inArray(gameTablePlayers.playerId, testPlayerIds))
  await db.delete(checkIns).where(inArray(checkIns.playerId, testPlayerIds))
  await db.delete(players).where(inArray(players.id, testPlayerIds))
  await db.delete(teams).where(inArray(teams.id, testTeamIds))
})
