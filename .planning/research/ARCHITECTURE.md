# Architecture Research

**Domain:** Server-authoritative, ledger-scored, polling-synced live event web app (Next.js App Router + Supabase-as-Postgres + Drizzle)
**Researched:** 2026-09-24
**Confidence:** HIGH (Next.js App Router / Route Handler / middleware behavior, event-sourcing/ledger pattern), MEDIUM (specific phase-advance concurrency approach, project-specific sizing), LOW (nothing domain-specific was unverifiable; this is a standard architecture assembled from well-documented primitives)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION (app/)                                │
│  Role-scoped route groups, each a thin client that POLLS its own view:     │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│  │ (player)  │ │ (leader)  │ │ (monitor) │ │ (admin)   │ │ (display) │    │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘    │
│        │             │             │             │             │          │
├────────┴─────────────┴─────────────┴─────────────┴─────────────┴──────────┤
│                    API / SERIALIZATION BOUNDARY (app/api/*)                │
│  Route Handlers = the ONLY place role-filtered DTOs are constructed.       │
│  Every handler: zod parse → session/role check → domain call → per-role    │
│  view-model → Response. Mutating handlers add: origin/CSRF, rate limit,    │
│  idempotency, DB transaction, audit log.                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                    DOMAIN / SERVICE LAYER (lib/domain/*)                   │
│  Pure, framework-agnostic, unit-testable. No Next.js imports.              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Gating      │ │ Task1 Game │ │ Ranking     │ │ Scoring     │            │
│  │ state       │ │ Engine     │ │ comparator  │ │ config      │            │
│  │ machine     │ │ (shuffle,  │ │ (pure sort) │ │ (constants) │            │
│  │             │ │ phases)    │ │             │ │             │            │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘              │
├──────────────────────────────────────────────────────────────────────────┤
│              DATA ACCESS LAYER (lib/db/* — Drizzle repositories)           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ teams /    │ │ game_tables│ │ score_events│ │ audit_log  │             │
│  │ players    │ │ / game_    │ │ (append-    │ │ (append-   │             │
│  │ repo       │ │ players    │ │ only)       │ │ only)      │             │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘              │
├──────────────────────────────────────────────────────────────────────────┤
│           DATA (Supabase Postgres — service-role key, server-only)         │
│  RLS deny-all on every table. teams, players, sessions, team_task_status,  │
│  game_tables, game_players, votes, score_events, bets, audit_log           │
└──────────────────────────────────────────────────────────────────────────┘

Sits alongside, feeding the presentation/domain layers, not inside them:
┌───────────────────┐   ┌────────────────────┐
│ Registration       │   │ (out of band)       │
│ Adapter            │──▶│ seeds teams/players  │
│ (mock/csv/real)     │   │ at boot / admin sync │
└───────────────────┘   └────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| Registration adapter | One-way, read-only source of team/player identity data | `lib/registration/adapter.ts` interface + `mock.ts`, `csv.ts` implementations; a sync script/admin action writes into `teams`/`players` tables — the rest of the app never talks to the adapter directly again |
| Auth/session | Verify player code + roll number, issue a signed httpOnly session cookie carrying `{playerId, teamId, role}` | `lib/auth/session.ts` using a signed/encrypted cookie (e.g. `iron-session`-style or hand-rolled HMAC JWT); every Route Handler resolves the session first, never trusts a client-supplied role/teamId |
| Gating state machine | Server-side, per-team task progression; the sole authority for "can this team enter task X now" | `lib/domain/gating.ts` — pure function over `team_task_status` rows + `task_config` (admin open/close flags) + checked-in count; re-evaluated inside every task-entry endpoint, not just read once for UI |
| Task 1 game engine | Cross-team grouping (shuffle into tables of 6), server-timed phase machine, vote tallying, per-role payload shaping | `lib/domain/task1/` — pure shuffle + phase-transition functions; `game_tables`/`game_players`/`votes` tables; a single polling Route Handler per game that lazily advances an expired phase before responding |
| Score ledger | Append-only, immutable record of every point-affecting event | `score_events` table (insert-only repository, no update/delete path exposed); corrections are new rows with `reason` |
| Leaderboard (derived read model) | Current standings computed from the ledger, never stored as mutable totals | SQL aggregate query (view or parametrized query) producing per-team per-task subtotals, fed into `lib/domain/ranking.ts` in application code for the tiebreak logic SQL can't express |
| Ranking comparator | Pure, deterministic sort implementing the 4-level tiebreak | `lib/domain/ranking.ts` — takes an array of team score summaries, returns a sorted+ranked array; used for leaderboard, Round 2 cutoff, and bet resolution |
| Admin/audit log | Every admin mutation is attributable and reconstructable | `lib/audit/log.ts` — a wrapper that, in the same DB transaction as the mutation, writes an `audit_log` row (actor, action, before/after snapshot or diff, reason) |
| Role-based view models | The single place that decides what a given role is allowed to see | `lib/view-models/*` — `buildTask1PlayerView`, `buildTask1MonitorView`, `buildAdminDashboardView`, etc.; Route Handlers call these instead of ever serializing a raw DB row |

## Recommended Project Structure

```
app/
├── (auth)/                      # login screen (player code + roll number)
├── (player)/                    # player + leader shared shell (leader gets extra actions)
│   ├── checkin/
│   ├── task/[taskKey]/          # task rail landing per task
│   └── task1/game/[gameId]/     # word reveal / description / vote / results screens
├── (monitor)/                   # roaming volunteer view (tables + phase + vote counts only)
├── (admin)/                     # check-in, task open/close, corrections, tie resolution, registration
├── (display)/                   # read-only projector view
└── api/
    ├── auth/                    # POST login, POST logout
    ├── checkin/                 # POST mark player checked in
    ├── tasks/[taskKey]/gate/    # POST admin open/close; GET current gate status
    ├── task1/
    │   ├── shuffle/             # POST admin: form tables once task1 opens
    │   └── games/[gameId]/
    │       ├── state/           # GET polling endpoint (role-filtered, self-advancing)
    │       └── vote/            # POST cast vote
    ├── tasks/[taskKey]/score/   # POST record completion (link/webhook/leader-confirm/manual)
    ├── task1/close/             # POST admin: convert raw points → rank points
    ├── bets/                    # POST place bet (leader only)
    ├── leaderboard/             # GET derived standings (role-filtered)
    └── admin/
        ├── corrections/         # POST compensating score_event
        ├── ties/                # POST admin tie resolution
        └── audit-log/           # GET (admin only)

lib/
├── domain/                      # pure, framework-agnostic business logic — no Next.js imports
│   ├── gating.ts                # task-gating state machine
│   ├── task1/
│   │   ├── shuffle.ts           # cross-team grouping algorithm
│   │   ├── phases.ts            # phase transition table + expiry check
│   │   └── vote.ts              # tally + majority/second-vote logic
│   ├── ranking.ts                # ranking comparator (pure, unit-tested against fixtures)
│   └── scoring/
│       └── config.ts             # all point values, timer durations, centralized
├── db/
│   ├── schema.ts                 # Drizzle schema (single source of truth)
│   ├── migrations/
│   └── repositories/             # teams, players, gameTables, scoreEvents, auditLog, bets
├── registration/
│   ├── adapter.ts                 # interface (Team[], Player[] read-only contract)
│   ├── mock.ts
│   └── csv.ts
├── auth/
│   ├── session.ts                 # issue/verify signed session cookie
│   └── guard.ts                   # requireRole(), requireOwnTeam() helpers for Route Handlers
├── view-models/                   # per-role DTO builders — the leak-prevention boundary
│   ├── task1-player-view.ts
│   ├── task1-monitor-view.ts
│   ├── leaderboard-view.ts
│   └── admin-dashboard-view.ts
└── audit/
    └── log.ts                     # writeAuditLog(tx, {actor, action, before, after, reason})

middleware.ts                      # CSP nonce, security headers, ALLOWED_HOSTS validation
components/                        # design-system components built from extracted tokens
```

### Structure Rationale

- **`lib/domain/` has zero Next.js imports:** the gating machine, the Task 1 shuffle/phase logic, and the ranking comparator are the highest-risk-of-bug, highest-value-to-test-in-isolation pieces of this app. Keeping them framework-agnostic means they can be unit tested with plain fixtures (no DB, no HTTP) in milliseconds, which matters given the hard 26 Sept deadline and the "automated tests for scoring math, shuffling, gating" requirement.
- **`lib/view-models/` is a dedicated leak-prevention boundary:** every "never leak X" requirement in this app (word/role/original team, personal data to non-admins, monitor never sees words) is a serialization concern, not an access-control concern — the data is already loaded server-side to run the game, the danger is what gets put on the wire. Centralizing this in named, individually-testable functions (one per role per screen) makes "does the imposter payload have the same shape as the crewmate payload" a unit-testable contract instead of a hope.
- **Route Handlers, not Server Actions, for anything polled or role-sensitive:** Server Actions are convenient for simple form-like mutations (e.g., bet placement, Kahoot submission) but polling reads and the Task 1 state endpoint benefit from being plain `GET`/`POST` Route Handlers — explicit caching control (`export const dynamic = 'force-dynamic'`), explicit response shaping, and straightforward testing with fixtures/fetch.
- **`score_events` and `audit_log` repositories only expose `insert`, never `update`/`delete`:** this is enforced at the repository layer (TypeScript API surface), not just by convention, so a future contributor cannot accidentally "fix a score" with an UPDATE.

## Architectural Patterns

### Pattern 1: Append-only ledger with a derived read model (event sourcing, lightweight)

**What:** `score_events` is the single write model. Every point-affecting fact (task1 crewmate points, task1 imposter points, task1 rank-point conversion, task2/3/4 rank points, bet delta, corrections) is a row: `{teamId, taskKey, eventType, points, reason, createdBy, createdAt}`. The leaderboard is never stored; it is computed by summing `score_events` per team (optionally per task) and then run through the ranking comparator.
**When to use:** Any time "how did we get this score" must be reconstructable and corrections must not destroy history — which this project requires explicitly (append-only, compensating events, audit trail).
**Trade-offs:** Reads require an aggregation query instead of a single row lookup, but at ~25-30 teams and a few hundred events total for the whole event, this is trivially fast (sub-millisecond aggregation) — the "read model" doesn't need caching or a separate projection table at this scale. Revisit only if this becomes a recurring multi-event platform.

**Example:**
```typescript
// lib/db/repositories/scoreEvents.ts
export async function appendScoreEvent(tx: Tx, event: NewScoreEvent) {
  // insert-only; no update/delete exported from this module
  return tx.insert(scoreEvents).values(event).returning();
}

// lib/domain/ranking.ts
export function rankTeams(summaries: TeamScoreSummary[]): RankedTeam[] {
  return [...summaries]
    .sort(compareTeams) // pure comparator, 4-level tiebreak, unit-tested with fixtures
    .map((team, i, arr) => ({ ...team, rank: computeRankWithTies(arr, i) }));
}
```

### Pattern 2: Self-driving poll-triggered state machine (no cron/WebSocket)

**What:** Every game/task carries `currentPhase`, `phaseStartedAt`, `phaseDurationSeconds` in the DB. The `GET /api/task1/games/[gameId]/state` handler, on every single poll from every client, first checks `now() > phaseStartedAt + phaseDurationSeconds`. If expired, it runs the domain phase-transition function and persists the new phase (with an optimistic-concurrency guard, see Pattern 3) before building the response. If not expired, it just reads and responds.
**When to use:** This is the direct substitute for the explicitly-ruled-out WebSocket/Realtime approach. It works because there are ~25 independent tables each polled every 1-2s by 6+ clients — there is always a poll arriving within the tolerance window to trigger the next phase, so no background scheduler is needed.
**Trade-offs:** Phase advances happen "at the next poll after expiry," not exactly on the timer — with 1-2s polling this is imperceptible, but it means the shortest configured phase duration must stay comfortably above the polling interval (already true: shortest phase is 15-30s vs ~1-2s polling). If a table goes completely idle (all 6 clients' tabs closed/backgrounded), its phase simply won't advance until someone polls again — acceptable for this domain since a human notices a stuck screen.

**Example:**
```typescript
// app/api/task1/games/[gameId]/state/route.ts
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { gameId: string } }) {
  const session = await requireSession(req);
  const state = await advanceIfExpired(params.gameId); // domain call, transactional
  const view = session.role === 'player'
    ? buildTask1PlayerView(state, session.playerId)
    : buildTask1MonitorView(state); // never includes word/role/originalTeam
  return Response.json(view);
}
```

### Pattern 3: Optimistic concurrency for concurrent phase-advance polls

**What:** Because 6+ clients poll the same `game_tables` row concurrently, more than one request can observe "phase expired" simultaneously. Guard the transition with a conditional update: `UPDATE game_tables SET phase = $new, phase_started_at = now() WHERE id = $id AND phase = $expectedOld RETURNING *`. Only one concurrent request's UPDATE actually matches and returns a row; the others see zero rows affected and simply re-read the (now-updated) state instead of transitioning again.
**When to use:** Any server-driven auto-transition triggered by multiple untrusted concurrent pollers (this applies equally to the gating state machine if "all 6 checked in" auto-transitions are ever poll-triggered rather than purely admin-triggered).
**Trade-offs:** Slightly more code than a naive read-then-write, but it is the standard, well-understood way to avoid double-advancing a phase (e.g., skipping straight from `reveal` to `vote2`) under concurrent polling — a real risk at ~150 concurrent phones, not a theoretical one.

## Data Flow

### Gating state machine flow

```
Admin action (check-in a player) ──▶ players.checked_in_at = now()
                                            │
                     recompute (pure fn)    ▼
                lib/domain/gating.ts: teamReadyForTask1(team) ──▶ team_task_status row
                                            │
Admin action (open Task 1 globally/per team) ──▶ task_config.task1.is_open = true
                                            │
Every task-entry Route Handler ──▶ gating.canEnter(teamId, 'task1')  [re-checked server-side,
                                            │                          NEVER trusted from client]
                                            ▼
                                   200 (enter) or 403 (blocked)
```

### score_events → leaderboard flow

```
Task 1 game closes (per table)          Task 2/3/4 completion recorded
   │  imposter caught/survived              │  (link/webhook/leader-confirm/manual)
   ▼                                         ▼
appendScoreEvent({team, task1, raw pts})   appendScoreEvent({team, taskKey, rank pts})
   │
Admin "Close Task 1" (global) ──▶ aggregate raw pts across teams ──▶ rankTeams() ──▶
                                   appendScoreEvent({team, task1, rank pts, type:'conversion'})
   │
Leader places bet ──▶ (before first leaderboard release) appendScoreEvent NOT yet — bet stored
   │                    separately in `bets` table until resolution
   ▼
GET /api/leaderboard ──▶ SUM(score_events.points) per team, per task  [pure SQL aggregation]
   ▼
   lib/domain/ranking.ts: rankTeams(summaries)  [4-level tiebreak, pure, unit-tested]
   ▼
First leaderboard release ──▶ resolve each unresolved bet:
   rankWithoutRule2 = rankTeams(summaries, { includeBetBonus: false })
   appendScoreEvent({team, 'bet', +10 | -10 | 0})
   ▼
Subsequent leaderboard reads now include bet deltas AND the rule-2 tiebreak
```

### Task 1 per-role visibility flow

```
game_players row (server-only): {gameId, playerId, originalTeamId, role: imposter|crewmate, word}
                                            │
GET /api/task1/games/[id]/state ──▶ look up requesting player's own game_players row only
                                            │
                     buildTask1PlayerView(state, requestingPlayerId)
                        - includes: own word, own timer/phase, tablemates' first names + colors
                        - excludes for ALL players (including self about others): others' role,
                          others' word, anyone's original team
                        - shape/size identical whether requester is imposter or crewmate
                                            ▼
                                   JSON response to that player's browser only

Monitor/admin/display polling the SAME game ──▶ buildTask1MonitorView(state)
                        - includes: phase, timer, vote counts, table id
                        - excludes: word, role, original team for every player, always
```

### Key data flows

1. **Registration → identity:** one-way sync (adapter → `teams`/`players` tables) run once at setup/admin trigger; nothing downstream ever calls the adapter again, decoupling the rest of the app from which adapter is live.
2. **Auth → every request:** session cookie resolved once per request into `{playerId, teamId, role}`; every Route Handler derives authorization from this, never from request body/query params claiming an identity.
3. **Ledger → leaderboard:** strictly one-directional and re-derivable; the leaderboard is a query, not a table, so a bug in aggregation can be fixed and re-run without any data loss or migration.
4. **Gating → task screens:** every task screen's availability is re-validated server-side on the actual mutating/entry endpoint, not just used to conditionally render a button client-side.

## Scaling Considerations

This is a single-day, single-event app (~25-30 teams, ~150-180 players, ~25 concurrent Task 1 tables), not a growing SaaS product. The "scaling" axis that matters is concurrent polling load during the ~15 minute Task 1 window, not user growth over time.

| Scale | Architecture Adjustments |
|-------|---------------------------|
| Current (150-180 concurrent users, ~25 polling loops at 1-2s intervals) | Route Handlers + Postgres is comfortably sufficient; no caching layer needed; Vercel serverless functions scale horizontally per-request automatically |
| If reused for a larger multi-round event later (500+ concurrent) | Add short-TTL in-memory/edge caching on read-heavy endpoints (`/leaderboard`, `/display/state`); consider widening the polling interval for non-critical roles (display/monitor) before touching architecture |
| If ever reused as a recurring platform (many events over time) | Only then consider splitting the leaderboard read model into a materialized view refreshed on write, and reconsider whether Supabase-as-DB-only is still the right boundary |

### Scaling Priorities

1. **First (and likely only) real bottleneck:** Postgres connection count from ~25 concurrent 1-2s polling loops plus mutation traffic on serverless (each invocation potentially opening a connection). Mitigate with Supabase's connection pooler (pgbouncer/transaction mode) and Drizzle configured to use it, plus keeping polling intervals no tighter than actually needed (players don't need sub-second precision; 1-2s is already generous).
2. **Second, minor:** the `advanceIfExpired` optimistic-concurrency UPDATE on `game_tables` under simultaneous polls from 6 clients per table — already addressed by Pattern 3, not expected to be a real contention problem at 6 concurrent writers per row.

## Anti-Patterns

### Anti-Pattern 1: Storing a mutable `teams.total_score` column

**What people do:** Update a running total column on every scoring action because it's "faster to read."
**Why it's wrong:** Directly violates the append-only/correction-by-compensating-event requirement; makes corrections destructive and audit trails incomplete; creates a second source of truth that can drift from the ledger.
**Do this instead:** Always derive totals from `score_events` via aggregation. At this scale (a few hundred events total) the aggregation cost is negligible.

### Anti-Pattern 2: Client-side-only gating checks

**What people do:** Hide the "Enter Task 2" button until the client's local state says the team is ready, but don't re-check on the actual task-entry endpoint.
**Why it's wrong:** A player can navigate directly to a task URL or replay a request; the requirement is explicit that gating is server-enforced, not client-decided.
**Do this instead:** Every task-entry/mutation Route Handler independently calls `gating.canEnter()` regardless of what the UI already showed.

### Anti-Pattern 3: One shared "game state" object serialized identically to all roles, filtered client-side

**What people do:** Return the full `game_players` rows (including everyone's word/role/originalTeam) from the API and rely on the client UI to just not display fields it shouldn't.
**Why it's wrong:** The data is sitting in the browser's network tab / React DevTools regardless of what's rendered — this is the single most likely way this app's core security requirement gets violated.
**Do this instead:** Build the response server-side per role via the `lib/view-models/` functions; the secret fields must never leave the server for anyone but their owner.

### Anti-Pattern 4: Scheduling phase advances with a cron job / serverless scheduled function

**What people do:** Reach for Vercel Cron or a background worker to tick timers forward.
**Why it's wrong:** Adds a second trigger path to reason about, complicates "server timestamp is the sole authority for timing" (now there are two writers), and is unnecessary overhead for ~25 tables that are already being polled every 1-2s by their own players.
**Do this instead:** Pattern 2 (self-driving, poll-triggered phase advance) — the existing polling traffic is sufficient to drive the state machine.

### Anti-Pattern 5: Letting SQL `ORDER BY` do the ranking

**What people do:** `SELECT team_id, SUM(points) FROM score_events GROUP BY team_id ORDER BY SUM(points) DESC` and call that "the leaderboard."
**Why it's wrong:** Misses the asymmetric bet-bonus tiebreak (rule 2), the per-task rank-point tiebreak cascade (rule 3), and the admin-unresolved-tie flag (rule 4) — none of which SQL `ORDER BY` alone can express cleanly or testably.
**Do this instead:** SQL only computes the aggregate summaries; `lib/domain/ranking.ts` (pure TypeScript, unit-tested against fixtures covering every tiebreak rule) does the actual ordering.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|----------------------|-------|
| Supabase (Postgres only) | Drizzle ORM over the service-role connection string, server-only env var | RLS deny-all on every table is a defense-in-depth backstop, not the access-control mechanism — the app's own role checks are; only server code ever holds the service-role key |
| Registration source (real adapter, TBD) | Implements the same `RegistrationAdapter` interface as mock/csv | Not built yet by design; the interface boundary (`Team[]`, `Player[]`, read-only) is what must be finalized early so the real adapter is a drop-in later, not a rework |
| Kahoot export (Task 4) | File import matched by team code nickname, not an API integration | One-off admin-triggered parse-and-score action; treat as a special case of the rank-based scoring path, not a new architectural component |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|----------------|-------|
| Presentation (app/) ↔ API (app/api/) | HTTP fetch, polling for reads, POST for mutations | No direct DB access from client components; Server Components may call `lib/db` directly for the *initial* server-rendered page load, but all subsequent polling goes through `app/api/*` so the same role-filtering boundary applies uniformly |
| API layer ↔ Domain layer | Direct function calls, in-process | Domain functions are pure/DB-agnostic where possible; where they need data (gating, ranking) they receive it as arguments rather than querying themselves, keeping them unit-testable without a DB |
| Domain layer ↔ Data access layer | Repository function calls, wrapped in DB transactions for anything touching `score_events` or `audit_log` together | Any mutation that both changes state and should be audited happens in one transaction so the two never diverge |
| Task 1 game engine ↔ Score ledger | One-directional: game engine calls `appendScoreEvent` at "close table" / "close task1"; ledger never calls back into the game engine | Keeps the ledger genuinely generic — it has no knowledge of Task 1's internals, only of `{teamId, taskKey, points, reason}` |
| Gating state machine ↔ everything else | Every other component asks gating "may this happen now," gating asks nothing of anyone | Keeps gating a single, small, highly-testable authority rather than logic scattered across task-specific endpoints |

## Build Order

The question of whether the ledger/ranking engine needs to exist before the Task 1 game engine has a clear answer: **build the ledger + ranking comparator before (or at the very start of, in parallel with) Task 1's game mechanics, and well before Task 1's "close game" step is implemented.**

Reasoning:
- The ledger and comparator are **generic primitives with zero dependency on Task 1** — they operate on `{teamId, taskKey, points}`, not on words/roles/phases. They can be fully built and unit-tested against fixture data with no game, no UI, and no other component existing yet.
- They are also **consumed by four different features** (Task 1 close, Task 2/3/4 scoring, betting, leaderboard/admin dashboards) — building the primitive once, early, and correctly avoids four separate ad-hoc implementations converging late under deadline pressure.
- Task 1's game mechanics (shuffle, phase timers, voting) are **orthogonal complexity** that can be built and manually/automatically tested up through "votes tallied, outcome known" without the ledger existing at all — only the final "award points" call needs it.
- The ranking comparator's tiebreak rules (especially the asymmetric bet-bonus rule) are exactly the kind of subtle, easy-to-get-wrong logic that benefits from being isolated and pinned down with unit tests early, independent of everything else that's still being built.

Recommended sequence:

1. **Foundation:** Drizzle schema for all tables, migrations, `middleware.ts` (security headers, CSP nonce, `ALLOWED_HOSTS`), env/config plumbing, registration adapter interface + mock adapter, seed script.
2. **Auth/session + role guards:** depends only on foundation; everything downstream depends on it.
3. **Score ledger + ranking comparator (+ leaderboard read query):** depends only on foundation (needs `teams`, `score_events` tables); build and unit-test in isolation with fixture data, no game or gating required yet.
4. **Gating state machine:** depends on auth (roles) and team/player data; independent of the ledger except that admin screens will want to show live subtotals eventually.
5. **Task 1 game engine:** depends on gating (must only run while task1 is open) and on the ledger existing (its "close" step calls `appendScoreEvent`) — this is why it comes after step 3, not before.
6. **Tasks 2/3/4 configurable completion + scoring:** depends on ledger + gating; reuses the rank-based scoring path already exercised by Task 1's conversion step.
7. **Betting:** depends on ledger + ranking comparator (needs the "rank without rule 2" calculation) and on the leaderboard-release concept from step 3/6.
8. **Admin surfaces (check-in, open/close, corrections, tie resolution) + audit log:** wraps steps 2-7 with the audit-log transaction pattern; naturally comes after the things it administers exist, though the audit-log writer utility itself can be built alongside step 3.
9. **Design system extraction and screen-by-screen UI:** independent track, can start on day one in parallel (tokens/components don't depend on backend), integrated into each screen as its backing API lands.

## Sources

- [Next.js Route Handlers documentation](https://nextjs.org/docs/app/getting-started/route-handlers) — HIGH confidence, official docs; confirms Route Handlers are not cached by default, making them suitable for polling.
- [Next.js Content Security Policy guide](https://nextjs.org/docs/14/app/building-your-application/configuring/content-security-policy) — HIGH confidence, official docs; confirms nonce-per-request via middleware requires dynamic rendering.
- [How to set up a CSP nonce in Next.js — CentralCSP](https://centralcsp.com/en/blog/csp-nonce-nextjs) — MEDIUM confidence, third-party but consistent with official docs; confirms `strict-dynamic` + nonce pattern via Edge Middleware for the App Router.
- Event sourcing / append-only ledger pattern — MEDIUM-HIGH confidence, synthesized from multiple independent sources ([Event Sourcing with Postgres](https://thebackenddevelopers.substack.com/p/event-sourcing-with-postgres-building), [System Design: Event Sourcing and CQRS](https://www.techinterview.org/post/3233465463/system-design-event-sourcing/), [Event Sourcing From Scratch](https://dev.to/tyson_cung/event-sourcing-from-scratch-why-your-database-has-been-lying-to-you-2eec)) that agree on the core shape: append-only events table, derived/projected read models, rebuildable from the event stream. This project applies a lightweight version (no CQRS split store, single Postgres DB) appropriate to its scale.
- Optimistic concurrency for concurrent state-machine advances and the poll-triggered self-driving timer pattern (Patterns 2-3) — LOW/MEDIUM confidence as a named pattern (not found as a specific published case study matching this exact scenario); this is standard conditional-update (`WHERE ... AND version/state = expected`) practice reasoned from Postgres/Drizzle fundamentals and the project's own explicit constraint (no WebSockets, no separate always-on service). Recommend validating the exact locking approach (conditional UPDATE vs. `pg_advisory_xact_lock`) with a load-style test during the Task 1 phase-engine build.

---
*Architecture research for: server-authoritative polling-synced event web app*
*Researched: 2026-09-24*
