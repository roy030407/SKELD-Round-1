# Project Skeld: Round 1 Web App

## What This Is

A standalone web app for Round 1 of "Project Skeld," the Robotics Club NIT Warangal freshers event (Among Us theme), running 26 September, 5 PM, at NAB. Roughly 25 teams of 6 first-years (about 150 players) check in, play through four tasks with server-authoritative scoring, and the top 8 teams (48 players) advance to Round 2, a physical Among Us game that is entirely out of scope for this app. The app also serves the admin team running the event and roaming volunteer monitors, plus a read-only projector display.

## Core Value

Every score, rank, and gating decision is computed and enforced server side from an append-only ledger, so the leaderboard is always correct and defensible even under load from ~150 concurrent phones, with the exact visual identity of rc-nitw.org/freshers reproduced throughout.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Registration & Auth**
- [ ] Registration data syncs read-only from the official site's database (adapter layer: mock, csv, and a not-yet-confirmed real adapter)
- [ ] CSV fallback adapter for registration data
- [ ] Players authenticate at check-in with player code + roll number
- [ ] Roles enforced server side: player, leader, monitor, admin, display

**Check-in**
- [ ] Admin/volunteer can check in each of a team's 6 players individually
- [ ] A team can only proceed to a task once all 6 members are checked in (server enforced)

**Task gating & flow**
- [ ] Admin opens/closes each task per team; a team can only enter the next task after the previous one is completed and the admin has opened the next one (server enforced, not client-decided)
- [ ] Round 1 flow enforced in order: Check-in → Task 1 → Task 2 → Task 3 → Task 4

**Task 1 — Imposter Word Game**
- [ ] Players are shuffled into groups of 6 drawn from 6 different teams (one game "table") for Task 1 only, then return to their original teams for scoring and later tasks
- [ ] Each player plays exactly 1 session by default; app supports running 2 sessions per player if games prove short (configurable)
- [ ] Per-game flow: ready check (45s) → word reveal (30s) → 2 description rounds (60s each) → vote (30s) → second vote if needed (30s) → results (15s); all timers configurable, server-timestamped, self-driving on players' phones with no per-table referee
- [ ] Word mode "similar word" for the imposter by default, configurable per session to "blank"
- [ ] Server never sends a player's own imposter/crewmate status, word, or original team identity to anyone but that player; imposter and crewmate payloads have identical shape and comparable size
- [ ] Max 2 voting rounds per game
- [ ] Scoring: imposter caught → each of the 5 crewmates' ORIGINAL teams get crewmate points (default 1 each); imposter survives both votes → imposter's ORIGINAL team gets imposter points (default 3); values configurable in `lib/scoring/config.ts`
- [ ] At "Close Task 1," raw points convert to rank points across all teams
- [ ] Live state (current phase, vote counts) reachable by players, monitors, admins, and the projector via short polling against a server-authoritative `/state` endpoint (no Supabase Realtime, no separate WebSocket service); staff and player views may poll at different intervals but use the same mechanism

**Task 2 — Cipher & Task 3 — Bomb Defusal**
- [ ] Both are external-link tasks; completion method not yet decided, so the app supports all of: external link display, webhook completion, leader "done" button with volunteer verification, and manual time entry by admin/monitor — fully configurable per task, no hardcoded method
- [ ] Rank-based scoring: with N eligible teams, best gets N points, next N−1, etc.; teams that did not finish get 0; ties share the average of the points they span

**Task 4 — Kahoot**
- [ ] One submission per team, made by the team leader
- [ ] Results imported from the Kahoot export file, matched to teams by team code nickname
- [ ] Same rank-based scoring as Tasks 2 and 3

**Betting**
- [ ] Each team may optionally place exactly one bet on its final rank, before the first leaderboard release
- [ ] Bet judged against the team's rank computed BEFORE the bet delta is applied, using the ranking comparator without rule 2 (no bet-bonus tiebreak exists yet at that point)
- [ ] Exact rank hit: +10; otherwise: −10; no bet placed: 0
- [ ] Only the leader can submit the team's bet; one bet per team enforced by a unique constraint

