# Phase 1: Foundation, Data Model, Registration & Auth — Execution Plan

**Phase:** 01-foundation-data-model-registration-auth
**Status:** Ready to execute
**Mode:** Walking Skeleton / MVP
**Branch:** phase/1-foundation
**Planned:** 2026-09-25 (revised: self-service registration)

---

## Architectural Change from Original Plan

> **Registration is now self-service on the site.** Players register directly via a web form — no CSV import, no mock adapter, no external data source. The REG-01..04 adapter requirements are replaced by:
> - Admin creates teams (with auto-generated team codes)
> - Players visit the site, fill in a form, and are added to a team using its code
> - Admin can lock/unlock registration; can approve late additions post-lock
> - Login on event day: player code (generated at registration) + roll number

---

## Goal

A secure foundation exists: database schema and migrations with RLS deny-all everywhere, security headers/CSP/host validation active, self-service player registration with team-code joining, and all five roles can authenticate with server-enforced role checks on every route. Output is **register → login → role-appropriate stub page** for all five roles.

---

## Waves

### Wave 0: Scaffold, Environment & Security Baseline

**W0-T1 — Create Next.js 16 app**
```bash
npx create-next-app@16.3.6 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack
```
- Verify: `npm run build` succeeds

**W0-T2 — Install core dependencies**
```bash
npm install drizzle-orm postgres zod jose clsx
npm install -D drizzle-kit vitest@5.0.2 @types/node @tailwindcss/postcss
```
- Exact versions: `drizzle-orm@0.45.3`, `postgres@3.4.9`, `zod@4.6.5`, `jose@6.2.12`, `drizzle-kit@0.31.11`

**W0-T3 — Environment schema (`lib/env.ts`)**

Zod-parse all required env vars at module import:
```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),         // port 6543 Supavisor transaction pooler
  DIRECT_URL: z.string().url(),           // port 5432 for drizzle-kit migrations
  SESSION_SECRET: z.string().min(32),
  ALLOWED_HOSTS: z.string(),              // comma-separated list
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Staff credentials
  STAFF_ADMIN_USERNAME: z.string(),
  STAFF_ADMIN_PASSWORD: z.string().min(12),
  STAFF_MONITOR_USERNAME: z.string(),
  STAFF_MONITOR_PASSWORD: z.string().min(12),
  STAFF_DISPLAY_USERNAME: z.string(),
  STAFF_DISPLAY_PASSWORD: z.string().min(12),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
```
- Create `.env.example` with placeholders (no real secrets ever committed)

**W0-T4 — `proxy.ts` (CSP + Host validation)**
- File at project root (NOT `middleware.ts` — deprecated in Next.js 16)
- Export `function proxy(request: NextRequest)`
- Order: (1) Host ∈ `ALLOWED_HOSTS` → 400 if not; (2) generate nonce; (3) set CSP; (4) pass `x-nonce` header
- CSP: `default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'nonce-{nonce}'; font-src 'self'; img-src 'self' data:; frame-ancestors 'none'; connect-src 'self'`
- Node.js runtime (default in Next 16); do NOT set `runtime` export

**W0-T5 — `next.config.ts` security headers**
- HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Frame-Options: DENY`
- Applied to `/(.*)`; CSP lives in proxy.ts only

**W0-T6 — Vitest config (`vitest.config.ts`)**
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node', globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

**W0-T7 — ESLint security rules**
- Ban `dangerouslySetInnerHTML`, `eval(`, `new Function(` via `no-restricted-syntax`

**W0-T8 — `.env.example`**
```
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxxx:password@db.xxxx.supabase.co:5432/postgres
SESSION_SECRET=change-me-at-least-32-chars-long
ALLOWED_HOSTS=localhost:3000,yourdomain.com
APP_URL=http://localhost:3000
STAFF_ADMIN_USERNAME=admin
STAFF_ADMIN_PASSWORD=change-me-admin
STAFF_MONITOR_USERNAME=monitor
STAFF_MONITOR_PASSWORD=change-me-monitor
STAFF_DISPLAY_USERNAME=display
STAFF_DISPLAY_PASSWORD=change-me-display
```

**Success check:** `npm run build && npm run lint && npx vitest run` all pass.

---

### Wave 1: Database Schema, RLS & Client

**W1-T1 — Drizzle config (`drizzle.config.ts`)**
```typescript
import { defineConfig } from 'drizzle-kit'
import { env } from './lib/env'

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: env.DIRECT_URL },
  entities: { roles: { provider: 'supabase' } },
})
```

**W1-T2 — DB client (`lib/db/client.ts`)**
```typescript
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { env } from '../env'

