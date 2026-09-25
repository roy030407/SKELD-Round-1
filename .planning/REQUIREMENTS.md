# Requirements: Project Skeld: Round 1 Web App

**Defined:** 2026-09-24
**Core Value:** Every score, rank, and gating decision is computed and enforced server side from an append-only ledger, so the leaderboard is always correct and defensible even under load from ~150 concurrent phones, with the exact visual identity of rc-nitw.org/freshers reproduced throughout.

This is a single fixed-date event (26 Sept). "v1" means everything required for that one afternoon to run correctly; there is no iterative rollout.

## v1 Requirements

### Registration & Data Adapter (REG)

- [ ] **REG-01**: Registration data (teams, players, roll numbers, contact info) is synced read-only into the app's own tables via a pluggable adapter interface
- [ ] **REG-02**: A mock adapter provides fixture registration data for development and testing
- [ ] **REG-03**: A CSV adapter imports registration data from a CSV file as the event-day fallback
- [ ] **REG-04**: Adapter interface is defined so the real official-site adapter can be plugged in later without touching the rest of the app

### Auth & Sessions (AUTH)

- [ ] **AUTH-01**: Player authenticates at check-in with player code + roll number
- [ ] **AUTH-02**: Server enforces exactly one active session per player (unique constraint); a new login revokes the prior session
- [ ] **AUTH-03**: Server enforces role-based access for all 5 roles (player, leader, monitor, admin, display) on every route and API call
- [ ] **AUTH-04**: Admin can force-revoke any player's session

### Check-in (CHK)

- [ ] **CHK-01**: Admin/volunteer can check in each of a team's 6 players individually
- [ ] **CHK-02**: Check-in is idempotent — re-submitting an already-checked-in player returns "already checked in," never a duplicate record
- [ ] **CHK-03**: A team cannot proceed to any task until all 6 members are checked in (server enforced)
- [ ] **CHK-04**: Admin can see, per team, exactly which player(s) are still missing, not just an incomplete count
- [ ] **CHK-05**: Admin has an exception path for check-in edge cases (player not found, wrong team) that flags for manual resolution instead of hard-failing
- [ ] **CHK-06**: A live checked-in roster (all ~25 teams, who's arrived, who's missing) is visible to admin as a single at-a-glance view

### Task Gating (GATE)

- [ ] **GATE-01**: Admin opens and closes each task independently, per team, server side
- [ ] **GATE-02**: A team can only enter a task once the previous task is completed and the admin has opened the next one (re-validated server side on every task-entry and mutating endpoint, not just at render time)
- [ ] **GATE-03**: Round 1 flow is enforced in fixed order: Check-in → Task 1 → Task 2 → Task 3 → Task 4 (sequence is hardcoded, not admin-configurable)
- [ ] **GATE-04**: Admin has a single screen showing every team's current task/status across all 4 tasks simultaneously

### Task 1 — Imposter Word Game (T1)

- [ ] **T1-01**: At "Close Task 1" (or per-session start), players are shuffled into groups of 6 drawn from 6 different teams to form a game table
- [ ] **T1-02**: Each player plays exactly 1 session by default; running 2 sessions per player is supported via a config flag
- [ ] **T1-03**: Each game runs a server-timed phase sequence: ready check (45s) → word reveal (30s) → description round 1 (60s) → description round 2 (60s) → vote (30s) → second vote if needed (30s) → results (15s); all durations read from `lib/scoring/config.ts`
- [ ] **T1-04**: Phase transitions are driven by server timestamps only and advance via a single guarded database write (no client-side "time's up" logic, no race between simultaneous pollers double-firing a transition)
- [ ] **T1-05**: Word mode defaults to "similar word" for the imposter; a session can be configured to "blank" mode instead
- [ ] **T1-06**: Players, monitors, admins, and the projector receive live game state via polling a server-authoritative `/state` endpoint; no WebSocket connection is used
- [ ] **T1-07**: A player's own imposter/crewmate response and every other player's response are identical in JSON shape and comparable in byte size — verified by an automated payload-parity test, not just UI inspection
- [ ] **T1-08**: A player never receives another player's word, role, or original team identity in any API payload
- [ ] **T1-09**: Voting is capped at 2 rounds per game
- [ ] **T1-10**: One vote per player per game round is enforced by a unique constraint
- [ ] **T1-11**: Scoring on game close: imposter caught → each of the 5 crewmates' ORIGINAL teams receive crewmate points (default 1, configurable); imposter survives both votes → imposter's ORIGINAL team receives imposter points (default 3, configurable)
- [ ] **T1-12**: Monitor can pause an individual game table server-side without affecting other tables
- [ ] **T1-13**: Monitor can flag an issue and leave a review note on a game table, visible to admin
- [ ] **T1-14**: At "Close Task 1," raw per-team points convert to rank points across all teams (N eligible teams: best gets N, next N−1, ... last gets 1; ties share the average of the points they span)