**Scoring & Ranking**
- [ ] All scores stored as an append-only ledger of score_events; leaderboards are always derived from the ledger, never stored as mutable totals
- [ ] Corrections are new compensating events with a required reason, never edits or deletes of existing events
- [ ] Final score = sum of task points + bet delta
- [ ] Ranking comparator (`lib/ranking.ts`), applied to the leaderboard and to Round 2 qualification: (1) higher total wins; (2) if tied, a team whose total includes a WINNING bet bonus ranks BELOW a team with the same total and no bonus (lost bet or no bet = "no bonus"); (3) if still tied, compare Task 4 rank points, then Task 3, then Task 2, then Task 1, higher wins at first difference; (4) if still tied, mark unresolved and let the admin decide, with a reason logged to the audit log
- [ ] All values (Task 1 point defaults, timer durations, scoring weights) centralized in `lib/scoring/config.ts`

**Roles & views**
- [ ] Player: sees only their own team's status, task rail, and (during Task 1) their own game state — never another player's word/role/original team
- [ ] Leader: everything a player sees, plus team-level submission actions (Kahoot result submission, bet placement)
- [ ] Monitor: roaming volunteer view — sees live phase and vote counts per table, can pause a table, flag an issue, leave a review note; cannot see words/roles, cannot change results
- [ ] Admin: full control over check-in, task open/close, score corrections, tie resolution, registration data; every admin action is audit logged
- [ ] Display: read-only projector view (task rail progress, security-map voting motif, leaderboard)

**Design**
- [ ] Exact visual reproduction of rc-nitw.org/freshers: layout, spacing, colors, fonts, animations, copy style, and assets extracted from the live site (via Playwright) and the six ground-truth screenshots in /design-reference/ (ref-01 to ref-06)
- [ ] Every other screen (login, task rail, voting, word reveal, results, leaderboard, admin, projector) built from the same extracted design tokens and components — no new colors or fonts introduced
- [ ] Mobile-first (players are on phones); a larger projector layout reuses the same design language
- [ ] Specific reuse mapping: voting screen reuses the security-map center-circle "EMERGENCY MEETING" motif with one crewmate card per tablemate in game color; word reveal uses an amber panel with a hold-to-reveal round button; leaderboard uses amber panel with ranked bordered cards, gold/silver/bronze accents for top 3; task rail uses the mission-stages colored-label list with status pills; admin reuses the same panels/components with no new colors

**Security (non-negotiable, acceptance criteria)**
- [ ] Server is the sole authority for roles, words, scores, ranks, timing, and gating — client never decides these
- [ ] No player's word/role/original team is ever sent to any browser except that player's own; imposter/crewmate response payloads are shape- and size-identical
- [ ] All time-based ranking uses server timestamps only
- [ ] RLS enabled with deny-all on every table; only server code using the service-role key touches the DB; all secrets are server-only env vars, never `NEXT_PUBLIC_`
- [ ] Every mutating endpoint: zod validation, origin/CSRF check, auth check, role check, rate limit, idempotency where relevant, DB transaction, audit log
- [ ] Unique constraints: one vote per player per game round, one bet per team, one submission per team per task, one active session per player
- [ ] Security headers on all responses: strict CSP with nonces, HSTS, X-Content-Type-Options, Referrer-Policy: no-referrer, Permissions-Policy, frame-ancestors none; Host validated against `ALLOWED_HOSTS`
- [ ] No secrets committed to git; `.env.example` only; gitleaks pre-commit hook; `npm audit` in CI
- [ ] Personal data (email, phone, roll number) visible to admin only; players see first names and crewmate colors only
- [ ] No `dangerouslySetInnerHTML`, no `eval`, no inline event handlers

**Testing**
- [ ] Automated tests for scoring math, Task 1 shuffling, task gating, and authorization/role checks — not skipped

### Out of Scope

