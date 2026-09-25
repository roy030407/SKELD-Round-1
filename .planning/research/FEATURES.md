# Feature Research

**Domain:** Event-day team competition / live scoring web app (single-afternoon, staff-operated, ~150 concurrent participants)
**Researched:** 2026-09-24
**Confidence:** MEDIUM

Most findings below are triangulated across multiple live-event tool categories (conference check-in apps, tournament/pickleball scoring platforms, hackathon judging pipelines, Kahoot's own support docs) because no single product matches this exact combination (team check-in + social-deduction mini-game + external-link tasks + Kahoot import + betting + append-only ledger). Where a claim rests on a single source or general pattern-matching rather than a directly comparable product, it is marked LOW and should be treated as a working assumption, not a verified fact.

## Feature Landscape

### Table Stakes (Staff Must Have These or the Event Breaks)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Idempotent check-in (safe to re-tap/re-submit) | Volunteers will double-tap under pressure or retry after a slow network response; without idempotency this creates duplicate check-ins or double-counted arrivals. Conference badge systems use row-level locking (`SELECT FOR UPDATE`) or a unique constraint so a second near-simultaneous check-in returns "already checked in" instead of creating a second record. | LOW | Already implied by PROJECT.md's unique-constraint requirements; extend the same idempotency discipline to the check-in endpoint itself, not just votes/bets. |
| Per-player (not just per-team) check-in granularity | PROJECT.md already specifies this: a team can't proceed until all 6 are checked in. This is table stakes because partial-team arrival is the norm at real events (stragglers, late buses) and staff need to see exactly who's missing, not just "team incomplete." | LOW | Already in requirements. Confirm the admin UI surfaces *which* 6th player is missing, not just a count. |
| Clear, unmissable "checked in" state per team, visible to whoever is running the door | Staff scanning ~25 teams need at-a-glance status, not a table they have to search. Multi-entrance/high-volume check-in guidance consistently calls for a live roster/dashboard showing who has arrived and who is still expected, used to decide when to start. | LOW-MEDIUM | Feeds the "when can we start Task 1" go/no-go decision. |
| Admin can manually open/close each task per team, server-enforced | Already in PROJECT.md. This is the single most load-bearing table-stakes feature: without server-enforced gating, one team's phone racing ahead (or a bug) desyncs the whole event. | MEDIUM | Confirmed table stakes by every "run of show" competition tool that separates "scheduled" from "admin released." |
| Admin override / manual score correction with a reason, never silent edits | Real-time scoring always produces edge cases (dispute, miscount, late submission, technical glitch) that must be fixed live, in front of/under pressure from participants, without the leaderboard looking untrustworthy. Tournament scoring tools (e.g., Scoreholio, GameSheet) universally expose an admin-level "fix a mistake" action distinct from normal scoring input. | MEDIUM | PROJECT.md already specifies this as compensating ledger events with a required reason. This is correct and matches the domain pattern; do not weaken it to allow direct edits under time pressure. |
| Pause/hold control at the sub-unit level (per table/per task), not just global | Live tournament software (Scoreholio's "Pause" button, GameSheet's play/pause clock) exists specifically so staff can halt one unit of play (a court, a game, a clock) without stopping the whole event, to handle a dispute, a late arrival, or a technical hiccup at just that table. | MEDIUM | Maps directly to PROJECT.md's monitor "can pause a table" requirement for Task 1. Confirms this is a known, expected pattern, not a nice-to-have. |
| A visible, at-a-glance "is everything on track" admin view (all teams x all tasks, one screen) | Staff running a live event with 25 teams cannot page through 25 individual team pages during the 3-hour window; they need one screen showing every team's current task/status simultaneously to spot stragglers and bottlenecks. | MEDIUM | This is effectively the admin equivalent of the projector display, but with controls. Should be considered a first-class screen, not an afterthought of the admin panel. |
| Duplicate/late external-task submission handling (Tasks 2, 3, 4) | Whatever completion method is chosen (webhook, leader "done" button, manual entry), staff will encounter teams who claim completion twice, submit after the deadline, or dispute a missed webhook. Idempotent submission handling (accept once, reject/flag repeats) prevents double-scoring. | MEDIUM | PROJECT.md leaves completion method fully configurable; whichever is chosen at build time, submission must be idempotent per team per task (already required as a unique constraint). |
| Kahoot result import with human-reviewable staging before it hits the ledger | Kahoot exports are a flat report (nickname, correct answers, score, "RawReportData Data" columns) with no guaranteed clean mapping to your team roster. An import that goes straight into final scores with no review step is the single most likely source of a live, public leaderboard error. | MEDIUM | See Pitfalls: staff need to see "team code X -> matched Kahoot nickname Y -> N points" before committing, with a way to fix mismatches (typo'd nickname, disconnected player, wrong device) before scores go live. |
| Read-only projector/display view that cannot be mistaken for a control surface | The projector is visible to all ~150 participants; any accidental score change or debug output shown there is a public incident, not a private bug. Must be a strictly separate, unauthenticated-safe, no-action route. | LOW | Already specified in PROJECT.md as a distinct role; confirmed as table stakes by the general pattern of "public display = read-only, always." |
| Basic conflict/exception queue for check-in edge cases | Every check-in operation (registration, conference, race-day bib pickup) hits players who aren't on the list, are on the wrong team, or have a name mismatch. Staff need a fast "resolve manually" path (admin override) that doesn't block the line behind them. | LOW-MEDIUM | Directly relevant given the registration-data adapter is not yet finalized; check-in UI should surface "not found / flag for admin" rather than hard-fail silently. |
| Server-side, append-only audit log of every admin/monitor action | Already required in PROJECT.md ("every admin action is audit logged"). This is table stakes specifically because a competition with real stakes (Round 2 qualification) needs to be defensible after the fact if a team disputes a result. | LOW-MEDIUM | Scope the log to: who, what action, what changed, when (server time), and why (for corrections/overrides/tie-breaks). Keep the schema simple: one events table, not a generic "activity feed" product. |

### Differentiators (What Sets This App Apart, Aligned With Core Value)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Append-only score ledger as the single source of truth for the leaderboard (not mutable totals) | This is the project's stated Core Value: the leaderboard is always correct and defensible even under load, because it's derived, not stored-and-mutated. Most small event tools (spreadsheets, basic scoreboard apps) store a mutable running total, which is exactly what makes disputes unresolvable ("what was the score before that edit?"). An append-only ledger is a genuine differentiator for a stakes-bearing qualification event. | MEDIUM-HIGH | Already the architectural decision in PROJECT.md. Worth calling out explicitly as a differentiator, not just an implementation detail, because it directly answers "why trust this leaderboard" for anyone challenging Round 2 qualification. |
| Deterministic, transparent tie-break comparator with a defined "admin decides" escape hatch, logged | Most casual event scoring tools resolve ties arbitrarily (insertion order, coin flip, "ask the judges") with no audit trail. A published, deterministic 4-level comparator (total -> bet-bonus rule -> Task 4/3/2/1 points -> logged admin decision) is unusually rigorous for a single-afternoon student event and doubles as a fairness guarantee participants can be shown after the fact. | MEDIUM | Already specified in PROJECT.md. Genuine differentiator versus typical "Kahoot leaderboard is the whole scoring system" freshers events. |
| Rank-based betting mechanic on your own team's final placement | This is a genuinely novel engagement feature for this domain, not found in standard event-scoring tools. It adds stakes and narrative to the leaderboard reveal without requiring new infrastructure (it's just another ledger event type). | LOW-MEDIUM (given the ledger already exists) | The asymmetric bet-bonus tie-break rule (winning bet ranks below equal no-bonus total) is a nice fairness touch: it prevents betting from ever letting a team "leapfrog" a team that earned the same score without gambling. Keep this rule visible/explainable, since it is non-obvious. |
| Same-mechanism polling used consistently across every role/timer, scaled by role need | Rather than building bespoke real-time paths per feature (a common source of desync bugs), a single server-authoritative `/state` endpoint polled at different intervals per role is simpler to reason about and matches the "single source of truth" theme. Hackathon leaderboard pipelines commonly reach for this same tradeoff (2s+ polling is "good enough" for anything except sub-second spectator displays), and even where WebSockets are used it's typically only for the venue projector, not for gameplay-critical state. | MEDIUM | Confirms PROJECT.md's polling decision is aligned with real-world practice for this scale; not over-engineering. Keep monitor/projector polling intervals looser than the in-game Task 1 timer polling, which needs to feel synchronous to players. |
| Blind, shape-identical role payloads (imposter vs. crewmate) | Distinguishes this from ad-hoc "just don't show it in the UI" approaches to hidden information, which are trivially defeated by inspecting network responses. Genuinely differentiates the Task 1 mini-game's integrity versus a typical in-person-refereed party game bolted onto an app. | LOW-MEDIUM | Already specified; flag to implementers that this must be verified by inspecting actual response bytes, not just the rendered UI. |

### Anti-Features (Commonly Requested, Often Problematic for a One-Day Event)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Real-time WebSocket push for everything (leaderboard, task rail, admin dashboard) | Feels more "live" and modern; "Kahoot itself uses WebSockets" is a natural comparison point. | Adds a second deployable service or a stateful connection layer that Vercel serverless doesn't hold cheaply; for a single afternoon with ~150 users, 1-2s polling is imperceptible to a human and dramatically lowers operational risk on the one day it must not fail. Real-time dashboard literature explicitly places "updates every 2+ seconds" solidly in polling territory, reserving WebSockets for sub-second needs. | Server-timestamped short polling, already decided in PROJECT.md. Reserve any "snappier" feel purely for the projector's leaderboard reveal moment, and only if profiling shows polling is visibly laggy there, not preemptively. |
| Offline-first / local-first check-in with conflict resolution (CRDTs, local SQLite sync) | Large-conference check-in tools tout offline queueing for bad venue WiFi as a resilience feature. | Enormous complexity (conflict resolution, sync protocols) for a controlled single-venue, single-afternoon event where the admin team controls the network and device count is small (a handful of staff phones/laptops, not thousands of attendee scanners). The failure mode it protects against (venue WiFi dies) is better solved by testing the venue network beforehand and having a wired/hotspot fallback for the few check-in stations, not by building distributed sync. | Verify venue connectivity in a dry run; keep check-in stations on a reliable connection (staff hotspot as fallback); accept that if the network is fully down, it's a whole-event problem no offline queue fixes anyway (Task 1 gameplay itself requires live connectivity). |
| Full RBAC / permission-management UI (roles, custom permission sets, invite flows) | "Role-based views" in the requirements can suggestion-creep into a generic admin-configurable permissions system. | Five roles (player, leader, monitor, admin, display) are fixed and known in advance for one event; a generic role-editor is speculative generality for a set of roles that will never change mid-event and won't be reused for a different event without a rebuild anyway. | Hardcode the 5 roles server-side with a simple enum + middleware check per PROJECT.md's existing plan. No admin UI for defining new roles. |
| General-purpose analytics/reporting dashboard (funnels, historical trends, exportable BI reports) | "We might want to analyze this after the event" is a natural instinct once an audit log and ledger exist. | The audit log and ledger already capture everything needed for a post-event review; building charts, trend lines, or export tooling beyond a simple CSV dump is speculative work for a product with no second event guaranteed to reuse it. | Ship a plain CSV/JSON export of the ledger and audit log for post-event analysis in a spreadsheet if organizers want it. Do not build in-app charts. |
| Configurable, admin-editable workflow builder for task order/rules | PROJECT.md already makes several things "configurable" (timers, scoring weights, Task 2/3 completion method), which can tempt over-generalizing into "let admins reconfigure the whole flow live." | The task order (Check-in -> Task 1 -> Task 2 -> Task 3 -> Task 4) is fixed and known; a drag-and-drop workflow builder is solving a problem that doesn't exist for a single, pre-planned run of show. | Keep the 4-task sequence hardcoded in server logic. Limit configurability to the specific parameters PROJECT.md already lists (timer durations, scoring weights, completion method per task) in `lib/scoring/config.ts`, not the sequence itself. |
| Automatic Kahoot API integration / live score pull during the Kahoot game | Feels more seamless than "wait for the export file and upload it." | Kahoot's public/partner API for pulling live in-game results is not a stable, documented, guaranteed-available integration point for arbitrary third-party apps (Kahoot's own ecosystem is built around export files and the Kahoot Academy/Reports UI, not a general results webhook for external apps), and building against an unofficial/undocumented mechanism risks breaking on event day with no fallback. PROJECT.md already scopes this correctly as file-based import. | Stick with the specified "import from Kahoot export file, match by team code nickname," with a human review/staging step before committing to the ledger (see Table Stakes and Pitfalls). |
| Multi-event / multi-tenant architecture ("what if we run this again next year with different rules") | Reasonable-sounding future-proofing instinct for a club that will likely run freshers events annually. | Designing for hypothetical future events now (configurable event definitions, tenant isolation, reusable team/task templates) adds abstraction cost against a single, immovable 26 Sept deadline, for a "next year" that will have different tasks, different team counts, and possibly a different tech decision entirely. | Build for this one event. If the club wants to reuse it next year, that's a future scoping exercise informed by how this event actually went, not a speculative feature now. |

