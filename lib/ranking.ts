// lib/ranking.ts
// Strict ranking comparator and leaderboard calculator per CLAUDE.md specification

export interface TeamScoreSummary {
  teamId: string
  teamCode: string
  teamName: string
  task1Points: number
  task2Points: number
  task3Points: number
  task4Points: number
  betBonus: number // +10 if winning bet, -10 if lost bet, 0 if no bet
  hasWinningBet: boolean // true only if bet was placed and won (+10)
  totalPoints: number // task1 + task2 + task3 + task4 + (includeBet ? betBonus : 0)
}

export interface RankedTeam extends TeamScoreSummary {
  rank: number
  tieUnresolved: boolean
}

/**
 * Compare two teams according to the 4-rule comparator:
 * 1. Higher total points ranks higher.
 * 2. If equal total points, a team whose total includes a WINNING bet bonus ranks BELOW
 *    a team that reached the same total without one.
 * 3. If still equal, compare Task 4 points, then Task 3, then Task 2, then Task 1.
 * 4. If still equal, return 0 (tie remains unresolved, requires admin intervention).
 *
 * @param a First team
 * @param b Second team
 * @param includeBetRule If false, rule 2 is skipped (used for pre-bet ranking to judge bets)
 */
export function compareTeams(
  a: TeamScoreSummary,
  b: TeamScoreSummary,
  includeBetRule: boolean = true
): number {
  // Rule 1: Higher total points ranks higher
  if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints
  }

  // Rule 2: If totals are equal, team WITH winning bet ranks BELOW team WITHOUT winning bet
  if (includeBetRule) {
    if (a.hasWinningBet && !b.hasWinningBet) {
      return 1 // a ranks below b
    }
    if (!a.hasWinningBet && b.hasWinningBet) {
      return -1 // b ranks below a
    }
  }

  // Rule 3: Compare Task 4 -> Task 3 -> Task 2 -> Task 1 (higher wins at first difference)
  if (b.task4Points !== a.task4Points) return b.task4Points - a.task4Points
  if (b.task3Points !== a.task3Points) return b.task3Points - a.task3Points
  if (b.task2Points !== a.task2Points) return b.task2Points - a.task2Points
  if (b.task1Points !== a.task1Points) return b.task1Points - a.task1Points

  // Rule 4: Still equal -> unresolved tie
  return 0
}

/**
 * Rank an array of teams using the ranking comparator.
 * Handles ties by assigning equal rank and marking tieUnresolved = true.
 */
export function rankTeams(
  teams: TeamScoreSummary[],
  includeBetRule: boolean = true
): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => compareTeams(a, b, includeBetRule))

  const ranked: RankedTeam[] = []
  let currentRank = 1

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!
    if (i === 0) {
      const isTiedWithNext =
        sorted.length > 1 && compareTeams(current, sorted[1]!, includeBetRule) === 0
      ranked.push({
        ...current,
        rank: 1,
        tieUnresolved: isTiedWithNext,
      })
      continue
    }

    const prev = sorted[i - 1]!
    const isTiedWithPrev = compareTeams(current, prev, includeBetRule) === 0
    const isTiedWithNext =
      i + 1 < sorted.length &&
      compareTeams(current, sorted[i + 1]!, includeBetRule) === 0

    if (isTiedWithPrev) {
      ranked.push({
        ...current,
        rank: ranked[i - 1]!.rank, // share previous rank
        tieUnresolved: true,
      })
    } else {
      currentRank = i + 1
      ranked.push({
        ...current,
        rank: currentRank,
        tieUnresolved: isTiedWithNext,
      })
    }
  }

  return ranked
}
