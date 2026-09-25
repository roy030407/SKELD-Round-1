# Project Research Summary

**Project:** Project Skeld: Round 1 Web App
**Domain:** Server-authoritative, ledger-scored, short-polling live event web app (single-day, ~150 concurrent participants)
**Researched:** 2026-09-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a single-day, server-authoritative event application, not an iterative SaaS product: ~25 teams of 6 check in, move through four gated tasks (a social-deduction mini-game, two externally-scored tasks, and a Kahoot-based finale), and are ranked on an append-only score ledger whose top 8 teams advance to a physical Round 2. Experts building this class of system (live tournament scoring, conference check-in, hackathon judging) converge on a small set of proven primitives: server-enforced gating (never client-decided), an insert-only event ledger with derived leaderboards (never a mutable running total), idempotent writes everywhere a flaky phone or nervous admin might retry a submit, and short polling (1-2s) rather than WebSockets/SSE for live sync at this scale. The research strongly validates the architecture already implied by PROJECT.md; nothing in the four research passes suggests a different foundational approach.

The recommended stack is Next.js 16 (App Router, `proxy.ts` not `middleware.ts`) + TypeScript strict + Tailwind v4 + Drizzle ORM over Supabase-as-Postgres-only (via the Supavisor pooler, `prepare: false`, never the Supabase client SDK) + zod + a hand-rolled `jose`-signed opaque-session-cookie auth system backed by a DB `sessions` table. Rate limiting and idempotency are implemented as plain Postgres tables (no new third-party service), consistent with PROJECT.md's working agreement. This stack is well-documented and low-risk; the highest-confidence findings in this research are the framework/library facts (verified live against npm and official docs) and the ledger/event-sourcing pattern (well-established, multi-source corroborated).

The dominant risk is not "will the stack work" but "will it survive the one afternoon it has to work, under real concurrency, with no redo." Four categories of pitfall recur across all four research files and should shape phase sequencing and acceptance criteria: (1) hidden-role payload/timing leaks in Task 1, discoverable by any curious player with devtools open; (2) race conditions in server-timed phase transitions and any check-then-insert logic (votes, bets, submissions, sessions) under ~150 concurrent, laggy, retry-prone phones; (3) ledger idempotency, since append-only systems make duplicate-insert-on-retry the dominant failure mode, not lost updates; and (4) admin/operations tooling failing exactly when needed most, live, under time pressure. All four are addressed by mitigations already achievable within the chosen stack (DB-level unique constraints, conditional/locked UPDATE for phase transitions, field-selection view-model builders, idempotency-key tables, a pre-event dry run) with no new technology required.

## Key Findings

### Recommended Stack

Full detail: `STACK.md`. Framework and library choices are fixed largely by PROJECT.md constraints; the research confirms current versions and fills in the operationally critical details that generic tutorials get wrong for this exact combination (Vercel serverless + Supabase-as-DB-only + Next.js 16).

**Core technologies:**
- Next.js 16.3.6 (App Router, React 19) — `middleware.ts` is deprecated/renamed to `proxy.ts` as of v16.0.0, which is load-bearing for this project's CSP-nonce/host-validation/auth-cookie layer.
- TypeScript 5.x strict + `noUncheckedIndexedAccess` — catches real bugs in the scoring/ranking/shuffling array-indexing code.
- Tailwind CSS v4 (CSS-first `@theme` config) — maps naturally onto literal design tokens extracted from the reference site.
- Drizzle ORM 0.45.x + drizzle-kit 0.31.x over Supabase Postgres via `postgres` (postgres.js) 3.4.x — **must** use Supavisor's pooler (port 6543, `prepare: false`), never the direct connection (IPv6-only by default, unreachable from Vercel serverless without a paid add-on) and never `@supabase/supabase-js` (pulls in Auth/RLS conventions that contradict "DB only, server is sole authority").
- zod v4 — runtime validation on every mutating endpoint and env var validation at boot.
- `jose` + a DB-backed `sessions` table (opaque signed session-id cookie) — not `iron-session` (no server-side revocation), not NextAuth/Auth.js (built for OAuth providers, unnecessary surface area for a bespoke player-code+roll-number credential).
- Rate limiting and idempotency implemented as two plain Postgres tables (`idempotency_keys`, `rate_limit_counters`) — explicitly avoids Upstash Redis / Vercel WAF paid tiers per PROJECT.md's no-new-third-party-service agreement.

