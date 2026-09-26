// lib/scoring/config.ts
// Single source of truth for all scoring values per CLAUDE.md specification

export const SCORING_CONFIG = {
  // Task 4: Imposter Shuffle (renamed from "task1" - the imposter game moved
  // to Task 4 slot when the round sequence was reordered to Quiz -> Cipher ->
  // Logic Gate Defusal -> Shuffling).
  task4Imposter: {
    // Imposter caught: each of the crewmates' ORIGINAL teams gets crewmate points
    crewmatePoints: 5,
    // Imposter survives all votes: imposter's ORIGINAL team gets imposter points
    imposterPoints: 10,
    maxVotingRounds: 2,
  },
  // Task 2 (Cipher): rank-based scoring.
  // With N eligible teams: 1st gets N, 2nd gets N-1, ... last gets 1.
  // Teams that did not finish get 0 points.
  // Task 1 (Quiz) and Task 3 (Bomb Defusal) are both external-link +
  // admin-manual-entry: admin types a point value per team directly, no
  // rank auto-calculation (see app/api/admin/quiz, app/api/admin/bomb-defusal).
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