### External Tasks — Cipher & Bomb Defusal (EXT)

- [ ] **EXT-01**: Task 2 and Task 3 each support a configurable completion method: external link display, webhook completion, leader "done" button with volunteer verification, or manual time entry by admin/monitor — selectable per task, no hardcoded method
- [ ] **EXT-02**: Submission per team per task is idempotent — a duplicate or late completion signal is rejected or flagged, never double-scored (enforced by a unique constraint)
- [ ] **EXT-03**: Rank-based scoring applies: with N eligible teams, best gets N points, next N−1, ... teams that did not finish get 0; ties share the average of the points they span

### Task 4 — Kahoot (KHT)

- [ ] **KHT-01**: Leader submits the team's single Kahoot-task submission (one per team, enforced by a unique constraint)
- [ ] **KHT-02**: Admin uploads the Kahoot export file and the app matches results to teams by team code nickname
- [ ] **KHT-03**: Import shows a human-reviewable staging view (team code → matched Kahoot nickname → resulting points) before anything commits to the score ledger
- [ ] **KHT-04**: Admin can correct a mismatched or unmatched nickname during staging before committing the import
- [ ] **KHT-05**: Same rank-based scoring as Tasks 2 and 3 applies to committed Kahoot results

### Betting (BET)

- [ ] **BET-01**: Team leader may submit exactly one bet on the team's final rank, before the first leaderboard release (enforced by a unique constraint, one bet per team)
- [ ] **BET-02**: Bet is judged against the team's rank computed BEFORE the bet delta is applied, using the ranking comparator without the bet-bonus rule (no bonus exists yet at that point)
- [ ] **BET-03**: Exact rank hit awards +10; any other outcome awards −10; no bet placed awards 0

### Scoring & Ranking Ledger (SCORE)

- [ ] **SCORE-01**: All scoring changes are stored as an append-only ledger of score_events (task points, corrections, bet deltas); no mutable running totals exist
- [ ] **SCORE-02**: Every ledger-writing action is idempotent at the database level (unique constraint or idempotency key) so a retried request never double-applies
- [ ] **SCORE-03**: The leaderboard is always computed by deriving from the score_events ledger, never read from a stored total
- [ ] **SCORE-04**: Corrections to any score are new compensating events with a required reason, never edits or deletes of existing events
- [ ] **SCORE-05**: Final score per team = sum of task rank points + bet delta
- [ ] **SCORE-06**: Ranking comparator (`lib/ranking.ts`) is a pure, unit-tested function implementing: (1) higher total wins; (2) if tied, a team whose total includes a WINNING bet bonus ranks BELOW an equally-totaled team with no bonus; (3) if still tied, compare Task 4 rank points, then Task 3, then Task 2, then Task 1, higher wins at first difference; (4) if still tied, mark the tie unresolved for admin decision
- [ ] **SCORE-07**: Comparator has an exhaustive test suite covering every tiebreak level, the asymmetric bet-bonus rule, and the rank-8/rank-9 Round 2 qualification boundary specifically
- [ ] **SCORE-08**: All scoring constants (Task 1 point defaults, timer durations, weights) live in a single file, `lib/scoring/config.ts`

