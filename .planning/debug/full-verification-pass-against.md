---
status: investigating
trigger: "Full verification pass against CLAUDE.md, following the Part 1 bug fixes (npm/vitest peer fix, schema/migration sync, Task 4 shuffle consolidation, cross-platform test script). Phase 2 (fixes for sections A/B + C/D/E/F) complete. Phase 3: replaced in-repo Task 3 with an external site. Phase 4 (this addendum): DB provider switch (Supabase -> Neon, out of free Supabase project slots) + remaining housekeeping + hosting prep."
created: 2026-09-26
updated: 2026-09-26T (Phase 4 implementation complete, self-verified: npm test/tsc/build/eslint clean)
---

# Debug Session: full-verification-pass-against

## Symptoms

**Expected behavior:** The repo at "C:\Users\harwa\OneDrive\Desktop\Skeld Task 1" (see CLAUDE.md at repo root for the ground-truth spec) should fully match every rule in CLAUDE.md, with no orphaned code, no duplicate implementations, no half-migrated features, and no security or design-fidelity gaps left over from having been built across several different tools (Claude Code, then Cursor, then Antigravity, then Antigravity on a different account) before this session.

**Actual behavior:** Unknown until investigated. Part 1 of this task (a separate, now-resolved debug session at `.planning/debug/resolved/re-verify-and-fix-4-confirmed.md`) found and fixed 4 confirmed bugs: an npm/vitest peer dependency conflict, schema/migration drift on 5 fields, a duplicate/broken Task 4 imposter-shuffle implementation (consolidated into `lib/game/t4-engine.ts`, old `/api/tasks/1/{session,vote,state}` routes deleted), and a Windows-only test script (fixed with `cross-env`). This session (Part 2) needs to check whether other issues of the same "later tool didn't fully apply an earlier change" shape exist elsewhere in the repo, and do a full rule-by-rule audit against CLAUDE.md.

**Error messages:** None yet; this is a proactive audit, not a reported crash.

**Timeline:** Starts now, after Part 1's fixes are in the working tree (uncommitted).

**Reproduction:** N/A — this is an audit/verification pass, not a single reproducible bug.

## Current Focus

hypothesis: Given the repo's history (multiple tools, a mid-project task reorder from quiz/cipher/bomb-defusal/imposter, and betting/leaderboard visibility changes applied after initial build), there are likely more instances of: duplicate implementations of the same concept, orphaned routes/components/DB columns, half-migrated features (UI updated but API not, or vice versa), and env vars mismatched between code and `.env.example`.
test: Cross-tool integrity sweep (Part 2 section A) plus a rule-by-rule check of every CLAUDE.md section (Part 2 section B), citing file/line evidence or exact repro steps for each rule, marked VERIFIED / BROKEN / PARTIAL / UNCLEAR.
expecting: A mix of VERIFIED and some BROKEN/PARTIAL/UNCLEAR items, especially around the task reorder and betting/leaderboard visibility.
next_action: |
  PHASE 1 (sections A+B) is complete; findings were shown to the human and decisions were made on the
  ambiguous items (see "Human Decisions" below). Proceed to PHASE 2: apply fixes for all A/B findings per
  these human decisions, then run sections C (test/build/lint), D (security re-check), E (design fidelity
  spot check), F (summary + final report).

## Human Decisions (Phase 1 checkpoint, resolved 2026-09-26)

1. **Gating (A1/A3) + orphaned routes (A2/A4):** Wire `canEnterTask` into the real live task routes
   (`/api/tasks/2/submit`, `/api/tasks/2/verify-fragment`, `/api/tasks/3/submit`, `/api/tasks/4/session`,
   `/api/tasks/4/vote`) so each actually enforces prior-task-complete + admin gate-open + all-6-checked-in
   before allowing the action. Then DELETE the orphaned `/api/tasks/submit/route.ts`, `/api/tasks/gate/route.ts`,
   and `/api/tasks/kahoot/route.ts` entirely (confirm via repo-wide grep that nothing references them before
   deleting, same as Part 1's t1-engine.ts cleanup) along with the now-fully-dead `kahootStaging` DB
   table/schema/migration if nothing else needs it (generate a migration to drop it, don't just leave an
   orphaned table).
2. **Cipher (Task 2) submission role:** Any team member may submit (matches current code behavior). Update
   the misleading code comment and any UI copy that currently claims "leader submits" so they match reality
   — do not add a role restriction.
3. **Betting (B4) role:** Leader-only. Fix `app/api/bet/route.ts` to reject non-leader roles (currently
   allows both `leader` and `player`), matching PROJECT.md and the route's own comment.
4. **Proceed to fix everything else too:** B5 (leaderboard open to unauthenticated/any-session requests —
   require a real session + role check, remove the client-controlled `source=projector` bypass, add
   `/api/leaderboard` and `/leaderboard` to proxy.ts's protected paths), A8 (restore a DB-level partial
   unique index on `sessions` for one-active-session-per-player, e.g.
   `CREATE UNIQUE INDEX ... ON sessions(player_id) WHERE revoked_at IS NULL` and equivalent for staff, via a
   new drizzle migration), A5 (fix the Task 2/3 rank read-then-write race — use a transaction with proper
   locking, e.g. `SELECT ... FOR UPDATE` or an atomic rank-assignment query, and consider whether
   tie-averaging per REQUIREMENTS EXT-03 is in scope or a separate decision), and update
   `registration_settings.quizLink`'s default (and any other Kahoot-specific copy/references surfaced in
   the audit) from `https://kahoot.it` to the real event's Wayground join link
   `https://wayground.com/join?gc=940315&source=liveDashboard`.

Items NOT explicitly greenlit for this pass (use judgment, but flag rather than silently deciding if
genuinely ambiguous): A6/A7 (configurable task-completion method, registration adapter pattern) — these are
larger architectural gaps flagged as "Pending" in the project's own decisions table; do a reasonable-scope
fix if time permits within Phase 2's C-F work, but if it's a large undertaking, report it as a BROKEN item
in the final F summary rather than a half-finished attempt. A9 (dropped FK constraints) — not spec-required,
mention in F summary as a discretionary item rather than fixing blindly. B3 (no server-enforced stage
pacing on bomb defusal) — not explicitly greenlit either; evaluate whether it's in scope for "no skipping
ahead" or should be reported as PARTIAL in F.

## Evidence

