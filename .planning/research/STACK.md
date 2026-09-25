# Stack Research

**Domain:** Server-authoritative, short-polling event-day web app (Next.js App Router + TypeScript + Tailwind + Supabase-as-Postgres + Drizzle + zod, deployed on Vercel)
**Researched:** 2026-09-24
**Confidence:** HIGH for framework/library facts (verified against official Next.js and Drizzle docs, and live npm registry versions); MEDIUM for pattern recommendations that are widely used but not codified in a single official "reference architecture" doc; LOW flagged explicitly where noted.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | `16.3.6` (React 19) | App Router framework, Route Handlers, `proxy.ts` | Latest stable per npm registry (checked live). Next.js 16 **renamed `middleware.ts` → `proxy.ts`** (the `middleware` file convention is deprecated as of v16.0.0). This is load-bearing for this project: the CSP-with-nonce implementation, host validation, and auth-cookie checks all live in this file. Requires Node.js `>=20.9.0` (from package `engines`). |
| TypeScript | `5.x` (strict mode) | Type safety across server-authoritative logic (scoring, ranking, gating) | Already fixed by project constraints. Use `"strict": true` plus `"noUncheckedIndexedAccess": true` — the scoring/ranking/shuffling code is exactly the kind of array/record-indexing logic where this catches real bugs. |
| Tailwind CSS | `4.x` (currently `4.3.3`) | Styling, pixel-accurate design-token reproduction | Tailwind v4 is CSS-first: theme tokens (colors, spacing, fonts extracted from rc-nitw.org/freshers) are declared in `@theme` inside a CSS file, not `tailwind.config.js`. This maps naturally onto "extracted design tokens" as literal CSS custom properties rather than a JS config object, and avoids the PostCSS-plugin-order pitfalls of v3. `tailwind.config.ts` still works for compatibility if needed, but new v4 projects should default to CSS-first config. |
| PostgreSQL (Supabase-hosted) | Postgres 15/17 (whatever Supabase provisions) | Sole database, DB-only (no Supabase Auth/Realtime/Storage) | Already fixed. Key operational fact: **direct connections on Supabase resolve to IPv6 by default** (Supabase stopped assigning IPv4 to new projects from Jan 2024), and **Vercel's serverless network does not support outbound IPv6**. This is why the connection driver choice below matters — see "Connecting to Supabase" section. |
| Drizzle ORM | `0.45.x` (orm) + `0.31.x` (drizzle-kit) | Typed schema, query builder, RLS policy declarations, migrations | Already fixed. Current tested pairing per Drizzle's own docs is `drizzle-orm@0.45.x` + `drizzle-kit@0.31.x` (confirmed live on npm: `0.45.3` / `0.31.11`). Drizzle has first-class `pgPolicy()`/`pgRole()` primitives and Supabase-specific helpers (`anonRole`, `authenticatedRole`, `serviceRole`, `authUid()`) purpose-built for the "RLS deny-all + service-role bypass" pattern this project needs. |
| zod | `4.x` (currently `4.6.5`) | Runtime validation on every mutating endpoint, env var validation | zod v4 is current stable and is a near-total rewrite for TS inference performance (matters here: many small endpoint schemas × 150 concurrent users). Note the v3→v4 API changes (`z.string().email()` deprecated in favor of top-level `z.email()`, etc.) — write new schemas in v4 style, don't copy v3 patterns from older tutorials/training data. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `postgres` (postgres.js) | `3.4.x` (currently `3.4.9`) | Postgres driver under Drizzle | This is Drizzle's own documented recommendation for Supabase (`drizzle-orm/postgres-js`). Use over `pg`/`node-postgres` and over `@supabase/supabase-js` — the latter is the Supabase client SDK built around Auth/Realtime/PostgREST, which is explicitly out of scope here. |
| `jose` | `6.x` (currently `6.2.12`) | Sign/verify the opaque session-reference cookie | Built on Web Crypto API, runs identically in Node.js and Edge runtimes (relevant since `proxy.ts` now defaults to the **Node.js runtime** in Next.js 16, but keeping `jose` means the code is portable if that ever changes). Use HS256 to sign a small payload (`{ sessionId, role }`) referencing a server-side `sessions` table row — **do not** put the session's authority (role, team, imposter status) only in the JWT; the DB row is the source of truth on every request, the signed cookie only prevents tampering/guessing of the session id client-side. |
| `zod` env schema (no separate library needed) | — | Validate `APP_URL`, `ALLOWED_HOSTS`, `DATABASE_URL`, session secret, etc. at boot | A small `lib/env.ts` that parses `process.env` through a zod schema and throws on missing/malformed vars at startup is sufficient; skip adding `@t3-oss/env-nextjs` as a dependency purely for this — it's a thin wrapper around the same zod pattern and not needed at this project's size. |
| `vitest` | `3.x` | Unit tests for scoring math, ranking comparator, Task 1 shuffling, gating, authorization | Vitest is the standard 2025/2026 choice for Next.js/TypeScript unit testing (native ESM, fast, Vite-powered, Jest-compatible API) — the "not skipped" testing requirement in PROJECT.md is precisely the kind of pure-function logic (ranking comparator, shuffle algorithm, ledger math) Vitest is built for. |
| Playwright | (already required for design extraction) | Also double as the E2E layer for gating flows (check-in → Task 1 → … → Task 4) and role-based visibility assertions | Reuses a tool already in the plan for screenshot/computed-style extraction; avoids adding a second E2E runner. |
| `gitleaks` (pre-commit, not an npm lib) | — | Prevent committed secrets | Already specified in PROJECT.md constraints; install as a pre-commit hook via `husky` + `lint-staged` or a plain git hook script — no new paid service. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `drizzle-kit generate` + `drizzle-kit migrate` | Versioned SQL migrations | Prefer over `drizzle-kit push` even under the tight event deadline: this project has audit-log and unique-constraint requirements where an unreviewed schema diff is a real risk. Generate migration SQL files, review them (especially the RLS `ENABLE ROW LEVEL SECURITY` and `pgPolicy` statements), commit them, then apply. |
| `eslint` + `@typescript-eslint` (Next.js's built-in `next lint` / flat config) | Lint, including a rule against `dangerouslySetInnerHTML` / `eval` | PROJECT.md security constraints explicitly forbid these — enforce with `no-restricted-syntax` ESLint rules, not just code review. |
| `npm audit` in CI | Dependency vulnerability scan | Already required by PROJECT.md constraints; run on every push via GitHub Actions or Vercel's build step. |

## Connecting to Supabase from Vercel (critical operational detail)

- **Use Supabase's connection pooler (Supavisor), transaction mode, port `6543`**, not the direct connection (port `5432`) for any code path that runs in a Vercel serverless function (i.e., all Route Handlers). Reasons:
  1. Direct connections resolve to IPv6 by default on Supabase; Vercel's serverless functions cannot make outbound IPv6 connections without Supabase's paid "Dedicated IPv4 Address" add-on. Supavisor is IPv4-compatible on every project, no add-on needed.
  2. Serverless functions open/close connections per-invocation; a pooler is required to avoid exhausting Postgres's connection limit under concurrent polling load (up to ~150 clients).
- **Transaction-mode pooling does not support prepared statements.** When constructing the `postgres` client, pass `{ prepare: false }`:
  ```ts
  import postgres from 'postgres'
  import { drizzle } from 'drizzle-orm/postgres-js'

  const client = postgres(process.env.DATABASE_URL!, { prepare: false })
  export const db = drizzle({ client })
  ```
- For `drizzle-kit` migrations (run locally or in CI, not on Vercel's serverless runtime), the **direct connection or session-mode pooler (port 5432)** is fine and often preferable (full DDL support). Keep `DATABASE_URL` (pooled, for the app) and `DIRECT_URL` (direct/session, for migrations) as two separate env vars — this is the same convention Drizzle's own Supabase guide and Prisma both converged on independently, so it's a safe, recognizable pattern.
- **Confidence: HIGH** — verified via Supabase's own docs (IPv4/IPv6 troubleshooting page, connection pooling docs) and Drizzle's official Supabase connection guide.

## RLS Deny-All + Service-Role-Only Pattern

1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` on every table, with **no policies granted to `anon` or `authenticated`** (those Supabase roles are unused anyway since Supabase Auth is out of scope — but leaving RLS off or policy-less-but-disabled is the actual footgun, since a disabled-RLS table is wide open to any role that can reach Postgres). Declare this in Drizzle schema via `pgTable(..., (t) => ({ rls: pgPolicy(...) }))` or raw SQL in a migration if Drizzle's policy DSL doesn't cover a specific case yet (it's a newer part of the API).
2. The app's **only** Postgres connection role is the one carrying the DB password from Supabase's project settings (effectively the `postgres`/service role used via `DATABASE_URL`), used exclusively in server-only code (Route Handlers, Server Actions) — **never** in a `NEXT_PUBLIC_` variable, never shipped to the client. Drizzle then runs every query as this always-authorized role, so RLS being "deny-all" for `anon`/`authenticated` is a defense-in-depth backstop (in case any credential ever leaked or was misconfigured), not the app's primary access-control mechanism. The primary access control is still: role checks in every Route Handler, as PROJECT.md's "every mutating endpoint" checklist already specifies.
3. Note the common Drizzle+Postgres gotcha (found across multiple community write-ups, not just one): if your app's Postgres role has the `BYPASSRLS` attribute (which the default Supabase "postgres" superuser-derived role effectively does), RLS policies are bypassed **regardless of what they say**. That's actually what this project wants (service-role-only access, deny-all for everyone else) — just don't accidentally treat RLS policies as if they were also restricting the server's own queries. They are not; the server is trusted by design, per PROJECT.md ("server is the sole authority").
- **Confidence: MEDIUM-HIGH** — Drizzle's RLS support and Supabase helper roles are documented on Drizzle's official RLS page; the BYPASSRLS nuance is corroborated by multiple independent community sources (GitHub discussions, blog posts) but is not spelled out in one single canonical doc, hence not full HIGH.

## Auth/Session Without a Third-Party Provider

**Recommended pattern: opaque session-id cookie + server-side `sessions` table, cookie value signed with `jose` for tamper-evidence.**

- On login (player code + roll number verified against the registration adapter), create a row in a `sessions` table: `id (uuid), player_id, role, team_id, created_at, expires_at, revoked_at`.
- Set an `httpOnly`, `secure`, `sameSite=strict` cookie containing a `jose`-signed compact JWS whose payload is just `{ sid: <session id> }` (short, low-entropy-safe because it references a server row rather than encoding trust). Do not rely on the JWT payload for authorization decisions on write paths — look the session row up from Postgres (or a request-scoped cache) on every mutating request, so a revoked/expired session is rejected even if someone replays an old but still-cryptographically-valid cookie.
- **"One active session per player" (PROJECT.md requirement)** maps directly to a partial unique index: `CREATE UNIQUE INDEX ON sessions (player_id) WHERE revoked_at IS NULL;` — on new login, revoke (`UPDATE ... SET revoked_at = now()`) any existing active session for that player inside the same transaction that inserts the new one, so double-login is server-enforced, not client-trusted.
- Read the session on the server via `proxy.ts` for cheap early rejection (missing/malformed cookie → redirect to login before hitting a Route Handler at all) and re-verify the full session + role in the Route Handler / Server Action itself before any mutation, per PROJECT.md's "auth check, role check" line item.
- **Why not `iron-session`:** iron-session encrypts the session's actual data into the cookie itself (stateless-by-design), which is a fine, simpler choice for typical apps, but doesn't naturally support "one active session per player" as a server-enforced invariant — you'd need a separate side-table anyway to track "the" active session, at which point you're back to a DB-backed session and iron-session's stateless benefit is moot. Use it only if the one-active-session and admin-revocation requirements are dropped.
- **Why not NextAuth.js/Auth.js:** it's built around OAuth/credential providers and its own session/adapter abstractions; for a single-event app with a bespoke player-code+roll-number credential and no third-party identity provider, it adds a large surface area (providers, callbacks, adapter interface) for no benefit over ~80 lines of custom cookie + DB code, and its "Credentials provider" pattern still funnels through the same session-cookie mechanics recommended above, just with more indirection.
- **Confidence: MEDIUM-HIGH.** `jose` as Next.js's/Vercel's de facto recommended JWT library (Edge/Node dual-runtime support) is well-established (echoed by Next.js's own community-facing auth guidance and Vercel templates), and the DB-session pattern is standard practice; the specific "which library" choice is a synthesis, not a single official "use exactly this" doc, so flagged MEDIUM-HIGH rather than HIGH.

## Efficient Short Polling on Vercel (avoiding N+1 overload at ~150 concurrent clients)

1. **One consolidated endpoint per polling surface**, not per-widget: e.g. `GET /api/tables/[tableId]/state` returns phase, timer end (server timestamp), vote tally, and player-scoped payload in a single response built from a single well-indexed query (or a small number of joined/`with`-relational Drizzle queries), rather than the client firing off separate polls for phase/timer/votes. This is the direct fix for "N+1 polling overload": the N+1 risk here isn't React-Query-style over-fetching, it's **naive per-field polling multiplying request count**, and the fix is response consolidation, not caching cleverness.
2. **ETag / conditional GET for cheap "nothing changed" responses.** Maintain a monotonically increasing `updated_at`/`version` column on the table-state row (bumped by the same transaction that advances phase or records a vote). Compute the response ETag from that version, compare against `If-None-Match`, and return `304 Not Modified` with no body when unchanged. At this project's scale (25 tables × 6 players polling every 1-2s ≈ 75-150 req/s peak during Task 1, well within a single Supabase Postgres instance's capacity for indexed point reads), this mainly saves bandwidth/parse cost on phones, not DB load — but it's cheap to add and keeps client code simple (fetch, check status, patch state).
3. **Differentiated polling intervals per role** (already anticipated in PROJECT.md): players in an active game poll fastest (~1-2s, since timers are self-driving and need to feel responsive), monitors/admin dashboards can poll slower (3-5s), and the projector display can poll slowest (2-3s, since a couple seconds of visual lag on a public screen is imperceptible). This is a client-side interval choice, not a stack/library choice — no special library needed, just `setInterval`/`useEffect` with `visibilitychange` handling to pause polling when a tab is backgrounded (saves load with zero cost).
4. **Do not reach for Server-Sent Events or WebSockets** despite them showing up heavily in generic "avoid polling" search results — PROJECT.md has already ruled out a persistent-connection architecture (`No persistent WebSocket service`), and Vercel serverless functions are not a good host for long-lived SSE connections either (same execution-time/connection-reuse constraints that ruled out WebSockets apply, and Vercel's own guidance is that Edge/serverless functions are not designed to hold connections open indefinitely). Short polling with the consolidation + ETag pattern above is the correct, already-decided architecture — this research reinforces rather than overturns that decision.
5. **Route Handler configuration:** mark polling endpoints `export const dynamic = 'force-dynamic'` and set `Cache-Control: no-store` (or a very short `s-maxage` only if a slight CDN-level staleness window is acceptable for the projector/leaderboard view specifically) so Vercel's data cache doesn't serve stale game state. Do not apply Next.js's `fetch` cache defaults to these routes.
- **Confidence: MEDIUM.** The consolidation + ETag pattern is standard REST/HTTP practice (well documented, e.g. MDN and general API design literature) and is a direct, defensible response to the stated N+1 concern; the specific interval numbers are this project's own reasonable judgment call, not an externally "researched" figure, and are flagged as such.

## CSP-with-Nonces and Security Headers (Next.js App Router, verified against official docs, Next.js 16.3.6, docs updated 2026-09-07)

- **File is `proxy.ts` at the project root (or `src/proxy.ts`), not `middleware.ts`.** Next.js 16.0.0 deprecated and renamed the `middleware` file convention to `proxy`; a codemod exists (`npx @next/codemod@canary middleware-to-proxy .`) but for a greenfield project, just start with `proxy.ts` and the exported `proxy` function name directly — don't build on the deprecated name.
- **`proxy.ts` now defaults to the Node.js runtime** (changed in v16.0.0 — it used to be Edge-only), and the `runtime` route-segment-config option is not applicable inside proxy files (setting it throws). This matters for this project because it removes the old Edge-runtime constraint on what can run in the auth/CSP layer (no need to avoid Node-only APIs there), though DB calls still shouldn't happen in `proxy.ts` — keep it to cookie/header inspection and the RS256/HS256 `jose` verify, not a database round-trip on every request.
- Official pattern (from `nextjs.org/docs/app/guides/content-security-policy`):
  ```ts
  // proxy.ts
  import { NextRequest, NextResponse } from 'next/server'

  export function proxy(request: NextRequest) {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    const isDev = process.env.NODE_ENV === 'development'
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
      style-src 'self' 'nonce-${nonce}';
      img-src 'self' blob: data:;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim()

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', cspHeader)

    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
  }
  ```
  Read the nonce in a Server Component via `(await headers()).get('x-nonce')` and pass it explicitly to any `<Script nonce={nonce}>`.
- **Nonce-based CSP forces dynamic rendering** for every page that needs it: static optimization/ISR is disabled, and Partial Prerendering is explicitly incompatible with nonce-based CSP. For pages that must stay static (if any), use `next.config.js`'s `headers()` with a non-nonce CSP (`'unsafe-inline'` fallback) instead — but given this app is a live, per-request, server-authoritative game state tool, essentially every page here is already dynamic by nature, so this tradeoff costs nothing extra.
- **Other required headers** (HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `frame-ancestors 'none'`) should be set once in `next.config.js`'s `headers()` array applied to `/(.*)` — keep the CSP itself only in `proxy.ts` (don't duplicate/conflict a second `Content-Security-Policy` header from `next.config.js`, since `frame-ancestors` is already covered inside the CSP directive, not the separate `X-Frame-Options` header, which is legacy).
- **Host validation against `ALLOWED_HOSTS`** (PROJECT.md requirement) belongs in `proxy.ts` too: read `request.headers.get('host')`, reject (400/redirect) if not in the env-driven allowlist, before any other logic runs.
- **Confidence: HIGH** — verified directly against `nextjs.org/docs/app/guides/content-security-policy` and `nextjs.org/docs/app/api-reference/file-conventions/proxy`, both fetched live and version-stamped `16.3.6`.

## Rate Limiting and Idempotency Without a New Paid Third-Party Service

PROJECT.md's working agreement forbids adding a new third-party service without asking first. This rules out the two "default" answers the ecosystem reaches for:
- **Upstash Redis / `@upstash/ratelimit`** — the library the Next.js/Vercel ecosystem defaults to for serverless rate limiting, but it's a new external paid-tiered service.
- **Vercel's own WAF rate limiting** — Vercel Firewall's DDoS mitigation, IP blocking, and basic custom rules are free on all plans, but **rate limiting and managed rulesets specifically are priced per-plan features**, not free on Hobby beyond a handful of custom rules. Since Vercel is already the deployment target (not "new"), this is worth flagging as a possible future upgrade path, but don't design the app to depend on it, since it's a paid feature gate, not guaranteed available.

**Recommended approach: implement both rate limiting and idempotency directly in Postgres**, since Supabase-as-DB is already provisioned and this workload is tiny (~150 users, one afternoon).

**Idempotency** (for endpoints like vote submission, bet placement, Kahoot result submission — anywhere a flaky phone connection could cause a retried mutating request):
```sql
create table idempotency_keys (
  key text primary key,
  endpoint text not null,
  response_status int,
  response_body jsonb,
  created_at timestamptz not null default now()
);
```
Client sends an `Idempotency-Key` header (a UUID generated client-side once per user action). Handler does `INSERT INTO idempotency_keys (key, endpoint) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING RETURNING key` inside the same transaction as the actual mutation; if the insert didn't happen (conflict), look up the stored `response_status`/`response_body` and replay it instead of re-executing the mutation. This is the same pattern Stripe popularized and that's documented independently by multiple sources (brandur.org, multiple Node+Postgres tutorials) — it needs no new service, just one table.

**Rate limiting** (for login attempts against the low-entropy player-code+roll-number pair, and as a backstop on all mutating endpoints):
```sql
create table rate_limit_counters (
  bucket_key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (bucket_key, window_start)
);
```
On each request, compute `window_start` by truncating `now()` to the desired window (e.g. 10-second buckets), then `INSERT ... ON CONFLICT (bucket_key, window_start) DO UPDATE SET count = rate_limit_counters.count + 1 RETURNING count`; reject with `429` if the returned count exceeds the route's threshold. `bucket_key` is a composite like `login:<roll_number>` or `vote:<session_id>`. No separate cleanup cron is needed at this scale/duration — always filter reads by a recent time window, and the whole table can simply be dropped/truncated after the event.
- This is intentionally simple (not a sliding-window log or token bucket with sub-second precision) because the actual threat model here is "a buggy client retry-loops" or "someone scripts the login endpoint," not adversarial high-frequency abuse at scale — fixed-window counting in Postgres is more than sufficient and keeps the whole mechanism auditable in the same database as everything else (fits the "everything server-authoritative and logged" theme of the rest of the app).
- **Confidence: MEDIUM.** The idempotency-key-in-Postgres pattern is well corroborated across multiple independent sources. The "use Postgres instead of Redis for rate limiting" recommendation is a reasoned synthesis given the explicit no-new-third-party constraint plus the small scale, not a pattern that appears as a named "best practice" in official docs — flagged accordingly so this can be revisited if load testing during Phase work shows Postgres write contention on the counters table (very unlikely at this scale, but worth a note for the roadmap's research-flag column).

## Installation

```bash
# Core
npm install next@16 react@latest react-dom@latest drizzle-orm postgres zod jose

# Dev dependencies
npm install -D typescript drizzle-kit vitest @types/node tailwindcss @tailwindcss/postcss
npm install -D playwright @playwright/test
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Custom `jose` + DB `sessions` table | `iron-session` | If the "one active session per player" server-enforced constraint were dropped and pure stateless cookies were acceptable — simpler, fewer moving parts, but no server-side revocation without an added blocklist table (at which point you're back to the recommended approach anyway). |
| Custom `jose` + DB `sessions` table | Auth.js / NextAuth.js | If a third-party identity provider (Google, etc.) were ever added later — not applicable here (explicitly no third-party auth), but worth knowing if requirements ever change. |
| `postgres` (postgres.js) driver | `pg` (node-postgres) | If long-running Node server deployment (not Vercel serverless) were chosen instead — `pg`'s native connection pooling is more suited to a persistent process. Not relevant here since Vercel serverless is fixed. |
| Postgres-table rate limiting/idempotency | `@upstash/ratelimit` + Upstash Redis | If the "no new third-party service" constraint is later lifted (e.g., post-event, turning this into a recurring tool) — Upstash's free tier is generous and the library is purpose-built, genuinely simpler than the Postgres approach at larger scale. Revisit if this app is reused for future events at higher scale. |
| Short polling + ETag/304 | Server-Sent Events (SSE) | If the "no persistent connection" constraint were ever relaxed and a platform other than Vercel serverless were used for the live-state service — SSE is a genuinely better fit for one-way live updates than polling, but doesn't fit Vercel serverless function execution-time limits well, and PROJECT.md has already ruled this class of solution out. |
| Tailwind v4 CSS-first config | Tailwind v3 + `tailwind.config.ts` | Only if a design-token-extraction tool/script specifically expects the v3 JS config shape — otherwise no reason to regress to v3 on a greenfield project. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `@supabase/supabase-js` client SDK | Pulls in Supabase Auth/Realtime/PostgREST-oriented conventions (anon key, `auth.uid()` expectations) that directly contradict the "Supabase is DB only" decision; also encourages exposing an anon key to the client, which this app's threat model (server is sole authority) doesn't want. | `drizzle-orm/postgres-js` talking directly to Postgres via the pooled connection string. |
| Direct Postgres connection (port 5432, non-pooled) from any Vercel serverless Route Handler | Resolves to IPv6 by default on Supabase; Vercel serverless can't reach it without Supabase's paid IPv4 add-on, and even with IPv4 it doesn't pool connections across concurrent invocations. | Supavisor transaction-mode pooler, port 6543, `prepare: false`. |
| `middleware.ts` (old Next.js convention/tutorials) | Deprecated in Next.js 16.0.0, renamed to `proxy.ts`/`proxy()`. Training-data-era tutorials and even some current blog posts still show `middleware.ts` — following them on a fresh Next.js 16 install will work today (the old name still functions as a deprecated alias per the docs) but is explicitly against the framework's own migration guidance and risks breaking on a future major version. | `proxy.ts` with an exported `proxy` function, per current official docs. |
| `@upstash/ratelimit` / Vercel WAF paid rate limiting / any Redis-as-a-service | New third-party or paid-tier service; PROJECT.md's working agreement requires asking the user before adding any of these. | Postgres-table-based idempotency keys and fixed-window rate-limit counters (see above) — reuses infrastructure already in the stack. |
| Stateless-only JWT sessions (no DB session row) | Cannot satisfy "one active session per player" or admin-forced logout/revocation without an additional server-side state store — at which point it's not actually stateless anyway. | Opaque session id in a signed cookie, backed by a `sessions` table row (see Auth section). |
| `X-Frame-Options` as the primary clickjacking defense | Legacy header, superseded by CSP's `frame-ancestors` directive, which the recommended CSP already includes (`frame-ancestors 'none'`). Fine to also send `X-Frame-Options: DENY` for older-browser defense-in-depth, but don't treat it as sufficient on its own. | CSP `frame-ancestors 'none'`, optionally paired with `X-Frame-Options: DENY` as a belt-and-suspenders header. |

## Stack Patterns by Variant

**If Task 2/3's "webhook completion" mode is eventually activated (currently deferred/configurable per PROJECT.md):**
- The idempotency-key table doubles as webhook deduplication storage (external services commonly retry webhooks) — no new mechanism needed, just route webhook POSTs through the same idempotency middleware as player-facing mutations.

**If load testing during the roadmap's Task 1 phase shows the fixed-window Postgres rate limiter causing write contention on the counters table (unlikely at ~150 users, but worth checking once):**
- Widen the window (e.g., 10s → 30s buckets) before reaching for an external service; at this scale the fix is almost certainly a wider bucket or an added index, not a new datastore.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `drizzle-orm@0.45.x` | `drizzle-kit@0.31.x` | Confirmed as the current live-npm pairing (both fetched from the registry directly, 2026-09-24). |
| `next@16.x` | `react@19.x` | Next.js 16 requires React 19; don't pin React 18 alongside Next 16. |
| `next@16.x` | Node `>=20.9.0` | From the `next` package's own `engines` field (live npm check) — set Vercel's Node.js version accordingly (Vercel's default is already recent enough, but confirm in project settings, not just assume). |
| `postgres@3.4.x` (postgres.js) + `{ prepare: false }` | Supabase Supavisor **transaction mode** (port 6543) | Required combination — transaction-mode pooling does not support prepared statements; omitting `prepare: false` causes intermittent errors under concurrent load, which is exactly the failure mode that would be hard to reproduce in low-traffic local dev and then appear during the live event. |
| Tailwind v4 | Next.js 16 App Router | Use `@tailwindcss/postcss` as the PostCSS plugin (v4's supported integration path) rather than the old `tailwindcss` + `autoprefixer` v3 PostCSS setup. |

## Sources

- `nextjs.org/docs/app/guides/content-security-policy` (fetched live, `version: 16.3.6`, `lastUpdated: 2026-03-20`) — CSP-with-nonce pattern, static-vs-dynamic rendering tradeoffs, SRI alternative.
- `nextjs.org/docs/app/api-reference/file-conventions/proxy` (fetched live, `version: 16.3.6`, `lastUpdated: 2026-09-07`) — `proxy.ts` file convention, Node.js-by-default runtime, migration-from-middleware guidance, version history table confirming `v16.0.0` as the deprecation point.
- `orm.drizzle.team/docs/rls` (fetched live) — `pgPolicy`, `pgRole`, Supabase-specific role helpers, service-role/bypass pattern.
- `orm.drizzle.team/docs/connect-supabase` (fetched live) — recommended `postgres.js` driver, `prepare: false` requirement for transaction-mode pooling.
- npm registry (`npm view`, live queries, 2026-09-24): `next@16.3.6`, `drizzle-orm@0.45.3`, `drizzle-kit@0.31.11`, `zod@4.6.5`, `postgres@3.4.9`, `jose@6.2.12`, `iron-session@9.0.1`, `typescript@7.0.2`, `tailwindcss@4.3.3`, plus `next`'s and `drizzle-orm`'s `engines`/`peerDependencies` fields — HIGH confidence, these are authoritative current version numbers, not training-data guesses.
- Supabase docs (`supabase.com/docs/guides/database/connecting-to-postgres`, `.../troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility`, via WebSearch-surfaced summaries) — IPv4/IPv6 behavior of direct vs. Supavisor connections. MEDIUM confidence (WebSearch-summarized, not directly WebFetched from Supabase's own page in this session — recommend a quick official-doc spot-check during the phase that sets up the DB connection, since this is a load-bearing operational detail).
- `vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting` and `.../usage-and-pricing` (via WebSearch-surfaced summaries) — confirms rate limiting is a paid/plan-gated WAF feature, not free-tier-by-default. MEDIUM confidence (WebSearch-summarized).
- General idempotency-key pattern: cross-referenced across multiple independent sources (brandur.org's "Implementing Stripe-like Idempotency Keys in Postgres", and several independent Node+Postgres tutorials) converging on the same `INSERT ... ON CONFLICT` design — MEDIUM-HIGH confidence via multi-source agreement.

---
*Stack research for: server-authoritative polling-based Next.js event-day web app*
*Researched: 2026-09-24*
