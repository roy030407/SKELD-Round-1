---
status: resolved
trigger: "Re-verify and fix 4 confirmed bugs in this repo, then run a full verification pass against CLAUDE.md"
created: 2026-09-26
updated: 2026-09-26
---

# Debug Session: re-verify-and-fix-4-confirmed

## Symptoms

**Expected behavior:**
- `npm install` succeeds cleanly on a fresh clone with no `--legacy-peer-deps`/`--force`.
- `lib/db/schema/index.ts` and `drizzle/migrations/` are in sync (zero pending diff), and the 5 newer fields (`registration_settings.quizLink`, `.round1Declared`, `.bettingOpen`, `.betsSettled`, `task_submissions.submissionData`) actually exist as columns and work end to end.
- Exactly one implementation of the Task 4 (imposter/shuffle) game exists, served at `/api/tasks/4/*`, satisfying every CLAUDE.md shuffle invariant (exactly-once appearance, no shared original team per game, exactly one imposter per game with each original team supplying exactly one imposter per session, no repeat imposter across sessions, correct word assignment, correct six crewmate colors: red, blue, cyan, yellow, green, purple). `/api/tasks/1/*` serves only the quiz.
- `npm test` (or equivalent) sets required env vars and passes identically on a POSIX shell (not just Windows cmd).

**Actual behavior (as previously confirmed by cloning this exact repo and running it directly: npm install, drizzle-kit generate, vitest):**
1. `npm install` fails with ERESOLVE: `package.json` devDependency `"@types/node": "^20.19.43"` conflicts with `vitest ^5.0.2`'s peer requirement of `@types/node ^22.0.0 || >=24.0.0`.
2. `lib/db/schema/index.ts` defines 5 fields that `npx drizzle-kit generate` reports as un-migrated (it produces a new migration adding exactly these 5 columns), meaning the live DB is missing them.
3. Task 4 (imposter game, last task per CLAUDE.md) has TWO implementations: the correct one (`lib/game/t1-engine.ts`, 334 lines, with word assignment + team-diversity logic) is wired to the OLD `/api/tasks/1/session|vote|state` routes (wrong slot now that Task 1 is the quiz); a NEW naive one at `/api/tasks/4/session` (76 lines) does a plain Fisher-Yates shuffle with no same-original-team check, no one-imposter-per-team guarantee, `word: null` always, and an invalid "orange" color not in the six crewmate colors. `lib/game/t4-engine.ts` is an empty file. Zero test coverage on shuffle invariants or on the live `/api/tasks/4/session` route.
4. `package.json`'s `test` script chains `set VAR=value && ... vitest run` — `set` is a Windows `cmd` builtin, a no-op on Mac/Linux/CI POSIX shells, so env vars never get set there and multiple test files fail with env-validation errors that look like real bugs.

**Error messages:** ERESOLVE peer dependency conflict (bug 1); drizzle-kit reporting pending schema diff (bug 2); env-validation failures in test files under POSIX shells (bug 4).

**Timeline:** Confirmed by an external clone-and-run of this exact repo prior to this session. Repo may have changed since (later commits from Cursor/Antigravity sessions) — re-verification required before any fix, not just re-application of the finding.

**Reproduction:**
1. `rm -rf node_modules package-lock.json && npm install` (no flags) → bug 1.
2. `npx drizzle-kit generate` and inspect output / `npx drizzle-kit check` → bug 2.
3. Read `lib/game/t1-engine.ts`, `lib/game/t4-engine.ts`, and `app/api/tasks/1/{session,vote,state}/route.ts` + `app/api/tasks/4/session/route.ts` → bug 3.
4. Run test script from a POSIX shell (Bash tool, not PowerShell/cmd) → bug 4.

## Current Focus

