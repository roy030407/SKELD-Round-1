# Phase 1: Foundation, Data Model, Registration & Auth - Research

**Researched:** 2026-09-25
**Domain:** Next.js 16 App Router + Drizzle/Postgres (Supabase DB-only) + custom jose/DB sessions + registration adapters + security baseline
**Confidence:** HIGH (framework/ORM/pooler/CSP patterns verified against live official docs + npm); MEDIUM (staff table shape, CSV column names — Claude discretion)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Staff roles (`monitor`, `admin`, `display`) are **not** players and do **not** use player-code + roll-number. They authenticate via **seeded staff accounts** (username + password), stored in a dedicated staff/accounts table (or equivalent), with passwords verified server-side against env-seeded credentials (never hardcoded in source).
- **D-02:** Staff sessions reuse the same `jose` + DB `sessions` pattern as players (opaque signed cookie → `sessions` row is source of truth). Role comes from the session/DB row, not from the JWT payload alone. Admin can revoke staff sessions the same way as player sessions.
- **D-03:** Seed at least one account per staff role for local/event use: `admin`, `monitor`, `display`. Credentials live in env / seed script (documented in `.env.example`), never committed as real secrets.
- **D-04:** Mock adapter ships **~25 teams × 6 players** (~150 players) of realistic fixture data — NITW-plausible roll numbers, first names, team codes/names, and contact fields — not toy `team1`/`player1` stubs. Fixtures must be good enough to exercise check-in, gating, and Task 1 shuffle logic in later phases without rewriting seed data.
- **D-05:** Exactly one player per team is marked as `leader` in fixtures so AUTH-03 / leader-only actions can be tested from day one.
- **D-06:** CSV schema is defined in this phase (Claude's discretion on exact column names) and must round-trip the same fields the mock adapter produces: team identity, player identity, roll number, leader flag, and contact fields needed by REG-01. Document the schema next to the adapter (header row + one example row in comments or a sample `.csv` under fixtures).
- **D-07:** CSV adapter is the event-day fallback when the real official-site adapter is unavailable; same pluggable interface as mock (REG-04). Import is read-only into app tables — adapters never become a live write path.
- **D-08:** Phase 1 success path is **login → role-appropriate page** for all five roles (`player`, `leader`, `monitor`, `admin`, `display`). Pages may be minimal stubs (role label + logout); pixel-perfect UI is Phase 2 / feature phases.
- **D-09:** Walking Skeleton must still satisfy the security baseline for everything it touches: RLS deny-all on every table, CSP/headers/host validation, no `NEXT_PUBLIC_` secrets, zod on mutating auth endpoints, one-active-session enforcement, and an automated authorization test suite covering all 5 roles (TEST-04 / AUTH-03).
- **Stack fixed:** Next.js 16 App Router, TypeScript strict, Tailwind v4, Drizzle, postgres.js to Supabase pooler `prepare: false`, zod v4, jose + DB sessions, `proxy.ts` (not `middleware.ts`).

### Claude's Discretion
- Exact staff table shape vs. unified users table with a `kind` discriminator.
- Exact CSV column names and delimiter conventions (as long as documented and fixture-compatible).
- Exact stub page routes/labels for each role.
- Seed credential naming (`STAFF_ADMIN_PASSWORD`, etc.) and whether display uses a simpler long-lived display code vs. full password — prefer simplest approach that still goes through the sessions table and role checks.

### Deferred Ideas (OUT OF SCOPE)
- Real official-site registration adapter implementation — out of scope until official DB type is confirmed (PROJECT.md Out of Scope); only the interface + mock + CSV ship now.
- Pixel-perfect login/landing UI — Phase 2 (design system) and later feature phases.
- Check-in flow, task gating, scoring, Task 1 engine — Phases 3–5+.
- Full admin operational surfaces beyond auth revoke + role stub — later phases.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REG-01 | Registration data synced read-only into app tables via pluggable adapter | Adapter interface + sync script/admin action writing `teams`/`players`; adapters never used as live write path |
| REG-02 | Mock adapter with fixture data | ~25×6 realistic fixtures (D-04/D-05); `lib/registration/mock.ts` |
| REG-03 | CSV adapter as event-day fallback | Claude-defined CSV schema (recommended columns below); `lib/registration/csv.ts` + sample fixture |
| REG-04 | Adapter interface for future real adapter | Single `RegistrationAdapter` contract; factory selects mock/csv/real by env |
| AUTH-01 | Player login with player code + roll number | POST `/api/auth/login/player`; verify against `players` table |
| AUTH-02 | One active session per player; new login revokes prior | Partial unique index on `sessions(player_id) WHERE revoked_at IS NULL`; transactional revoke+insert |
| AUTH-03 | Role checks for all 5 roles on every route/API | `requireRole()` / `requireSession()` in handlers + route-group stubs; Vitest authz matrix (TEST-04) |
| AUTH-04 | Admin force-revoke any player session | POST `/api/admin/sessions/revoke`; sets `revoked_at`; cookie becomes useless on next DB lookup |
| SEC-01 | RLS deny-all on every table; only server DB access | Drizzle `pgTable.withRLS` / ENABLE RLS; single `lib/db` client; no anon client |
| SEC-02 | Secrets never `NEXT_PUBLIC_` | Env zod schema; CI grep for `NEXT_PUBLIC_.*(SECRET\|PASSWORD\|DATABASE\|SERVICE)` |
| SEC-03 | Mutating endpoint pipeline | Shared `mutate()` helper: zod → origin/CSRF → auth → role → rate limit → idempotency → tx → audit |
| SEC-04 | Postgres-backed rate limit + idempotency | Tables `rate_limit_counters`, `idempotency_keys`; not in-memory Maps |
| SEC-05 | Security headers + CSP nonces | `proxy.ts` CSP+nonce; `next.config` for HSTS/nosniff/referrer/permissions-policy; frame-ancestors in CSP |
| SEC-06 | Host validation via `ALLOWED_HOSTS` | First check in `proxy.ts`; no hardcoded domains |
| SEC-07 | No secrets in git; `.env.example`; gitleaks + npm audit | Hook + CI; document gitleaks binary install |
| SEC-08 | PII admin-only in payloads | Field-select view-models; never return email/phone/roll to non-admin |
| SEC-09 | No dangerouslySetInnerHTML / eval / inline handlers | ESLint `no-restricted-syntax` |
| SEC-10 | Supavisor transaction pooler for app | `DATABASE_URL` port 6543, `prepare: false`, `max: 1`; `DIRECT_URL` for migrations |
| TEST-04 | Automated authorization tests for all 5 roles | Vitest suite: each role allowed/denied against stub + revoke endpoints |
</phase_requirements>

## Summary

Phase 1 is a **Walking Skeleton**: scaffold Next.js 16, ship Drizzle schema/migrations with RLS deny-all, wire `proxy.ts` security/CSP/host validation, load registration via mock+CSV adapters into app tables, and deliver a real **login → role stub page** path for all five roles with server-enforced sessions and an authorization test suite. Pixel UI and game features are explicitly out of scope.

The load-bearing patterns are already settled by project research and CONTEXT: opaque `jose`-signed `{ sid }` cookie → DB `sessions` row as source of truth; staff via seeded username/password (not player codes); Supabase as Postgres-only through Supavisor transaction pooler with `prepare: false`; no Auth.js / no `@supabase/supabase-js`. Planner tasks should implement these patterns, not reopen them.

**Primary recommendation:** Plan a thin vertical slice in ordered waves — (0) scaffold + env + headers/proxy, (1) schema+RLS+DB client, (2) adapters+seed, (3) player+staff auth+session revoke, (4) five role stub routes + Vitest authz matrix — without inventing a design system.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSP nonce / Host validation / security headers | Frontend Server (`proxy.ts`) | CDN/Static (static asset exclusion via matcher) | Runs before render; official Next.js Proxy pattern |
| Session cookie issue/verify (crypto) | API / Backend | Frontend Server (cheap cookie presence in proxy) | `jose` sign/verify; DB row is authority — full lookup in Route Handlers / Server Components, not Proxy DB round-trips |
| Role authorization | API / Backend | Frontend Server (redirect stubs) | AUTH-03: every API + page must deny wrong role server-side |
| Registration adapter sync | API / Backend (script or admin action) | Database / Storage | One-way seed into `teams`/`players`; adapters never called from game paths |
| Schema, RLS, unique constraints | Database / Storage | API / Backend (repos) | Pitfalls 4 & 10: bake RLS + UNIQUE into first migrations |
| Rate limit / idempotency counters | Database / Storage | API / Backend | SEC-04: must survive serverless (no in-memory) |
| Stub role pages | Frontend Server (SSR) | Browser (minimal client logout) | Walking Skeleton UI only |
| PII field filtering | API / Backend (`lib/view-models`) | — | SEC-08: field-select outbound DTOs |
| Password verify (staff) | API / Backend | — | `node:crypto` scrypt; never send hash to client |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.3.6` [VERIFIED: npm registry] | App Router, Route Handlers, `proxy.ts` | Locked; Proxy replaces middleware as of v16.0.0 [CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy] |
| `react` / `react-dom` | `19.x` (paired with Next 16) [ASSUMED pairing from Next engines] | UI | Required peer of Next 16 |
| `typescript` | `5.x` strict + `noUncheckedIndexedAccess` [ASSUMED] | Type safety | Project constraint |
| `tailwindcss` | `4.3.3` [VERIFIED: npm registry] | Styling tokens later; minimal stubs now | Locked; CSS-first `@theme` |
| `@tailwindcss/postcss` | `4.3.3` [VERIFIED: npm registry] | Tailwind v4 PostCSS integration | Official Tailwind v4 Next path [CITED: STACK.md / Tailwind docs via project research] |
| `drizzle-orm` | `0.45.3` [VERIFIED: npm registry] | Schema, queries, RLS helpers | Locked; `pgTable.withRLS`, `drizzle-orm/supabase` roles [CITED: orm.drizzle.team/docs/rls] |
| `drizzle-kit` | `0.31.11` [VERIFIED: npm registry] | Migrations | Pairing with orm 0.45.x [VERIFIED: npm registry] |
| `postgres` | `3.4.9` [VERIFIED: npm registry] | Driver under Drizzle | Official Drizzle+Supabase recommendation; `prepare: false` [CITED: orm.drizzle.team/docs/connect-supabase] |
| `zod` | `4.6.5` [VERIFIED: npm registry] | Request + env validation | Locked; write v4-style schemas |
| `jose` | `6.2.12` [VERIFIED: npm registry] | Sign/verify opaque session cookie | Locked; Web Crypto, Node Proxy runtime OK |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `5.0.2` [VERIFIED: npm registry] | Unit tests (authz, adapter, session revoke) | TEST-04; Wave 0 test infra |
| `eslint` + `eslint-config-next` | with create-next-app | Lint + ban `dangerouslySetInnerHTML`/`eval` | SEC-09 |
| `husky` + `lint-staged` | current [ASSUMED] | Pre-commit hooks | SEC-07 with gitleaks |
| Node `crypto.scrypt` | built-in | Staff password hashing | Prefer over adding bcrypt — no new third-party hash lib |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jose` + DB sessions | Auth.js / iron-session | Ruled out by STACK: no OAuth; iron-session lacks natural one-active-session revocation |
| `postgres` + Supavisor | `@supabase/supabase-js` | Ruled out: pulls Auth/Realtime conventions; contradict DB-only |
| `proxy.ts` | `middleware.ts` | Deprecated alias in Next 16; do not scaffold the old name |
| `node:crypto` scrypt | `bcryptjs` / `argon2` | Extra deps; scrypt is adequate for seeded staff passwords at this scale |
| Hand-rolled CSV for controlled fixtures | `papaparse` | Avoid new dep unless quoted-field complexity appears; fixtures are app-owned |

**Installation (scaffold then add):**
```bash
npx create-next-app@16.3.6 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack
npm install drizzle-orm postgres zod jose
npm install -D drizzle-kit vitest @types/node
# Tailwind v4 PostCSS plugin if not already present:
npm install -D @tailwindcss/postcss
```

**Version verification (2026-09-25):** `next@16.3.6`, `drizzle-orm@0.45.3`, `drizzle-kit@0.31.11`, `zod@4.6.5`, `postgres@3.4.9`, `jose@6.2.12`, `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3`, `vitest@5.0.2` via `npm view`.

## Package Legitimacy Audit

> Ran `slopcheck install -e npm` on 2026-09-25. (Initial run without `-e npm` wrongly used PyPI — ignore that false SLOP set.)

| Package | Registry | Age / notes | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-------------|-----------|-------------|-----------|-------------|
| `next` | npm | mature | high | vercel/next.js | [OK] | Approved |
| `drizzle-orm` | npm | mature | high | drizzle-team/drizzle-orm | [OK] | Approved |
| `drizzle-kit` | npm | mature | high | drizzle-team/drizzle-orm | [OK] | Approved |
| `zod` | npm | mature | high | colinhacks/zod | [OK] | Approved |
| `postgres` | npm | mature | high | porsager/postgres | [OK] | Approved |
| `jose` | npm | mature | high | panva/jose | [OK] | Approved |
| `tailwindcss` | npm | mature | high | tailwindlabs/tailwindcss | [OK] | Approved |
| `@tailwindcss/postcss` | npm | mature | high | tailwindlabs/tailwindcss | [OK] | Approved |
| `vitest` | npm | mature; official Vite test runner | high | vitest-dev/vitest | [SUS] (name similarity to `vite` — false positive) | Approved — planner may proceed; not a typosquat |

**Packages removed due to slopcheck [SLOP] verdict:** none (npm ecosystem)
**Packages flagged as suspicious [SUS]:** `vitest` — false positive; confirmed via npm registry + project STACK.md as the intended test runner. No `checkpoint:human-verify` required beyond noting the false positive.

**Password hashing:** use Node built-in `crypto.scrypt` — **do not** add `bcryptjs`/`argon2` unless user approves a new dependency.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │  Browser (phone / staff / projector) │
                    └──────────────┬──────────────────────┘
                                   │ HTTP
                    ┌──────────────▼──────────────────────┐
                    │  proxy.ts (Node runtime)             │
                    │  1. Host ∈ ALLOWED_HOSTS?            │
                    │  2. CSP nonce + security headers     │
                    │  3. Cookie present? (cheap gate)     │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
┌─────────▼─────────┐   ┌──────────▼──────────┐   ┌─────────▼─────────┐
│ (auth) login pages │   │ Role stub pages     │   │ app/api/*         │
│ player + staff     │   │ /player /leader …   │   │ auth, admin revoke│
└─────────┬─────────┘   └──────────┬──────────┘   └─────────┬─────────┘
          │                        │                        │
          │              requireSession()+role              │
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │ lib/auth (jose cookie ↔ sessions)    │
                    │ lib/registration (adapter → sync)    │
                    │ lib/view-models (PII field-select)   │
                    │ lib/db (drizzle + postgres.js)       │
                    └──────────────┬──────────────────────┘
                                   │ DATABASE_URL :6543
                                   │ prepare:false, max:1
                    ┌──────────────▼──────────────────────┐
                    │ Supabase Postgres (RLS deny-all)     │
                    │ teams, players, staff_accounts,      │
                    │ sessions, rate_limit_counters,       │
                    │ idempotency_keys, audit_log, …       │
                    └─────────────────────────────────────┘

Registration (one-way, offline from request path after seed):
  mock.ts / csv.ts  ──sync──▶  teams + players
  (real adapter later implements same interface)
```

### Recommended Project Structure

```
app/
├── (auth)/
│   ├── login/page.tsx              # player: code + roll
│   └── staff/login/page.tsx        # staff: username + password
├── (player)/player/page.tsx        # stub
├── (leader)/leader/page.tsx        # stub
├── (monitor)/monitor/page.tsx      # stub
├── (admin)/admin/page.tsx          # stub + link to revoke UI minimal
├── (display)/display/page.tsx      # stub
└── api/
    ├── auth/
    │   ├── login/player/route.ts
    │   ├── login/staff/route.ts
    │   └── logout/route.ts
    └── admin/
        └── sessions/revoke/route.ts
lib/
├── env.ts                          # zod env parse at import
├── db/
│   ├── client.ts                   # sole postgres.js factory
│   ├── schema/                     # drizzle tables + RLS
│   └── repositories/
├── auth/
│   ├── session.ts                  # issue / load / revoke
│   ├── password.ts                 # scrypt hash/verify
│   └── guard.ts                    # requireSession, requireRole
├── registration/
│   ├── types.ts                    # RegistrationAdapter interface
│   ├── mock.ts
│   ├── csv.ts
│   └── sync.ts                     # adapter → upsert teams/players
├── security/
│   ├── csrf.ts                     # Origin check
│   ├── rate-limit.ts
│   └── mutate.ts                   # SEC-03 pipeline helper
├── view-models/
│   └── player-public.ts            # strips PII for non-admin
└── audit/
    └── log.ts
proxy.ts
drizzle.config.ts                   # DIRECT_URL for migrate
fixtures/
├── registration.mock.ts            # or .json
└── registration.sample.csv
```

### Pattern 1: Opaque session cookie + DB row (AUTH-01/02)

**What:** Cookie holds jose JWS `{ sid }`; every mutating/authenticated path loads `sessions` by id and rejects if `revoked_at` set or expired. Role/team/player come from DB, not JWT claims.
**When to use:** All auth for players and staff (D-02).
**Example:**
```typescript
// Source: pattern from STACK.md + jose SignJWT / jwtVerify API
import { SignJWT, jwtVerify } from 'jose'

const secret = () => new TextEncoder().encode(env.SESSION_SECRET)

export async function sealSessionId(sid: string): Promise<string> {
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret())
}

export async function openSessionId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return typeof payload.sid === 'string' ? payload.sid : null
  } catch {
    return null
  }
}
```

### Pattern 2: One-active-session via partial unique index (AUTH-02)

**What:** In one transaction: `UPDATE sessions SET revoked_at = now() WHERE player_id = $1 AND revoked_at IS NULL`, then `INSERT` new session. DB enforces uniqueness even under concurrent logins.
**When to use:** Every player and staff login.
```sql
-- Source: STACK.md / PROJECT.md unique-constraint requirement
CREATE UNIQUE INDEX sessions_one_active_player
  ON sessions (player_id)
  WHERE revoked_at IS NULL AND player_id IS NOT NULL;
CREATE UNIQUE INDEX sessions_one_active_staff
  ON sessions (staff_id)
  WHERE revoked_at IS NULL AND staff_id IS NOT NULL;
```

### Pattern 3: RLS deny-all with Drizzle (SEC-01)

**What:** Enable RLS on every table with no permissive policies for `anon`/`authenticated`. App connects with the DB password user (bypasses RLS as table owner / privileged role) — RLS is defense-in-depth against accidental PostgREST/anon exposure, **not** the app's primary authz.
**When to use:** Every table from the first migration.
```typescript
// Source: https://orm.drizzle.team/docs/rls
import { pgTable } from 'drizzle-orm/pg-core'

export const teams = pgTable.withRLS('teams', {
  // columns…
})
```
Configure `drizzle.config.ts` with `entities.roles: { provider: 'supabase' }` so kit ignores built-in Supabase roles [CITED: orm.drizzle.team/docs/rls].

### Pattern 4: Registration adapter (REG-01..04)

**What:** Interface returns normalized `TeamRecord[]` / `PlayerRecord[]`; `syncRegistration(adapter)` upserts into app tables. Mock and CSV implement the same interface; env `REGISTRATION_ADAPTER=mock|csv` selects implementation.
**When to use:** Seed/dev and event-day import only — never per-request.

### Pattern 5: CSP + Host in `proxy.ts` (SEC-05/06)

**What:** Generate per-request nonce; set CSP on request+response; validate `Host` against `ALLOWED_HOSTS` first; put non-nonce headers in `next.config` `headers()` without duplicating CSP.
**When to use:** All matched routes including API for Host + HSTS family; CSP primarily on HTML navigations (matcher may still cover app routes).
```typescript
// Source: https://nextjs.org/docs/app/guides/content-security-policy
export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  if (!env.ALLOWED_HOSTS.includes(host)) {
    return new NextResponse('Invalid host', { status: 400 })
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  // … build CSP with nonce-${nonce}, frame-ancestors 'none'
  // pass x-nonce request header; set CSP on response
}
```
Proxy defaults to **Node.js runtime**; do not set `runtime` in the proxy file (throws) [CITED: nextjs.org proxy docs].

### Anti-Patterns to Avoid
- **`middleware.ts` filename:** deprecated; use `proxy.ts` / `export function proxy`.
- **Trusting JWT role claims without DB lookup:** breaks revocation (AUTH-02/04).
- **`@supabase/supabase-js` anon client:** contradicts DB-only + deny-all design.
- **In-memory rate limit Map:** broken on Vercel serverless (SEC-04 / Pitfall 9).
- **App-level check-then-insert for sessions without UNIQUE:** Pitfall 10.
- **Returning raw `players` rows:** leaks PII (SEC-08); use view-models.
- **Building Phase 2 design system in Phase 1 stubs:** deferred; stubs are plain text + logout.

## Discretion Recommendations (locked choices for planner)

| Topic | Recommendation | Rationale |
|-------|----------------|-----------|
| Staff storage | Dedicated `staff_accounts` table (`id`, `username` unique, `password_hash`, `role` enum ∈ {admin,monitor,display}) | Clear separation from players (D-01); avoids polymorphic user confusion |
| Sessions subject | Nullable `player_id` XOR `staff_id` + `CHECK` | One sessions table for revoke UX (D-02) |
| Display auth | Same username/password path as admin/monitor (`display` / `STAFF_DISPLAY_PASSWORD`) | Simplest path still through sessions + role checks (CONTEXT preference) |
| CSV columns | `team_code,team_name,player_code,first_name,roll_number,is_leader,email,phone` (comma, UTF-8, header required) | Round-trips REG-01 fields; document in `fixtures/registration.sample.csv` |
| Stub routes | `/player`, `/leader`, `/monitor`, `/admin`, `/display` + `/login` + `/staff/login` | Obvious role mapping for authz tests |
| Env credential names | `STAFF_ADMIN_USERNAME`/`PASSWORD`, `STAFF_MONITOR_*`, `STAFF_DISPLAY_*` | Explicit; document in `.env.example` only |
| Schema breadth | Phase 1 migrations include **identity/auth/infra tables now**, plus **stub tables** for later phases (`score_events`, `votes`, …) with RLS + uniqueness constraints | Matches SUMMARY/PITFALLS “bake UNIQUE+RLS from first migration”; empty tables cost little |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT crypto | Custom HMAC | `jose` SignJWT/jwtVerify | Easy to get alg/encoding wrong |
| SQL migrations | Ad-hoc SQL in prod | `drizzle-kit generate` + `migrate` | Reviewable RLS/UNIQUE diffs |
| Env parsing | Scattered `process.env.X!` | `lib/env.ts` zod schema | Fail fast at boot |
| Password hashing | Homegrown hash | `crypto.scrypt` + random salt | Timing-safe compare via `timingSafeEqual` |
| CSP nonce plumbing | Manual script tags everywhere | Next Proxy CSP + auto nonce on framework scripts | Official pattern |
| CSV for messy free text | Full CSV engine now | Minimal RFC4180-ish parser for **controlled** fixtures | Fixtures are ours; Kahoot mess is Phase 6 |

**Key insight:** Phase 1 risk is mis-wiring auth/RLS/pooler, not missing libraries — stay on the locked stack and enforce constraints in the database.

## Common Pitfalls

### Pitfall 1: RLS enabled but app uses wrong connection / forgets new tables
**What goes wrong:** New tables without RLS; or confusion thinking RLS replaces app role checks.
**Why it happens:** Supabase tutorials push anon+policies; this app is inverted (deny-all + privileged server).
**How to avoid:** `pgTable.withRLS` for every table; CI query `relrowsecurity`; single `lib/db/client.ts`; never create anon client.
**Warning signs:** Empty arrays that are silent RLS denials; `NEXT_PUBLIC_SUPABASE_ANON_KEY` anywhere.

### Pitfall 2: Direct DB URL (5432) from Vercel serverless
**What goes wrong:** IPv6-only direct endpoint unreachable from Vercel; or connection exhaustion.
**Why it happens:** Dashboard “direct” string works locally.
**How to avoid:** App `DATABASE_URL` = shared pooler **transaction mode port 6543**, `prepare: false`, `max: 1`, `ssl: 'require'`; migrations use `DIRECT_URL` (session pooler 5432 or direct) [CITED: supabase.com/docs/guides/database/connecting-to-postgres].
**Warning signs:** Port `5432` in Vercel env for the app connection.

### Pitfall 3: Session revocation not honored
**What goes wrong:** Cookie still works after revoke because handler trusts JWT expiry only.
**Why it happens:** Stateless JWT habit.
**How to avoid:** Always `SELECT` session row; treat `revoked_at` as hard deny; AUTH-04 sets `revoked_at`.
**Warning signs:** Tests that only check cookie crypto, not DB revoke.

### Pitfall 4: Concurrent double-login creates two active sessions
**What goes wrong:** Two devices both “active.”
**Why it happens:** Check-then-insert without unique index.
**How to avoid:** Partial unique index + transactional revoke-then-insert; catch unique violation and retry once.
**Warning signs:** Login handler with no unique index migration.

### Pitfall 5: PII leakage on stub “me” endpoints
**What goes wrong:** Player `/api/me` returns roll/email/phone.
**Why it happens:** Serializing Drizzle row.
**How to avoid:** `toPublicPlayer()` / admin-only serializers; Vitest asserts absence of keys for non-admin.
**Warning signs:** `SELECT *` returned as JSON.

### Pitfall 6: CSP / Host only on pages, not enforced on API Host
**What goes wrong:** Host spoofing or missing headers on API.
**Why it happens:** Copying CSP matcher that excludes `api`.
**How to avoid:** Host validation on all requests; document matcher consciously; headers() cover `/(.*)`.
**Warning signs:** Success criterion 4 fails curl Host tests.

### Pitfall 7: Scaffolding `middleware.ts` from stale tutorials
**What goes wrong:** Deprecated convention; future breakage.
**How to avoid:** Only `proxy.ts` with `export function proxy`.
**Warning signs:** File named `middleware.ts` in repo.

## Code Examples

### Supabase pooler client (SEC-10)
```typescript
// Source: https://supabase.com/docs/guides/database/connecting-to-postgres
// and https://orm.drizzle.team/docs/connect-supabase
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 1,
  ssl: 'require',
})
export const db = drizzle({ client })
```

### Mutating endpoint skeleton (SEC-03)
```typescript
// Source: PROJECT.md security acceptance criteria (composition)
export async function POST(req: Request) {
  const body = loginSchema.parse(await req.json())
  assertSameOrigin(req)           // CSRF/origin
  await rateLimit(req, 'login')   // Postgres counter
  // … auth logic in transaction …
  await writeAuditLog(tx, { … })
  return Response.json({ ok: true })
}
```

### requireRole (AUTH-03)
```typescript
export function requireRole(session: SessionRow, allowed: Role[]) {
  if (!allowed.includes(session.role)) {
    throw new HttpError(403, 'Forbidden')
  }
}
```

### Leader derivation (AUTH-03)
On player login, set `sessions.role` to `'leader'` if `players.is_leader`, else `'player'`. Do not trust client-supplied role.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` / `proxy()` | Next.js 16.0.0 | Scaffold must use new name |
| Edge-only middleware | Proxy defaults to Node.js | Next.js 16.0.0 | `jose` + Node crypto fine in proxy; still avoid DB in proxy |
| Supabase Auth + anon key | Custom sessions + postgres.js | Project lock | No `@supabase/supabase-js` |
| Tailwind v3 JS config | Tailwind v4 `@theme` CSS | Tailwind 4 | Tokens later in Phase 2 |

**Deprecated/outdated:**
- Tutorials showing `middleware.ts` for Next 16 greenfield
- Iron-session as primary session store for this project's revocation requirement
- Direct Postgres from Vercel without pooler

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React 19 is the correct peer for Next 16.3.6 without pinning an older React | Standard Stack | create-next-app resolves this; low risk |
| A2 | `husky` + `lint-staged` are acceptable npm deps for gitleaks hook wiring | Supporting | User may prefer a plain git hook script |
| A3 | Dedicated `staff_accounts` preferred over unified users table | Discretion | Either works if sessions unify revoke |
| A4 | Full later-phase stub tables in Phase 1 migrations are desired | Discretion / Schema | If planner prefers minimal schema, CI RLS gate must still cover every *existing* table and later phases must add RLS in the same PR as the table |
| A5 | Display uses full password auth (not a separate display code) | Discretion | CONTEXT allows simpler display code if still session-backed |
| A6 | Vitest 5.x is appropriate (STACK.md said 3.x earlier) | Validation | STACK version drifted; 5.0.2 is current on npm — use current |

**If this table is empty:** N/A — several discretion items remain as recommendations above.

## Open Questions

1. **Supabase project credentials availability**
   - What we know: App needs `DATABASE_URL` (6543) + `DIRECT_URL` (5432 session/direct).
   - What's unclear: Whether the user already has a Supabase project for Phase 1 execution.
   - Recommendation: Planner Wave 0 includes `.env.example` + local/docker Postgres fallback optional; execution blocks on real URLs for integration tests but unit tests mock DB.

2. **gitleaks binary on Windows CI**
   - What we know: SEC-07 requires gitleaks pre-commit + npm audit in CI; gitleaks not installed on this machine today.
   - What's unclear: Preferred install path (Chocolatey / GitHub Action `gitleaks/gitleaks-action`).
   - Recommendation: Use official gitleaks GitHub Action in CI; document local install; husky script calls `gitleaks protect` when binary present.

3. **How wide is “schema for all tables” in Phase 1?**
   - What we know: SUMMARY says all tables + UNIQUE from first migration; CONTEXT walking skeleton excludes game logic.
   - What's unclear: User preference for empty future tables now vs. later.
   - Recommendation: Include stub tables + constraints + RLS now (A4); domain code deferred.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next 16 (`>=20.9.0`) | ✓ | v22.22.0 | — |
| npm | install | ✓ | 10.9.3 | — |
| `package.json` / app code | Phase 1 scaffold | ✗ | — | create-next-app in Wave 0 |
| Supabase / Postgres | schema, auth | ✗ (not probed logged-in) | — | Local Postgres or provide env before execute |
| ctx7 CLI | docs lookup | ✗ | — | WebFetch official docs (done) |
| gitleaks | SEC-07 | ✗ | — | GitHub Action in CI; optional local |
| slopcheck | package audit | ✓ | 0.6.1 | — |
| Docker | optional local DB | not probed | — | Use hosted Supabase |

**Missing dependencies with no fallback:**
- Live `DATABASE_URL` / `DIRECT_URL` for end-to-end migrate+login against real Postgres (unit tests can mock).

**Missing dependencies with fallback:**
- gitleaks local binary → CI Action
- ctx7 → WebFetch (used)

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `5.0.2` [VERIFIED: npm registry] |
| Config file | `vitest.config.ts` — **none yet (Wave 0)** |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-02 | Second login revokes prior session | unit (repo/tx mocked or test DB) | `npx vitest run tests/auth/session-revoke.test.ts` | ❌ Wave 0 |
| AUTH-03 / TEST-04 | Each of 5 roles allowed/denied on protected handlers | unit | `npx vitest run tests/auth/authorization-matrix.test.ts` | ❌ Wave 0 |
| AUTH-04 | Admin revoke sets revoked_at; subsequent requireSession fails | unit | `npx vitest run tests/auth/admin-revoke.test.ts` | ❌ Wave 0 |
| REG-02/03/04 | Mock + CSV adapters produce same shape; sync upserts | unit | `npx vitest run tests/registration/adapters.test.ts` | ❌ Wave 0 |
| SEC-08 | Non-admin payloads omit email/phone/roll | unit | `npx vitest run tests/view-models/pii.test.ts` | ❌ Wave 0 |
| SEC-01 | Every public table has RLS enabled | smoke/sql or migration test | `npx vitest run tests/db/rls-enabled.test.ts` | ❌ Wave 0 |
| SEC-02 | No forbidden `NEXT_PUBLIC_` secret patterns | unit/lint | `npx vitest run tests/security/env-public.test.ts` | ❌ Wave 0 |
| SEC-06 | Disallowed Host rejected | unit (proxy pure fn) | `npx vitest run tests/security/host.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` + `tests/` directory layout
- [ ] `tests/auth/authorization-matrix.test.ts` — covers AUTH-03 / TEST-04
- [ ] `tests/auth/session-revoke.test.ts` — covers AUTH-02 / AUTH-04
- [ ] `tests/registration/adapters.test.ts` — covers REG-02/03/04
- [ ] `tests/db/rls-enabled.test.ts` — covers SEC-01 (needs test DB or SQL assertion helper)
- [ ] `tests/view-models/pii.test.ts` — covers SEC-08
- [ ] Framework install: `npm i -D vitest` as part of scaffold
- [ ] Optional: Playwright later for header smoke; **not required** for Phase 1 if proxy host/CSP pure functions are unit-tested

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Player code+roll; staff username+scrypt password |
| V3 Session Management | yes | jose cookie + DB sessions; revoke; one-active unique index |
| V4 Access Control | yes | `requireRole` on routes/APIs; TEST-04 matrix |
| V5 Input Validation | yes | zod on all mutating endpoints + env |
| V6 Cryptography | yes | jose HS256; scrypt; no hand-rolled crypto |
| V14 Config | yes | ALLOWED_HOSTS, no NEXT_PUBLIC secrets, CSP/HSTS |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session fixation / theft replay after logout | Spoofing | Revoke row; short cookie; Secure + HttpOnly + SameSite=strict |
| Privilege escalation via forged role in body | Elevation | Role only from session DB row |
| Host header injection | Spoofing | ALLOWED_HOSTS in proxy |
| XSS → session theft | Tampering | CSP nonce; no dangerouslySetInnerHTML/eval |
| CSRF on login/revoke | Spoofing | Origin/Referer check vs APP_URL |
| PII disclosure | Info disclosure | Field-select view-models; admin-only |
| Serverless rate-limit bypass | DoS | Postgres fixed-window counters |
| Accidental anon DB access | Info disclosure | RLS deny-all; no anon client |

## Project Constraints (from .cursor/rules/)

No `.cursor/rules/` directory present in the project root at research time. Constraints are taken from `CLAUDE.md` / PROJECT.md / CONTEXT.md (stack fixed, no new third-party services without asking, security rules as acceptance criteria, env-only domains).

## Sources

### Primary (HIGH confidence)
- [CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy] — `proxy.ts`, Node default runtime, matcher, v16 rename
- [CITED: nextjs.org/docs/app/guides/content-security-policy] — nonce CSP via Proxy, dynamic rendering, frame-ancestors
- [CITED: orm.drizzle.team/docs/connect-supabase] — postgres.js, `prepare: false` for transaction pooler
- [CITED: orm.drizzle.team/docs/rls] — `pgTable.withRLS`, Supabase roles helpers, drizzle.config entities.roles
- [CITED: supabase.com/docs/guides/database/connecting-to-postgres] — transaction mode `:6543`, session `:5432`, `max: 1`, `prepare: false`, `ssl: 'require'`
- [VERIFIED: npm registry] — package versions listed in Standard Stack (2026-09-25)
- Project: `.planning/research/STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md`, `01-CONTEXT.md`, `REQUIREMENTS.md`

### Secondary (MEDIUM confidence)
- WebSearch corroboration of Supavisor IPv4/transaction-mode guidance (aligned with official Supabase connect doc fetched above)
- Project SUMMARY “all tables in Phase 1” vs Walking Skeleton thinness — resolved as stub tables recommendation (A4)

### Tertiary (LOW confidence)
- Exact NITW roll-number format for fixtures — generate plausible patterns; organizers can replace via CSV

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — npm versions + official Next/Drizzle/Supabase docs fetched this session
- Architecture: **HIGH** — aligns with locked CONTEXT + project ARCHITECTURE; staff/CSV details are discretionary recommendations
- Pitfalls: **HIGH** — Pitfalls 4, 9, 10 directly map to Phase 1; verified against official pooler/RLS docs

**Research date:** 2026-09-25
**Valid until:** ~2026-10-25 (framework majors move fast; re-check `next`/`drizzle-orm` if delayed)