### Expected Features

Full detail: `FEATURES.md`. No single comparable product exists; findings are triangulated across tournament-scoring apps, conference check-in tools, and hackathon judging pipelines.

**Must have (table stakes):**
- Idempotent, per-player check-in with "all 6 in" gating, and a live all-teams-at-a-glance admin/staff dashboard.
- Server-enforced task gating (admin open/close per team, fixed order).
- Admin manual score correction / tie resolution with a required, audit-logged reason — never a silent edit.
- Per-table pause/hold control for Task 1 (monitor-accessible).
- Kahoot import with a human-reviewable staging step before anything hits the ledger.
- Read-only, strictly non-actionable projector display.
- Full server-side audit log of every admin/monitor action.

**Should have (differentiators, already scoped in PROJECT.md):**
- Append-only score ledger as the sole source of truth (not a mutable total) — the project's actual "Core Value" and a genuine differentiator versus typical spreadsheet/Kahoot-only freshers events.
- Deterministic 4-level tie-break comparator with a logged "admin decides" escape hatch.
- Rank-based betting on a team's own final placement, with an asymmetric bet-bonus rule that must never let a betting team leapfrog an equal-scoring non-betting team.
- One consistent server-authoritative `/state` polling mechanism reused across all five roles at different intervals, rather than bespoke real-time paths per feature.

**Defer / do not build:**
- WebSockets/SSE for anything (conflicts with the explicit no-persistent-connection, Vercel-serverless architecture).
- Offline-first/local-first sync, a general RBAC editor, an analytics/BI dashboard, or a configurable workflow builder — all speculative generality for a single, fixed, one-day event. A plain CSV/JSON export of the ledger/audit log is the appropriate ceiling for "post-event analysis."

### Architecture Approach

Full detail: `ARCHITECTURE.md`. A four-layer architecture (presentation → API/serialization boundary → pure domain/service layer → Drizzle data-access layer) sits over a Postgres database with RLS deny-all enabled everywhere as defense-in-depth. The domain layer (`lib/domain/`) has zero Next.js imports so the highest-risk logic (gating, Task 1 phase/shuffle engine, ranking comparator) can be unit-tested with plain fixtures. A dedicated `lib/view-models/` layer is the single place per-role response shapes are built by field-selection (never field-stripping), which is the architectural answer to the Task 1 hidden-information requirement. Task 1's phase timer is "self-driving": every poll lazily checks and, if expired, transitions the phase via a conditional/locked UPDATE, with no cron or background worker needed.

**Major components:**
1. **Gating state machine** (`lib/domain/gating.ts`) — sole, re-checked-on-every-request authority for "can this team enter task X now."
2. **Score ledger + ranking comparator** (`score_events` table, `lib/domain/ranking.ts`) — insert-only repository; leaderboard is always derived/summed, never stored; the comparator is a single pure function reused for the display leaderboard, Round 2 qualification, and pre-bet-delta bet resolution.
3. **Task 1 game engine** (`lib/domain/task1/`) — shuffle, poll-triggered phase transitions guarded by optimistic concurrency (conditional `UPDATE ... WHERE phase = $expected`), vote tally.
4. **Role-based view-model builders** (`lib/view-models/`) — the leak-prevention boundary for every "never leak X" requirement in the app.
5. **Registration adapter** — one-way, read-only sync (mock/CSV/real, interface finalized early) that seeds `teams`/`players`; nothing downstream talks to it again.

Recommended build order: schema/migrations/auth foundation → ledger + ranking comparator (generic, dependency-free, build and test first) → gating → Task 1 engine (depends on both) → Tasks 2-4 scoring (reuses the same rank-based path) → betting (depends on ledger + comparator) → admin surfaces + audit log (wraps everything) → design-system integration (parallel track from day one).

### Critical Pitfalls

Full detail: `PITFALLS.md` (10 pitfalls total; top 5 below).