## Feature Dependencies

```
Server-authoritative role/word/gating enforcement
    └──requires──> Server-side session/auth with roll number + player code

Task gating (Check-in -> T1 -> T2 -> T3 -> T4)
    └──requires──> Per-player check-in with "all 6 in" server check
    └──requires──> Append-only score ledger (so "task closed" state has a durable record)

Task 1 shuffled cross-team groups
    └──requires──> Check-in complete (need real attendance to form valid tables of 6 distinct teams)
    └──requires──> Server-authoritative /state polling (self-driving timers with no per-table referee)

Task 1 scoring -> rank points conversion
    └──requires──> Append-only ledger (raw points as events, converted at "Close Task 1")

Betting
    └──requires──> Append-only ledger (bet is itself a ledger event type)
    └──requires──> A defined "before first leaderboard release" cutoff, which itself
                    requires Task 1-4 scoring pipeline to exist first (bet resolves against
                    the pre-bet-delta rank)

Kahoot import
    └──requires──> Team roster / team-code mapping already established at check-in
    └──requires──> Human-review staging step (Table Stakes) before ledger commit

Admin score correction / tie-break override
    └──requires──> Append-only ledger (corrections are compensating events, not edits)
    └──requires──> Audit log (every correction must log a reason)

Monitor "pause a table" (Task 1)
    └──requires──> Server-authoritative /state (pause is a server-side state flag, not client-local)

Projector display
    └──enhances──> Leaderboard, task rail (read-only consumer, adds no new state)

Real-time WebSocket push [ANTI-FEATURE] ──conflicts──> Vercel + Supabase-as-DB-only architecture
Offline-first sync [ANTI-FEATURE] ──conflicts──> Server-authoritative single-source-of-truth model
Configurable workflow builder [ANTI-FEATURE] ──conflicts──> Fixed, server-enforced task sequence
```