### Admin & Audit (ADMIN)

- [ ] **ADMIN-01**: Admin can apply a manual score correction with a required reason, recorded as a compensating ledger event
- [ ] **ADMIN-02**: Admin can resolve an unresolved tie manually, with a required reason logged
- [ ] **ADMIN-03**: Every admin and monitor action (check-in override, task open/close, score correction, tie resolution, session revocation) is recorded in a server-side, append-only audit log capturing who, what, what changed, when (server time), and why where applicable
- [ ] **ADMIN-04**: Admin can view the audit log

### Monitor (MON)

- [ ] **MON-01**: Monitor sees live phase and vote counts per Task 1 table, without seeing any word, role, or original-team identity
- [ ] **MON-02**: Monitor cannot change scores or results through any action available to them

### Display / Projector (DISP)

- [ ] **DISP-01**: Display role is strictly read-only — no route available to it can mutate any state, and it requires no elevated auth beyond identifying it as the display role
- [ ] **DISP-02**: Projector view shows task rail progress and the leaderboard, reusing the same design language as the rest of the app
- [ ] **DISP-03**: Projector view polls the same server-authoritative state mechanism as other roles, at its own interval

### Design System (DESIGN)

- [ ] **DESIGN-01**: Design tokens (colors, fonts, spacing, animations) are extracted from rc-nitw.org/freshers via the six ground-truth screenshots and Playwright-inspected computed styles, and centralized for reuse
- [ ] **DESIGN-02**: Landing/marketing-style surfaces reproduce rc-nitw.org/freshers layout, copy style, and assets exactly, not as an interpretation
- [ ] **DESIGN-03**: Every other screen (login, task rail, voting, word reveal, results, leaderboard, admin, projector) is built from the same extracted tokens and components, introducing no new colors or fonts
- [ ] **DESIGN-04**: All player-facing layouts are mobile-first; the projector layout is a larger-format variant of the same design language

### Security & Infrastructure (SEC)

- [ ] **SEC-01**: RLS is enabled with deny-all on every table; only server code using the service-role key touches the database
- [ ] **SEC-02**: All secrets (service-role key, etc.) are server-only env vars, never `NEXT_PUBLIC_`
- [ ] **SEC-03**: Every mutating endpoint performs, in order: zod validation, origin/CSRF check, auth check, role check, rate limit check, idempotency check where relevant, DB transaction, audit log write
- [ ] **SEC-04**: Rate limiting and idempotency keys are implemented as Postgres-backed tables (not in-memory), so they remain correct across serverless invocations
- [ ] **SEC-05**: Security headers are present on all responses: strict CSP with nonces, HSTS, X-Content-Type-Options, Referrer-Policy: no-referrer, Permissions-Policy, frame-ancestors none
- [ ] **SEC-06**: Host header is validated against `ALLOWED_HOSTS`; no domain is hardcoded anywhere in the codebase
- [ ] **SEC-07**: No secrets are committed to git; `.env.example` documents required vars only; a gitleaks pre-commit hook and `npm audit` run in CI
- [ ] **SEC-08**: Personal data (email, phone, roll number) is visible to the admin role only; players see first names and crewmate colors only
- [ ] **SEC-09**: No `dangerouslySetInnerHTML`, no `eval`, no inline event handlers anywhere in the codebase
- [ ] **SEC-10**: Database connections use the Supabase Supavisor pooler (transaction mode) suitable for Vercel serverless, not a direct connection

### Testing (TEST)