const client = postgres(env.DATABASE_URL, {
  prepare: false,   // REQUIRED: Supavisor transaction mode doesn't support prepared statements
  max: 1,
  ssl: 'require',
})
export const db = drizzle({ client, schema })
```

**W1-T3 — Full schema (`lib/db/schema/`)**

Use `pgTable.withRLS` on every table (enables Row Level Security):

*Registration & Auth:*
```typescript
// teams — created by admin; players join via team_code
teams: {
  id: uuid pk default gen_random_uuid(),
  code: text unique not null,           // e.g. "SKELD-01", generated by admin
  name: text not null,                  // e.g. "Polus Crew"
  created_at: timestamptz default now(),
  created_by: uuid references staff_accounts(id),
}

// players — self-registered on the site
players: {
  id: uuid pk default gen_random_uuid(),
  team_id: uuid not null references teams(id),
  player_code: text unique not null,    // e.g. "P001" — auto-generated at registration
  first_name: text not null,
  roll_number: text not null,           // e.g. "22BCE1234"
  email: text,                          // admin-only visible
  is_leader: boolean not null default false,  // admin-designates after registration
  registered_at: timestamptz default now(),
  // unique: one roll number per team
  UNIQUE(team_id, roll_number),
}

// staff_accounts — seeded by admin seed script
staff_accounts: {
  id: uuid pk default gen_random_uuid(),
  username: text unique not null,
  password_hash: text not null,
  role: text not null CHECK(role IN ('admin','monitor','display')),
  created_at: timestamptz default now(),
}

// sessions — both players and staff
sessions: {
  id: uuid pk default gen_random_uuid(),
  player_id: uuid references players(id),     // nullable
  staff_id: uuid references staff_accounts(id), // nullable
  role: text not null CHECK(role IN ('player','leader','monitor','admin','display')),
  team_id: uuid references teams(id),         // nullable (staff have none)
  created_at: timestamptz default now(),
  expires_at: timestamptz not null,
  revoked_at: timestamptz,
  // CHECK: exactly one of player_id / staff_id is not null
  CHECK((player_id IS NOT NULL)::int + (staff_id IS NOT NULL)::int = 1),
}

// registration_settings — admin controls
registration_settings: {
  id: integer pk default 1,            // single-row table (always id=1)
  is_open: boolean not null default true,
  locked_at: timestamptz,
  locked_by: uuid references staff_accounts(id),
}
```

*Unique indexes:*
```sql
CREATE UNIQUE INDEX sessions_one_active_player
  ON sessions (player_id) WHERE revoked_at IS NULL AND player_id IS NOT NULL;
CREATE UNIQUE INDEX sessions_one_active_staff
  ON sessions (staff_id) WHERE revoked_at IS NULL AND staff_id IS NOT NULL;
-- Player code counter per team prefix
CREATE UNIQUE INDEX players_roll_per_team
  ON players (team_id, roll_number);
