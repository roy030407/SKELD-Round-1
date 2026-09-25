# Phase 1: Foundation, Data Model, Registration & Auth - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning
**Source:** Recovered from Claude Code `/gsd-discuss-phase 1` session (interrupted mid-discuss when org disabled Claude Code subscription). Decisions below match what was captured in that session; "You decide" areas are locked here as the Recommended path.

<domain>
## Phase Boundary

A secure foundation exists: database schema and migrations with RLS deny-all everywhere, security headers/CSP/host validation active, registration data loaded read-only via a pluggable adapter (mock + CSV), and all five roles can authenticate with server-enforced role checks on every route. This is Walking Skeleton / MVP mode — deliver a real end-to-end path of login → role-appropriate stub page, not polished UI (UI belongs to Phase 2 / later feature phases). No scoring, gating, Task 1 engine, or check-in flow beyond what's required to prove auth/session/role enforcement.

</domain>

<decisions>
## Implementation Decisions

### Registration Model (CHANGED from original plan)
- **D-REVISED:** Registration is **self-service on the site** — players fill in a web form and join their team using a team code. There is no CSV import, no mock adapter, and no external data source integration. The REG-01..04 adapter requirements are superseded by this decision.
- **D-10:** Admin pre-creates teams (with auto-generated sequential codes: `SKELD-01`, `SKELD-02`, ...) before registration opens.
- **D-11:** Registration form collects: full name, roll number (NITW format), team code (to join a team), email. Phone number is NOT collected.
- **D-12:** Registration auto-generates a player code (`P001`..`P006`) which, combined with roll number, is the player's login credential. Player code is shown prominently on the registration success page — no email delivery.
- **D-13:** Registration is open by default. Admin can lock it. Admin can approve late individual additions post-lock.
- **D-14:** Team leader is designated by admin after registration (not self-selected).
- **D-15:** Team cap is 6 players (enforced server-side in the registration transaction).

### Staff Login Mechanism
- **D-01:** Staff roles (`monitor`, `admin`, `display`) authenticate via **seeded staff accounts** (username + password), stored in `staff_accounts` table, verified against env-seeded credentials.
- **D-02:** Staff sessions reuse the same `jose` + DB `sessions` pattern as players.
- **D-03:** Seed at least one account per staff role. Credentials in env only.

### Walking Skeleton Scope
- **D-08:** Phase 1 success path is **register → login → role-appropriate page** for all five roles. Pages are minimal stubs; pixel-perfect UI is Phase 2.
- **D-09:** Walking Skeleton must satisfy the security baseline: RLS deny-all on every table, CSP/headers/host validation, no `NEXT_PUBLIC_` secrets, zod on mutating endpoints, one-active-session enforcement, and an automated authorization test suite covering all 5 roles.

### Claude's Discretion
- Exact player code format per team (P001, P002, ...).
- Exact team code format (SKELD-01, SKELD-02, ...).
- Exact stub page routes/labels for each role.
- Display auth: same username/password path as admin/monitor.

</decisions>

<specifics>
## Specific Ideas

- Areas the user explicitly selected to discuss in Claude Code: staff login mechanism, mock adapter fixture realism, CSV adapter format, Walking Skeleton.
- Staff auth: user chose **"You decide (Recommended)"** → seeded staff accounts (above).
- Mock fixtures: user direction crystallized as **~25×6 realistic** fixtures.
- CSV: user direction crystallized as **Claude-defined schema**.
- Walking Skeleton: user direction crystallized as **login → role-appropriate page**.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — REG-01..04, AUTH-01..04, SEC-01..10, TEST-04

### Project & Roadmap
- `.planning/PROJECT.md` — auth/session model, adapter layer, security acceptance criteria, five roles
- `.planning/ROADMAP.md` §Phase 1 — goal, success criteria, Walking Skeleton / MVP mode

### Research
- `.planning/research/STACK.md` — `jose` + DB sessions, Supavisor pooler `prepare: false`, `proxy.ts` CSP/host validation, no Auth.js / no `@supabase/supabase-js`
- `.planning/research/ARCHITECTURE.md` — RLS deny-all + service-role-only, adapter as one-way seed into `teams`/`players`
- `.planning/research/SUMMARY.md` — stack + pitfall summary for Phase 1 foundation choices
- `.planning/research/PITFALLS.md` — unique-constraint / session / RLS pitfalls that apply from the first migration

### Stack constraints (project root)
- `CLAUDE.md` — fixed tech stack, env-only domains, no new third-party services without asking

</canonical_refs>

<code_context>
## Existing Code Insights

This is a greenfield project — no application source code exists yet (only `.planning/` docs and `design-reference/` screenshots). Phase 1 creates the Next.js app, schema, adapters, and auth from scratch. Phase 2 (design system) is a parallel track and must not block Phase 1; stub pages here should not invent a competing design system.

</code_context>

<deferred>
## Deferred Ideas

- Real official-site registration adapter implementation — out of scope until official DB type is confirmed (PROJECT.md Out of Scope); only the interface + mock + CSV ship now.
- Pixel-perfect login/landing UI — Phase 2 (design system) and later feature phases.
- Check-in flow, task gating, scoring, Task 1 engine — Phases 3–5+.
- Full admin operational surfaces beyond auth revoke + role stub — later phases.

</deferred>

---

*Phase: 01-foundation-data-model-registration-auth*
*Context gathered: 2026-09-25 (recovered from Claude Code discuss + Recommended locks)*