- Round 2 (physical Among Us game) — explicitly a separate, non-web-app event; this app only feeds it the qualified top-8 team list
- Real Supabase Auth, Supabase Realtime, Supabase Storage — Supabase is used strictly as a Postgres database; auth, live sync, and any file storage are built independently
- A persistent WebSocket service — ruled out in favor of server-timestamped short polling, to avoid a second deployable service alongside Vercel + Supabase-as-DB
- The real registration-database adapter's implementation — official DB type unconfirmed; only the adapter interface plus mock and CSV adapters ship now, real adapter is plugged in later
- Hardcoded domain anywhere in code — domain is unknown until deploy; everything reads `APP_URL`/`ALLOWED_HOSTS` from env

## Context

- Single-event tool: built for one specific date (26 Sept) and will not need to scale beyond ~25-30 teams / ~150-180 players, but Task 1 does require ~25 fully independent concurrent game sessions running self-driven timers.
- The organizers (admin) are also the primary operators during the live event, so the admin surface needs to be reliable and fast to use under time pressure (task open/close, check-in, tie-break decisions) — this is a live, synchronous, single-afternoon operation, not a long-running SaaS product.
- The design is not a "wireframe from a written description" — it's a pixel-accurate clone of an existing site, extracted from screenshots and Playwright-inspected computed styles, then extended consistently to screens the source site doesn't have (voting, leaderboard, admin, etc).
- Deployment target (Vercel, custom domain) is fixed, but the actual domain is not yet known, so `APP_URL`/`ALLOWED_HOSTS` must be env-driven from day one, not backfilled later.

## Constraints

- **Tech stack**: Next.js (App Router), TypeScript (strict), Tailwind, PostgreSQL on Supabase (database only), Drizzle ORM, zod — fixed by the user, not open for reconsideration without discussion
- **Deployment**: Vercel, custom domain unknown at build time — no hardcoded domains anywhere; env vars only
- **Timeline**: Event is 26 Sept, 5 PM — hard, immovable deadline
- **Scale**: 20-30 teams (~150-180 players); Task 1 must fit in a 10-15 minute window per session
- **Security**: Treat the SECURITY RULES list in the spec as acceptance criteria, not aspirational guidance — every mutating endpoint and every table is in scope for this from the first phase that touches it
- **Third-party services**: No new third-party service may be added without asking the user first (explicit working agreement)
- **Design fidelity**: No creative reinterpretation of rc-nitw.org/freshers — exact reproduction is a hard requirement, verified against screenshots and computed styles, not "inspired by"

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase used only as a Postgres DB (no Supabase Auth/Realtime/Storage) | User's explicit stack decision; keeps auth/session and live-sync logic fully under app control and auditable | — Pending |
| Task 1 live sync via server-timestamped short polling (~1-2s), same mechanism for players/monitor/admin/projector at different intervals | Vercel serverless can't hold persistent WebSocket connections cheaply; a separate always-on WebSocket service would add a second deployable and contradict "Supabase = DB only"; polling is simple, works everywhere on Vercel, keeps the server as sole timing authority | — Pending |
| Append-only score_events ledger, leaderboard always derived, corrections are compensating events | Makes every score change auditable and reversible without data loss; matches the audit-log requirement across the rest of the app | — Pending |
| Ranking comparator with 4-level tiebreak (total → bet-bonus rule → Task 4/3/2/1 rank points → admin-decided unresolved tie) | User-specified exact tiebreak semantics, including the asymmetric bet-bonus rule (a winning bet ranks below an equal total with no bonus) | — Pending |
| Registration data via adapter layer (mock/csv now, real adapter later) | Official registration DB type not yet confirmed; adapter interface lets the rest of the app be built now without blocking on that decision | — Pending |
| Tasks 2 & 3 completion method fully configurable (link/webhook/leader-confirm/manual-entry) | Neither task's actual completion mechanism is decided yet; building all four modes now avoids a rework later | — Pending |
| Design built from extracted tokens (screenshots + Playwright computed styles) rather than a fresh interpretation | User requires pixel-accurate reproduction of rc-nitw.org/freshers as ground truth, not "inspired by" | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-24 after initialization*