- timestamp: 2026-09-26T (Part 2, Phase 1, Section A+B investigation)
  checked: Full repo sweep (app/api, app/*, lib/*, drizzle/migrations/*, .planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md, .planning/STATE.md) cross-referenced against CLAUDE.md + PROJECT.md as ground truth.
  found: |
    === SECTION A: CROSS-TOOL INTEGRITY SWEEP ===

    A1. [CRITICAL] Task gating (`canEnterTask` in lib/gating.ts:103-157) is NEVER CALLED by any of the live, UI-wired task routes.
        - `app/api/tasks/2/submit/route.ts`, `app/api/tasks/2/verify-fragment/route.ts`, `app/api/tasks/3/submit/route.ts`,
          `app/api/tasks/4/session/route.ts`, `app/api/tasks/4/vote/route.ts` — none import or call `canEnterTask`.
        - `canEnterTask` is only referenced by `app/api/tasks/gate/route.ts` (GET/POST) and `app/api/tasks/submit/route.ts` (generic POST),
          neither of which is called from any `.tsx` page (`grep` for these two paths across `app/**/*.tsx` returns zero matches).
        - Confirmed via direct read of `app/tasks/2/page.tsx`: it calls `/api/tasks/2/state`, `/api/tasks/2/verify-fragment`,
          `/api/tasks/2/submit` only — no gate check anywhere in the fetch chain.
        - Net effect: a team can submit Task 2/3 answers or trigger/participate in Task 4 without Task 1/2/3 being complete,
          and without admin having opened that task's gate. This breaks PROJECT.md lines 30-31 ("Round 1 flow enforced in
          order... server enforced, not client-decided") and REQUIREMENTS.md CHK-03. This is the single highest-severity
          finding: gating is fully built (lib/gating.ts) but wired only into orphaned/duplicate routes, not the real ones.

    A2. [CRITICAL — duplicate implementation] Two parallel, conflicting task-submission systems exist:
        - Task-specific: `/api/tasks/2/submit`, `/api/tasks/3/submit` (validate real puzzle answer via
          `validateMasterSentence` / `LOGIC_GATE_STAGES[i].verify`, then rank-based score).
        - Generic: `/api/tasks/submit` (`app/api/tasks/submit/route.ts`) accepts `{taskNumber: 2|3|4, proof?: string}`
          with ZERO validation of the actual puzzle/game outcome — it just inserts a `taskSubmissions` row and awards
          rank-based points directly. Both write to the same `taskSubmissions` unique constraint
          `(teamId, taskNumber)`, so whichever is called first wins.
        - This generic route is unreferenced by any `.tsx` page but is still a live, reachable, `leader`/`admin`-role-gated
          endpoint. Any leader/admin session (i.e., any real player logged in as leader, or any staff admin) could POST
          `{taskNumber: 3}` directly to `/api/tasks/submit` and receive full Task 3 credit without ever seeing/solving the
          logic-gate puzzle. Same for `taskNumber: 4` — it would fully bypass the entire vote-based imposter game and
          directly write a rank-based `taskSubmissions`/score event, which conflicts with `t4-engine.ts`'s own
          fixed-point (`crewmatePoints`/`imposterPoints`) scoring path for Task 4. Two divergent Task 4 scoring
          mechanisms can each independently mark `taskSubmissions.taskNumber=4` for the same team.
        - Likely origin: `/api/tasks/submit` + `/api/tasks/gate` are leftover Phase 4 (gating engine) scaffolding from
          before the task-specific routes (Phase 6) were built; never deleted after being superseded.

    A3. [HIGH] `/api/tasks/4/session` (`createGameSession` in lib/game/t4-engine.ts:224-310`) pulls ALL checked-in
        players (`db.select().from(checkIns)` joined to `players`, no team-level filter) with no check that each
        team has completed Task 3 or that admin opened Task 4 for that team. A team that is checked in but has not
        finished Tasks 1-3 will still be shuffled into a live Task 4 imposter table when admin clicks "Start Table
        Shuffle" (`app/admin/page.tsx:129-141`). This is the same root issue as A1 (gating not wired) applied to the
        table-shuffle trigger specifically.

    A4. [HIGH — half-migrated feature] The Kahoot-style staging flow described in REQUIREMENTS.md KHT-01/02/03
        ("leader submits Kahoot nickname" -> "admin uploads Kahoot export, matches by nickname" -> "human-reviewable
        staging view before commit") is fully scaffolded (`kahootStaging` table in schema, `app/api/tasks/kahoot/route.ts`
        GET/POST) but is 100% DISCONNECTED:
        - No `.tsx` page references `/api/tasks/kahoot` (grep confirms zero matches in `app/**/*.tsx`).
        - No route ever reads `kahootStaging.matchedByAdmin`/`committed` and calls `recordScoreEvent` — searched
          entire `app/` tree for `kahootStaging` usage; only `app/api/tasks/kahoot/route.ts` itself references it.
        - There is also no file-upload/CSV/export-parsing endpoint anywhere (`grep` for `formData|multipart|\.csv` in
          `app/api` returns zero matches), so REQUIREMENTS.md KHT-02 ("admin uploads the Kahoot export file... matches
          by team code nickname") is entirely unimplemented.
        - Instead, the LIVE path for what is now Task 1 (Quiz) is `app/api/admin/quiz/route.ts`: admin manually types
          a point value per team in a table (`app/admin/page.tsx` "Manual Team Scores" panel) and clicks
          "DECLARE RESULTS" — a completely different, ad-hoc mechanism with no staging/no review step, that coexists
          with (but never talks to) the orphaned kahootStaging scaffolding.

    A5. [MEDIUM] Rank-based tie handling for Task 2/3 does not implement "ties share the average of the points they
        span" (REQUIREMENTS.md EXT-03, PROJECT.md line 46). Both `/api/tasks/2/submit` and `/api/tasks/3/submit`
        compute `rank = existingCount + 1` from a `SELECT count(*)` immediately followed by an `INSERT`, with no
        transaction/locking between the two — this is a read-then-write race: two teams submitting concurrently can
        both read the same count and be awarded the same rank/points (not "average of the span," just an outright
        duplicate-rank bug). No tie-averaging logic exists anywhere in the Task 2/3 scoring path.

    A6. [MEDIUM — spec vs. build architecture mismatch] PROJECT.md line 45 / REQUIREMENTS.md EXT-01 require Task 2
        and Task 3 completion method to be "fully configurable per task, no hardcoded method" (external link / webhook
        / leader-confirm / manual entry, selectable). The actual implementation hardcodes a single method (direct
        POST with validated answer) for both tasks, with no configuration surface (no admin UI, no config field in
        `registrationSettings` or elsewhere) to select an alternate method. Not a regression from a prior working
        state, but a build that took a simpler path than the documented requirement without a recorded decision
        (PROJECT.md's own "Key Decisions" table lists "Tasks 2 & 3 completion method fully configurable" as
        "— Pending", never resolved).

    A7. [MEDIUM — spec vs. build architecture mismatch] PROJECT.md line 20-21 / REQUIREMENTS.md require a
        "registration data syncs read-only from the official site's database (adapter layer: mock, csv, real-later)."
        No adapter interface, mock adapter, or CSV adapter exists anywhere in the repo (only `scripts/seed-words.ts`
        matched a CSV-related grep, unrelated). The actual implementation (`app/api/auth/register/route.ts`) is a
        fully different architecture: direct player self-registration writing straight into the `players` table via
        a public form. This is a wholesale architecture substitution, not a partial migration, and it's undocumented
        as a decision (PROJECT.md's Key Decisions row for this is also "— Pending").

    A8. [HIGH — schema regression, DB-level constraint silently dropped] `drizzle/migrations/0000_spicy_harpoon.sql`
        originally created `sessions` with a PLAIN `UNIQUE("player_id")` / `UNIQUE("staff_id")` constraint (not a
        partial index on `WHERE revoked_at IS NULL` as the project's own STACK.md research explicitly recommends:
        "CREATE UNIQUE INDEX ON sessions (player_id) WHERE revoked_at IS NULL"). That plain constraint would itself
        have been a bug (see B-Check-in below). `drizzle/migrations/0001_outgoing_polaris.sql` then DROPS both
        `sessions_one_active_player` and `sessions_one_active_staff` (and the `sessions_exactly_one` CHECK) and never
        re-adds any replacement constraint/index. `lib/db/schema/index.ts`'s current `sessions` table definition has
        no `.unique()` on `playerId`/`staffId` at all. `drizzle/migrations/0002_harsh_loners.sql` (Part 1's fix) does
        not touch `sessions` either. Net result: there is currently NO database-level constraint enforcing "one active
        session per player/staff" — enforcement is 100% application-level (`revokeAllForPlayer` + insert in
        `lib/auth/session.ts` and `app/api/auth/login/player/route.ts:22-33`, not wrapped in a way that prevents a
        genuine race between two concurrent logins for the same player, e.g. two devices logging in within the same
        transaction window could both succeed and leave two un-revoked active sessions). Directly contradicts
        REQUIREMENTS.md AUTH-02 ("Server enforces exactly one active session per player (unique constraint)").

    A9. [MEDIUM] `drizzle/migrations/0001_outgoing_polaris.sql` also drops a large number of foreign-key constraints
        (`bets_team_id_teams_id_fk`, `check_ins_player_id_players_id_fk`, `check_ins_checked_in_by_staff_accounts_id_fk`,
        `game_table_players_*_fk` x3, `game_tables_game_session_id_game_sessions_id_fk`,
        `kahoot_staging_team_id_teams_id_fk`, `kahoot_staging_matched_by_admin_staff_accounts_id_fk`,
        `score_events_team_id_teams_id_fk`, `score_events_created_by_staff_accounts_id_fk`,
        `task_gates_team_id_teams_id_fk`, `task_gates_opened_by_staff_accounts_id_fk`,
        `task_submissions_team_id_teams_id_fk`, `task_submissions_submitted_by_staff_accounts_id_fk`,
        `teams_created_by_staff_accounts_id_fk`, `votes_*_fk` x3) and never re-adds them (only
        `players_team_id_teams_id_fk`, `sessions_player_id_players_id_fk`, `sessions_staff_id_staff_accounts_id_fk`
        are re-added). Cross-checked against `lib/db/schema/index.ts`: the current TS schema is internally consistent
        with this state (none of these fields have `.references()` calls), so this is NOT a schema/migration drift
        bug (schema.ts and the migration agree) — it's a deliberate-looking removal of referential integrity across
        most of the data model. Flagging as MEDIUM since PROJECT.md doesn't explicitly mandate FK constraints, but it
        is a real reduction in data-integrity guarantees (e.g., a `scoreEvents.teamId` or `votes.voterPlayerId` could
        now reference a deleted row with nothing at the DB level to prevent/cascade it) worth a human decision.

    A10. env vars: `.env.example` and `lib/env.ts` zod schema are in agreement (DATABASE_URL, DIRECT_URL,
         SESSION_SECRET, ALLOWED_HOSTS, APP_URL, STAFF_ADMIN/MONITOR/DISPLAY_USERNAME+PASSWORD). No orphaned or
         missing env vars found. VERIFIED.

    A11. No leftover references to deleted Part-1 files: grep for `t1-engine|tasks/1/session|tasks/1/vote|tasks/1/state`
         across all `.ts`/`.tsx` returns only a comment in `lib/game/t4-engine.ts` describing the historical removal
         (not a live import). VERIFIED clean.

    === SECTION B: RULE-BY-RULE CHECK AGAINST CLAUDE.md / PROJECT.md ===

    B1. Task order & gating (quiz->cipher->bomb defusal->imposter, gated on previous task + 6/6 check-in):
        BROKEN. `lib/gating.ts:canEnterTask` correctly implements the rule (check-in 6/6 -> previous
        `taskSubmissions` row exists -> admin `taskGates` open), but per A1/A3 above it is never invoked by any of
        the live task-completion or Task-4-session-creation code paths. The order is enforced only by
        UI navigation convenience (buttons linking `/tasks/2` -> `/tasks/3`), not server-side. A team (or anyone
        with a valid team-role session/cookie) can call the APIs out of order.

    B2. Cipher task (Task 2) individual fragments: VERIFIED. `lib/game/cipher-data.ts` defines 6 fragments
        (`fragmentIndex` 0-5) whose plaintexts concatenate exactly to `MASTER_SENTENCE`. `app/api/tasks/2/state/route.ts`
        maps `player.playerCode` (P001..P006) to `fragmentIndex` 0-5 correctly (`codeNum - 1`, clamped 0-5).
        Verification (`/api/tasks/2/verify-fragment`) and master-sentence submission (`/api/tasks/2/submit`) both
        correctly use `lib/game/cipher-data.ts`'s `validateFragment`/`validateMasterSentence`.

        Cipher submission "leader-only vs any-member": DISCREPANCY (documentation/comment vs. actual code, not
        code vs. spec). `app/api/tasks/2/submit/route.ts` header comment says "Leader submits assembled sentence,"
        and `app/tasks/2/page.tsx` UI copy says "Leader Assembly Console... Only the team leader should submit" (implied),
        but the route handler only checks `session.teamId` truthy — it does NOT check `session.role === 'leader'`,
        so ANY team member (player or leader) can call `/api/tasks/2/submit` and it will be accepted. Checked
        PROJECT.md itself: it does NOT explicitly require cipher submission to be leader-restricted (only Task 4/Kahoot
        submission and betting are explicitly named as leader-only, PROJECT.md line 68). So code does not contradict
        the written PROJECT.md spec, but it DOES contradict its own inline comment/UI copy claiming leader-only.
        Reporting explicitly per instructions rather than silently resolving: is cipher submission intended to be
        leader-only (needs an `isLeader`/`role==='leader'` check added) or any-member (needs the comment/UI text
        corrected)?

    B3. Bomb defusal (Task 3) sequential logic gates, fastest-time-wins, no skipping ahead:
        PARTIAL. `lib/game/logic-gates-data.ts` defines 5 stages with correct `verify()` logic (AND, NOR, XOR,
        compound NAND-AND, 4-channel bus) — spot-checked stage 3 (NAND-AND: A=0,B=1,C=1 -> NAND(0,1)=1, AND(1,1)=1 ✓)
        and stage 4 (A=1,B=0,C=1,D=0 -> OR=1, XOR=1, AND=1 ✓), both correct.
        `app/api/tasks/3/submit/route.ts` (verified restored to last-committed HEAD content per Part 1's stash note,
        stash@{0} still present, not touched) verifies all 5 stages atomically via `LOGIC_GATE_STAGES[i].verify()`,
        correct. HOWEVER: "no skipping ahead" is not actually enforced — the route accepts all 5 stage results in
        a single POST, meaning the frontend fully controls how/whether stages are gated from each other client-side;
        server only validates final correctness, not stage order/timing. Also inherits the A1 gating hole (no
        `canEnterTask` check for Task 2 completion) and the A5 tie-race issue for scoring.

    B4. Betting rules: PARTIAL/BROKEN on one point.
        - "Opens after Task 1 results declared (`registration_settings.round1Declared`)": VERIFIED —
          `app/api/admin/quiz/route.ts` POST sets both `round1Declared: true` AND `bettingOpen: true` together when
          admin clicks declare; `app/api/bet/route.ts` GET/POST both gate on `settings.bettingOpen`.
        - "One bet per team, immutable once placed": VERIFIED — `bets.teamId` has a DB `unique()` constraint and
          the insert uses `.onConflictDoNothing({ target: bets.teamId })`, returning 409 on duplicate.
        - "Only the leader can submit the team's bet" (PROJECT.md line 57): BROKEN. `app/api/bet/route.ts:42`
          checks `if (!['leader', 'player'].includes(session.role))` — this explicitly ALLOWS plain `player` role,
          not just `leader`, directly contradicting both PROJECT.md's explicit requirement and the route's own
          header comment ("POST — place a rank bet (leader only, once per team, betting must be open)").
        - "+10 exact hit / -10 miss, judged with pre-bet-bonus ranking": PARTIAL. `app/api/admin/settle-bets/route.ts`
          correctly awards +10/-10 via `recordScoreEvent` with `eventType: 'bet_bonus'|'bet_penalty'`. However the
          code's own comment (lines 30-34) admits it does NOT explicitly compute rank "without rule 2" as PROJECT.md
          line 55 specifies — it calls `getLeaderboard()` -> `rankTeams(summaries)` with the DEFAULT
          `includeBetRule=true`, relying on the fact that no team has a `hasWinningBet` yet at settle time for this
          to be harmless. This happens to be correct in practice (since bet events don't exist yet when this runs),
          but is not an explicit/intentional implementation of "without rule 2" — it's an implicit coincidence that
          would break if `settle-bets` were ever called a second time or reordered relative to other logic.

    B5. Leaderboard visibility: BROKEN (critical, confirmed via direct code trace, not just inspection).
        - `app/api/leaderboard/route.ts` GET handler: `isProjector = url.searchParams.get('source') === 'projector'`
          — this is a CLIENT-SUPPLIED QUERY PARAMETER, not a session/role check. The route's session loading is
          also fully optional (`token` may be absent -> `session = null` -> proceeds anyway, no `requireSession`
          call at all in this route).
        - Condition `if (isStaff || isProjector) { return NextResponse.json({ leaderboard: fullLeaderboard, ... }) }`
          means ANY caller — including a plain player, or literally an unauthenticated client with no session
          cookie at all — can retrieve the full ranked leaderboard for every team by requesting
          `GET /api/leaderboard?source=projector`. This completely bypasses the "hiddenForPlayers" restriction and
          the in-app message "CLASSIFIED: Live leaderboard is displayed exclusively on the NAB Main Auditorium
          Projector Screen" (line 43 of the same file) — that message is only shown on the code path that isn't
          taken when the query param is present.
        - Traced the route-level protection too: `proxy.ts` `PROTECTED_PATHS` = `['/player','/leader','/monitor',
          '/admin','/display']` — `/leaderboard` and `/api/leaderboard` are NOT in this list, so there is no
          proxy-level session gate on either the page or the API route; protection for this endpoint was intended
          to rely entirely on the in-route `isStaff`/`isProjector` check, which is broken as described.
        - This directly violates PROJECT.md's non-negotiable security rule "Server is the sole authority... client
          never decides these" and the orchestrator's explicit checklist item ("confirm there is NO route... reachable
          by an ordinary player session that exposes team rankings or scores... actually trace/try to reach it").
        - Note: `app/display/page.tsx` (the intended projector view) does NOT even use this `?source=projector`
          bypass itself — it calls `fetch('/api/leaderboard')` with no query param, relying on the caller having a
          real `role: 'display'` staff session (which does correctly satisfy `isStaff`). This means the
          `isProjector` query-param branch appears to be entirely dead/unused by the app's own legitimate code paths,
          existing only as an exploitable side door.

    B6. Ranking comparator Task 4 reference: VERIFIED correct. `lib/ranking.ts:54-58` compares
        `task4Points -> task3Points -> task2Points -> task1Points` in that order. Cross-checked against
        `lib/scoring/ledger.ts:79-91` (`getTeamScoreSummaries`) which aggregates `scoreEvents.taskNumber === 4` into
        `task4Points` — and `taskNumber: 4` is exactly the imposter-shuffle events written by
        `lib/game/t4-engine.ts:castVote` (`TASK_4_CREWMATE_WIN`/`TASK_4_IMPOSTER_WIN`, both with `taskNumber: 4`).
        So "Task 4" in the tie-break sequence correctly refers to the post-reorder imposter game, not a stale
        pre-reorder reference. No stale numbering bug here.

    B7. Registration import/sync adapter (mock + CSV): BROKEN — see A7. No adapter interface, mock adapter, or CSV
        adapter exists anywhere in the repo. Actual mechanism is direct self-registration
        (`app/api/auth/register/route.ts`), architecturally different from the documented "read-only sync from
        official DB via adapter layer" requirement.

    B8. Check-in, join codes, session invalidation on second device login: PARTIAL/BROKEN.
        - Check-in idempotency (CHK-02): VERIFIED — `lib/gating.ts:checkInPlayer` checks for an existing row before
          inserting, returns `alreadyCheckedIn: true` rather than duplicating.
        - "Team cannot proceed until all 6 checked in" (CHK-03): logic itself is correct in
          `getTeamCheckInStatus`/`canEnterTask` (`isFullyCheckedIn = teamPlayers.length >= 6 && checkedInCount ===
          teamPlayers.length`), BUT per A1 this check is never invoked on the live task-submission paths, so in
          practice a not-fully-checked-in team can still submit Task 2/3 answers or be included in a Task 4 shuffle
          session as long as at least the submitting player has a valid session (Task 4 shuffle additionally only
          requires the individual player to be in `check_ins`, per A3, not the whole team).
        - Session invalidation on second login (AUTH-02, "one active session per player, unique constraint"):
          BROKEN at the DB layer, see A8. Application-level revoke-then-insert (`revokeAllForPlayer` then
          `createSession`, both in `app/api/auth/login/player/route.ts:22-33`) does work correctly in the
          non-concurrent case (revokes old row, inserts new one, old row's `revokedAt` makes `loadSession` reject
          it going forward) — so a normal sequential "log in on phone B after phone A" scenario is handled
          correctly by app logic. But there is no DB constraint backing this, so it is not "server enforced ...
          unique constraint" as REQUIREMENTS.md AUTH-02 explicitly requires, and is vulnerable to a genuine
          concurrent-login race (two near-simultaneous logins from two devices could both complete before either
          transaction's revoke is visible to the other, leaving two valid active sessions).
        - Join codes: `teams.code` is unique; `/api/teams/by-code/route.ts` and `/api/auth/register` correctly
          look up team by code. Not fully traced beyond existence check (time-boxed per Phase-1 scope).

    B9. Score events append-only ledger, no direct mutation: VERIFIED. Grepped all of `app/` and `lib/` for
        `.update(` calls — only 7 matches, all on `registrationSettings`, `players` (leader flag), and `sessions`
        (revocation). Zero `.update()` calls on `scoreEvents` or `bets` anywhere in the codebase. All scoring paths
        (`recordScoreEvent` in `lib/scoring/ledger.ts`) exclusively `.insert()` with `onConflictDoNothing` on an
        idempotency key. Leaderboard is always derived (`getLeaderboard()` re-aggregates `scoreEvents` on every
        call, no cached/stored total). This rule holds cleanly.

    B10. Blind/shape-identical Task 4 payloads: VERIFIED. `lib/game/t4-engine.ts:getPlayerGameView` (lines 316-366)
         only sets `yourWord`/`isImposter` when `isYou` is true; both fields are `undefined` (not present with a
         null/placeholder — actually `undefined`, which JSON.stringify will omit entirely) for every other player
         in the table. Did not runtime-diff actual byte sizes of imposter vs crewmate responses (would require a
         live DB) but the code path is structurally identical regardless of the viewer's own role, so this should
         hold; flagging as VERIFIED-BY-CODE-TRACE rather than VERIFIED-BY-LIVE-TEST since no DB is available in
         this environment (placeholder Supabase credentials only, per Part 1 session notes).

  implication: |
    Section A/B produced 2 CRITICAL findings (A1/B1 unenforced task gating on all live routes; B5 leaderboard
    query-param bypass exposing all team scores to anyone), 3 HIGH findings (A2 duplicate/unvalidated generic
    submit route, A3 Task-4-session ignores gating, A4 orphaned Kahoot staging flow vs. undocumented ad-hoc
    replacement, A8 dropped session uniqueness constraint), and several MEDIUM/discrepancy findings (A5 tie-race,
    A6/A7/B7 spec-vs-build architecture gaps around configurable completion methods and registration adapter, A9
    dropped FKs, B4 leader-only bet-role bug, B2 cipher leader-only comment/code mismatch, B4 settle-bets implicit
    rather than explicit "without rule 2" ranking). Per task instructions, NONE of these have been fixed yet — this
    is a reporting checkpoint only. Root cause commonality: almost all CRITICAL/HIGH items trace back to the same
    pattern the orchestrator flagged — routes/engines built in an earlier phase (gating engine, Kahoot staging) were
    superseded by later, task-specific implementations (Phase 6) that were never wired back into the earlier
    cross-cutting enforcement layer, and the earlier orphaned routes were never deleted, leaving them live and
    exploitable rather than merely dead code.

## Eliminated

## Resolution

root_cause: |
  Two independent classes of root cause, consistent with the repo's multi-tool build history:
  (1) Cross-tool integrity gaps: an earlier phase's cross-cutting enforcement layer (task gating
  engine in lib/gating.ts, Kahoot staging table+route) was superseded by later, task-specific
  implementations (Phase 6's per-task routes, the ad-hoc admin "Manual Team Scores" panel) that
  were never wired back into the earlier layer, and the superseded routes were left live and
  reachable (exploitable) rather than deleted. Several role/behavior mismatches (betting role
  check, leaderboard auth, cipher comment) were simple logic bugs from iterative edits across
  tools. The session-uniqueness DB constraint and several FK constraints were dropped in migration
  0001 and never restored. (2) Two NEW, previously-undiscovered bugs surfaced specifically by this
  session's Section D trace-don't-assert requirement: app/tasks/3/page.tsx shipped the entire
  answer-oracle (verify predicate + plain-English solving values) to the client bundle; and
  proxy.ts's PUBLIC_PATHS matching used `path.startsWith('/')` for the literal root path, which is
  true for every path, silently disabling the entire cookie-gate mechanism for every protected page
  in the app (not just the routes touched this session).
fix: |
  1. Wired canEnterTask() (check-in 6/6 + prior-task-complete + admin-gate-open) into
     app/api/tasks/2/submit, app/api/tasks/2/verify-fragment, app/api/tasks/3/submit,
     lib/game/t4-engine.ts createGameSession (filters shuffle-eligible teams), and
     app/api/tasks/4/vote. Deleted orphaned app/api/tasks/submit, app/api/tasks/gate,
     app/api/tasks/kahoot routes and the kahootStaging table (migration 0003).
  2. Confirmed+documented cipher (Task 2) submission is intended to be any-team-member; fixed the
     misleading comment/UI copy rather than adding a role restriction.
  3. Restricted betting (app/api/bet/route.ts) to leader role only.
  4. Removed the client-controlled `?source=projector` leaderboard bypass; app/api/leaderboard now
     requires a real session and only admin/monitor/display roles get the full board. Added
     '/leaderboard' and '/api/leaderboard' to proxy.ts's protected paths.
  5. Restored DB-level "one active session per player/staff" via partial unique indexes
     (WHERE revoked_at IS NULL) on `sessions`, migration 0003.
  6. Fixed the Task 2/3 rank read-then-write race with a new submitTaskWithRank() helper
     (db.transaction + pg_advisory_xact_lock keyed by task number).
  7. Updated the Kahoot->Wayground quiz link default/fallbacks/placeholder text everywhere, and
     corrected 2 stale pre-reorder task-rail labels on the landing page.
  8. [Beyond the explicit Human Decisions list, found during Section D] Removed the client-side
     puzzle-answer leak in Task 3: split lib/game/logic-gates-data.ts into a server-only `verify`
     path and a new getClientSafeStages() view; added app/api/tasks/3/state and
     app/api/tasks/3/verify-stage server routes; rewrote app/tasks/3/page.tsx to use them instead
     of importing the raw answer-bearing module.
  9. [Beyond the explicit Human Decisions list, found during Section D] Fixed proxy.ts's
     PUBLIC_PATHS '/' matching bug that had silently disabled the cookie gate for every protected
     page in the entire app (not just this session's changes).
verification: |
  npm test: 186 passed, 2 skipped (2 tests genuinely require a real reachable Postgres instance —
  not available in this dev environment, same documented limitation as Part 1). npm run build:
  clean, zero errors, 45 routes. npx tsc --noEmit: zero errors. npx eslint: 105 problems, all
  pre-existing/convention-consistent (not a Phase 2 regression), does not block the build.
  Leaderboard lockdown and proxy cookie-gate verified via 13 new real trace tests (not just
  assertions) in tests/security/leaderboard-access.test.ts and tests/security/host.test.ts.
  Task 3 answer-leak fix verified by grepping the actual compiled .next/static production bundle
  (zero matches for the previously-leaked answer text/logic post-fix). RLS deny-all verified by
  code inspection of every table definition. Cookie flags verified by direct code read. Session
  DB constraint verified by SQL-migration review + transaction-interleaving trace (could not run
  a live concurrent-login integration test — no real DB credentials in this environment).
  Design-fidelity spot check is code-level only (component reuse) — no browser/screenshot
  capability in this environment, stated as an explicit limitation, not claimed as done.
files_changed:
  - app/api/tasks/2/submit/route.ts
  - app/api/tasks/2/verify-fragment/route.ts
  - app/api/tasks/3/submit/route.ts
  - app/api/tasks/3/state/route.ts (new)
  - app/api/tasks/3/verify-stage/route.ts (new)
  - app/api/tasks/4/session/route.ts (via lib/game/t4-engine.ts change)
  - app/api/tasks/4/vote/route.ts
  - app/api/tasks/submit/route.ts (deleted)
  - app/api/tasks/gate/route.ts (deleted)
  - app/api/tasks/kahoot/route.ts (deleted)
  - app/api/bet/route.ts
  - app/api/leaderboard/route.ts
  - app/api/admin/quiz/route.ts
  - app/api/tasks/1/quiz/route.ts
  - app/admin/page.tsx
  - app/page.tsx
  - app/tasks/2/page.tsx
  - app/tasks/3/page.tsx
  - proxy.ts
  - lib/gating.ts (no functional change, confirmed correct as-is)
  - lib/game/t4-engine.ts
  - lib/game/logic-gates-data.ts
  - lib/scoring/ledger.ts
  - lib/db/schema/index.ts
  - drizzle/migrations/0003_phase2-gating-cleanup.sql (new)
  - drizzle/migrations/meta/0003_snapshot.json (new)
  - drizzle/migrations/meta/_journal.json
  - tests/security/host.test.ts
  - tests/security/leaderboard-access.test.ts (new)

## Evidence (Phase 2 checkpoint — fixes applied, section C/D/E in progress)

- timestamp: 2026-09-26T (Phase 2, fixes for Human Decisions 1-4)
  checked: Applied all fixes listed in Human Decisions block.
  found: |
    DONE — Decision 1 (gating + orphan cleanup):
      - Wired canEnterTask() into app/api/tasks/2/submit, app/api/tasks/2/verify-fragment,
        app/api/tasks/3/submit (team-scoped check), lib/game/t4-engine.ts createGameSession
        (filters checked-in players down to only teams passing canEnterTask(teamId, 4) before
        shuffling), and app/api/tasks/4/vote (team-scoped check via session.teamId).
      - Deleted app/api/tasks/submit/route.ts, app/api/tasks/gate/route.ts,
        app/api/tasks/kahoot/route.ts (confirmed zero remaining references repo-wide before
        deleting, same method as Part 1's t1-engine.ts cleanup).
      - Removed kahootStaging table from lib/db/schema/index.ts; generated
        drizzle/migrations/0003_phase2-gating-cleanup.sql (DROP TABLE kahoot_staging CASCADE).
      - Noted (not fixed, out of explicit scope): there is still no admin UI that writes to
        taskGates (the only writer was the now-deleted /api/tasks/gate POST). canEnterTask's own
        gate check fails OPEN when no taskGates row exists, so this does not block the gating fix
        — Task 1-4 order + check-in enforcement now works with zero admin action required — but
        it does mean there is currently no way for admin to manually CLOSE a task gate mid-event.
        Flagging in F summary as a discretionary follow-up, not a regression from this fix.
    DONE — Decision 2 (cipher role clarification): confirmed any-member submission is intended;
      updated app/api/tasks/2/submit/route.ts header comment and app/tasks/2/page.tsx UI copy
      ("Leader Assembly Console" -> "Assembly Console", "Team Leader: once ALL 6..." -> "Any team
      member: once ALL 6...") to match actual (unrestricted) behavior. No role check added.
    DONE — Decision 3 (betting leader-only): app/api/bet/route.ts POST now rejects any
      session.role !== 'leader' (was ['leader','player']).
    DONE — Decision 4a (leaderboard lockdown): app/api/leaderboard/route.ts GET now calls
      requireSession() unconditionally (401 if no valid session) and removed the
      `?source=projector` query-param bypass entirely; only session.role in
      ['admin','monitor','display'] receives the full leaderboard, matching the projector's own
      real access path (app/display/page.tsx already only worked via a real display-role
      session). Added '/leaderboard' and '/api/leaderboard' to proxy.ts PROTECTED_PATHS so an
      unauthenticated request never reaches the route at all (redirect to /login for the page;
      the API route itself still 401s defense-in-depth since proxy only checks cookie presence,
      not validity/role).
    DONE — Decision 4b (session uniqueness DB constraint): added partial unique indexes
      sessions_one_active_player / sessions_one_active_staff (ON ... WHERE revoked_at IS NULL) to
      lib/db/schema/index.ts sessions table, generated in the same
      0003_phase2-gating-cleanup.sql migration. This restores REQUIREMENTS.md AUTH-02's
      "unique constraint" requirement and closes the concurrent-double-login race window.
    DONE — Decision 4c (A5 rank race): added submitTaskWithRank() in lib/scoring/ledger.ts —
      wraps the count-existing + insert-submission steps in a single db.transaction() serialized
      by `pg_advisory_xact_lock(920000, taskNumber)`, so concurrent Task 2/3 submissions can no
      longer read the same existingCount and be awarded the same rank. app/api/tasks/2/submit and
      app/api/tasks/3/submit now call this helper instead of the old read-then-write pattern.
      Tie-averaging (REQUIREMENTS EXT-03) itself was NOT implemented — flagged as a separate,
      not-explicitly-greenlit decision in the F summary (see below); the race-condition part
      specifically named in the Human Decisions block is fixed.
    DONE — Decision 4d (quiz link -> Wayground): updated default value in
      lib/db/schema/index.ts (registrationSettings.quizLink), app/api/admin/quiz/route.ts,
      app/api/tasks/1/quiz/route.ts, app/admin/page.tsx (initial state, fallback, placeholder)
      from https://kahoot.it to https://wayground.com/join?gc=940315&source=liveDashboard.
      Also fixed two stale task-rail labels surfaced by this same grep sweep in app/page.tsx
      (landing page): Task 1 was mislabeled "Imposter Game" and Task 4 "Kahoot Finals" — both
      leftover pre-reorder names; corrected to "Quiz & Betting" and "Imposter Shuffle" to match
      the actual reordered sequence (these are "any other Kahoot-specific copy/references
      surfaced in the audit" per the Human Decisions wording).
  implication: |
    All 4 Human Decision items applied. Proceeding to Section C (test/build/lint), Section D
    (security re-check incl. a live/traced check of the leaderboard fix), Section E (design
    fidelity spot check), then F (final summary). A6/A7/A9/B3 handled per the "judgment call"
    instruction — see F summary for final disposition of each.

- timestamp: 2026-09-26T (Phase 2, Section C — test/build/lint)
  checked: npm test (vitest), npm run build (Next.js 16 production build), npx tsc --noEmit, npx eslint .
  found: |
    npm test: 186 passed, 2 skipped (13 new tests added this session: 7 in tests/security/host.test.ts,
      6 in new tests/security/leaderboard-access.test.ts). The 2 skipped tests
      (tests/db/rls-enabled.test.ts, tests/game/t4-session-integration.test.ts) are explicitly
      gated with skipIf(!DIRECT_URL || dummy/xxxx) — they require a REAL reachable Postgres
      instance and cannot run against this dev environment's placeholder Supabase credentials
      (same documented limitation as Part 1). This is a genuine blocker, not a bug: both tests
      are correctly written and will run automatically once real credentials are configured
      before the event.
    npm run build: clean, zero errors, all 45 routes (incl. the 2 new Task 3 routes) compile and
      prerender/register correctly. Next.js 16's own build step does not appear to enforce the
      strict flat-config eslint rules (see below) — build succeeds independent of lint status.
    npx tsc --noEmit (strict mode, project already has noUncheckedIndexedAccess per package config):
      zero errors.
    npx eslint . : 105 problems (76 errors, 29 warnings) — UP from 102 (73/29) before this session's
      changes. Verified by running eslint on individual pre-existing untouched files
      (e.g. app/api/tasks/2/submit/route.ts) that this is a PRE-EXISTING, codebase-wide
      convention (`catch (err: any)` in ~30+ existing route handlers, `@typescript-eslint/no-explicit-any`),
      not something introduced by this session — my first full-repo eslint run's tail was
      truncated and made it initially look like app/api/** was clean; re-running confirmed
      app/api/tasks/2/submit/route.ts alone already had 1 pre-existing error before I touched it.
      The +3 new errors from this session are: app/api/leaderboard/route.ts's new
      `catch (error: any)` (added to properly forward HttpError.status — previously the file used
      `catch (error)` with no status handling at all, which was itself a smaller pre-existing bug),
      and one `any` each in the 2 new Task 3 routes, all using the SAME established catch-block
      convention as every other route in the codebase. NOT fixed codebase-wide (would mean
      touching ~30 unrelated files this close to the event deadline for pure type-safety polish,
      no behavior change) — flagged as pre-existing, non-blocking, convention-consistent debt in
      the F summary rather than silently left unmentioned.
  implication: |
    Test/build/typecheck are all clean and passing. Lint has known, pre-existing, non-blocking
    debt (documented, not fixed). No regressions introduced by any Phase 2 change.

- timestamp: 2026-09-26T (Phase 2, Section D — security re-check)
  checked: |
    (1) grep the client-reachable bundle/pages for puzzle-answer/secret leakage.
    (2) confirm RLS deny-all on every table, including tables touched by this session's + Part 1's migrations.
    (3) confirm the leaderboard lockdown holds under a direct URL attempt — via a real trace/test, not just assertion.
    (4) confirm session cookies are httpOnly/Secure/SameSite and second-device login still invalidates the old session.
  found: |
    (1) [NEW CRITICAL FINDING, FIXED] app/tasks/3/page.tsx directly imported LOGIC_GATE_STAGES from
        lib/game/logic-gates-data.ts — a server-only-intended module — and called
        `currentStage.verify(...)` CLIENT-SIDE. This meant: (a) the exact `verify` predicate for
        all 5 logic-gate stages shipped in the browser bundle for /tasks/3, letting a technical
        player brute-force or read off the correct inputs directly (each stage has at most 16
        possible input combinations); and (b) the `description` text for Stages 1-3 LITERALLY
        STATED the answer in plain English (e.g. "Set A=1 and B=1", "Set A=0 and B=0", "Set A=1
        B=0 (or A=0 B=1)") — this is not a subtle leak, it was the puzzle answer printed on the
        page. Confirmed via source-level grep AND a real production-build artifact check
        (`grep -rl "NAND|Sector A breaker" .next/static` returned zero matches AFTER the fix,
        confirming the fix actually removes it from the shipped bundle, not just the source).
        FIXED: added `getClientSafeStages()` (strips `verify`, keeps only display-safe fields) to
        lib/game/logic-gates-data.ts; rewrote the 3 answer-revealing `description` strings to keep
        the puzzle flavor without stating the solving inputs; created
        app/api/tasks/3/state (GET, client-safe stage list) and
        app/api/tasks/3/verify-stage (POST, server-only per-stage check, mirrors the existing
        Task-2 verify-fragment pattern) so app/tasks/3/page.tsx no longer imports the raw
        answer-bearing module at all. Confirmed Task 2's cipher-data.ts (MASTER_SENTENCE,
        plaintexts) has NEVER been imported client-side (re-verified, still clean) and Task 4's
        word/imposter data is only ever read from the already-correctly-scoped
        getPlayerGameView() (re-verified, still clean, per original B10 finding).
    (2) VERIFIED: all 17 remaining tables in lib/db/schema/index.ts still end in `.enableRLS()`
        with zero `pgPolicy()` grants anywhere in the codebase — deny-all-by-default intact.
        kahoot_staging was fully DROPPED (not migrated with new policies, since it no longer
        exists) via drizzle/migrations/0003_phase2-gating-cleanup.sql. The 2 new partial unique
        indexes on `sessions` do not weaken RLS (indexes are orthogonal to RLS policies).
    (3) VERIFIED via 2 real test files (not just assertion): tests/security/leaderboard-access.test.ts
        (6 tests, mocks only the true external boundaries — Next's cookie store, the DB-backed
        session loader, the DB-backed leaderboard aggregator — and calls the REAL route handler's
        GET function) proves: no cookie -> 401, never computes/returns team data; plain player
        session -> hiddenForPlayers:true, no leaderboard array, even when the legacy
        `?source=projector` query param is supplied; only real admin/monitor/display-role
        sessions get the full board. tests/security/host.test.ts (extended, 7 new tests) traces
        proxy.ts directly with real NextRequest objects.
        [NEW CRITICAL FINDING, FIXED, DISCOVERED BY WRITING THIS TEST] While writing the proxy-level
        trace, discovered that PUBLIC_PATHS included the literal string '/' and the match logic
        was `path.startsWith(p)` — since EVERY path starts with '/', `isPublic` was ALWAYS true
        for every path in the entire app, which made `isProtected && !isPublic` ALWAYS false. This
        means proxy.ts's cookie gate had been a complete no-op for its entire existence: NOT just
        the newly-added /leaderboard and /api/leaderboard paths, but also the original
        /player, /leader, /monitor, /admin, and /display paths — an unauthenticated request to
        any of these would previously NOT be redirected to /login by the proxy at all (route-level
        requireSession/requireSessionAndRole checks inside each API handler were still enforcing
        auth correctly at the DATA layer throughout, so this was not a raw data-leak bug, but it
        did mean the intended page-level "redirect to login" UX/defense-in-depth layer was
        entirely non-functional for every protected page in the app, and would have made my own
        B5 leaderboard proxy-layer fix silently ineffective if left unfixed). FIXED: match '/'
        with strict equality (`path === '/'`), keep prefix-matching for the other, legitimately
        prefix-based public paths. Added explicit regression tests for /admin, /player, /,
        /api/leaderboard, /api/leaderboard?source=projector, and /leaderboard — all pass.
    (4) VERIFIED: app/api/auth/login/player/route.ts:36 and app/api/auth/login/staff/route.ts:39
        both set `{ httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 12h }`.
        Second-device invalidation: both routes call `revokeAllForPlayer`/`revokeAllForStaff` then
        `createSession` inside the SAME db.transaction — traced the exact interleaving against the
        new partial unique index (sessions_one_active_player/staff WHERE revoked_at IS NULL):
        sequential re-login (device A then device B) works correctly (A's row is revoked, hence
        excluded from the partial index, before B's row is inserted); a genuine CONCURRENT
        double-login race would now have its second transaction's INSERT rejected by the DB
        constraint (previously: both could silently succeed, leaving two active sessions). Could
        NOT run this as a live concurrency integration test — no real reachable Postgres in this
        dev environment (same documented blocker as Part 1 and the 2 skipped tests above). Noted:
        the concurrent-loser's error path returns a raw Postgres constraint-violation message via
        `catch (err: any) { return new Response(err.message, {status:401}) }` rather than a clean
        "please retry" message — a minor UX polish gap under a rare race, not a security issue,
        not fixed (out of the explicit Human Decisions scope).
  implication: |
    Section D found and fixed 2 NEW CRITICAL issues beyond the original Human Decisions list
    (Task 3 answer leak; proxy.ts isPublic no-op bug) — both discovered specifically BECAUSE the
    task instructions required tracing/testing rather than just asserting. All 4 D-checklist items
    now verified true, with 2 of them requiring a real fix, not just confirmation.

- timestamp: 2026-09-26T (Phase 2, Section E — design fidelity spot check, CODE-LEVEL ONLY)
  checked: |
    Component-reuse grep across every screen touched this session: app/tasks/1/page.tsx (quiz
    link + betting UI, unchanged this session but re-checked since its API responses changed),
    app/tasks/2/page.tsx (cipher, copy edited), app/tasks/3/page.tsx (rewritten for the answer-leak
    fix), app/admin/page.tsx (quiz link + Wayground copy), app/leaderboard/page.tsx,
    app/display/page.tsx (both unchanged in JSX, re-checked since their backing API changed).
  found: |
    All 6 screens import and use ONLY the shared design-system components
    (components/ui/panel.tsx, button.tsx, emergency-banner.tsx, status-pill.tsx) — zero new ad hoc
    component definitions or raw unstyled HTML introduced. Panel's `default`/`amber` variants both
    resolve to `border-skeld-amber` (gold border), `red` variant to `border-skeld-red` — the
    Task 3 rewrite preserves the exact same `variant="red"` alert panel and Tailwind utility class
    set (font-orbitron/font-rajdhani/skeld-* tokens) as the pre-existing version, only the data
    source changed (fetched from a new API route instead of a static import). No new colors, fonts,
    or spacing values were introduced anywhere in this session's edits.
    LIMITATION (explicitly stated per task instructions): this is a code-level/component-reuse
    check only. This environment has no way to render a browser or take a screenshot, so pixel-
    level fidelity against rc-nitw.org/freshers (exact spacing, computed styles, crewmate color
    hex values, pixel-font rendering) was NOT and could not be visually verified in this session.
  implication: |
    No new design-fidelity regressions from this session's code changes, to the extent a
    code-level check can confirm. A real visual/screenshot-based pass (Playwright, per STACK.md's
    own "design extraction" tooling) is still recommended before the event as a separate,
    dedicated check — this was out of reach in this environment.

## Phase 3 Evidence (Task 3 replaced with external site + admin manual entry)

- timestamp: 2026-09-26T (Phase 3, implementation)
  checked: |
    Read the Task 1 quiz reference pattern (lib/db/schema/index.ts registrationSettings,
    app/api/admin/quiz/route.ts, app/api/tasks/1/quiz/route.ts, app/tasks/1/page.tsx),
    the current Task 3 implementation being replaced (lib/game/logic-gates-data.ts,
    app/api/tasks/3/{submit,verify-stage,state}/route.ts, app/tasks/3/page.tsx),
    lib/gating.ts canEnterTask, lib/scoring/ledger.ts (recordScoreEvent, submitTaskWithRank),
    lib/scoring/config.ts, app/admin/page.tsx (quiz tab), and grepped app/tasks/2/page.tsx and
    app/tasks/4/page.tsx for the existing "blocked/gated" visual pattern. Finding: app/tasks/2's
    own page doesn't render a distinct blocked panel (gate failures just fall through to generic
    inline error text); app/tasks/4/page.tsx's "Waiting for organizers" Panel (variant="amber",
    auto-refresh note, return-to-hub link) is the actual established blocked-state visual pattern
    in this codebase, so Task 3's rewrite uses that pattern instead, adapted to show the real
    canEnterTask() reason text.
  found: |
    Implemented exactly per task_spec:
    1. Schema: added `bombDefusalLink` text column (default
       'https://vedant-jadhav-23.github.io/BombDefusalTask/') to registrationSettings in
       lib/db/schema/index.ts. Generated drizzle/migrations/0004_phase3-bomb-defusal-link.sql
       via `npx drizzle-kit generate` — single additive `ALTER TABLE "registration_settings" ADD
       COLUMN "bomb_defusal_link" text DEFAULT '...'`, confirmed via `npx drizzle-kit check` ->
       "Everything's fine". Not applied to any live DB (placeholder Supabase credentials only,
       same documented limitation as Phase 1/2).
    2. Deleted lib/game/logic-gates-data.ts, app/api/tasks/3/submit/route.ts,
       app/api/tasks/3/verify-stage/route.ts (confirmed via repo-wide grep for
       logic-gates-data|LOGIC_GATE_STAGES|getClientSafeStages|tasks/3/submit|tasks/3/verify-stage
       that only the files being deleted/rewritten referenced them, before deleting — same method
       as Part 1/Phase 2 cleanups).
    3. Rewrote app/api/tasks/3/state/route.ts: keeps the `canEnterTask(teamId, 3)` gate check,
       now returns `{ bombDefusalLink, completed }` (completed = taskSubmissions row exists for
       taskNumber 3) instead of stage data.
    4. New app/api/admin/bomb-defusal/route.ts mirroring app/api/admin/quiz/route.ts's structure
       and `requireSessionAndRole(req, db, ['admin'])` auth exactly. GET returns
       `{ bombDefusalLink, teams: [{id, code, name, points, completed}] }`. POST accepts
       `{ bombDefusalLink?, scores? }`; each score entry calls recordScoreEvent (taskNumber:3,
       eventType 'TASK_3_BOMB_DEFUSAL', idempotencyKey `bomb-defusal-t3-${teamId}`) then inserts
       the taskSubmissions row (onConflictDoNothing), unlocking Task 4 for that team immediately —
       no "declare results" step, per the human decision (teams finish the external site at
       different times, unlike the quiz).
    5. Rewrote app/tasks/3/page.tsx: fetches /api/tasks/3/state; on 403 shows a blocked panel
       (Panel variant="amber", reason text from the gate check, auto-refresh note, return-to-hub
       link — matching app/tasks/4/page.tsx's established "waiting" pattern); on allowed +
       !completed shows the bomb-defusal-link as a big external button (same visual treatment as
       Task 1's "ENTER QUIZ MISSION" button, Panel variant="red" preserved from the old page) plus
       the "notify organizers once finished" note; on completed shows a success panel ("BOMB
       DEFUSED!") with a "PROCEED TO TASK 4" button, adapted from the old page's existing
       success-panel copy/structure.
    6. app/admin/page.tsx: added a `'bombdefusal'` tab mirroring the `'quiz'` tab exactly (link
       editor + save, per-team point inputs + "SAVE SCORES"), plus a ✓ completed indicator per
       team row (quiz tab has no equivalent since Task 1 has a single global "declare" step; Task
       3 doesn't, so per-team completion visibility replaces it). No declare-results button, per
       the human decision.
    7. lib/scoring/config.ts: updated the stale `tasksRankBased` comment (previously claimed
       "Tasks 2, 3, 4: Rank-based scoring") to correctly scope it to Task 2 only, and documented
       that Tasks 1 and 3 are both external-link + admin-manual-entry (no rank auto-calculation).
       No behavior change, comment accuracy only.
    8. tests/game/rounds-2-and-3.test.ts: removed the 11 `describe('Logic Gate Stages', ...)`
       tests (import of the deleted LOGIC_GATE_STAGES module removed); kept all cipher/Task-2
       tests unchanged.
  implication: |
    All task_spec items complete. Verification:
    - `npm test`: 175 passed, 2 skipped (same 2 pre-existing DB-dependent skips as Phase 2; test
      count dropped from 186 to 175 = exactly the 11 removed logic-gate tests, no other change).
    - `npx tsc --noEmit`: initially reported 2 stale-route-manifest errors referencing the deleted
      /api/tasks/3/{submit,verify-stage} routes (same known Next.js 16 `.next/types` staleness
      trick documented earlier in this session) — resolved by deleting `.next` and rebuilding;
      re-ran `npx tsc --noEmit` after rebuild: zero errors.
    - `npm run build`: clean, zero errors, 42 routes (down from 45: -2 for the deleted Task 3
      routes, -1 net for other unrelated changes not part of this phase), includes the new
      `/api/admin/bomb-defusal` route and rewritten `/api/tasks/3/state`; `/api/tasks/3/submit`
      and `/api/tasks/3/verify-stage` no longer appear in the route table.
    - `npx eslint .`: 104 problems (75 errors, 29 warnings), down from 105 before this phase (net
      -1: removed 2 pre-existing `any` lint errors from the deleted Task 3 routes, added 2 new
      `any` in the new/rewritten routes using the same established `catch (err: any)` convention
      as every other route in the codebase — same non-blocking, pre-existing-convention debt
      documented in Phase 2's Section C, not a regression).
    - Gating chain traced end-to-end (no live DB in this environment, same limitation as Phase 2):
      Task 2 complete -> submitTaskWithRank inserts taskSubmissions(teamId, taskNumber=2) ->
      canEnterTask(teamId, 3) reads that row as `prevTask` satisfied -> Task 3 page reachable,
      returns bombDefusalLink + completed:false -> admin enters that team's score in the new
      Bomb Defusal tab, POST /api/admin/bomb-defusal inserts taskSubmissions(teamId,
      taskNumber=3) -> canEnterTask(teamId, 4)'s prevTask=3 check now passes for that team
      specifically -> Task 4 becomes reachable for that team; Task 3 page's next 5s poll shows
      completed:true and the "PROCEED TO TASK 4" success panel. Confirmed via direct code trace,
      consistent with the rigor of Phase 2's Section D.
    - Confirmed via repo-wide grep that no remaining references to the deleted
      lib/game/logic-gates-data.ts, /api/tasks/3/submit, or /api/tasks/3/verify-stage exist.
    ACTION ITEM FOR THE HUMAN (not fixable by this session): the stored bombDefusalLink default
    (https://vedant-jadhav-23.github.io/BombDefusalTask/) will 404 until GitHub Pages is enabled
    on https://github.com/vedant-jadhav-23/BombDefusalTask by its owner (Settings -> Pages ->
    deploy from `main` branch). This is a pre-event action item, not something this session can or
    should do (not this session's repo).
files_changed (Phase 3):
  - lib/db/schema/index.ts (added bombDefusalLink column)
  - drizzle/migrations/0004_phase3-bomb-defusal-link.sql (new)
  - drizzle/migrations/meta/0004_snapshot.json (new)
  - drizzle/migrations/meta/_journal.json
  - lib/game/logic-gates-data.ts (deleted)
  - app/api/tasks/3/submit/route.ts (deleted)
  - app/api/tasks/3/verify-stage/route.ts (deleted)
  - app/api/tasks/3/state/route.ts (rewritten — external link + completed flag)
  - app/api/admin/bomb-defusal/route.ts (new)
  - app/tasks/3/page.tsx (rewritten — external link + blocked/success panels)
  - app/admin/page.tsx (new 'bombdefusal' tab)
  - lib/scoring/config.ts (comment accuracy only)
  - tests/game/rounds-2-and-3.test.ts (removed 11 logic-gate tests, kept cipher tests)

## Phase 3 addendum (2026-09-26): Replace Task 3 with external site

**New human decision, made after Phase 2 completed:** Task 3 (bomb defusal) must be replaced with an external, standalone site: https://github.com/vedant-jadhav-23/BombDefusalTask (single-file `index.html`, ~24KB, own dark red/yellow/cyan theme, no callback mechanism). This mirrors how Task 1 (quiz) already links out to an external Wayground quiz instead of an in-app puzzle. Scoring/completion method: **admin manual entry**, exactly like the existing quiz admin flow in `app/api/admin/quiz/route.ts` (admin types a point value per team; no rank auto-calculation).

**Important caveat to flag to the user, not silently work around:** the GitHub repo has `has_pages: false` — there is no live hosted URL yet, only the raw repo. Use the repo's GitHub Pages URL pattern (`https://vedant-jadhav-23.github.io/BombDefusalTask/`) as the stored default link value, but note in the final report that this only works once GitHub Pages is actually enabled on that repo (Settings -> Pages -> deploy from `main` branch) — flag this as a pre-event action item for the user, do not attempt to enable it yourself (not your repo).

next_action: |
  Phase 3 implementation complete (see "## Phase 3 Evidence" above): Task 3 replaced with
  external-link + admin-manual-entry flow, npm test/tsc/build all clean, gating chain traced
  end-to-end. Changes left uncommitted in the working tree per task instructions. Remaining
  human action items: (1) enable GitHub Pages on
  https://github.com/vedant-jadhav-23/BombDefusalTask so the stored default link resolves,
  (2) review/commit when ready.

## Phase 4 addendum (2026-09-26): DB provider switch + remaining housekeeping + hosting prep

**New human decisions:**
1. User is out of free Supabase project slots (2/2 used) and explicitly chose to switch the database host to **Neon** (a different Postgres provider) rather than pause/delete an existing Supabase project. This is a deliberate deviation from CLAUDE.md's originally-fixed "PostgreSQL on Supabase (database only)" stack constraint, approved after discussion (per that constraint's own "not open for reconsideration without discussion" clause — the discussion happened, user decided).
2. For the remaining Part 2 open items (A6/A7 configurable task-completion method, registration mock/CSV adapter, admin gate-toggle UI, the leftover git stash), orchestrator's recommendation, stated to and not objected to by the user given explicit "quickly fix everything else" instruction under extreme time pressure (event is TODAY):
   - Do NOT build a generic configurable-completion-method abstraction (A6) or a CSV/mock registration-adapter layer (A7) right now — both existing alternatives (fixed per-task completion methods; direct player self-registration via `/api/auth/register`) already function correctly for today's event, and introducing new abstraction layers hours before a live event is too risky. Leave both as-is; do not touch this.
   - DO restore a minimal admin gate-toggle UI (open/close a task mid-event) — this was lost when Phase 2 deleted the orphaned `/api/tasks/gate/route.ts` (its only writer), and is a genuinely useful operational safety valve for event day.
   - DO drop the leftover `git stash@{0}` from Part 1 (the two accidental pre-existing regressions that were found and reverted) — its contents are fully superseded by Phases 1-3's proper fixes; nothing further needs recovering from it.

next_action: Execute Phase 4 exactly as scoped in the orchestrator's dispatch message below.

## Phase 4 Evidence

- timestamp: 2026-09-26T (Phase 4, Task 1 — DB provider generalization Supabase -> Neon)
  checked: |
    Grepped lib/db/schema/index.ts for anonRole/authenticatedRole/serviceRole/authUid/pgRole —
    zero matches (schema only uses generic `.enableRLS()`, confirmed no Supabase-specific role
    helpers exist to break). Grepped whole repo (excl. node_modules) for "supabase" (case
    insensitive) and separately for "Supavisor" to catch comment-only references that don't
    contain the literal string "supabase".
  found: |
    drizzle.config.ts had `entities: { roles: { provider: 'supabase' } }` — removed entirely
    (drizzle-kit will no longer try to skip Supabase's pre-created system roles during
    introspection, which is correct since Neon doesn't have them).
    lib/db/client.ts's postgres.js config ({prepare:false, max:1, ssl:'require'}) confirmed
    provider-agnostic, needs no code change; only its inline comment referenced "Supavisor" by
    name — generalized to "PgBouncer/pooler transaction mode (Neon, Supabase's Supavisor, etc.)".
    lib/env.ts's DATABASE_URL/DIRECT_URL comments said "port 6543 Supavisor transaction pooler" /
    "port 5432 for drizzle-kit migrations" (Supabase-specific port numbers, misleading for Neon
    which uses hostname-based pooled-vs-unpooled endpoints, not fixed ports) — reworded to
    describe pooled-vs-unpooled generically.
    .env.example: replaced Supabase-style example connection strings with Neon-style
    (`ep-xxxx-pooler.region.aws.neon.tech` pooled / `ep-xxxx.region.aws.neon.tech` unpooled),
    kept the pooled-for-app / unpooled-for-migrations comment distinction.
    CLAUDE.md: added a short dated note under the Constraints "Tech stack" line and directly
    under the "## Connecting to Supabase from Vercel" heading, stating the 2026-09-26 switch to
    Neon and that no driver code changes were needed; did not rewrite the research section itself
    (kept as historical record per task instructions).
    README.md: updated the one-line tech stack bullet to say Neon, cross-referencing CLAUDE.md.
    Remaining "supabase"/"Supavisor" matches are all in .planning/** (historical planning docs,
    explicitly out of scope per task instructions) — left untouched.
  implication: |
    DB provider config is now provider-agnostic; Neon "just works" through the same
    postgres.js + Drizzle pooled/unpooled pattern, zero application code changes required beyond
    the drizzle-kit introspection config and doc/comment accuracy.

- timestamp: 2026-09-26T (Phase 4, Task 2 — admin gate-toggle UI)
  checked: |
    lib/gating.ts canEnterTask (reads taskGates by teamId+taskNumber, fails OPEN if no row
    exists, blocks only when `closedAt && !openedAt`). git show HEAD:app/api/tasks/gate/route.ts
    (the deleted Phase-2 route) to salvage the open/close upsert logic. lib/db/schema/index.ts
    taskGates table definition (teamId, taskNumber, openedAt, closedAt, openedBy; unique on
    teamId+taskNumber). app/api/admin/bomb-defusal/route.ts as the established admin-route
    pattern (requireSessionAndRole + GET/POST shape) to match.
  found: |
    Created app/api/admin/task-gate/route.ts (admin-only, requireSessionAndRole(['admin'])):
    GET returns all teams + a per-task open/closed summary (a task is reported closed only if
    every team has an explicit closed-without-opened row, matching canEnterTask's fail-open
    default for any team missing a row) + raw per-team gate rows. POST accepts
    { taskNumber, action: 'open'|'close', teamId? } — omitting teamId applies the action to every
    team in one call (upsert loop via onConflictDoUpdate), matching the "pause task 3 for
    everyone" operational use case named in the dispatch; passing teamId targets one team. This
    is a genuine behavior improvement over the old deleted route, whose POST silently did nothing
    when teamId was omitted (an existing bug in the salvaged code, not reproduced).
    Old route was reachable by any authenticated session for its GET (read-only, low risk) but its
    POST already required admin role — the new route requires admin for BOTH GET and POST, since
    GET now also exposes all-teams gate state rather than just the caller's own team.
    Added a small "Task Gates" tab to app/admin/page.tsx: 4 rows (Task 1-4), each showing
    OPEN/CLOSED + a single toggle button that flips it for all teams, using the existing
    Panel/Button components and the same design tokens (font-orbitron/skeld-* colors) as every
    other admin tab. Reuses the same load-on-mount + POST + reload pattern as the existing
    quiz/bomb-defusal/betting tabs.
  implication: |
    Restores the admin's ability to pause/resume a task mid-event, which Phase 2's orphan-route
    cleanup had removed as a side effect (taskGates had no remaining writer). Fail-open default
    means zero admin action is required for the event to proceed normally; CLOSE is purely an
    operational safety valve.

- timestamp: 2026-09-26T (Phase 4, Task 3 — drop leftover git stash)
  checked: |
    `git stash list` -> single entry, stash@{0} "On main: wip-before-debug-fixes: uncommitted
    regressions (schema field removal, empty task3 submit route)". `git stash show -p stash@{0}
    --stat` to view full diff before dropping (not just trusting the message).
  found: |
    Diff confirmed exactly the two known accidental regressions: (1) app/api/tasks/3/submit/
    route.ts fully emptied (92 lines -> 0), superseded by Phase 3's complete external-site +
    admin-manual-entry replacement (route now deleted entirely, functionality moved to
    app/api/admin/bomb-defusal/route.ts + app/api/tasks/3/state/route.ts); (2) 5 schema field
    removals from lib/db/schema/index.ts (registrationSettings.quizLink/round1Declared/
    bettingOpen/betsSettled, taskSubmissions.submissionData) — all 5 fields are present and in
    active use in the current lib/db/schema/index.ts (confirmed by re-reading the live file),
    so nothing in the stash is un-recovered work.
    Dropped via `git stash drop stash@{0}`; `git stash list` now empty.
  implication: |
    No recovery risk — stash contents were fully superseded by Phases 1-3's proper fixes before
    being dropped, confirmed via diff inspection rather than trusting the stash message alone.

- timestamp: 2026-09-26T (Phase 4, Task 4 — hosting prep)
  checked: |
    Existence of vercel.json (none). Grep for hardcoded localhost/ports/URLs across app/, lib/,
    components/ (excluding tests and .env.example). Cross-referenced lib/env.ts's zod schema for
    the full runtime env var list.
  found: |
    No vercel.json exists and none is needed — this is a standard Next.js App Router project with
    no custom header/redirect config beyond what's already in next.config.ts (security headers)
    and proxy.ts (CSP, host allowlist, auth cookie gate); Vercel auto-detects Next.js. Did not
    create one speculatively.
    Grep for localhost/127.0.0.1/hardcoded http(s) URLs across app/**/*.{ts,tsx},
    lib/**/*.{ts,tsx}, components/**/*.{ts,tsx}: zero matches. The only "URL-shaped" literals in
    the live app are the intentional external task links (Wayground quiz join link, GitHub Pages
    bomb-defusal link) which are admin-editable via the DB (registrationSettings.quizLink /
    .bombDefusalLink) and only used as browser-facing default/fallback values, not
    infrastructure/domain config — these are content, not hardcoded deployment domains, so not a
    CLAUDE.md violation. APP_URL/ALLOWED_HOSTS are correctly sourced from env everywhere (lib/env.ts,
    proxy.ts host check) with no literal fallback domain anywhere in app/lib/components.
    Nothing ambiguous found requiring a flag-rather-than-fix judgment call.
  implication: |
    No hosting-prep code changes needed. Vercel env-var checklist produced below (see final
    report) directly from lib/env.ts's zod schema, cross-referenced with app/api/admin/quiz +
    bomb-defusal routes for the two DB-stored (not env-var) link defaults.

- timestamp: 2026-09-26T (Phase 4, Task 5 — full verification)
  checked: npm test (vitest), npx tsc --noEmit (after deleting stale .next), npm run build
    (Next.js 16 production build), npx eslint .
  found: |
    npm test: 175 passed, 2 skipped — identical count to the end of Phase 3 (no test regressions,
    no new tests added this phase since Task 1-4 work was config/UI, not business logic requiring
    new unit tests; the 2 skipped tests are the same pre-existing real-DB-required skips
    documented in every prior phase).
    npx tsc --noEmit: zero errors (had to delete .next first — same known Next.js 16 stale
    route-manifest-type trick documented in Phase 3, caused by the new app/api/admin/task-gate
    route not yet being in .next/types on the first run before a clean rebuild).
    npm run build: clean, zero errors, 43 routes (up from 42 at end of Phase 3: +1 for the new
    /api/admin/task-gate route, no other route count change).
    npx eslint .: 106 problems (77 errors, 29 warnings), up from 104 (75/29) at end of Phase 3.
    Isolated the delta by linting app/api/admin/task-gate/route.ts alone: exactly 2 errors, both
    `catch (err: any)` in the file's two handlers — the SAME established convention used in every
    other route in the codebase (documented as pre-existing, non-blocking debt in Phase 2 and
    Phase 3's Section C). +2 matches +1 new route file with 2 handlers exactly; no other file's
    lint status changed. Not fixed codebase-wide, same reasoning as Phases 2-3 (would mean
    touching ~30 unrelated files hours before the event for pure type-safety polish).
  implication: |
    Zero regressions from Phase 4's 5 tasks. Test/build/typecheck clean; lint delta fully
    explained and consistent with the pre-existing, documented codebase convention.

## Resolution (Phase 4 addendum)

root_cause: |
  N/A for Phase 4 — this phase was scoped as fix/audit execution work (DB provider
  generalization, admin tooling restoration, repo hygiene, hosting prep), not a single symptom
  investigation. See the original Resolution block above for the root causes fixed in Phases 2-3.
fix: |
  Phase 4 additions on top of Phases 1-3's fixes:
  1. Removed drizzle.config.ts's Supabase-specific `entities.roles.provider` (confirmed no
     Supabase role-helper code exists to break); generalized Supavisor-specific comments in
     lib/db/client.ts and lib/env.ts; updated .env.example to Neon-style connection strings;
     added short dated notes to CLAUDE.md (Constraints line + Supabase-connection research
     heading) and README.md documenting the 2026-09-26 Supabase->Neon switch, without rewriting
     the historical research content.
  2. Restored an admin-only task-gate toggle: new app/api/admin/task-gate/route.ts (GET status
     summary, POST open/close with optional per-team targeting, defaults to all-teams) plus a new
     "Task Gates" tab in app/admin/page.tsx.
  3. Confirmed stash@{0}'s contents were fully superseded by Phases 1-3, then dropped it.
  4. Hosting prep: confirmed no vercel.json needed, confirmed zero hardcoded localhost/URLs in
     app/lib/components; produced a Vercel env-var checklist (delivered in the final report, not
     a new file, per task instructions).
verification: |
  npm test: 175 passed, 2 skipped (unchanged from Phase 3, no regressions). npx tsc --noEmit:
  zero errors. npm run build: clean, zero errors, 43 routes (was 42; +1 for the new
  /api/admin/task-gate route). npx eslint .: 106 problems (was 104), +2 fully explained as the
  same pre-existing `catch (err: any)` convention applied to the one new route file, not a new
  category of issue. git stash list: empty (confirmed via diff before dropping, not just the
  stash message). All changes left uncommitted in the working tree per task constraints.
files_changed (Phase 4):
  - drizzle.config.ts (removed Supabase-specific entities.roles config)
  - lib/db/client.ts (comment generalization only, no behavior change)
  - lib/env.ts (comment generalization only, no behavior change)
  - .env.example (Neon-style example connection strings)
  - CLAUDE.md (dated Supabase->Neon switch notes, 2 locations)
  - README.md (tech stack bullet updated)
  - app/api/admin/task-gate/route.ts (new — admin gate open/close, all-teams or per-team)
  - app/admin/page.tsx (new "Task Gates" tab)

## Phase 5 addendum (2026-09-26): Properly fix CSP nonce propagation instead of relaxing script-src

**Human directive, correcting Phase 4's emergency trade-off:** Revert the `script-src` relaxation to `'unsafe-inline'` committed in `d883a4d`. Do NOT use `unsafe-inline` for script-src under any circumstance. Root-cause and fix the actual bug instead: Next.js 16.3.6's own internal hydration/injected `<script>` tags were not receiving the matching per-request nonce, which is what caused the CSP violations and downstream React hydration error #412 (every form on the site was effectively broken - clicks fell back to native form submission instead of the React handler).

next_action: Execute exactly the 4-step fix + 2-check verification plan below. Do not report done until both verification checks pass for real, with evidence.