- [ ] **TEST-01**: Automated tests cover the scoring math (point accrual, rank conversion) end to end
- [ ] **TEST-02**: Automated tests cover Task 1 shuffling (cross-team group formation correctness)
- [ ] **TEST-03**: Automated tests cover task gating (a team cannot skip ahead or enter a closed task)
- [ ] **TEST-04**: Automated tests cover authorization (each role can only do/see what it's permitted to)
- [ ] **TEST-05**: An automated test verifies imposter/crewmate response payloads are identical in shape and comparable in size

## v2 Requirements

Deferred; only built if time remains before 26 Sept.

### Operational Polish (OPS)

- **OPS-01**: Richer visual polish on the admin all-teams dashboard beyond a functional table
- **OPS-02**: CSV/JSON export of the score ledger and audit log for post-event review

## Out of Scope

| Feature | Reason |
|---------|--------|
| Round 2 (physical Among Us game) | Separate, non-web-app event; this app only outputs the qualified top-8 team list |
| Supabase Auth, Supabase Realtime, Supabase Storage | Supabase is used strictly as a Postgres database per explicit stack decision; auth/live-sync/storage are built independently |
| Persistent WebSocket service for real-time updates | Vercel serverless can't hold persistent connections cheaply; a separate always-on service would add a second deployable and contradict "Supabase = DB only"; server-timestamped short polling covers this scale |
| Offline-first / local-first check-in with conflict resolution (CRDTs, local sync) | Single controlled venue, single afternoon, small staff device count; venue-network dry run and a hotspot fallback solve the real risk without distributed sync complexity |
| Full RBAC / permission-management UI (custom roles, invite flows) | 5 fixed roles are known in advance for one event; a generic role editor is speculative generality |
| General-purpose analytics/BI dashboard (charts, trend export) | The ledger + audit log already capture everything needed for a post-event review; a CSV dump (v2, if time allows) is sufficient |
| Configurable, admin-editable workflow builder for task order | The 4-task sequence is fixed and known; configurability is scoped to timers/weights/completion-method only, not the sequence |
| Automatic Kahoot API live-score pull | No stable, documented, third-party-safe API for this exists; file-based export import with human review is the specified and safer path |
| Multi-event / multi-tenant architecture ("run this again next year") | Designing for a hypothetical future event now adds abstraction cost against an immovable 26 Sept deadline; a future rebuild can be scoped later, informed by how this event actually goes |
| The real registration-database adapter implementation | Official DB type unconfirmed; only the adapter interface plus mock and CSV adapters ship now |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REG-01, REG-02, REG-03, REG-04 | Phase 1 | Pending |
| AUTH-01, AUTH-02, AUTH-03, AUTH-04 | Phase 1 | Pending |
| SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10 | Phase 1 | Pending |
| TEST-04 | Phase 1 | Pending |
| DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04 | Phase 2 | Pending |
| SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-07, SCORE-08 | Phase 3 | Pending |
| TEST-01 | Phase 3 | Pending |
| CHK-01, CHK-02, CHK-03, CHK-04, CHK-05, CHK-06 | Phase 4 | Pending |
| GATE-01, GATE-02, GATE-03, GATE-04 | Phase 4 | Pending |
| TEST-03 | Phase 4 | Pending |
| T1-01, T1-02, T1-03, T1-04, T1-05, T1-06, T1-07, T1-08, T1-09, T1-10, T1-11, T1-12, T1-13, T1-14 | Phase 5 | Pending |
| MON-01, MON-02 | Phase 5 | Pending |
| TEST-02, TEST-05 | Phase 5 | Pending |
| EXT-01, EXT-02, EXT-03 | Phase 6 | Pending |
| KHT-01, KHT-02, KHT-03, KHT-04, KHT-05 | Phase 6 | Pending |
| BET-01, BET-02, BET-03 | Phase 7 | Pending |
| ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04 | Phase 7 | Pending |
| DISP-01, DISP-02, DISP-03 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 79 total (corrected from earlier miscount of 62)
- Mapped to phases: 79
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-24*
*Last updated: 2026-09-24 after roadmap creation (8 phases, full coverage)*