hypothesis: All 4 findings are as described above; each needs independent re-verification against the current state of the repo (main branch, current HEAD) before fixing, since multiple tools have touched this repo since the findings were made.
test: For each bug, run the exact repro step above against the current repo state.
expecting: Some bugs may already be partially or fully fixed by later commits; some may have changed shape (e.g., different route names, different naive-shuffle details). Confirm exact current state before touching any file.
next_action: All 4 bugs fixed and self-verified (npm install clean, drizzle schema/migration in sync, single consolidated Task 4 engine with passing invariant tests, cross-platform test script). Full suite: 173 passed / 2 skipped, tsc clean. AWAITING HUMAN VERIFICATION before archiving to resolved/ and committing - in particular the user should apply drizzle/migrations/0002_harsh_loners.sql to the real Supabase DB (real credentials weren't available in this environment) and spot-check the Task 4 admin flow live.

## Evidence

- timestamp: 2026-09-26T00:00:00Z
  checked: git status/diff on repo before touching anything
  found: Two UNCOMMITTED working-tree regressions unrelated to intentional fixes existed prior to this session - (1) lib/db/schema/index.ts had the 5 disputed fields (quizLink, round1Declared, bettingOpen, betsSettled, submissionData) DELETED entirely rather than migrated (opposite direction from bug 2's description); (2) app/api/tasks/3/submit/route.ts was emptied to 0 bytes (92 lines deleted). Both looked like accidental/incomplete edits from another tool session, not intentional fixes.
  implication: Stashed both via `git stash push -u` (stash@{0}) to preserve them recoverably, restoring HEAD content for both files as the correct starting point. Proceeding with bug re-verification against restored HEAD state (commit 8a29578).

- timestamp: 2026-09-26T00:05:00Z
  checked: Bug 1 re-verification - `rm -rf node_modules package-lock.json && npm install` (no flags) on restored HEAD state
  found: STILL PRESENT exactly as described. npm ERESOLVE: root project pins `@types/node@^20.19.43`, but `vitest@5.0.2` peer-requires `@types/node@^22.0.0 || >=24.0.0` (transitively via `vite@8.3.1`). Confirmed via full clean install with no flags.
  implication: Fix by bumping @types/node (smaller/less disruptive than downgrading vitest per orchestrator note). Checked npm registry live: latest 24.x is 24.19.0, latest overall is 26.6.3. Chose ^24.19.0 to satisfy vitest's ">=24.0.0" peer range while staying on the same major line as Node types closest to LTS, rather than jumping to 26.
- timestamp: 2026-09-26T00:08:00Z
  checked: Applied fix - bumped `@types/node` to `^24.19.0` in package.json, then re-ran `rm -rf node_modules package-lock.json && npm install` with no flags
  found: Install succeeded cleanly - "added 418 packages, and audited 419 packages" - zero ERESOLVE errors, no --force/--legacy-peer-deps needed. (Unrelated: 4 moderate npm audit vulnerabilities reported, pre-existing in transitive deps, out of scope for these 4 bugs - not touching.)
  implication: Bug 1 RESOLVED and verified.

- timestamp: 2026-09-26T00:15:00Z
  checked: Bug 4 re-verification. Ran `npm test` from Git Bash (POSIX) both with and without a local `.env` present.
  found: NUANCE - `npm test` invoked from Git Bash on this Windows machine did NOT reproduce the failure, because npm's `script-shell` default on Windows is `cmd.exe` regardless of the calling shell, so `set VAR=value` worked fine even "from Git Bash". This masked the bug locally. Proved the real POSIX failure by executing the literal script string via `bash -c '...'` (bypassing npm's Windows cmd.exe re-invocation) and separately via direct `npx vitest run` with no env vars set at all: 3 test files failed (tests/security/host.test.ts and 2 others) with zod env-validation errors (`invalid_type`/`too_small` on DATABASE_URL, SESSION_SECRET, STAFF_*_PASSWORD, etc.) because `set VAR=value` is a no-op under /bin/sh-style POSIX shells (confirmed directly: `set FOO=bar; echo $FOO` -> empty, sets positional param not env var).
  implication: Bug 4 CONFIRMED present in the form that matters (genuine POSIX/CI execution), even though naive `npm test` from Git Bash on Windows didn't show it. Fix: replace the `set VAR=value && ...` chain with `cross-env` (added as devDependency ^10.1.0), which sets all vars in one cross-platform-safe invocation.
- timestamp: 2026-09-26T00:20:00Z
  checked: Applied fix - added `cross-env` devDependency, rewrote package.json `test` script to `cross-env VAR1=... VAR2=... ... vitest run`. Re-verified via `npm test` (no .env present) from Git Bash, AND via literal `bash -c 'export PATH=.../node_modules/.bin:$PATH && cross-env ... vitest run'` to simulate genuine POSIX invocation bypassing npm's Windows cmd.exe wrapper.
  found: Both invocations passed identically - "Test Files 9 passed | 1 skipped (10)", "Tests 33 passed | 1 skipped (34)".
  implication: Bug 4 RESOLVED and verified under genuine POSIX execution, not just Windows-masked `npm test`.

- timestamp: 2026-09-26T00:30:00Z
  checked: Bug 2 re-verification. `.env` has PLACEHOLDER Supabase credentials (identical to `.env.example` template - `postgres.xxxx:password@aws-0-region.pooler...`), not a real reachable database. Ran `npx drizzle-kit generate` with .env vars sourced into shell (drizzle.config.ts imports lib/env.ts which zod-validates all vars, so CLI needs them present manually - drizzle-kit itself doesn't auto-load dotenv).
  found: STILL PRESENT exactly as described - generate produced `drizzle/migrations/0002_harsh_loners.sql` adding exactly the 5 predicted columns: registration_settings.quiz_link (text, default), .round1_declared (bool, default false), .betting_open (bool, default false), .bets_settled (bool, default false), and task_submissions.submission_data (text). All additive, no destructive changes, safe defaults.
  implication: Reviewed migration SQL - correct and minimal. Re-ran `drizzle-kit generate` again: "No schema changes, nothing to migrate" and `drizzle-kit check`: "Everything's fine" - confirms schema.ts and drizzle/migrations/ are now in sync (zero pending diff).
- timestamp: 2026-09-26T00:35:00Z
  checked: Attempted `npx drizzle-kit migrate` against configured DIRECT_URL to actually apply the migration to a live database, per instructions.
  found: Hangs/times out - the host in .env (aws-0-region.pooler.supabase.com / db.xxxx.supabase.co) is a placeholder template value, not a real provisioned Supabase project. NO REAL DATABASE IS AVAILABLE in this dev environment to migrate against, and per project constraints I cannot fabricate/provision real Supabase credentials (third-party service, requires the user).
  implication: LIMITATION - cannot fully satisfy "confirm columns actually exist in the live DB" without real credentials. Verified everything that CAN be verified without a live DB: (1) migration file generated, reviewed, and will be committed; (2) zero pending schema diff per drizzle-kit generate/check; (3) `npx tsc --noEmit` compiles clean across the whole project (all 8 read/write call sites of the 5 fields: app/admin/page.tsx, app/api/admin/betting/route.ts, app/api/admin/quiz/route.ts, app/api/admin/settle-bets/route.ts, app/api/bet/route.ts, app/api/tasks/1/quiz/route.ts, app/api/tasks/2/submit/route.ts, app/tasks/1/page.tsx); (4) full vitest suite (33 passed/1 skipped) still green. Recommend user runs `npm run db:migrate` against the real Supabase project (with real DIRECT_URL) before the event - flagging this clearly in final report rather than silently declaring full end-to-end DB verification that wasn't actually possible.

- timestamp: 2026-09-26T00:45:00Z
  checked: Bug 3 re-verification. Read lib/game/t1-engine.ts (335 lines, confirmed team-diverse partition + word assignment logic, hardcoded taskNumber:1), lib/game/t4-engine.ts (confirmed empty), app/api/tasks/1/{session,vote,state}/route.ts (confirmed wired to t1-engine), app/api/tasks/4/session/route.ts (confirmed naive Fisher-Yates, no team-diversity check, word:null always, colors array included invalid 'orange'), app/api/tasks/4/{vote,state}/route.ts (found these were ALREADY reimplemented independently and reasonably well - correct taskNumber:4 scoring events, DB-level unique-constraint vote dedup via onConflictDoNothing, generic tableSlots.length-based round completion - better than t1-engine's castVote in some respects, but missing taskSubmissions marking on game-over and missing round-advance signaling). Confirmed app/tasks/1/page.tsx already correctly serves ONLY the quiz+betting UI (no imposter code), and app/tasks/4/page.tsx already correctly calls only /api/tasks/4/state and /api/tasks/4/vote - so frontend needed zero changes. Grepped whole repo: nothing else references tasks/1/session|vote|state or t1-engine except those files themselves.
  found: STILL PRESENT exactly as described. DECISION: chose option (a) - moved/rewrote the real shuffle logic into lib/game/t4-engine.ts (not a straight copy - rewrote partitioning to a "largest remaining queue first" greedy algorithm instead of random-subset selection to guarantee invariant "every player appears exactly once" even under unbalanced check-in; added a bipartite perfect-matching step, Kuhn's algorithm, so each table's imposter-providing team is chosen such that every team supplies AT MOST ONE imposter per session, exactly one whenever team sizes are uniform/balanced per Hall's theorem on regular bipartite graphs; added cross-session "everImposter" history lookup so no player repeats as imposter; fixed crewmate colors to the canonical six, never orange). Repointed app/api/tasks/4/session, /api/tasks/4/vote, /api/tasks/4/state to thin wrappers calling t4-engine's createGameSession/castVote/getPlayerGameView respectively (adopting the better DB-safe vote-dedup and generic table-size handling from the pre-existing /api/tasks/4/vote+state code, while adding the taskSubmissions-marking and round-advance signaling they were missing). Renamed SCORING_CONFIG.task1 -> SCORING_CONFIG.task4Imposter (only referenced from the engine itself, safe rename) to remove stale Task-1 naming. Deleted lib/game/t1-engine.ts and app/api/tasks/1/{session,vote,state}/route.ts entirely (confirmed via grep no other references). /api/tasks/1/* now serves only app/api/tasks/1/quiz/route.ts.
  implication: Wrote tests/game/t4-shuffle-invariants.test.ts (140 pure-function tests: team counts 6,8,10,13,17,20,25,31,40 x 15 random-seed runs each, asserting all 7 invariants, plus a dedicated cross-session no-repeat-imposter test, a canonical-colors test, and an unbalanced-check-in stranding test) - all pass. Wrote tests/game/t4-session-integration.test.ts (real DB integration test calling the actual createGameSession() against live inserted teams/players/check-ins, asserting invariants on the persisted rows) - gated by the SAME test.skipIf(!hasRealDb) convention already used in tests/db/rls-enabled.test.ts, since no real DB is available in this environment (documented in bug 2's evidence) - correctly SKIPPED here, will run for real once real Supabase credentials are configured. Full suite: 173 passed, 2 skipped (both DB-gated). `npx tsc --noEmit` clean after rm -rf .next (had to clear stale Next.js route-manifest cache referencing the deleted routes).

## Eliminated

## Resolution

root_cause: |
  Bug 1: package.json pinned @types/node@^20.19.43 while vitest@5.0.2 peer-requires @types/node ^22.0.0 || >=24.0.0 (transitively via vite@8.3.1) - ERESOLVE on clean install.
  Bug 2: lib/db/schema/index.ts declared 5 fields (registration_settings.quizLink/round1Declared/bettingOpen/betsSettled, task_submissions.submissionData) that were never captured in a drizzle migration - schema and migrations had drifted out of sync.
  Bug 3: the imposter/shuffle game had two divergent implementations - the correct team-diverse-partition-and-word-assignment logic lived in lib/game/t1-engine.ts wired to stale /api/tasks/1/session|vote|state routes (leftover from before the round sequence was reordered to Quiz->Cipher->Logic Gates->Shuffling), while a separate naive Fisher-Yates implementation with no team-diversity guarantee, null words, and an invalid "orange" color lived at /api/tasks/4/session. lib/game/t4-engine.ts was an empty orphan file. No shuffle-invariant test coverage existed.
  Bug 4: package.json's test script used `set VAR=value && ...` (a Windows cmd builtin) which silently no-ops on POSIX shells (confirmed: `set FOO=bar` sets a positional parameter, not an env var, under /bin/sh-style shells), so CI/Vercel/Mac/Linux test runs would fail env validation. (Note: this doesn't reproduce via plain `npm test` from Git Bash on Windows, because npm's script-shell defaults to cmd.exe on Windows regardless of the invoking shell - had to execute the literal script string via `bash -c` to prove the real POSIX failure.)
fix: |
  Bug 1: Bumped @types/node to ^24.19.0 (latest 24.x, satisfies vitest's peer range without jumping to the newer, more disruptive 26.x line).
  Bug 2: Ran `npx drizzle-kit generate` (with .env sourced manually, since drizzle.config.ts validates all env vars via lib/env.ts and drizzle-kit doesn't auto-load dotenv) to produce drizzle/migrations/0002_harsh_loners.sql, reviewed (5 additive ALTER TABLE ADD COLUMN statements, safe defaults, no data loss), confirmed zero pending diff via `drizzle-kit generate`/`check` afterward.
  Bug 3: Chose option (a). Rewrote the real shuffle logic into lib/game/t4-engine.ts: replaced random-subset team partitioning with a "largest remaining queue first" greedy algorithm (guarantees every player is seated whenever check-in is balanced, degrades gracefully to an undersized last table rather than dropping players otherwise); added a bipartite perfect-matching step (Kuhn's algorithm) so each table's imposter-providing team is chosen such that every team supplies at most one imposter per session (exactly one when team sizes are uniform, provable via Hall's theorem on regular bipartite graphs); added an "everImposter" cross-session history lookup so no player is ever re-selected as imposter; kept the canonical six crewmate colors (red/blue/cyan/yellow/green/purple), never "orange". Repointed app/api/tasks/4/{session,vote,state}/route.ts to thin wrappers around the engine, adopting the pre-existing /api/tasks/4/vote and /state routes' better qualities (DB-unique-constraint vote dedup, generic table-size handling) while adding the taskSubmissions-marking and round-advance signaling they were missing. Renamed SCORING_CONFIG.task1 -> SCORING_CONFIG.task4Imposter (only self-referenced, safe). Deleted lib/game/t1-engine.ts and app/api/tasks/1/{session,vote,state}/route.ts entirely (confirmed via repo-wide grep no other references) - /api/tasks/1/* now serves only the quiz.
  Bug 4: Added `cross-env` devDependency; rewrote the `test` script to `cross-env VAR1=... VAR2=... ... vitest run`, removing the `set` chain entirely.
verification: |
  Bug 1: `rm -rf node_modules package-lock.json && npm install` (no flags) succeeds cleanly - "added 420 packages" - twice (once immediately after the fix, once again as a final end-to-end check after all 4 bugs were fixed).
  Bug 2: `npx drizzle-kit generate` reports "No schema changes, nothing to migrate"; `npx drizzle-kit check` reports "Everything's fine"; `npx tsc --noEmit` compiles clean across all 8 call sites of the 5 fields. LIMITATION: could not apply the migration to a live database - .env only contains placeholder Supabase credentials (identical to .env.example), not a real reachable project, and fabricating real credentials is out of scope (third-party service, requires the user). `npx drizzle-kit migrate` was attempted and confirmed to hang/timeout against the placeholder host, proving no live DB is reachable in this environment - documented as a follow-up action for the user.
  Bug 3: New tests/game/t4-shuffle-invariants.test.ts (140 pure-function tests across team counts 6-40, 15 random-seed runs each) - all pass, covering every invariant (exactly-once appearance, no-same-team, one-imposter-per-table, one-imposter-per-team-per-session, no-repeat-imposter-across-sessions, real word assignment, canonical colors) plus an unbalanced-check-in stranding test. New tests/game/t4-session-integration.test.ts calls the real createGameSession() against live inserted DB rows and asserts invariants on the persisted output - gated by the same test.skipIf(no real DB) convention already used in tests/db/rls-enabled.test.ts (correctly skipped here for the same reason as bug 2's DB limitation; will run for real once real credentials exist). Full suite: 173 passed, 2 skipped. `npx tsc --noEmit` clean (had to `rm -rf .next` once to clear a stale route-manifest cache referencing the deleted routes). `npx eslint` clean on all changed files (pre-existing `catch (e: any)` pattern across 26 files repo-wide is untouched, out of scope).
  Bug 4: Verified via literal `bash -c '...'` execution of the new cross-env-based script content (bypassing npm's Windows cmd.exe wrapper) - passes identically with and without a local .env present: "Test Files 9 passed | 1 skipped (10)".
  Final full-repo pass: clean `npm install` (no flags) -> `npx tsc --noEmit` (clean) -> `npm test` (173 passed, 2 skipped) all green together after all 4 fixes applied simultaneously.
files_changed:
  - package.json (bumped @types/node, added cross-env devDependency, rewrote test script)
  - package-lock.json (regenerated)
  - drizzle/migrations/0002_harsh_loners.sql (new - the 5 missing columns)
  - drizzle/migrations/meta/0002_snapshot.json (new)
  - drizzle/migrations/meta/_journal.json (updated)
  - lib/game/t4-engine.ts (rewritten - now the sole shuffle/imposter engine)
  - lib/game/t1-engine.ts (deleted)
  - app/api/tasks/4/session/route.ts (repointed to t4-engine)
  - app/api/tasks/4/vote/route.ts (repointed to t4-engine)
  - app/api/tasks/4/state/route.ts (repointed to t4-engine)
  - app/api/tasks/1/session/route.ts (deleted)
  - app/api/tasks/1/vote/route.ts (deleted)
  - app/api/tasks/1/state/route.ts (deleted)
  - lib/scoring/config.ts (renamed task1 -> task4Imposter)
  - tests/game/t4-shuffle-invariants.test.ts (new)
  - tests/game/t4-session-integration.test.ts (new)