### Dependency Notes

- **Task gating requires per-player check-in:** PROJECT.md's rule that a team can't proceed until all 6 are checked in means check-in must be fully built and reliable before any task-gating logic can be meaningfully tested end-to-end; check-in should land in an early phase.
- **Betting requires the full scoring pipeline to exist first:** the bet is judged against a rank computed before the bet delta, using the ranking comparator "without rule 2." That means the ranking comparator, and at minimum a partial ledger (enough completed tasks to compute a meaningful pre-bet rank), must exist before betting can be tested, not just built in isolation.
- **Kahoot import requires check-in's team-code mapping:** matching Kahoot nicknames to teams depends entirely on the team-code scheme established at check-in/registration; any inconsistency between the code participants are told to use as their Kahoot nickname and the code stored server-side becomes an import-time bug. This mapping should be locked down and communicated to teams before Task 4, not improvised at import time.
- **Admin corrections require both the ledger and the audit log:** these two table-stakes features are not independent; a correction without a logged reason defeats the purpose of the append-only model, and an audit log without ledger-backed corrections has nothing meaningful to record for scoring.
- **Real-time push conflicts with the chosen architecture:** WebSockets would require either a persistent connection layer Vercel doesn't cheaply support or a second deployable service, which PROJECT.md has already explicitly ruled out. This is listed as a dependency conflict, not just an anti-feature, because it's the kind of "obviously nice" request that could resurface mid-build and should be pointed back at this documented tradeoff.

