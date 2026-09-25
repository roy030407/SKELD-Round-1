// lib/scoring/config.ts
// Single source of truth for all scoring values per CLAUDE.md specification

export const SCORING_CONFIG = {
  task1: {
    // Round 1 Quiz: points manually entered or rank-based
    crewmatePoints: 5,
    imposterPoints: 10,
    maxVotingRounds: 2,
  },
  task4: {
    // Round 4 Shuffling: Imposter caught -> crewmates get 5 pts; Imposter survives -> 10 pts
    crewmatePoints: 5,
    imposterPoints: 10,
    maxVotingRounds: 2,
  },
  // Tasks 2, 3, 4: Rank-based scoring
  // With N eligible teams: 1st gets N, 2nd gets N-1, ... last gets 1.
  // Teams that did not finish get 0 points.
  tasksRankBased: {
    uncompletedPoints: 0,
  },
  betting: {
    exactRankBonus: 10,
    missPenalty: -10,
    noBet: 0,
  },
} as const

export type ScoringConfig = typeof SCORING_CONFIG
