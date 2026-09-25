# Pitfalls Research

**Domain:** Server-authoritative, high-concurrency, single-day live event web app with a social-deduction mini-game and an append-only scoring ledger (Next.js + Supabase-as-DB + Vercel)
**Researched:** 2026-09-24
**Confidence:** MEDIUM-HIGH (architecture/infra pitfalls verified against official Vercel/Supabase docs and community post-mortems; social-deduction-specific leak patterns are MEDIUM confidence, synthesized from general secure-multiplayer-state principles since this exact game type is niche; ledger and ranking pitfalls are HIGH confidence, well-documented patterns)

## Critical Pitfalls

### Pitfall 1: Hidden role/word leaks through payload shape, size, or field presence, not just field values

**What goes wrong:**
The server correctly withholds the actual word/role value from non-owners, but the payload structure itself leaks the answer. Classic examples: an imposter's `/state` response omits a `word` field entirely while a crewmate's includes it (different JSON shape); the imposter payload is 40 bytes smaller because it lacks the field (visible via browser devtools Network tab, no code reading required); a `role` field is sent as `"imposter"` / `"crewmate"` to the client and merely hidden in the UI rather than never sent; or extra debug/dev-only fields (e.g. `__original_team_id`) are attached in non-production builds and forgotten. Any first-year player with devtools open (F12, Network tab) can see this in under a minute. This is the single most embarrassing and most likely-to-be-discovered failure mode for this feature, since curious CS-adjacent freshers WILL open devtools during a hackathon-style event.

**Why it happens:**
Developers build the "give the player their own data" path first, get it working, then bolt on "and hide it from everyone else" as an afterthought, e.g. `if (isOwner) payload.word = word` instead of designing two fully-disjoint response shapes from the start. React state visible in Redux/React DevTools is a second leak vector: even if the network payload is clean, if the client ever *fetches* another player's full record (e.g. a monitor view accidentally reusing the player fetch hook) and stores it in component state, it's inspectable.

**How to avoid:**
- Define two (or N-role) explicit, versioned response schemas with zod (`PlayerSelfView`, `PlayerOtherView`) and validate outgoing payloads against them server side before sending, not just incoming requests.
- Never compute a "full" object server side and strip fields before sending; build the response by selecting only permitted fields into a new object per role, so there is no code path where sensitive data ever touches the serialization boundary for the wrong viewer.
- Assert payload byte-length parity in an automated test: serialize an imposter's own-state response and a crewmate's own-state response with the same table/game and same field ordering, and fail the test if `JSON.stringify` lengths differ by more than a small tolerance (name length variance).
- For any endpoint that returns "other players in my table" (vote screen roster), return only first name + assigned game color + vote status, structurally identical for every player regardless of role, and never include a `role` or `word` key at all in that response type, not even as `null` (a `null` key still telegraphs role via presence in imposter's own payload vs its absence in a crewmate's if inconsistently applied).
- Ban `console.log`/debug fields in any code path touching Task 1 state via lint rule or code review checklist; never ship "dev only" extra fields gated by `NODE_ENV`, since Vercel preview deployments can run in ambiguous env states.

**Warning signs:**
- Any `if (role === 'imposter') { ...omit field... }` conditional inside a response builder instead of two separate builder functions.
- A Task 1 API route that does `SELECT *` from a table row and returns it near-directly to the client.
- No automated test comparing imposter vs crewmate payload shape/size.
- React Query/SWR cache keys that could let a monitor's browser accidentally hold a player's full record in memory.

**Phase to address:**
Task 1 game engine / real-time state phase (the phase implementing the `/state` polling endpoint and per-role response shape), with a dedicated test task before Task 1 is considered done.

---

### Pitfall 2: Timing side channels reveal role even when payload content is identical

**What goes wrong:**
Even with byte-identical payloads, response *latency* can leak information. If the imposter's response requires an extra DB lookup (e.g. to fetch the "similar word" shown to them) while crewmates' does not, the imposter's `/state` calls are measurably slower under repeated polling, an attentive player (or a bored one comparing network waterfall timings across two phones at their table) could notice a pattern. Similarly, vote-tally reveals: if the server computes and caches the winner only after all 6 votes are in, but exposes partial tallies to some viewer roles before others, mistiming a UI transition, the reveal order itself becomes an inference channel.

**Why it happens:**
Developers optimize the "happy path" (crewmate, majority case) and treat the imposter's extra logic (assigning a similar-but-different word) as a special case computed inline, adding variable latency. This is a second-order concern usually caught only by explicitly threat-modeling the hidden-information requirement, not by generic code review.

**How to avoid:**
- Precompute all per-player payloads (word assignment, similar-word lookup) at game/round start server side and store them, so serving `/state` is always a straight row read for every role, no conditional extra computation at request time.
- If any deliberate variable-cost step exists, add a constant-time padding/delay budget so all roles' responses land within the same narrow latency band. For this project's low-stakes scale (curious teenagers, not adversarial pentesters), precomputation alone is sufficient and simpler than constant-time engineering; don't over-invest here, but do the precompute.
- Keep the polling endpoint uniform in DB access pattern across roles (same query shape, same number of round trips) for every viewer type.

**Warning signs:**
- Any per-request branch in the `/state` handler that does extra work only for the imposter.
- No load-test/timing comparison between imposter and crewmate response times during Task 1 QA.

**Phase to address:**
Task 1 game engine phase, same phase as Pitfall 1; verify together since the fix (precompute at round start) addresses both.

---

