# Roadmap: Project Skeld: Round 1 Web App

## Overview

This roadmap takes the app from an empty repo to a fully operational Round 1 event tool for 26 September. The build starts with two parallel foundations: a secure, server-authoritative data/auth layer (Phase 1) and the extracted rc-nitw.org/freshers design system (Phase 2), since neither depends on the other. From there, the append-only score ledger and ranking comparator are built as dependency-free primitives (Phase 3) before any feature that scores anything, so every later scoring path reuses one tested implementation instead of four ad-hoc ones. Check-in and task gating (Phase 4) then establish the server-enforced flow every task must respect. Task 1's imposter word-game engine (Phase 5) is isolated as its own phase because it concentrates the hardest, highest-risk requirements in the whole project: zero information leakage between players and race-free, server-timed phase transitions under concurrent load. Tasks 2-4 (Phase 6) reuse the same rank-based scoring path once it exists. Betting, admin corrections, and the audit log (Phase 7) come next because betting settlement depends on real ranked data existing. Finally, the display/projector role and full operational hardening (Phase 8) close the loop, since a read-only aggregate view and a live rehearsal only make sense once everything they display or stress-test actually exists. By the end, every v1 requirement across registration, auth, check-in, gating, Task 1-4 scoring, betting, admin/audit, roles, design fidelity, security, and testing is delivered and verifiable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation, Data Model, Registration & Auth** - Secure schema, security baseline, registration adapters, and role-enforced authentication are in place
- [ ] **Phase 2: Design System & Visual Foundation** - rc-nitw.org/freshers is reproduced pixel-for-pixel as reusable design tokens and components, ready for every screen
- [ ] **Phase 3: Score Ledger & Ranking Engine** - The append-only score ledger and the 4-level ranking comparator exist as tested, reusable primitives
- [ ] **Phase 4: Check-in & Task Gating** - Admin checks teams in and controls task-by-task progression, fully server-enforced
- [ ] **Phase 5: Task 1 - Imposter Word Game Engine** - Players play the full cross-team social-deduction game with zero information leakage and monitor oversight
- [ ] **Phase 6: Tasks 2, 3 & 4 (Kahoot) - Completion and Scoring** - Cipher, Bomb Defusal, and Kahoot all complete and score through the shared rank-based path
- [ ] **Phase 7: Betting, Admin Corrections & Audit Log** - Teams bet on their rank, admins correct scores and resolve ties, every action is audit logged
- [ ] **Phase 8: Display/Projector & Operational Hardening** - The read-only projector view is live and the system is proven ready for event-day load

## Phase Details

### Phase 1: Foundation, Data Model, Registration & Auth
**Goal**: A secure foundation exists: database schema and migrations with RLS deny-all everywhere, security headers/CSP/host validation active, registration data loaded read-only via a pluggable adapter, and players can authenticate with server-enforced role checks on every route.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: REG-01, REG-02, REG-03, REG-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, TEST-04
**Success Criteria** (what must be TRUE):
  1. A player can log in at check-in using player code + roll number and lands on a role-appropriate view; a second login from elsewhere revokes the prior session.
  2. Accessing a role-restricted route with the wrong role (e.g. a player hitting an admin endpoint) is denied server-side, verified by an automated authorization test suite covering all 5 roles.
  3. Registration data (teams, players, roll numbers, contact info) loads read-only into the app's own tables via the mock adapter or the CSV fallback, with the adapter interface ready for a real adapter to be plugged in later without touching the rest of the app.
  4. Every HTTP response carries the required security headers (CSP with nonce, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors none) and a request with a disallowed Host is rejected; no secret or service-role key is ever exposed via a `NEXT_PUBLIC_` var or committed to git.
  5. Admin can force-revoke any player's session, and personal data (email, phone, roll number) is visible only to the admin role in every response payload.
**Plans**: TBD
**UI hint**: yes

### Phase 2: Design System & Visual Foundation
**Goal**: The exact visual identity of rc-nitw.org/freshers is extracted into a reusable, centralized design-token system and base component library, and the landing/marketing surface reproduces the reference site pixel-for-pixel, so every later screen has a ready-made, faithful set of building blocks.
**Mode:** mvp
**Depends on**: Nothing (parallel track to Phase 1, per architecture research)
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04
**Success Criteria** (what must be TRUE):
  1. Design tokens (colors, fonts, spacing, animations) extracted from rc-nitw.org/freshers via the six ground-truth reference screenshots and Playwright-inspected computed styles are centralized in one source (e.g. the Tailwind theme) that all other code imports rather than redefining.
  2. The landing/marketing surface visually matches rc-nitw.org/freshers' layout, copy style, and assets against the reference screenshots, not as an interpretation.
  3. A base component library (panels, cards, status pills, buttons, the security-map voting motif, mission-stage task rail) exists in the reference visual language, documented for reuse so later screens introduce no new colors or fonts.
  4. Components render mobile-first by default, with a larger-format projector variant established as a variant of the same components rather than a separate design.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Score Ledger & Ranking Engine
