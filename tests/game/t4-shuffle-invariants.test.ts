import { describe, it, expect } from 'vitest'
import {
  CREWMATE_COLORS,
  ShuffledPlayer,
  assignPlayersToSeats,
  partitionTeamsIntoTables,
  matchImposterTeamPerTable,
} from '../../lib/game/t4-engine'

/** Build a synthetic team -> players map with `teamCount` teams of `perTeam` players each. */
function buildTeamMap(teamCount: number, perTeam = 6): Map<string, ShuffledPlayer[]> {
  const map = new Map<string, ShuffledPlayer[]>()
  for (let t = 0; t < teamCount; t++) {
    const teamId = `team-${t}`
    const list: ShuffledPlayer[] = []
    for (let p = 0; p < perTeam; p++) {
      list.push({ playerId: `${teamId}-p${p}`, teamId, name: `Player ${t}-${p}` })
    }
    map.set(teamId, list)
  }
  return map
}

const TEAM_COUNTS = [6, 8, 10, 13, 17, 20, 25, 31, 40]
const SEEDS_PER_SCENARIO = 15

describe('Task 4 shuffle invariants (pure, no DB)', () => {
  for (const teamCount of TEAM_COUNTS) {
    describe(`${teamCount} teams x 6 players`, () => {
      for (let seed = 0; seed < SEEDS_PER_SCENARIO; seed++) {
        it(`run ${seed}: every invariant holds`, () => {
          const teamMap = buildTeamMap(teamCount, 6)
          const totalPlayers = teamCount * 6

          const tables = assignPlayersToSeats(teamMap, new Set())

          // Invariant 1: every player appears in exactly one seat, session-wide.
          const seenPlayers = new Set<string>()
          let seatCount = 0
          for (const table of tables) {
            for (const seat of table) {
              expect(seenPlayers.has(seat.player.playerId)).toBe(false)
              seenPlayers.add(seat.player.playerId)
              seatCount++
            }
          }
          expect(seatCount).toBe(totalPlayers)
          expect(seenPlayers.size).toBe(totalPlayers)

          // Invariant 2: no two players from the same original team share a table.
          for (const table of tables) {
            const teamIdsAtTable = table.map((s) => s.teamId)
            expect(new Set(teamIdsAtTable).size).toBe(teamIdsAtTable.length)
          }

          // Invariant 3: exactly one imposter per table.
          for (const table of tables) {
            const imposters = table.filter((s) => s.isImposter)
            expect(imposters).toHaveLength(1)
          }

          // Invariant 4: with balanced team sizes (uniform 6 per team), every
          // team supplies AT MOST one imposter this session, and - since
          // teamCount === tableCount in this balanced scenario - the
          // matching is perfect, so every team supplies EXACTLY one.
          const imposterTeamCounts = new Map<string, number>()
          for (const table of tables) {
            for (const seat of table) {
              if (seat.isImposter) {
                imposterTeamCounts.set(seat.teamId, (imposterTeamCounts.get(seat.teamId) ?? 0) + 1)
              }
            }
          }
          expect(imposterTeamCounts.size).toBe(teamCount)
          for (const count of imposterTeamCounts.values()) {
            expect(count).toBe(1)
          }
        })
      }
    })
  }

  it('no player is ever assigned imposter twice across two sequential sessions', () => {
    for (let seed = 0; seed < SEEDS_PER_SCENARIO; seed++) {
      const teamMap = buildTeamMap(10, 6)

      const session1Tables = assignPlayersToSeats(teamMap, new Set())
      const session1Imposters = new Set<string>()
      for (const table of session1Tables) {
        for (const seat of table) {
          if (seat.isImposter) session1Imposters.add(seat.player.playerId)
        }
      }

      // Session 2 reshuffles the SAME player pool, now aware of session 1's imposters.
      const session2Tables = assignPlayersToSeats(teamMap, session1Imposters)
      const session2Imposters = new Set<string>()
      for (const table of session2Tables) {
        for (const seat of table) {
          if (seat.isImposter) session2Imposters.add(seat.player.playerId)
        }
      }

      for (const playerId of session2Imposters) {
        expect(session1Imposters.has(playerId)).toBe(false)
      }
    }
  })

  it('crewmate colors are always exactly the six canonical colors, never "orange"', () => {
    expect(CREWMATE_COLORS).toEqual(['red', 'blue', 'cyan', 'yellow', 'green', 'purple'])
    expect(CREWMATE_COLORS).not.toContain('orange')
  })

  it('partitionTeamsIntoTables never strands a player when team sizes are uniform', () => {
    for (const teamCount of TEAM_COUNTS) {
      const counts = new Map<string, number>()
      for (let t = 0; t < teamCount; t++) counts.set(`team-${t}`, 6)

      const tables = partitionTeamsIntoTables(counts)
      const totalSeated = tables.reduce((sum, t) => sum + t.length, 0)
      expect(totalSeated).toBe(teamCount * 6)
      // Every table should be full (6 distinct teams) in the balanced case.
      for (const table of tables) {
        expect(table.length).toBe(6)
        expect(new Set(table).size).toBe(6)
      }
    }
  })

  it('matchImposterTeamPerTable finds a perfect matching for a balanced layout', () => {
    for (const teamCount of TEAM_COUNTS) {
      const counts = new Map<string, number>()
      for (let t = 0; t < teamCount; t++) counts.set(`team-${t}`, 6)
      const tables = partitionTeamsIntoTables(counts)

      const matching = matchImposterTeamPerTable(tables)
      expect(matching).toHaveLength(tables.length)
      expect(matching.every((teamId) => teamId !== '')).toBe(true)
      // Every matched team is unique (no team assigned to two tables).
      expect(new Set(matching).size).toBe(matching.length)
    }
  })

  it('gracefully handles unbalanced check-in without stranding any player', () => {
    // Deliberately unbalanced: teams with very different remaining counts.
    const teamMap = new Map<string, ShuffledPlayer[]>()
    const sizes = [6, 6, 6, 6, 6, 6, 3, 1]
    sizes.forEach((size, t) => {
      const teamId = `team-${t}`
      const list: ShuffledPlayer[] = []
      for (let p = 0; p < size; p++) {
        list.push({ playerId: `${teamId}-p${p}`, teamId, name: `Player ${t}-${p}` })
      }
      teamMap.set(teamId, list)
    })
    const totalPlayers = sizes.reduce((a, b) => a + b, 0)

    const tables = assignPlayersToSeats(teamMap, new Set())

    const seen = new Set<string>()
    for (const table of tables) {
      const teamIds = table.map((s) => s.teamId)
      expect(new Set(teamIds).size).toBe(teamIds.length) // no same-team pairing, even if undersized
      for (const seat of table) seen.add(seat.player.playerId)
    }
    expect(seen.size).toBe(totalPlayers) // nobody dropped
  })
})