```

*Security infra:*
```typescript
rate_limit_counters: { id, key, window_start, count, UNIQUE(key, window_start) }
idempotency_keys: { id, key unique, response_body, created_at, expires_at }
audit_log: { id, actor_id, actor_role, action, target_type, target_id, old_value jsonb, new_value jsonb, reason, created_at }
```

*Stub tables (RLS + constraints baked in now per PITFALLS — domain code comes in later phases):*
```typescript
check_ins: { id, player_id unique, checked_in_at, checked_in_by }
task_gates: { id, team_id, task_number (1-4), opened_at, closed_at, opened_by, UNIQUE(team_id, task_number) }
score_events: { id, team_id, task_number, event_type, points, idempotency_key unique, reason, created_at, created_by }
bets: { id, team_id unique, predicted_rank, placed_at }
game_sessions: { id, session_number (1|2), status }
game_tables: { id, game_session_id, table_number }
game_table_players: { id, table_id, player_id, original_team_id, word, is_imposter, crewmate_color, UNIQUE(table_id, player_id) }
votes: { id, game_table_id, voter_player_id, target_player_id, round (1|2), UNIQUE(game_table_id, voter_player_id, round) }
task_submissions: { id, team_id, task_number (2|3|4), submitted_at, submitted_by, UNIQUE(team_id, task_number) }
kahoot_staging: { id, team_id, kahoot_nickname, matched_by_admin, committed }
words: { id, category, crew_word, imposter_word, is_active boolean default true }
```

**W1-T4 — Generate & apply migration**
```bash
npx drizzle-kit generate
# Review generated SQL — verify ENABLE ROW LEVEL SECURITY on every table
npx drizzle-kit migrate
```

**W1-T5 — Seed word list (`scripts/seed-words.ts`)**
Parse and insert `seed/words.csv` (from Prompt Pack) into the `words` table.
Create `seed/words.csv` with the full word list provided.

**W1-T6 — RLS smoke test (`tests/db/rls-enabled.test.ts`)**
```typescript
// Queries pg_class to assert relrowsecurity = true for every app table
test.skipIf(!process.env.DIRECT_URL)('all tables have RLS', async () => { ... })
```

**Success check:** Migration applies; RLS on all tables; `npx vitest run tests/db/` passes.

---

### Wave 2: Admin Team Management
*Admin creates teams before registration opens. Players join via team code.*

**W2-T1 — Player code generator (`lib/registration/player-code.ts`)**
```typescript
// Generates next available code for a team: "P001", "P002", ...
// Uses a DB query: SELECT COUNT(*) FROM players WHERE team_id = $1
export async function generatePlayerCode(db, teamId: string): Promise<string>
```

**W2-T2 — Admin: create team (`app/api/admin/teams/route.ts`)**
- POST: `{ name: z.string().min(2).max(50) }`
- Pipeline: requireSessionAndRole(['admin']) → generate team code (`SKELD-${padded n}`) → INSERT team → audit log → return `{ team }`
- Team codes are sequential: `SKELD-01`, `SKELD-02`, ...

**W2-T3 — Admin: list teams (`app/api/admin/teams/route.ts` GET)**
- requireSessionAndRole(['admin']) → SELECT teams with player count + leader name → return list

**W2-T4 — Admin: set team leader (`app/api/admin/teams/[teamId]/leader/route.ts`)**
- POST: `{ playerId: z.string().uuid() }`
- requireSessionAndRole(['admin']) → verify player belongs to team → set `is_leader = true`, unset all others in team → audit log

**W2-T5 — Admin: lock/unlock registration (`app/api/admin/registration/route.ts`)**
- POST: `{ action: z.enum(['lock', 'unlock', 'approve-late']) }`
- `lock`: set `registration_settings.is_open = false`, `locked_at = now()`
- `unlock`: set `is_open = true`, clear `locked_at`
- `approve-late`: requires `{ playerId }` — adds a single player after lock (admin override)
- Audit log every action

**W2-T6 — Admin UI stubs**
- `app/(admin)/admin/teams/page.tsx` — list teams + create team form + set leader button per team
- `app/(admin)/admin/registration/page.tsx` — show registration status (open/locked), lock/unlock button, player count per team

**Success check:** Admin can create teams; team codes generate correctly; lock/unlock works.

---

### Wave 3: Self-Service Registration
*Players visit the site, pick their team, and register.*

**W3-T1 — Registration form page (`app/register/page.tsx`)**
Fields:
- Full name (text, required)
- Roll number (text, required, pattern: `[0-9]{2}[A-Z]{3}[0-9]{4}` e.g. `22BCE1234`)
- Team code (text, required — must match an existing team)
- Email (email, required)

Shows team name after team code is validated (live check via GET `/api/teams/by-code`).

**W3-T2 — Team lookup endpoint (`app/api/teams/by-code/route.ts`)**
- GET: `?code=SKELD-01`
- Returns `{ team: { id, name, memberCount } }` or 404
- Public (no auth required)
- Rate limited (10/min per IP)

**W3-T3 — Registration endpoint (`app/api/auth/register/route.ts`)**
Schema: `{ firstName, rollNumber, teamCode, email }`

Pipeline:
1. Zod parse
2. Origin/CSRF check
3. Rate limit: 5 registrations/min per IP
4. Check `registration_settings.is_open = true` → 403 "Registration is closed" if not
5. Find team by code → 404 if not found
6. Check team not full (< 6 members) → 400 "Team is full"
7. Check roll number not already registered in this team → 409 "Roll number already registered"
8. Generate player code (`P001`..`P006`)
9. INSERT player in transaction
10. Return `{ playerCode, teamName }` — display to player immediately (they must save this)
11. Write audit log

> **Important UX:** After registration, show the player code prominently ("Your player code is **P003** — save this, you need it to log in"). Do not email it (no email service in scope).

**W3-T4 — Registration confirmation page (`app/register/success/page.tsx`)**
- Displays player code prominently in a Panel component
- "Save this code! You will need: **Player Code: P003** + your roll number to log in on event day"
- Link to login page

**W3-T5 — Registration unit tests (`tests/registration/register.test.ts`)**
- Closed registration → 403
- Full team (6 players) → 400
- Duplicate roll number in same team → 409
- Valid registration → player created with correct code
- Player code increments correctly per team

**Success check:** Player can register; receives player code; team full at 6; registration lock works.

---

### Wave 4: Auth — Session Issuance, Player Login & Staff Login

**W4-T1 — Password utilities (`lib/auth/password.ts`)**
```typescript
// node:crypto scrypt — no new deps
export async function hashPassword(password: string): Promise<string>
export async function verifyPassword(password: string, hash: string): Promise<boolean>
```

**W4-T2 — Session utilities (`lib/auth/session.ts`)**
```typescript
// jose JWS cookie: { sid } only — role comes from DB
export async function sealSessionId(sid: string): Promise<string>
export async function openSessionId(token: string): Promise<string | null>
export async function createSession(db, opts): Promise<SessionRow>
export async function loadSession(db, sid: string): Promise<SessionRow | null>
export async function revokeSession(db, sessionId: string): Promise<void>
export async function revokeAllForPlayer(db, playerId: string): Promise<void>
```
- Cookie: `httpOnly, secure, sameSite: 'strict', path: '/', maxAge: 12h`

**W4-T3 — Role guard (`lib/auth/guard.ts`)**
```typescript
export async function requireSession(request, db): Promise<SessionRow>   // 401 if invalid
export function requireRole(session, allowed: Role[]): void               // 403 if wrong role
export async function requireSessionAndRole(request, db, allowed): Promise<SessionRow>
```

**W4-T4 — Player login route (`app/api/auth/login/player/route.ts`)**
- Schema: `{ playerCode: z.string(), rollNumber: z.string() }`
- Find player by `player_code + roll_number` → 401 if not found
- `is_leader` → role `'leader'`, else `'player'`
- Revoke prior active session → create new session → set cookie
- Rate limit: 10/min per IP

**W4-T5 — Staff login route (`app/api/auth/login/staff/route.ts`)**
- Schema: `{ username: z.string(), password: z.string() }`
- Find staff account → `verifyPassword` → create session → set cookie

**W4-T6 — Logout route (`app/api/auth/logout/route.ts`)**
- Revoke session → clear cookie → redirect `/`

**W4-T7 — Admin force-revoke (`app/api/admin/sessions/revoke/route.ts`)**
- requireSessionAndRole(['admin']) → `{ targetPlayerId }` → revokeAllForPlayer → audit log

**W4-T8 — Security utilities**
- `lib/security/csrf.ts` — `assertSameOrigin(request)`: check `Origin` or `Referer` vs `APP_URL`
- `lib/security/rate-limit.ts` — Postgres fixed-window counters; `async rateLimit(db, key, limit, windowSecs)`
- `lib/security/mutate.ts` — `mutate(pipeline)` helper: zod → origin → rate-limit → auth → role → idempotency → tx → audit

**W4-T9 — Staff seed script (`scripts/seed-staff.ts`)**
- Reads `STAFF_*` env vars, hashes passwords, upserts `staff_accounts`
- `package.json`: `"seed:staff": "npx tsx scripts/seed-staff.ts"`

**Success check:** Player registers → gets code → logs in → gets cookie; second login revokes first; staff login works; admin revoke kills session.

---

### Wave 5: Role Stub Pages & Walking Skeleton UI

**W5-T1 — Player login page (`app/(auth)/login/page.tsx`)**
- Two fields: Player Code + Roll Number
- POST to `/api/auth/login/player`
- Plain design (no design system yet — Phase 2)
- Link to `/register` for new players

**W5-T2 — Staff login page (`app/(auth)/staff/login/page.tsx`)**
- Username + password form

**W5-T3 — Role stub pages**
- `app/(player)/player/page.tsx` → requireSessionAndRole(['player','leader']) → "PLAYER — {firstName} ({teamCode}) [{role}]" + logout
- `app/(leader)/leader/page.tsx` → requireSessionAndRole(['leader']) → "LEADER STUB" + logout
- `app/(monitor)/monitor/page.tsx` → requireSessionAndRole(['monitor']) → "MONITOR STUB" + logout
- `app/(admin)/admin/page.tsx` → requireSessionAndRole(['admin']) → "ADMIN STUB" + links to: teams, registration, session revoke
- `app/(display)/display/page.tsx` → requireSessionAndRole(['display']) → "DISPLAY STUB" + logout

**W5-T4 — Admin session revoke UI (`app/(admin)/admin/sessions/page.tsx`)**
- List active sessions with player name, team, role, created_at
- Revoke button per row

**W5-T5 — PII view models (`lib/view-models/player-public.ts`)**
```typescript
// toPublicPlayer strips email, rollNumber — only admin gets those
export function toPublicPlayer(player: PlayerRow): { id, firstName, teamId, playerCode, role }
export function toAdminPlayer(player: PlayerRow): PlayerRow  // full row
```

**W5-T6 — Proxy cookie gate**
- Update `proxy.ts`: protected paths missing cookie → redirect `/login`
- `app/page.tsx`: cookie present → redirect to role stub; else → `/login` or `/register`

**Success check:** Full manual flow: register → get code → login → correct stub page; wrong role → 403.

---

### Wave 6: Authorization Test Suite (TEST-04)

**W6-T1 — Authorization matrix (`tests/auth/authorization-matrix.test.ts`)**
- Each of 5 roles: allowed routes pass, forbidden routes return 403/401
- No role can pass a `role` body param to escalate privileges
- Admin can reach `/api/admin/*`; player cannot

**W6-T2 — Session revoke test (`tests/auth/session-revoke.test.ts`)**
- Second login revokes first session (unique index enforced)
- Admin revoke: `revoked_at` set; `loadSession` returns null

**W6-T3 — Registration tests (`tests/registration/register.test.ts`)**
- See Wave 3 W3-T5

**W6-T4 — PII test (`tests/view-models/pii.test.ts`)**
- `toPublicPlayer` does NOT include email/rollNumber
- Admin view DOES include them

**W6-T5 — Host validation test (`tests/security/host.test.ts`)**
- Disallowed Host → 400; allowed → passes through

**W6-T6 — Env public test (`tests/security/env-public.test.ts`)**
- Scan source files: no `NEXT_PUBLIC_.*SECRET|PASSWORD|DATABASE|SERVICE_ROLE`

**Success check:** `npx vitest run` — all tests green. **Phase 1 is complete.**

---

## Success Criteria Mapping

| Criterion | Wave | Test |
|-----------|------|------|
| Player self-registers; receives player code | W3 | W6-T3 |
| Player can log in (code + roll); second login revokes prior | W4 | W6-T2 |
| Role-restricted routes denied to wrong roles | W5+W6 | W6-T1 |
| Registration closes when admin locks; re-opens on unlock | W2 | W6-T3 |
| All HTTP responses carry required security headers; bad Host rejected | W0 | W6-T5 |
| Admin can force-revoke any player session; PII visible only to admin | W4+W6 | W6-T2, W6-T4 |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No Supabase `DATABASE_URL` yet | Medium | Blocks W1 | Use local Postgres (Docker) or create Supabase project; unit tests mock DB |
| Phase 2 scaffold conflict on `app/layout.tsx` | Low | Merge pain | File ownership: Phase 1 owns `proxy.ts`, `lib/`, `app/(auth)/`, `app/api/`; Phase 2 owns `globals.css`, `components/`, `app/page.tsx` |
| Player code UX (no email delivery) | Low | Players lose code | Registration success page must show code prominently + "screenshot this" instruction |
| 6-player team cap race condition | Low | 7th player slips in | Use DB transaction + SELECT FOR UPDATE or unique constraint check in same tx |

---

## Removed from Original Plan (registration change)

The following are **removed** and replaced by self-service registration:
- ~~REG-01: Registration adapter interface~~
- ~~REG-02: Mock adapter with 150 fixture players~~
- ~~REG-03: CSV adapter~~
- ~~REG-04: Pluggable adapter for real data~~
- ~~`lib/registration/types.ts`, `mock.ts`, `csv.ts`, `sync.ts`~~
- ~~`scripts/seed.ts` (registration data seed)~~
- ~~`fixtures/registration.mock.ts`, `registration.sample.csv`~~

Replaced by:
- Admin team creation flow (W2)
- Self-service registration form + endpoint (W3)
- Word list seed from `seed/words.csv` (W1-T5)

---

*Plan revised: 2026-09-25 (self-service registration)*
*Phase: 01-foundation-data-model-registration-auth*
*Status: Ready to execute on phase/1-foundation branch*