**Goal**: The append-only score ledger and the pure ranking comparator exist as fully tested, dependency-free primitives that every scoring feature (Task 1 close, Tasks 2-4, betting) will call, so scoring logic is implemented once, correctly, rather than four times under deadline pressure.
**Mode:** mvp
**Depends on**: Phase 1 (database schema and migrations)
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-07, SCORE-08, TEST-01
**Success Criteria** (what must be TRUE):
  1. Appending a score_event (task points, correction, or bet delta) to the ledger and re-deriving a team's total always reflects the ledger's sum; no mutable stored total exists anywhere.
  2. A correction is applied as a new compensating event with a required reason, never an edit or delete of an existing event, and the derived total updates accordingly.
  3. A retried ledger-writing call never double-applies, enforced at the database level by a unique constraint or idempotency key.
  4. The ranking comparator (`lib/ranking.ts`) correctly orders teams through all 4 tiebreak levels, including the asymmetric bet-bonus rule and the rank-8/rank-9 Round 2 qualification boundary, verified by an exhaustive automated test suite.
  5. All scoring constants (Task 1 point defaults, timer durations, weights) live in and are read from a single file, `lib/scoring/config.ts`.
**Plans**: TBD

### Phase 4: Check-in & Task Gating
**Goal**: Admin checks in every player and controls, per team and per task, when a team may proceed, with the fixed Check-in to Task 4 sequence enforced server-side on every request, not just at render time.
**Mode:** mvp
**Depends on**: Phase 1 (auth, roles, team/player data)
**Requirements**: CHK-01, CHK-02, CHK-03, CHK-04, CHK-05, CHK-06, GATE-01, GATE-02, GATE-03, GATE-04, TEST-03
**Success Criteria** (what must be TRUE):
  1. Admin/volunteer can check in each of a team's 6 players individually, and re-submitting an already-checked-in player returns "already checked in" instead of creating a duplicate record.
  2. A team cannot proceed to any task until all 6 members are checked in, re-validated server-side on every task-entry attempt regardless of what the client believes.
  3. Admin opens and closes each task independently per team, and a team can only enter the next task once the previous one is complete and admin has opened the next; the Check-in to Task 1 to Task 2 to Task 3 to Task 4 order cannot be skipped or reordered.
  4. Admin has one at-a-glance view showing, per team, exactly which players are still missing at check-in and every team's current task/status across all 4 tasks simultaneously.
  5. Automated tests confirm gating cannot be bypassed: no entering a closed task, no skipping ahead, no proceeding with an incomplete roster.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Task 1 - Imposter Word Game Engine
**Goal**: Players are shuffled into cross-team tables of 6 and play the full self-driving, server-timed social-deduction game with zero leakage of any player's word, role, or original team, while monitors can observe and intervene without seeing hidden information.
**Mode:** mvp
**Depends on**: Phase 3 (ledger, for scoring on close), Phase 4 (task must be open before the engine runs)
**Requirements**: T1-01, T1-02, T1-03, T1-04, T1-05, T1-06, T1-07, T1-08, T1-09, T1-10, T1-11, T1-12, T1-13, T1-14, MON-01, MON-02, TEST-02, TEST-05
**Success Criteria** (what must be TRUE):
  1. Players are shuffled into groups of 6 drawn from 6 different teams and each plays their session(s) (1 by default, 2 if configured) through the full server-timed phase sequence: ready check, word reveal, 2 description rounds, vote, optional second vote, results, with phase transitions driven only by server timestamps via a single guarded write, never a client-side timer.
  2. A player never receives another player's word, role, or original team identity in any payload; an automated test verifies imposter and crewmate response payloads are identical in shape and comparable in byte size.
  3. Voting is capped at 2 rounds per game with one vote per player per round enforced by a unique constraint, and closing a game correctly awards crewmate points to the 5 crewmates' original teams (imposter caught) or imposter points to the imposter's original team (imposter survives), using the configured defaults.
  4. At "Close Task 1," raw per-team points convert correctly to rank points across all teams, with ties sharing the average of the points they span.
  5. A monitor sees live phase and vote counts per table without ever seeing a word/role/original-team identity, can pause an individual table without affecting others, and can flag an issue with a review note visible to admin; no action available to the monitor can change a score or result.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Tasks 2, 3 & 4 (Kahoot) - Completion and Scoring