## MVP Definition

Given this is a single fixed-date event (not an iterative product), "MVP" here means the minimum that must work correctly on 26 Sept, not a phased rollout to real users over time. There is effectively one launch.

### Launch With (Required for 26 Sept)

- [ ] Idempotent per-player check-in, gated per team (all 6 required) — event cannot start without this
- [ ] Server-enforced task gating (admin open/close per task, in fixed order) — prevents desync across ~25 teams
- [ ] Task 1 full flow: shuffled groups, self-driving timers, blind role payloads, voting, scoring — the core game mechanic
- [ ] Tasks 2 & 3 completion + rank-based scoring (whichever method is finalized) — required for the 4-task flow
- [ ] Kahoot import with human-review staging before committing to the ledger — required for Task 4, and the single highest-risk import path
- [ ] Append-only score ledger, derived leaderboard, comparator with tie-break rules — the Core Value; nothing else works without this being correct
- [ ] Betting (one bet per team, resolved per the specified rule) — explicitly in scope and simple once the ledger exists
- [ ] Admin score correction + tie resolution, with required reason, audit logged — needed the moment any real-world scoring edge case occurs, which is likely given 25 teams
- [ ] Monitor pause-a-table control for Task 1 — needed the moment any table has a dispute or technical issue during a live, unrefereed mini-game
- [ ] Read-only projector display (task rail, leaderboard) — needed for the public-facing moment of the event
- [ ] Role-based access enforced server-side for all 5 roles — security/privacy requirement, not deferrable