### Pitfall 3: Race conditions in server-timed phase transitions under ~25 concurrent self-driving tables and ~150 polling clients

**What goes wrong:**
With phases advancing on a server timer (ready check 45s → word reveal 30s → description 60s×2 → vote 30s → second vote 30s → results 15s) and ~150 clients polling independently, two failure modes are common: (a) **double transition**: multiple concurrent poll requests each observe "timer expired, phase not yet advanced" and each attempt to advance the phase and write the transition event, causing the phase to skip ahead twice or duplicate scoring writes; (b) **split-brain phase view**: some clients still polling the old phase's data while others already see the new phase, because phase advancement is computed client-side from a timestamp instead of being a single authoritative server write that all clients read. At 25 concurrent tables each running this independently, the probability of hitting the race at least once during the live event approaches certainty if not explicitly guarded against.

**Why it happens:**
It's tempting to implement "phase X lasts 45s" as "client computes now() - phase_started_at >= 45 and shows next phase," which is fast to build and looks correct in single-player manual testing, but breaks under concurrent multi-client load because there is no single writer. Even a naive server-side check-and-advance (read phase, if expired then update) is vulnerable to the classic read-then-write race without a DB-level guard.

**How to avoid:**
- Phase advancement must be a single idempotent server-side transition, guarded by either a Postgres advisory lock keyed on `game_id`/`table_id`, or a conditional `UPDATE ... WHERE phase = $current_phase AND phase_started_at + interval <= now() RETURNING *` so only one of N concurrent requests actually performs the transition (the others see 0 rows affected and simply re-read the now-updated state).
- Clients never compute "what phase should I be in" from a local timer; they always render whatever phase + `phase_started_at` + `phase_duration` the server returns from `/state`, and use that only to drive a local countdown display, never to decide when to transition.
- Any scoring/side-effect write that happens "on phase advance" (e.g. recording vote results) must be wrapped in the same guarded transition so it fires exactly once, not once per racing request. Use a DB unique constraint or idempotency marker (e.g. a `transitioned_at` column set exactly once) as the enforcement mechanism, not application-level "if" checks alone.
- Load-test this specific path before the event: simulate 6+ clients hammering `/state` and the phase-advance trigger simultaneously against one table and assert the phase advances exactly once and side effects fire exactly once.

**Warning signs:**
- Phase transition logic that lives in a `useEffect`/client timer rather than being derived purely from server response.
- An UPDATE statement for phase transition that isn't conditioned on the current phase value or protected by a lock.
- No test simulating concurrent requests against the same table's phase-advance endpoint.

**Phase to address:**
Task 1 game engine phase (server-timed state machine), explicitly called out as a phase needing concurrency load testing before sign-off, not just functional testing.

---

### Pitfall 4: RLS deny-all + service-role-only pattern silently reintroduces a hole somewhere