1. **Hidden role/word leaks through payload shape, size, or timing, not just values** — build two explicit field-selected response schemas per Task 1 role and assert byte-length parity in an automated test; precompute all per-player data at round start so no role requires extra request-time computation (which would create a timing side channel).
2. **Race conditions in server-timed phase transitions under ~25 concurrent tables / ~150 pollers** — phase advancement must be a single idempotent, conditionally-guarded server UPDATE (`WHERE phase = $expected`); clients render server state only, never compute their own phase locally; load-test this path with concurrent requests before the event.
3. **Append-only ledger double-counts on retry** — "Close Task," corrections, and Kahoot import are all single admin actions that must be idempotent via a DB-level unique constraint/idempotency key and wrapped in one transaction; test each with a deliberately duplicated call.
4. **Ranking comparator mishandles ties, especially the asymmetric bet-bonus rule** — this comparator decides real Round 2 qualification outcomes (rank 8 vs 9); it needs exhaustive unit tests for every tiebreak level, the unresolved-tie terminal state, and the pre-bet-delta variant, plus rank must be computed from tie-aware grouping, never array index.
5. **Admin/staff tooling fails exactly when needed most, live, under time pressure** — every state-changing admin action needs unambiguous confirmation and must be safe to double-click (idempotent); the "admin decides unresolved tie" screen must be built and tested, not deferred as a theoretical edge case; a full multi-person dry run on venue conditions is required before 26 Sept.

Two additional pitfalls with database-wide implications: **RLS/service-role misconfiguration** (new tables silently unprotected, or an accidental anon-key client bypassing the deny-all design) should be guarded by a CI check from the first migration onward; and **app-only unique constraints bypassed under concurrency** (votes/bets/submissions/sessions) means every "one X per Y" rule in PROJECT.md must be a real DB `UNIQUE` constraint, not a check-then-insert.

## Implications for Roadmap

Based on combined research, the natural phase structure follows the dependency graph identified in ARCHITECTURE.md, reinforced by which pitfalls are cheapest to prevent early versus expensive to retrofit late.

### Phase 1: Foundation, Data Model & Auth
**Rationale:** Everything downstream depends on schema, security headers/CSP, session auth, and role guards; RLS-enabled-on-every-table and DB-level unique constraints (Pitfalls 4 and 10) are cheapest to bake in now and expensive to retrofit once feature phases are underway.
**Delivers:** Drizzle schema + migrations for all tables (with `UNIQUE` constraints for one-vote/one-bet/one-submission/one-active-session rules and RLS enabled on every table from the first migration), `proxy.ts` (CSP nonce, security headers, `ALLOWED_HOSTS`), env/config plumbing, registration adapter interface + mock/CSV implementations, session auth (`jose` + `sessions` table, one-active-session-per-player), a CI check asserting RLS is enabled on every table and that no `NEXT_PUBLIC_` var leaks a service/secret key.
**Addresses:** Auth & Registration requirements, role enforcement (FEATURES.md table stakes).
**Avoids:** Pitfall 4 (RLS/service-role misconfiguration), Pitfall 10 (app-only unique constraints).

### Phase 2: Score Ledger & Ranking Engine
**Rationale:** Per ARCHITECTURE.md's explicit build-order guidance, the ledger and comparator are generic primitives with zero dependency on Task 1 and are consumed by four later features (Task 1 close, Tasks 2-4 scoring, betting, leaderboard); building and unit-testing them early and correctly avoids four ad-hoc implementations converging late under deadline pressure.
**Delivers:** Insert-only `score_events` repository, derived leaderboard query, `lib/domain/ranking.ts` (pure, exhaustively unit-tested 4-level comparator including the asymmetric bet-bonus rule and the unresolved-tie terminal state), idempotency-key infrastructure reused by every later ledger-writing endpoint.
**Uses:** Drizzle repositories, zod schemas, vitest.
**Avoids:** Pitfall 5 (ledger double-counting on retry), Pitfall 6 (comparator tie mishandling), including the rank-8/9 qualification-boundary test case.

### Phase 3: Check-in & Task Gating
**Rationale:** PROJECT.md's "all 6 checked in" rule is a hard prerequisite for any task-gating logic to be meaningfully testable end-to-end; this is also the first place admin-operational UX (Pitfall 7) must be gotten right, since check-in volume is the likely real-world bottleneck of event day.
**Delivers:** Idempotent per-player check-in flow, minimum-taps admin check-in UI, gating state machine (`lib/domain/gating.ts`, re-checked server-side on every task-entry endpoint, never client-decided), admin all-teams-at-a-glance dashboard.
**Implements:** Gating state machine component from ARCHITECTURE.md.
**Avoids:** Pitfall 7 (admin tooling UX), Anti-Pattern 2 from ARCHITECTURE.md (client-side-only gating checks).

