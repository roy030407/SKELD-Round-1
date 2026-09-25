import { describe, it, expect } from 'vitest'
import { compareTeams, rankTeams, TeamScoreSummary } from '@/lib/ranking'

describe('Ranking Comparator (lib/ranking.ts) — TEST-01', () => {
  const baseTeam = (id: string, code: string, overrides: Partial<TeamScoreSummary> = {}): TeamScoreSummary => ({
    teamId: id,
    teamCode: code,
    teamName: `Team ${code}`,
    task1Points: 0,
    task2Points: 0,
    task3Points: 0,
    task4Points: 0,
    betBonus: 0,
    hasWinningBet: false,
    totalPoints: 0,
    ...overrides,
  })

  it('Rule 1: higher total points ranks higher', () => {
    const a = baseTeam('1', 'A', { totalPoints: 50 })
    const b = baseTeam('2', 'B', { totalPoints: 40 })

    expect(compareTeams(a, b)).toBeLessThan(0) // a comes before b
    expect(compareTeams(b, a)).toBeGreaterThan(0) // b comes after a
  })

  it('Rule 2: if totals equal, team WITH winning bet bonus ranks BELOW team WITHOUT winning bet', () => {
    // Both have 50 total points. Team A earned it via pure tasks. Team B had 40 task points + 10 bet bonus.
    const a = baseTeam('1', 'A', { totalPoints: 50, hasWinningBet: false, betBonus: 0 })
    const b = baseTeam('2', 'B', { totalPoints: 50, hasWinningBet: true, betBonus: 10 })

    // Team A should rank higher than Team B
    expect(compareTeams(a, b)).toBeLessThan(0)
    expect(compareTeams(b, a)).toBeGreaterThan(0)

    // For pre-bet ranking (includeBetRule = false), they should tie on total
    expect(compareTeams(a, b, false)).toBe(0)
  })

  it('Rule 3: if totals equal and no bet bonus difference, compare Task 4 -> 3 -> 2 -> 1', () => {
    // Task 4 tie-breaker
    const a = baseTeam('1', 'A', { totalPoints: 50, task4Points: 20, task3Points: 10 })
    const b = baseTeam('2', 'B', { totalPoints: 50, task4Points: 15, task3Points: 15 })
    expect(compareTeams(a, b)).toBeLessThan(0) // A wins on Task 4

    // Task 3 tie-breaker when Task 4 is equal
    const c = baseTeam('3', 'C', { totalPoints: 50, task4Points: 20, task3Points: 15, task2Points: 5 })
    const d = baseTeam('4', 'D', { totalPoints: 50, task4Points: 20, task3Points: 10, task2Points: 10 })
    expect(compareTeams(c, d)).toBeLessThan(0) // C wins on Task 3

    // Task 2 tie-breaker
    const e = baseTeam('5', 'E', { totalPoints: 50, task4Points: 20, task3Points: 15, task2Points: 10, task1Points: 5 })
    const f = baseTeam('6', 'F', { totalPoints: 50, task4Points: 20, task3Points: 15, task2Points: 5, task1Points: 10 })
    expect(compareTeams(e, f)).toBeLessThan(0) // E wins on Task 2

    // Task 1 tie-breaker
    const g = baseTeam('7', 'G', { totalPoints: 50, task4Points: 20, task3Points: 15, task2Points: 5, task1Points: 10 })
    const h = baseTeam('8', 'H', { totalPoints: 50, task4Points: 20, task3Points: 15, task2Points: 5, task1Points: 5 })
    expect(compareTeams(g, h)).toBeLessThan(0) // G wins on Task 1
  })

  it('Rule 4: identical scores in all tasks result in unresolved tie', () => {
    const a = baseTeam('1', 'A', { totalPoints: 50, task4Points: 20, task3Points: 15, task2Points: 10, task1Points: 5 })
    const b = baseTeam('2', 'B', { totalPoints: 50, task4Points: 20, task3Points: 15, task2Points: 10, task1Points: 5 })

    expect(compareTeams(a, b)).toBe(0)

    const ranked = rankTeams([a, b])
    expect(ranked[0]!.rank).toBe(1)
    expect(ranked[1]!.rank).toBe(1)
    expect(ranked[0]!.tieUnresolved).toBe(true)
    expect(ranked[1]!.tieUnresolved).toBe(true)
  })

  it('Correctly ranks a table of 5 teams with proper rank gaps for ties', () => {
    const teams: TeamScoreSummary[] = [
      baseTeam('1', 'T1', { totalPoints: 100 }),
      baseTeam('2', 'T2', { totalPoints: 80, hasWinningBet: true }),
      baseTeam('3', 'T3', { totalPoints: 80, hasWinningBet: false }), // Beats T2 due to no winning bet
      baseTeam('4', 'T4', { totalPoints: 50, task4Points: 20 }),
      baseTeam('5', 'T5', { totalPoints: 50, task4Points: 20 }), // Ties with T4
    ]

    const ranked = rankTeams(teams)
    expect(ranked[0]!.teamCode).toBe('T1')
    expect(ranked[0]!.rank).toBe(1)

    expect(ranked[1]!.teamCode).toBe('T3')
    expect(ranked[1]!.rank).toBe(2)

    expect(ranked[2]!.teamCode).toBe('T2')
    expect(ranked[2]!.rank).toBe(3)

    // T4 and T5 tie at rank 4
    expect(ranked[3]!.rank).toBe(4)
    expect(ranked[4]!.rank).toBe(4)
    expect(ranked[3]!.tieUnresolved).toBe(true)
    expect(ranked[4]!.tieUnresolved).toBe(true)
  })
})