**What goes wrong:**
The stated architecture (RLS enabled with deny-all on every table, only server code with the service-role key touches the DB) is sound, but it fails in practice in a few specific, recurring ways: (a) a new table or migration is added later in the project and the developer forgets to `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on it, silently leaving it wide open if any anon/publishable key path ever touches it; (b) a server route is accidentally built using the anon/publishable key (copy-pasted from an earlier prototype or a Supabase quickstart) instead of the service-role key, so it dutifully gets blocked by RLS in a confusing way that looks like "RLS is broken" and tempts a rushed fix of loosening policies instead of fixing the key; (c) the service-role key ends up in a `NEXT_PUBLIC_`-prefixed env var or in client-bundled code through an import that isn't tree-shaken correctly, fully bypassing RLS from the browser; (d) an SSR client is initialized with the service-role key but also wired to forward the user's session cookie, and Supabase evaluates policies based on the effective Authorization header, which unexpectedly is the user's JWT, not the service key, causing either confusing denials or (worse) proceeding with the wrong privilege level.

**Why it happens:**
Supabase's docs and quickstarts default to teaching the anon-key + RLS-policy pattern (auth-based row ownership), which is the opposite of this project's architecture (deny-all + trusted server only). Boilerplate and tutorials pull developers toward the wrong pattern under time pressure, and the two approaches look superficially similar (both involve "RLS policies") but are architecturally inverted.

**How to avoid:**
- Enforce RLS-enabled-on-every-table as a CI check: a migration test or startup script that queries `pg_tables`/`pg_class.relrowsecurity` for every table in the target schema and fails the build if any table has RLS disabled.
- Use exactly one server-side Supabase/Postgres client factory in the codebase (e.g. `lib/db/server-client.ts`) that always uses the service-role key from a server-only env var, and lint/grep in CI for any other `createClient(` call or direct `DATABASE_URL` usage outside that module.
- Never create an anon/publishable key client anywhere in this codebase at all, since auth is custom-built (player code + roll number), not Supabase Auth; if no code path needs the anon key, don't generate one into env, reducing the chance it gets used by accident.
- Grep CI for `NEXT_PUBLIC_` env vars and fail the build if any contain `SERVICE_ROLE`, `SECRET`, or match the Supabase service key format.
- Since RLS is deny-all everywhere and only the service role touches the DB, RLS here is a defense-in-depth backstop, not the primary access control; the primary access control is the app's own role/auth checks (documented per project as required on every mutating endpoint). Don't let "RLS is on" create false confidence that authorization is handled; each endpoint's zod validation, auth check, and role check are what actually enforce access, and RLS only prevents a compromised/misconfigured client path from reading anything at all.

**Warning signs:**
- Any `createClient` call using `NEXT_PUBLIC_SUPABASE_ANON_KEY` anywhere in the repo.
- A migration added without a corresponding RLS-enable statement.
- Confusing "row not found" or empty-result bugs that are actually silent RLS denials from an accidentally anon-keyed client (test this by checking for RLS errors being swallowed as empty arrays rather than surfaced).

**Phase to address:**
Data model / infrastructure setup phase (first phase touching the DB), with the CI check added before any feature phase starts writing endpoints, so the guard exists from the first migration onward.

---

### Pitfall 5: Append-only ledger double-counts or double-applies events on retries

**What goes wrong:**
"Close Task 1" (converting raw points to rank points), "Close Task 2/3" (rank-based scoring), and Kahoot import all involve a single admin action producing a batch of `score_events`. If that action is retried, whether by the admin double-clicking a slow button, a network blip causing the browser to resend the request, or Vercel retrying a function invocation, the events get inserted twice, silently doubling every team's score for that task. Because the ledger is append-only and leaderboards are derived by summing events, this kind of bug doesn't throw an error; it just produces a wrong, plausible-looking leaderboard that nobody notices until someone manually audits totals, likely mid-event when it's hardest to debug.

**Why it happens:**
Append-only/event-sourced systems are often assumed to be "safer" by default because nothing is overwritten, but append-only makes *duplicate inserts* the dominant failure mode instead of lost updates; the safety property (auditability, no silent overwrites) doesn't automatically confer idempotency. Idempotency has to be designed in explicitly; it isn't a side effect of the ledger being append-only.

**How to avoid:**
- Every ledger-writing admin action (close task, apply correction, import Kahoot results, settle bets) must carry a deterministic idempotency key (e.g. `task_id + 'close' + admin_action_nonce`, or simpler: a unique constraint on `(task_id, event_type)` for the one-time "close" events, and `(team_id, task_id, event_type)` for per-team scoring events) enforced at the database level with a unique constraint, not just an application-level "have I already done this" check, since the app-level check itself is racy under retry.
- Wrap the entire "compute all scoring events for this close action" step in a single DB transaction so it's all-or-nothing; a partial failure (crash after inserting 12 of 25 teams' events) must not leave the ledger half-updated, or a retry will double-count the first 12.
- Make the admin "Close Task" button disable itself immediately on click and show a clear "already closed" state on reload, so accidental double-submission from impatient admin clicking is caught at the UI layer too (defense in depth, not the only guard).
- Add an automated test that calls the close-task endpoint twice in a row (simulating a retry) and asserts the resulting ledger and derived leaderboard are identical to a single call, not double.
- For corrections specifically (compensating events with a required reason), the same idempotency discipline applies: a correction should be uniquely identified so retried submissions of "the same correction" don't compound.

**Warning signs:**
- A "close task" or "import results" handler that does a loop of `INSERT INTO score_events` without a surrounding transaction or a uniqueness constraint that would reject a duplicate batch.
- No test exercising a duplicate/retried call to any ledger-writing endpoint.
- Admin UI where the close/submit button remains clickable (not disabled) while the request is in flight.

**Phase to address:**
Scoring & ranking phase (ledger design and the endpoints that write to it), verified again in each task-specific phase (Task 1 close, Task 2/3 close, Kahoot import, betting settlement) since each is a separate write path with its own retry risk.

---

### Pitfall 6: Ranking comparator mishandles ties, especially the asymmetric bet-bonus rule and multi-level fallback

**What goes wrong:**
This project's comparator has four tiebreak levels, including an unusual asymmetric rule (a team with a winning-bet bonus ranks *below* an equal-total team with no bonus), a cascading per-task comparison (Task 4 → 3 → 2 → 1), and an explicit "mark unresolved, admin decides" terminal case. Comparators like this are notoriously easy to get subtly wrong in ways that don't show up until a specific tie pattern occurs live: (a) implementing the bet-bonus rule as a simple sort key instead of only applying when totals are exactly equal, causing it to incorrectly affect non-tied comparisons; (b) using an unstable sort (JS `Array.prototype.sort` is stable since ES2019 in modern engines, but a hand-rolled comparator returning 0 in the wrong case can still produce nondeterministic ordering across renders); (c) computing "rank" as array index + 1 rather than from the comparator's actual tie groups, so two teams the comparator considers equal (genuinely unresolved tie) still get displayed as e.g. rank 5 and rank 6 instead of both being flagged; (d) the Task 2/3 rank-based scoring's own tie handling ("ties share the average of the points they span") being a *second*, independent tie-computation living in a different part of the codebase from the top-level leaderboard comparator, and the two not being tested together, so a tie inside Task 3's scoring interacts unpredictably with a tie in the final leaderboard.
Because the same comparator is also used for Round 2 qualification (top 8 teams), a comparator bug at the qualification boundary (rank 8 vs rank 9) has real stakes: it decides which team physically advances to the next event.

**Why it happens:**
Multi-level tiebreak logic with an asymmetric rule is exactly the kind of spec that's easy to describe in English but easy to implement with an off-by-one or wrong-precedence bug, especially under deadline pressure where the "happy path, no ties" case is what gets tested first and ties get treated as an edge case addressed late.

**How to avoid:**
- Implement the comparator as a single, pure, exhaustively unit-tested function in `lib/ranking.ts` (as specified), with test cases for every level explicitly: exact totals equal with one winning bet vs none (must rank the bonus team lower); totals equal, no bonuses, Task 4 differs (decide by Task 4); all four task-rank-points equal (must produce the "unresolved" marker, not a coin-flip order); a tie that straddles the top-8/rest-of-field cutoff (this is the qualification boundary case and deserves its own explicit test).
- Never compute displayed rank as `index + 1` in a sorted array; compute rank groups explicitly from the comparator (teams the comparator returns 0 for are the same rank group) so ties are visually and data-wise represented as ties, not silently split.
- Treat "unresolved tie, admin decides" as a first-class state everywhere ranks are consumed (leaderboard display, Round 2 qualification list, bet settlement), not just a display-layer footnote; qualification for Round 2 must not silently pick one of the tied teams by array order.
- Keep the Task 2/3 "ties share the average of spanned points" logic and the top-level `lib/ranking.ts` comparator covered by an integration test that constructs a realistic multi-task tie scenario end-to-end, not just unit tests of each piece in isolation.
- Because betting is judged against the pre-bet-delta rank using the comparator *without* rule 2, make sure the comparator function takes a flag/parameter for this rather than being duplicated as a second near-identical function that can drift out of sync with the real one.

**Warning signs:**
- Rank displayed as array index rather than from tie-aware grouping.
- No test file for `lib/ranking.ts` covering the bet-bonus asymmetric case or the rank-8/rank-9 qualification boundary.
- Two separate implementations of "compare teams" (one for display, one for qualification) that could diverge.

**Phase to address:**
Scoring & ranking phase, as the primary owner; explicitly re-verified in the betting phase (pre-bet-delta comparator variant) and in any Round 2 hand-off phase (top-8 qualification list).

---

### Pitfall 7: Admin/staff tooling fails exactly when it's needed most, live, under time pressure, with no fallback

**What goes wrong:**
Admin surfaces built and tested calmly during development (task open/close, check-in, tie-break decisions, corrections) behave very differently in the hands of a stressed volunteer at 5:15pm with 150 teenagers waiting. Common live-event failure patterns: (a) a slow or ambiguous-feedback action (e.g. "Close Task 1") that doesn't clearly confirm success, so the admin clicks it again "just in case," triggering Pitfall 5's double-write risk under exactly the conditions most likely to cause it; (b) check-in flow that requires too many taps/screens per player, so checking in 150 players across ~25 volunteer stations becomes the actual bottleneck of the event, not the game itself; (c) no way to quickly fix a mis-scanned player code or handle a walk-up team member without restarting a flow; (d) the admin's device losing wifi/cell connectivity in a crowded venue (NAB, ~150 phones on the same network) at the exact moment they need to open the next task, with no visible "are we online" indicator and no retry/offline-queue behavior, so the action silently fails and the admin doesn't realize it; (e) tie-break "admin decides" UI not existing yet because it was deprioritized as a rare edge case, only for it to actually occur live with no way to resolve it except a manual DB edit, which breaks the audit-log requirement.

**Why it happens:**
Admin tooling is frequently the last thing built and the least tested, because it isn't the "main product" from a feature-list perspective, yet for this project the admin IS the live-operations control plane for a real, unrepeatable event; there's no "redeploy and try again tomorrow." Developers also tend to test admin flows themselves, calmly, one action at a time, which doesn't surface the concurrent, rushed, multi-volunteer conditions of the actual event.

**How to avoid:**
- Every state-changing admin action must give immediate, unambiguous visual confirmation (success/failure, current state after the action) and must be safe to click multiple times (idempotent, per Pitfall 5) so a nervous double-click never causes harm; disable the button while in flight and show a clear "Task 1 is now closed" confirmation state, not just a toast that can be missed.
- Design check-in for minimum taps per player (ideally a single scan/tap-to-confirm per player, batch "check in all 6" only after a positive per-player confirmation) and load-test the actual UI flow with a stopwatch during a dry run, not just functionally.
- Build the "admin decides" tie-break UI as a real, tested screen before the event, not a theoretical fallback; it should log the decision + reason to the audit log automatically, satisfying the audit requirement without a manual DB edit.
- Add a visible connectivity/last-successful-sync indicator on admin and monitor views (e.g. "last updated 2s ago" from the polling response), so a stale/offline admin screen is obvious rather than silently wrong.
- Run a full dry run (tech rehearsal) with the actual admin team, on the actual venue wifi if possible, before 26 Sept, specifically exercising: check-in under simulated volume, a forced tie scenario, and a deliberate double-click of Close Task.
- Give admins a documented manual recovery path (e.g. a "force re-open task" or "undo last correction via compensating event" action) that stays inside the audited, ledger-based system, so a live mistake never requires an out-of-band DB edit that breaks the audit trail.

**Warning signs:**
- Admin actions with no loading/disabled state.
- Check-in flow requiring more than ~2 taps per player in practice.
- No dedicated screen/flow for the "unresolved tie" admin decision path.
- No planned dry run/rehearsal before the event date.

**Phase to address:**
Admin & roles phase, with an explicit "operational dry run" milestone/checklist item scheduled shortly before 26 Sept, separate from feature completion.

---

### Pitfall 8: CSV/Kahoot import matching silently drops, duplicates, or mismatches teams

**What goes wrong:**
Matching Kahoot's export to internal teams by "team code nickname" is fragile in predictable ways: players may not type the team code exactly as expected (typos, extra spaces, wrong case, autocorrect on phone keyboards changing characters, players entering their own name instead of the team code despite instructions), Kahoot's export format/column names can vary by export type, and duplicate or near-duplicate nicknames (two teams both effectively entering "TEAM 7" vs "Team7") can cause one team's score to silently overwrite or merge with another's, or a team to be silently excluded from scoring with no error surfaced. Because Task 4 has "one submission per team, made by the team leader," a failed match doesn't just misscore one player, it can zero out an entire team's Task 4 contribution to their final rank right before advancement decisions are made.

**Why it happens:**
CSV/export matching against free-text nicknames is treated as a "small later detail" since the exact matching mechanism is explicitly not finalized yet in this project (per requirements), and free-text human input is inherently messier than the clean internal team-code data model assumes, especially under phones/autocorrect and teenagers moving fast.

**How to avoid:**
- Normalize both sides of the match aggressively before comparing: trim whitespace, collapse internal whitespace, case-fold, strip common punctuation, and consider a fuzzy/edit-distance fallback match with a low threshold, surfaced to the admin for manual confirmation rather than auto-accepted.
- Import must be a preview-then-commit flow: parse the CSV, show the admin a match table (Kahoot nickname → matched team, with unmatched/ambiguous rows highlighted) before writing any score_events, so a bad match is caught by a human before it becomes ledger data.
- Any unmatched or ambiguous row must block-and-flag, never silently skip or silently guess; the import summary should explicitly state "24 of 25 teams matched, 1 unmatched: review before committing."
- Since the leader is the one who submits the team code as a Kahoot nickname, consider having the app pre-generate/display the exact string each leader must enter (and instruct volunteers to say it aloud/show it on screen at Task 4 start) to reduce free-text entry error at the source, rather than only fixing it after the fact at import time.
- Treat the Kahoot import exactly like the Task 2/3/Kahoot ledger-writing paths from Pitfall 5: idempotent, transactional, re-import-safe (running the same CSV import twice must not double-score), since a corrected CSV may need to be re-imported after fixing a nickname issue.

**Warning signs:**
- Import logic that writes score_events directly from parsed CSV rows with no preview/confirmation step.
- String matching done with plain `===` equality rather than normalization.
- No handling path for "0 matches" or "2 possible matches" rows, only the happy path of exact match.

**Phase to address:**
Task 4 (Kahoot) phase, with the preview-then-commit import UI as an explicit acceptance criterion, not an implementation detail left to developer discretion.

---

### Pitfall 9: Vercel + Supabase serverless architecture breaks under sustained polling load from ~150 clients, not at build time but live

**What goes wrong:**
This app's chosen architecture (server-timestamped short polling at 1-2s intervals from ~150 players plus staff/projector, no Supabase Realtime, no persistent WebSocket service) means every poll is a fresh serverless function invocation, potentially a fresh DB connection, at meaningful concurrency. This surfaces three distinct failure modes that are invisible in development/small-scale testing but appear precisely at event scale: (a) **Postgres connection exhaustion**: using the direct Postgres connection string (port 5432) instead of Supabase's pooled connection (Supavisor, port 6543) causes "too many connections" errors once concurrent polling invocations exceed Postgres's connection limit, something that won't reproduce with 1-2 developers testing locally but will reproduce reliably with 25 tables x multiple viewers polling every 1-2s; (b) **stale connections after redeploys**: if the app is redeployed close to the event (a last-minute fix), old serverless function instances can leak pooled connections until they time out, compounding (a) at the worst possible moment; (c) **cold starts adding latency spikes** to individual polls, which, combined with Pitfall 3's phase-transition race, increases the odds of two clients disagreeing about current phase right after a period of low traffic (e.g. right as description-round phase begins and polling resumes at a different cadence).

**Why it happens:**
Serverless-per-request architecture is a good fit for this project's constraints (no second deployable service, keeps server as sole timing authority, works within the explicit "Supabase = DB only" decision) but connection-per-invocation is the well-known cost of that tradeoff, and it's easy to wire up Drizzle/Postgres with the direct connection string during early development (it just works locally) and never revisit it before the connection count matters.

**How to avoid:**
- Use Supabase's pooled connection string (Supavisor, transaction mode, port 6543) for all application query paths from day one, not the direct connection; reserve the direct connection only for migrations/admin scripts run outside the request path.
- Be aware transaction-mode pooling doesn't support named prepared statements; configure Drizzle/the Postgres driver accordingly (disable prepared statement caching or use a driver mode compatible with transaction pooling) so queries don't silently fail under the pooled connection.
- Load-test the actual `/state` polling endpoint at realistic concurrency (simulate ~150 pollers at the target interval, ideally against a staging Supabase project matching the real one's tier) before the event, not just functionally test it with a handful of manual browser tabs.
- Avoid redeploying to production in the hours immediately before the event; if a last-minute fix is unavoidable, verify connection counts return to normal afterward rather than assuming it.
- Confirm the polling endpoint's typical response time comfortably fits within Vercel's function duration limits for the chosen plan (Hobby: 60s without Fluid Compute; Pro: up to 300s) with wide margin, since a `/state` read should be milliseconds, not seconds; if any admin/import endpoint (e.g. Kahoot CSV parse for ~150 rows) could be slow, verify it separately, it's a very different duration profile than the polling endpoint.
- Any in-process rate limiting or caching (e.g. a naive in-memory Map used for rate limiting a mutating endpoint) will not work correctly across serverless invocations, since each invocation may be a cold instance with no shared memory; rate limiting and idempotency guards must live in the database (or a shared store), not in function-local memory.

**Warning signs:**
- Connection string in env pointing at port 5432 rather than the pooler port for application code.
- No load/concurrency test of the polling endpoint before the event.
- Rate limiting implemented with a local `Map`/variable inside a serverless function file.
- No staging-environment rehearsal at realistic team/player counts.

**Phase to address:**
Infrastructure/deployment phase (initial DB client setup) for the connection string choice, with a dedicated load-testing pass scheduled as part of the pre-event operational dry run (same milestone as Pitfall 7's rehearsal).

---

### Pitfall 10: Unique constraints enforced only in application code, not the database, get bypassed under concurrency

**What goes wrong:**
The project explicitly requires unique constraints for one vote per player per game round, one bet per team, one submission per team per task, and one active session per player. If these are implemented as "check then insert" application logic (query for an existing row, insert if none found) rather than actual database-level `UNIQUE` constraints, concurrent requests (two rapid taps on "submit vote," a flaky network causing a retry, two browser tabs) can both pass the "check" step before either completes the "insert," resulting in duplicate votes/bets/submissions that corrupt scoring.

**Why it happens:**
Check-then-insert is the natural way to write this logic and passes single-request manual testing every time; the bug only appears under genuine concurrency, which is exactly the condition present during the live event (150 real users tapping buttons on real, sometimes laggy, phones and often retapping when unsure if their tap registered).

**How to avoid:**
- Every constraint listed in the project's requirements must be an actual Postgres `UNIQUE` constraint (or unique index) at the schema level, with the application catching the resulting constraint-violation error and returning a clean "already voted/already submitted" response, not just an application-level pre-check.
- Treat the DB constraint as the source of truth and the app-level check as a UX nicety (fail fast with a friendly message when possible), never the other way around.
- Add a concurrency test (fire two simultaneous vote/bet/submission requests for the same player/team) asserting exactly one succeeds and the other receives a clean, expected rejection, not a 500 or a silent duplicate.

**Warning signs:**
- Migrations that create these tables without `UNIQUE` constraints matching every rule listed in the project's Active requirements.
- Vote/bet/submission endpoints that do a `SELECT` existence check followed by a separate `INSERT` with no constraint backing it.

**Phase to address:**
Data model / schema phase (should be baked into initial migrations), verified again in each phase that adds a submission-like action (voting, betting, Kahoot submission).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|--------------------|-----------------|-------------------|
| Check-then-insert instead of DB unique constraints | Faster to write initially | Duplicate votes/bets/submissions under real concurrency at the live event | Never for this project's listed unique-constraint requirements |
| Computing displayed rank as sorted-array index | Simple, looks correct for no-tie cases | Silently misrepresents genuine ties, including the rank-8/9 qualification boundary | Never; always derive from tie-aware comparator grouping |
| In-memory rate limiting / idempotency tracking | No extra DB table needed, quick to add | Doesn't work across serverless invocations on Vercel; silently ineffective under load | Never in production paths on Vercel; acceptable only in fully local single-process dev/test scripts |
| Direct Postgres connection string in app code (skip pooler) | Works fine locally, one fewer config step | Connection exhaustion once concurrent load resembles the live event | Never for application query paths; direct connection is fine only for one-off migration scripts |
| Deferring the "admin decides unresolved tie" UI as a theoretical edge case | Ship other features faster | No usable path to resolve a live tie except a manual, unaudited DB edit | Never; build it, even minimally, before the event |
| Manual/ad hoc testing of admin flows by the developer alone | Faster iteration during build | Admin UX failures (slow flows, unclear confirmations) surface for the first time live under real time pressure | Acceptable only if followed by a genuine multi-person dry run before the event; never as the only testing |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|---------------------|
| Supabase (DB only) | Using the anon/publishable key or a session-forwarding SSR client anywhere, bypassing the deny-all + service-role-only design | Single server-only client factory using the service-role key from a server-only env var; never generate/use an anon key at all |
| Supabase connection string | Using the direct (port 5432) connection for application queries in serverless functions | Use the pooled Supavisor connection (port 6543, transaction mode) for all app query paths; direct connection reserved for migrations only |
| Kahoot CSV export | Auto-committing parsed rows straight into score_events with exact-string nickname matching | Preview-then-commit import flow with normalized/fuzzy matching, admin confirmation, and explicit handling of unmatched/ambiguous rows |
| Vercel deploys near event time | Redeploying production shortly before/during the live event "just to fix one thing" | Freeze deploys well before 26 Sept 5pm; if unavoidable, verify connection pool and phase-transition behavior immediately after |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|------------------|
| Direct (unpooled) Postgres connections from serverless functions | Works fine in dev/small tests; "too many connections" errors appear only under real concurrent load | Use pooled connection string (Supavisor) from the start | Once concurrent polling invocations approach the small connection limit typical of hosted Postgres tiers, plausible with ~150 pollers at 1-2s intervals |
| Client-side phase-timer computation instead of server-driven phase | Looks correct with 1 tester; multiple simultaneous tables/clients disagree on current phase or double-fire scoring | Server is sole authority for phase + conditional/locked transition writes | Reliably reproduces once more than a handful of clients poll the same table concurrently near a phase boundary |
| In-memory rate limiting/dedup in a serverless function | Works in a long-lived dev server; silently no-ops in production because each invocation may be a fresh instance | DB-backed idempotency keys / unique constraints | Immediately in production on Vercel; not a "scale" threshold, it's broken by architecture from the first concurrent request |
| Kahoot import processing done synchronously with no preview step | Fine with a hand-checked small test CSV; a real ~25-row export with a few messy nicknames produces silent bad data | Preview-then-commit import UI | The very first time a real, messy Kahoot export is imported without prior review |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Imposter/crewmate payloads differ in shape or size even when values are correctly hidden | Any player with devtools can deduce their own or (via table roster leak) another's role from response structure alone | Two explicit, tested, byte-length-comparable response schemas built by field-selection, not field-stripping |
| Variable-latency server logic for imposter-only computation (e.g. similar-word lookup at request time) | Timing side channel reveals role over repeated polls | Precompute per-player payloads at round start; uniform query shape per request regardless of role |
| Service-role key ending up in a `NEXT_PUBLIC_` env var or bundled client code | Full RLS bypass from any browser; complete DB access exposed publicly | CI grep for `NEXT_PUBLIC_` vars matching service/secret key patterns; single server-only client factory |
| New tables added later without RLS enabled | Silent full-table exposure if any non-service-role path ever touches it | CI check asserting RLS is enabled on every table in the schema |
| Unique-constraint rules (one vote/bet/submission) enforced only in application logic | Duplicate votes/bets/submissions corrupt scoring under concurrent live-event taps | DB-level UNIQUE constraints as source of truth, app-level checks as UX only |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|---------------------|
| Admin action with no clear success/failure confirmation | Nervous admin double-clicks "Close Task," risking duplicate scoring under time pressure | Immediate, unmistakable confirmation state per action; button disabled while in flight; action idempotent regardless |
| Check-in requiring many taps/screens per player | Check-in becomes the real bottleneck for ~150 players across ~25 stations, delaying the whole event | Minimize taps per player; batch-confirm per team only after per-player confirmation; time it in a dry run |
| No visible "last synced" indicator on admin/monitor/projector views | Staff or projector silently shows stale state during a connectivity hiccup, causing wrong live decisions | Show "last updated Xs ago" derived from actual poll success, distinct styling when stale |
| Self-driving Task 1 timers with no visible countdown or table guidance | Players confused about what phase they're in or how much time remains, since there's no per-table referee | Prominent, server-driven countdown and phase label on every player's own screen at all times during Task 1 |
| Tie-break "unresolved, admin decides" surfaced only as a raw data state with no UI | Admin has no way to actually resolve a live tie without a manual DB edit, breaking the audit trail | Dedicated, tested admin screen for tie resolution that writes an audited decision |

## "Looks Done But Isn't" Checklist

- [ ] **Task 1 role/word payload separation:** Often "done" once field *values* are hidden; verify payload *shape and byte length* are identical across roles via an automated test, not just manual inspection of one example.
- [ ] **Phase transitions:** Often "done" once a single-client manual test advances phases correctly; verify with a concurrency test (multiple simultaneous requests) that the transition and its side-effect writes fire exactly once.
- [ ] **RLS deny-all:** Often "done" once the tables built so far have RLS enabled; verify with a CI check across *every* table, re-run after each new migration, not a one-time manual audit.
- [ ] **Ledger writes (task close, corrections, imports):** Often "done" once the happy-path single call produces correct events; verify a duplicate/retried call produces the identical, non-doubled result.
- [ ] **Ranking comparator:** Often "done" once no-tie cases sort correctly; verify every explicit tiebreak level, the asymmetric bet-bonus rule, and the unresolved-tie terminal case with dedicated unit tests, plus the rank-8/9 qualification boundary.
- [ ] **Kahoot import:** Often "done" once a clean, well-formatted sample CSV imports correctly; verify behavior on a messy real-world-shaped CSV (typos, case differences, extra whitespace, a duplicate nickname, a missing team) with a preview step that surfaces problems before commit.
- [ ] **Unique constraints (vote/bet/submission/session):** Often "done" once a single request is correctly rejected on retry; verify with two genuinely concurrent requests that only one succeeds.
- [ ] **Admin action idempotency + confirmation:** Often "done" functionally; verify by actually double-clicking every state-changing admin button during QA and confirming no duplicate effect.
- [ ] **Connection pooling:** Often "done" once the app works locally with 1-2 users; verify the connection string is the pooled one and run a concurrency/load test before trusting it at event scale.
- [ ] **Security headers / CSP / secrets hygiene:** Often "done" once the app loads without console CSP errors; verify systematically against the full documented list (CSP with nonces, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors, ALLOWED_HOSTS validation) rather than checking only the errors that happen to surface in normal browsing.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|--------------------|
| Discovered role/payload leak shortly before or during the event | HIGH (trust/fairness impact if discovered by players during the actual game) | Patch the response builder to field-select rather than field-strip; if discovered mid-event, consider invalidating and rerunning affected table's vote if fairness is compromised; log the incident for the audit trail |
| Double-scored task close due to a race/retry | MEDIUM | Because the ledger is append-only, issue a compensating correction event with a clear reason ("duplicate close event, task X, corrected") rather than editing/deleting the duplicate; never mutate history |
| Discovered unresolved comparator bug affecting Round 2 qualification | HIGH (affects which real teams physically advance) | Freeze the leaderboard, recompute qualification manually with the corrected comparator against the ledger (which remains a reliable source of truth since it's append-only), log the correction and reasoning to the audit log before announcing final qualifiers |
| Kahoot import mismatch discovered after commit | MEDIUM | Because import is (or should be) idempotent, correct the source CSV/matching and re-run the import safely rather than hand-editing team scores; if events were already written wrongly, issue compensating events with a reason, not a silent edit |
| Connection pool exhaustion live during the event | HIGH (event-blocking) | Switch remaining traffic to the pooled connection string if misconfigured (requires a fast redeploy, risky mid-event); mitigate in advance via pre-event load testing so this is never discovered live |
| Admin tie-break needed with no UI built | MEDIUM | If the dedicated screen wasn't built in time, the admin must still log a reason in the audit table directly via a safe, reviewed one-off script rather than editing scores directly; strongly prefer building the UI beforehand to avoid this path entirely |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|------------------|
| 1. Payload shape/size leak | Task 1 game engine phase | Automated test comparing imposter vs crewmate payload shape and byte length |
| 2. Timing side channel | Task 1 game engine phase | Timing comparison test/log review between roles under repeated polling |
| 3. Phase-transition race conditions | Task 1 game engine phase | Concurrency test: N simultaneous requests against one table's phase-advance path, assert single transition |
| 4. RLS/service-role misconfiguration | Data model / infra setup phase | CI check: RLS enabled on every table; grep for anon-key usage and `NEXT_PUBLIC_` secret leakage |
| 5. Ledger double-counting on retry | Scoring & ranking phase (plus each task-close/import phase) | Test: call each ledger-writing endpoint twice, assert identical, non-doubled resulting ledger |
| 6. Ranking comparator tie edge cases | Scoring & ranking phase (plus betting phase for the pre-bet variant) | Unit tests for every tiebreak level, the asymmetric bet-bonus rule, unresolved-tie state, and the rank-8/9 boundary |
| 7. Admin tooling failing live | Admin & roles phase, plus a pre-event operational dry-run milestone | Full team rehearsal exercising check-in volume, a forced tie, and deliberate double-clicks |
| 8. Kahoot import matching failures | Task 4 (Kahoot) phase | Import tested against a deliberately messy sample CSV with a preview/confirm step before commit |
| 9. Vercel/Supabase serverless polling load issues | Infrastructure/deployment phase, verified in pre-event dry run | Load test of `/state` endpoint at ~150-poller equivalent concurrency against the pooled connection |
| 10. App-only unique constraints bypassed under concurrency | Data model / schema phase, verified in voting/betting/submission phases | Concurrency test: two simultaneous requests for the same constrained action, assert exactly one succeeds |

## Sources

- [Supabase Docs: Troubleshooting service role key RLS behavior](https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z)
- [Supabase RLS common mistakes (DEV Community)](https://dev.to/lazydev_oh/supabase-rls-5-common-mistakes-i-broke-and-fixed-myself-38bl)
- [10 Common Supabase Security Misconfigurations](https://modernpentest.com/blog/supabase-security-misconfigurations)
- [Supabase service role key discussion, RLS blocking writes](https://github.com/orgs/supabase/discussions/36423)
- [Vercel: Connection Pooling with Vercel Functions](https://vercel.com/guides/connection-pooling-with-serverless-functions)
- [Vercel: The real serverless compute-to-database connection problem](https://vercel.com/blog/the-real-serverless-compute-to-database-connection-problem-solved)
- [Why serverless functions keep exhausting Postgres connections (DEV Community)](https://dev.to/delehq/why-serverless-functions-keep-exhausting-your-postgres-connections-35gj)
- [Supabase connection pooling with PgBouncer on Vercel (DEV Community)](https://dev.to/mahdi_benrhouma_fe1c6005/supabase-connection-pooling-with-pgbouncer-on-vercel-serverless-1o33)
- [Vercel Functions Limits (official docs)](https://vercel.com/docs/functions/limitations)
- [Vercel: Configuring Maximum Duration for Functions](https://vercel.com/docs/functions/configuring-functions/duration)
- [Event Sourcing Pattern, idempotent event handlers (Microsoft Learn / Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Design a Payment Ledger: Idempotent, Audit-Compliant (DEV Community)](https://dev.to/gabrielanhaia/design-a-payment-ledger-idempotent-audit-compliant-reconciles-to-the-cent-59p7)
- [PostgreSQL Advisory Locks vs SELECT FOR UPDATE (Medium / oneuptime.com)](https://oneuptime.com/blog/post/2026-01-25-use-advisory-locks-postgresql/view)
- [Using PostgreSQL advisory locks to avoid race conditions (FireHydrant)](https://firehydrant.com/blog/using-advisory-locks-to-avoid-race-conditions-in-rails/)
- [Your Redis Leaderboard Is Probably Breaking Ties Wrong (DEV Community)](https://dev.to/trungdlp/your-redis-leaderboard-is-probably-breaking-ties-wrong-39k4)
- [Leaderboard rank-as-array-index bug report (GitHub)](https://github.com/DougZeThug/willyoubemyhero/pull/117)
- [Kahoot player identifier / nickname behavior (Kahoot support)](https://support.kahoot.com/hc/en-us/articles/360036178314-Player-identifier)
- [Kahoot CSV import column-matching requirements (Kahootz KB)](https://help.kahootz.com/en-US/kb/articles/how-to-import-data-from-an-excel-spreadsheet-or-csv-file-into-a-kahootz-database)
- Project-internal source: `.planning/PROJECT.md` (feature requirements, constraints, and architecture decisions that shaped which pitfalls are in-scope)
- Social-deduction hidden-information architecture principle (secure multiplayer state design, general pattern synthesis): asymmetric/hidden-role client views must be constructed server side from field-selection, not field-stripping. MEDIUM confidence, general secure-state-design principle applied to this domain rather than a single authoritative source specific to word-based social deduction games.

---
*Pitfalls research for: server-authoritative live-event web app with social-deduction mini-game and append-only ledger (Project Skeld Round 1)*
*Researched: 2026-09-24*