### Add After Validation (Only If Time Remains Before 26 Sept)

- [ ] Richer admin "everything at a glance" dashboard polish (beyond a functional table) — the functional version is Table Stakes; visual polish can trail
- [ ] Configurable 2-session-per-player mode for Task 1 (already scoped as a config flag, but only exercise it if a dry run shows games running short)
- [ ] CSV export of ledger/audit log for post-event review — nice for organizers, not needed live

### Future Consideration (Explicitly Not for This Event)

- [ ] Any of the anti-features above (WebSocket push, offline-first sync, general RBAC editor, analytics dashboard, workflow builder, live Kahoot API pull, multi-event architecture) — all deferred indefinitely, not "v2"; only reconsider if the club commits to running this again as a recurring product

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Per-player check-in with gating | HIGH | LOW-MEDIUM | P1 |
| Server-enforced task gating | HIGH | MEDIUM | P1 |
| Task 1 full mini-game (shuffle, timers, blind payloads, voting) | HIGH | HIGH | P1 |
| Append-only ledger + derived leaderboard + comparator | HIGH | MEDIUM-HIGH | P1 |
| Kahoot import with staged review | HIGH | MEDIUM | P1 |
| Admin correction + tie-break with audit log | HIGH | MEDIUM | P1 |
| Monitor pause-a-table | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Betting mechanic | MEDIUM | LOW-MEDIUM | P1 |
| Projector display | MEDIUM | LOW | P1 |
| Admin all-teams-at-a-glance dashboard | HIGH (operationally) | MEDIUM | P1 |
| Ledger/audit CSV export | LOW-MEDIUM | LOW | P2 |
| Visual dashboard polish beyond functional table | LOW | LOW-MEDIUM | P2 |
| Real-time WebSocket push | LOW (imperceptible gain at this scale) | HIGH | P3 (do not build) |
| Offline-first sync | LOW (controlled venue) | HIGH | P3 (do not build) |
| Configurable RBAC editor | NONE (fixed roles) | MEDIUM-HIGH | P3 (do not build) |
| Analytics/BI dashboard | LOW | MEDIUM | P3 (do not build) |
| Workflow builder for task sequence | NONE (fixed sequence) | HIGH | P3 (do not build) |

**Priority key:**
- P1: Must have for the 26 Sept event
- P2: Should have if time allows, non-blocking
- P3: Explicitly out of scope, do not build

## Competitor Feature Analysis

No single product matches this exact combination. The table below compares the closest analog categories rather than named competitors.