### Phase 4: Task 1 — Imposter Word Game Engine
**Rationale:** Depends on gating (must only run while open) and the ledger (its "close" step calls `appendScoreEvent`), so it correctly comes after Phases 2-3, not before. This phase carries the single highest concentration of critical, hard-to-retrofit pitfalls (payload leaks, timing side channels, phase-transition races) and needs dedicated concurrency/security testing before sign-off, not just functional testing.
**Delivers:** Shuffle-into-tables-of-6 algorithm, self-driving server-timed phase machine (ready check → reveal → description rounds → vote(s) → results) with optimistic-concurrency-guarded transitions, vote tally, two field-selected role-view builders (`buildTask1PlayerView`, `buildTask1MonitorView`) with an automated payload-shape/byte-length-parity test, precomputed per-player payloads to eliminate timing side channels.
**Addresses:** Task 1 requirements (FEATURES.md P1: full mini-game).
**Avoids:** Pitfall 1 (payload shape/size leak), Pitfall 2 (timing side channel), Pitfall 3 (phase-transition race conditions) — the research explicitly recommends verifying these together with a dedicated concurrency load test before this phase is considered done.

### Phase 5: Tasks 2, 3 & 4 (Kahoot) Completion and Scoring
**Rationale:** Reuses the rank-based scoring path already exercised by Task 1's conversion step (Phase 4); Kahoot import specifically depends on the team-code mapping locked down at check-in (Phase 3) and should not be improvised at import time.
**Delivers:** Configurable completion methods for Tasks 2/3, idempotent rank-based scoring writes, Kahoot CSV import with a mandatory preview-then-commit staging step (normalized/fuzzy nickname matching, explicit unmatched/ambiguous-row handling, admin confirmation before any `score_events` write), re-import safety.
**Addresses:** Kahoot import table-stakes feature; duplicate/late submission handling.
**Avoids:** Pitfall 8 (Kahoot import matching failures), Pitfall 5 (re-applied to this task's write path — re-import-safe, idempotent).

### Phase 6: Betting, Admin Corrections & Audit Log
**Rationale:** Betting depends on the ledger and ranking comparator (needs the "rank without rule 2" pre-bet-delta calculation) and on a defined leaderboard-release concept, which only exists once Phases 2-5 are in place. Admin correction/tie-resolution UI naturally wraps the features it administers, though the audit-log writer utility itself should be built alongside Phase 2.
**Delivers:** Bet placement (leader-only, one per team) and settlement against the pre-bet-delta rank, admin score-correction flow (compensating ledger events, required reason), a real tested "admin decides unresolved tie" screen (not a theoretical fallback), full audit-log coverage of every admin/monitor mutation.
**Addresses:** Betting mechanic (FEATURES.md differentiator), admin correction/tie-break table stakes.
**Avoids:** Pitfall 6 (bet-bonus asymmetric tie-break variant, tested against the same comparator with a flag, not a drifting duplicate), Pitfall 7 (unresolved-tie UI built ahead of time, not improvised live).

### Phase 7: Monitor & Projector Views, Operational Hardening, Dry Run
**Rationale:** These roles are read-mostly consumers of state that already exists once Phases 1-6 land, so they are correctly sequenced last as an integration/polish phase — but per PITFALLS.md this phase must not be treated as "just UI polish," since connection pooling, load testing, and a full live-conditions rehearsal are irreducible, date-critical requirements, not optional extras.
**Delivers:** Monitor pause-a-table control, read-only projector display, connectivity/last-synced indicators on admin/monitor/projector views, confirmed Supavisor pooled-connection usage end-to-end, a `/state` polling load test at ~150-poller-equivalent concurrency, a full multi-person operational dry run (check-in volume, a forced tie, deliberate admin double-clicks) before 26 Sept, a deploy freeze window immediately before the event.
**Addresses:** Monitor pause control, projector display (FEATURES.md table stakes).
**Avoids:** Pitfall 9 (serverless/Supabase polling load issues), Pitfall 7 (operational dry run milestone).

### Phase Ordering Rationale

- **Ledger and comparator (Phase 2) are placed before any feature that scores anything**, per ARCHITECTURE.md's explicit build-order analysis: they are dependency-free primitives consumed by four later features, so building them once, early, and correctly avoids four separate ad-hoc, deadline-pressured implementations.
- **Gating (Phase 3) is placed before Task 1 (Phase 4)** because Task 1's game engine must only run while the task is open and gating is the authority that enforces that; PROJECT.md's requirement that a team can't proceed until all 6 are checked in also makes check-in a hard prerequisite for meaningfully testing gating end-to-end.
- **Task 1 (Phase 4) is isolated as its own phase** rather than folded into general "task" work because PITFALLS.md concentrates its highest-severity, hardest-to-retrofit findings (payload leaks, timing side channels, phase races) here specifically, and ARCHITECTURE.md confirms it has real dependencies (gating, ledger) that place it correctly in the middle of the sequence, not first.
- **Kahoot import (Phase 5) is placed after check-in** because the team-code-to-Kahoot-nickname mapping depends entirely on data established at check-in (Phase 3); doing this out of order risks an import-time bug from a mapping inconsistency that should have been locked down earlier.
- **Betting (Phase 6) is placed after the full scoring pipeline exists** because it is judged against a rank computed from real task data using the comparator without rule 2 — it cannot be meaningfully tested in isolation before Tasks 1-4's scoring paths produce real ledger data.
- **Operational hardening and the dry run (Phase 7) are placed last but treated as non-optional**, not because they are low-priority, but because PITFALLS.md's most severe operational failure modes (connection exhaustion, admin tooling collapse under pressure) only reproduce at realistic scale/conditions, which requires the rest of the system to exist first — this phase's dry-run milestone should be scheduled with hard lead time before 26 Sept, not squeezed in at the very end.

### Research Flags

Needs research during phase planning (`--research-phase`):
- **Phase 4 (Task 1 engine):** STACK.md and ARCHITECTURE.md both flag the optimistic-concurrency locking approach (conditional UPDATE vs. `pg_advisory_xact_lock`) as MEDIUM/LOW confidence, not a directly-matched published case study; validate the exact locking mechanism with a load-style test during this phase, not just at ship time.
- **Phase 5 (Kahoot import):** the exact Task 2/3 completion method is explicitly left configurable/unfinalized in PROJECT.md, and Kahoot's export column format/nickname behavior is corroborated by community sources rather than a single canonical spec; confirm against a real sample export before finalizing the matching logic.
- **Phase 7 (operational hardening):** the Supabase IPv4/IPv6/pooler behavior and Vercel WAF rate-limiting pricing claims in STACK.md are flagged MEDIUM confidence (WebSearch-summarized, not directly WebFetched in this research pass) — do a quick official-doc spot-check when setting up the production DB connection and before relying on any Vercel-native rate limiting.

Phases with standard, well-documented patterns (research-phase likely unnecessary):
- **Phase 1 (foundation/auth):** Next.js `proxy.ts`/CSP-nonce pattern and Drizzle+Supabase RLS/pooling setup are HIGH confidence, verified directly against live official docs.
- **Phase 2 (ledger/ranking):** the append-only event-sourcing pattern is HIGH/MEDIUM-HIGH confidence, well-documented and multi-source corroborated; the specific tiebreak rules are already fully specified in PROJECT.md, leaving "how to test them exhaustively" as an implementation task, not a research gap.
- **Phase 3 (check-in/gating):** idempotent check-in and server-enforced gating are standard, multiply-corroborated patterns (conference check-in tooling, tournament admin controls) with no open technical unknowns.
- **Phase 6 (betting/admin/audit):** compensating-event corrections and audit logging are standard applications of the Phase 2 ledger pattern; no new technology or unresolved pattern involved.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH for framework/library facts (verified live against npm registry and official Next.js/Drizzle docs); MEDIUM for synthesized patterns (auth library choice, rate-limiting-in-Postgres approach) not codified in one canonical doc |
| Features | MEDIUM — no single directly comparable product exists; findings triangulated across tournament-scoring, conference check-in, and hackathon-judging analogs, several sources are vendor blogs or single-project write-ups |
| Architecture | HIGH for Route Handler/middleware behavior and the event-sourcing/ledger pattern (official docs, multi-source corroboration); MEDIUM/LOW specifically for the exact optimistic-concurrency locking mechanism, flagged as needing a load-test validation pass |
| Pitfalls | MEDIUM-HIGH — infra/architecture pitfalls verified against official Vercel/Supabase docs and real community post-mortems (including a concrete production idempotency-fix PR); social-deduction-specific leak patterns are MEDIUM, synthesized from general secure-multiplayer-state principles since this exact game type is niche |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Supabase IPv4/IPv6 and pooler behavior, and Vercel WAF rate-limiting pricing** (STACK.md): sourced from WebSearch summaries rather than a direct WebFetch of Supabase's own docs in this research pass. Recommend a quick official-doc spot-check during Phase 1/7 when the production `DATABASE_URL` is finalized, since this is load-bearing operationally (wrong connection string reliably causes "too many connections" failures only at event scale, per Pitfall 9).
- **Exact optimistic-concurrency locking mechanism for Task 1 phase transitions** (ARCHITECTURE.md, PITFALLS.md): conditional `UPDATE ... WHERE phase = $expected` vs. `pg_advisory_xact_lock` is reasoned from Postgres fundamentals, not a directly matched published case study for this exact scenario. Validate with an explicit concurrency load test during Phase 4, per the Research Flags above.
- **Task 2/3 completion method** is explicitly left configurable/unfinalized in PROJECT.md itself (webhook, leader "done" button, or manual entry) — this is a project decision to be made, not a research gap per se, but it should be resolved before Phase 5 planning since it affects that phase's idempotency-key design.
- **Kahoot export format specifics**: matching logic is designed from general Kahoot documentation and community tooling (kahoot-merger), not a fresh sample export from this specific event's Kahoot account. Recommend testing the import pipeline against a real, intentionally messy sample export (typos, case differences, a duplicate nickname) before Phase 5 is considered done, per Pitfall 8's "looks done but isn't" checklist item.
- **Real registration adapter** is explicitly not yet built (mock/CSV only, per PROJECT.md); the interface boundary is the load-bearing artifact from Phase 1, and the real adapter's shape should be finalized as early as possible even though its implementation can land later.

## Sources

### Primary (HIGH confidence)
- `nextjs.org/docs/app/guides/content-security-policy` and `.../file-conventions/proxy` — fetched live, version-stamped 16.3.6 — CSP-with-nonce pattern, `proxy.ts` file convention.
- `orm.drizzle.team/docs/rls` and `.../connect-supabase` — fetched live — RLS/pgPolicy primitives, `postgres.js` driver recommendation, `prepare: false` requirement.
- npm registry live queries (2026-09-24) — authoritative current versions for `next`, `drizzle-orm`, `drizzle-kit`, `zod`, `postgres`, `jose`, `tailwindcss`.
- Kahoot Help Center (official) — player identifier mechanism, disconnect/rejoin behavior, connectivity troubleshooting.
- `learn.microsoft.com/.../patterns/event-sourcing` (Microsoft Learn / Azure Architecture Center) — idempotent event handler pattern underlying the ledger design.
- Supabase troubleshooting docs and GitHub discussions on service-role/RLS behavior — corroborated across multiple official and community sources.

### Secondary (MEDIUM confidence)
- Multiple independent Node+Postgres idempotency-key tutorials and brandur.org's Stripe-idempotency writeup — converging `INSERT ... ON CONFLICT` pattern.
- Scoreholio / GameSheet tournament-scoring documentation — pause/hold control, admin score-correction patterns.
- Multi-Track Hackathon Judging Live Leaderboard Pipeline (GitHub, real project) — 2s+ polling as sufficient for this scale/domain.
- PR #602, OpenStackweb/summit-api — real production idempotency fix for duplicate check-in scans, directly analogous concurrency bug.
- Supabase IPv4/IPv6 and Vercel WAF pricing claims — WebSearch-summarized, not directly WebFetched this pass; flagged for spot-check.

### Tertiary (LOW confidence)
- Social-deduction hidden-information leak/timing-side-channel principles — general secure-multiplayer-state design reasoning applied to this domain, no directly comparable published case study for this exact word-based social-deduction game type.
- Conference offline-badge-scanning vendor blog (Tendro) — used only as the basis for the offline-first anti-feature reasoning, not a direct recommendation source.

---
*Research completed: 2026-09-24*
*Ready for roadmap: yes*