**Goal**: Teams complete the Cipher (Task 2), Bomb Defusal (Task 3), and Kahoot (Task 4) tasks through fully configurable completion methods, and all three score correctly through the same rank-based scoring path, with Kahoot results imported and human-reviewed before committing.
**Mode:** mvp
**Depends on**: Phase 3 (ledger, rank-based scoring), Phase 4 (gating, team-code mapping from check-in)
**Requirements**: EXT-01, EXT-02, EXT-03, KHT-01, KHT-02, KHT-03, KHT-04, KHT-05
**Success Criteria** (what must be TRUE):
  1. Task 2 and Task 3 each support whichever completion method is configured for it (external link display, webhook, leader "done" button with volunteer verification, or manual time entry) with no hardcoded method, and a duplicate or late completion signal for the same team/task is rejected or flagged, never double-scored.
  2. Rank-based scoring (N eligible teams: best gets N points, next N-1, ... non-finishers get 0, ties share the average of the points they span) is correctly computed and committed to the score ledger for Task 2 and Task 3.
  3. The team leader submits the team's single Kahoot result (one per team, enforced by a unique constraint), and admin uploads the Kahoot export file to a human-reviewable staging view (team code to matched nickname to resulting points) where a mismatched or unmatched nickname can be corrected before anything commits.
  4. Committed Kahoot results are scored with the same rank-based scoring as Tasks 2 and 3 and appear correctly in the ledger.
**Plans**: TBD

### Phase 7: Betting, Admin Corrections & Audit Log
**Goal**: Team leaders can place a rank bet before the first leaderboard release and see it settle correctly against their pre-bet rank, and admins can correct scores, resolve unresolved ties, and review a complete, tamper-evident record of every administrative action.
**Mode:** mvp
**Depends on**: Phase 3 (ledger and comparator), Phase 5 (Task 1 scoring feeds real ledger data), Phase 6 (Tasks 2-4 scoring feeds real ledger data)
**Requirements**: BET-01, BET-02, BET-03, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. A team leader can submit exactly one bet on the team's final rank before the first leaderboard release; a second bet attempt from the same team is rejected by a unique constraint.
  2. The bet settles against the team's rank computed BEFORE the bet delta is applied, using the ranking comparator without the bet-bonus rule, awarding +10 for an exact rank hit, -10 for any other outcome, and 0 when no bet was placed.
  3. Admin can apply a manual score correction with a required reason (recorded as a compensating ledger event, never an edit) and can manually resolve an unresolved tie with a logged reason.
  4. Every admin and monitor mutating action (check-in override, task open/close, score correction, tie resolution, session revocation) appears in an admin-viewable, append-only audit log capturing who, what changed, when (server time), and why.
**Plans**: TBD
**UI hint**: yes

### Phase 8: Display/Projector & Operational Hardening
**Goal**: The read-only projector display is live, showing task-rail progress and the leaderboard in the same design language as the rest of the app, and the whole system is proven to survive event-day conditions: ~150 concurrent phones, retried requests, and admins operating under time pressure.
**Mode:** mvp
**Depends on**: Phase 2 (design tokens/components), Phase 7 (full scoring, audit log, and leaderboard release to display)
**Requirements**: DISP-01, DISP-02, DISP-03
**Success Criteria** (what must be TRUE):
  1. The display role is strictly read-only: no route reachable by it can mutate any state, and it requires no elevated auth beyond identifying it as the display role.
  2. The projector view shows task-rail progress and the leaderboard, visibly built from the same design tokens and components as the rest of the app.
  3. The projector view polls the same server-authoritative `/state` mechanism used by players, monitors, and admins, at its own configured interval, and continues to reflect current state correctly under a load test simulating ~150-poller-equivalent concurrency.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, Data Model, Registration & Auth | 0/TBD | Not started | - |
| 2. Design System & Visual Foundation | 0/TBD | Not started | - |
| 3. Score Ledger & Ranking Engine | 0/TBD | Not started | - |
| 4. Check-in & Task Gating | 0/TBD | Not started | - |
| 5. Task 1 - Imposter Word Game Engine | 0/TBD | Not started | - |
| 6. Tasks 2, 3 & 4 (Kahoot) - Completion and Scoring | 0/TBD | Not started | - |
| 7. Betting, Admin Corrections & Audit Log | 0/TBD | Not started | - |
| 8. Display/Projector & Operational Hardening | 0/TBD | Not started | - |