| Feature Area | Tournament scoring apps (Scoreholio, GameSheet) | Conference check-in apps (badge scanners, Engineerica-style) | Hackathon judging pipelines | Our Approach |
|---------|--------------|--------------|--------------|--------------|
| Pause/hold control | Per-court/per-clock pause, admin-only | N/A (no live play to pause) | Rarely present; judging is asynchronous | Per-table pause (Task 1), server-enforced, monitor-accessible |
| Live leaderboard sync | Polling or push depending on tier; push for premium/broadcast views | N/A | 2s+ polling common; WebSocket reserved for venue displays | Uniform server-timestamped polling for all roles, different intervals; matches hackathon-pipeline pattern |
| Score correction | Admin-only "fix a mistake" action, usually as a direct edit | N/A | Judges re-submit; rarely append-only | Compensating ledger events with required reason (stricter than most analogs) |
| Check-in duplicate handling | N/A | Idempotent via row lock / unique constraint, "already checked in" status | N/A | Same idempotency pattern, applied per-player |
| External result import | N/A | N/A | Often manual CSV upload with a review step before publishing | Kahoot export import with mandatory human-review staging before ledger commit |
| Audit trail | Usually minimal or absent | Present for check-in status changes at larger conferences | Present for judge score changes at more mature platforms | Full audit log for every admin/monitor action, ledger-backed, required by PROJECT.md |

## Sources

- [The Live Scoring App User Guide – Sporty](https://support.sportsground.com/hc/en-us/articles/37605605470617-The-Live-Scoring-App-User-Guide) — pause/end-game/delete admin controls (MEDIUM confidence, single source)
- [Pause Button | Scoreholio](https://docs.scoreholio.com/tournament-admin/pause-button) — per-court pause semantics, verified via WebFetch (MEDIUM confidence)
- [Live Scoring - GameSheet Inc. Knowledge Base](https://help.gamesheet.app/article/71-live-scoring) — play/pause clock pattern (LOW-MEDIUM, WebSearch summary only)
- [The Architecture of Real-Time Dashboards: WebSockets, Polling, and Event Sourcing](https://dev.to/3ni8ma/the-architecture-of-real-time-dashboards-websockets-polling-and-event-sourcing-p2o) — polling vs. WebSocket decision matrix (MEDIUM, community source but consistent with general industry consensus)
- [Multi-Track Hackathon Judging Live Leaderboard Pipeline (GitHub)](https://github.com/thuthuzin11/Multi-Track-Hackathon-Judging-Live-Leaderboard-Pipeline) — real hackathon architecture using 2s polling + Redis buffering (MEDIUM, single project but directly analogous scale/domain)
- [Kahoot Help Center: Allow disconnected players to rejoin with prior score](https://support.kahoot.com/hc/en-us/community/posts/115000985067-Allow-disconnected-players-to-rejoin-with-their-prior-score) — confirms disconnect/rejoin data-loss risk (HIGH confidence, official Kahoot source)
- [Kahoot Help Center: Player identifier](https://support.kahoot.com/hc/en-us/articles/360036178314-Player-identifier) — official mechanism for preserving player identity across sessions (HIGH confidence, official source)
- [Kahoot Help Center: How to avoid connectivity issues](https://support.kahoot.com/hc/en-us/articles/115003198708-How-to-avoid-connectivity-issues) — network/websocket disconnect causes (HIGH confidence, official source)
- [kahoot-merger (GitHub)](https://github.com/enics-labs/kahoot-merger) — real-world evidence of name-matching gotchas (nickname format variance, duplicates from re-used reports) (MEDIUM, community tool but directly on-topic)
- [PR #602, OpenStackweb/summit-api: make addBadgeScan idempotent](https://github.com/OpenStackweb/summit-api/pull/602) — concrete idempotency race-condition fix for duplicate check-in scans (MEDIUM-HIGH, real production fix)
- [Offline Badge Scanning: How to Capture Leads When Conference WiFi Fails (Tendro)](https://tendro.com/blog/offline-badge-scanner-conference-wifi) — offline-first check-in pattern, used here as basis for anti-feature reasoning (LOW-MEDIUM, vendor blog)
- [Event App for High-Concurrency (PubNub)](https://www.pubnub.com/blog/event-app-for-high-concurrency/) — dedicated staff network, live dashboard, rehearsal recommendations (LOW-MEDIUM, vendor blog, general best-practice consensus)
- PROJECT.md (this repository) — authoritative source for all already-decided requirements referenced throughout as "already specified"

---
*Feature research for: event-day team competition / live scoring web app*
*Researched: 2026-09-24*
