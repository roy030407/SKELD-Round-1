<!-- GSD:project-start source:PROJECT.md -->
## Project

**Project Skeld: Round 1 Web App**

A standalone web app for Round 1 of "Project Skeld," the Robotics Club NIT Warangal freshers event (Among Us theme), running 26 September, 5 PM, at NAB. Roughly 25 teams of 6 first-years (about 150 players) check in, play through four tasks with server-authoritative scoring, and the top 8 teams (48 players) advance to Round 2, a physical Among Us game that is entirely out of scope for this app. The app also serves the admin team running the event and roaming volunteer monitors, plus a read-only projector display.

**Core Value:** Every score, rank, and gating decision is computed and enforced server side from an append-only ledger, so the leaderboard is always correct and defensible even under load from ~150 concurrent phones, with the exact visual identity of rc-nitw.org/freshers reproduced throughout.

### Constraints

- **Tech stack**: Next.js (App Router), TypeScript (strict), Tailwind, PostgreSQL on Supabase (database only), Drizzle ORM, zod — fixed by the user, not open for reconsideration without discussion
- **Deployment**: Vercel, custom domain unknown at build time — no hardcoded domains anywhere; env vars only
- **Timeline**: Event is 26 Sept, 5 PM — hard, immovable deadline
- **Scale**: 20-30 teams (~150-180 players); Task 1 must fit in a 10-15 minute window per session
- **Security**: Treat the SECURITY RULES list in the spec as acceptance criteria, not aspirational guidance — every mutating endpoint and every table is in scope for this from the first phase that touches it
- **Third-party services**: No new third-party service may be added without asking the user first (explicit working agreement)
- **Design fidelity**: No creative reinterpretation of rc-nitw.org/freshers — exact reproduction is a hard requirement, verified against screenshots and computed styles, not "inspired by"
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
- **Transaction-mode pooling does not support prepared statements.** When constructing the `postgres` client, pass `{ prepare: false }`:
- For `drizzle-kit` migrations (run locally or in CI, not on Vercel's serverless runtime), the **direct connection or session-mode pooler (port 5432)** is fine and often preferable (full DDL support). Keep `DATABASE_URL` (pooled, for the app) and `DIRECT_URL` (direct/session, for migrations) as two separate env vars — this is the same convention Drizzle's own Supabase guide and Prisma both converged on independently, so it's a safe, recognizable pattern.
- **Confidence: HIGH** — verified via Supabase's own docs (IPv4/IPv6 troubleshooting page, connection pooling docs) and Drizzle's official Supabase connection guide.
## RLS Deny-All + Service-Role-Only Pattern
- **Confidence: MEDIUM-HIGH** — Drizzle's RLS support and Supabase helper roles are documented on Drizzle's official RLS page; the BYPASSRLS nuance is corroborated by multiple independent community sources (GitHub discussions, blog posts) but is not spelled out in one single canonical doc, hence not full HIGH.
## Auth/Session Without a Third-Party Provider
- On login (player code + roll number verified against the registration adapter), create a row in a `sessions` table: `id (uuid), player_id, role, team_id, created_at, expires_at, revoked_at`.
- Set an `httpOnly`, `secure`, `sameSite=strict` cookie containing a `jose`-signed compact JWS whose payload is just `{ sid: <session id> }` (short, low-entropy-safe because it references a server row rather than encoding trust). Do not rely on the JWT payload for authorization decisions on write paths — look the session row up from Postgres (or a request-scoped cache) on every mutating request, so a revoked/expired session is rejected even if someone replays an old but still-cryptographically-valid cookie.
- **"One active session per player" (PROJECT.md requirement)** maps directly to a partial unique index: `CREATE UNIQUE INDEX ON sessions (player_id) WHERE revoked_at IS NULL;` — on new login, revoke (`UPDATE ... SET revoked_at = now()`) any existing active session for that player inside the same transaction that inserts the new one, so double-login is server-enforced, not client-trusted.
- Read the session on the server via `proxy.ts` for cheap early rejection (missing/malformed cookie → redirect to login before hitting a Route Handler at all) and re-verify the full session + role in the Route Handler / Server Action itself before any mutation, per PROJECT.md's "auth check, role check" line item.
- **Why not `iron-session`:** iron-session encrypts the session's actual data into the cookie itself (stateless-by-design), which is a fine, simpler choice for typical apps, but doesn't naturally support "one active session per player" as a server-enforced invariant — you'd need a separate side-table anyway to track "the" active session, at which point you're back to a DB-backed session and iron-session's stateless benefit is moot. Use it only if the one-active-session and admin-revocation requirements are dropped.
- **Why not NextAuth.js/Auth.js:** it's built around OAuth/credential providers and its own session/adapter abstractions; for a single-event app with a bespoke player-code+roll-number credential and no third-party identity provider, it adds a large surface area (providers, callbacks, adapter interface) for no benefit over ~80 lines of custom cookie + DB code, and its "Credentials provider" pattern still funnels through the same session-cookie mechanics recommended above, just with more indirection.
- **Confidence: MEDIUM-HIGH.** `jose` as Next.js's/Vercel's de facto recommended JWT library (Edge/Node dual-runtime support) is well-established (echoed by Next.js's own community-facing auth guidance and Vercel templates), and the DB-session pattern is standard practice; the specific "which library" choice is a synthesis, not a single official "use exactly this" doc, so flagged MEDIUM-HIGH rather than HIGH.
## Efficient Short Polling on Vercel (avoiding N+1 overload at ~150 concurrent clients)
- **Confidence: MEDIUM.** The consolidation + ETag pattern is standard REST/HTTP practice (well documented, e.g. MDN and general API design literature) and is a direct, defensible response to the stated N+1 concern; the specific interval numbers are this project's own reasonable judgment call, not an externally "researched" figure, and are flagged as such.
## CSP-with-Nonces and Security Headers (Next.js App Router, verified against official docs, Next.js 16.3.6, docs updated 2026-09-07)
- **File is `proxy.ts` at the project root (or `src/proxy.ts`), not `middleware.ts`.** Next.js 16.0.0 deprecated and renamed the `middleware` file convention to `proxy`; a codemod exists (`npx @next/codemod@canary middleware-to-proxy .`) but for a greenfield project, just start with `proxy.ts` and the exported `proxy` function name directly — don't build on the deprecated name.
- **`proxy.ts` now defaults to the Node.js runtime** (changed in v16.0.0 — it used to be Edge-only), and the `runtime` route-segment-config option is not applicable inside proxy files (setting it throws). This matters for this project because it removes the old Edge-runtime constraint on what can run in the auth/CSP layer (no need to avoid Node-only APIs there), though DB calls still shouldn't happen in `proxy.ts` — keep it to cookie/header inspection and the RS256/HS256 `jose` verify, not a database round-trip on every request.
- Official pattern (from `nextjs.org/docs/app/guides/content-security-policy`):
- **Nonce-based CSP forces dynamic rendering** for every page that needs it: static optimization/ISR is disabled, and Partial Prerendering is explicitly incompatible with nonce-based CSP. For pages that must stay static (if any), use `next.config.js`'s `headers()` with a non-nonce CSP (`'unsafe-inline'` fallback) instead — but given this app is a live, per-request, server-authoritative game state tool, essentially every page here is already dynamic by nature, so this tradeoff costs nothing extra.
- **Other required headers** (HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `frame-ancestors 'none'`) should be set once in `next.config.js`'s `headers()` array applied to `/(.*)` — keep the CSP itself only in `proxy.ts` (don't duplicate/conflict a second `Content-Security-Policy` header from `next.config.js`, since `frame-ancestors` is already covered inside the CSP directive, not the separate `X-Frame-Options` header, which is legacy).
- **Host validation against `ALLOWED_HOSTS`** (PROJECT.md requirement) belongs in `proxy.ts` too: read `request.headers.get('host')`, reject (400/redirect) if not in the env-driven allowlist, before any other logic runs.
- **Confidence: HIGH** — verified directly against `nextjs.org/docs/app/guides/content-security-policy` and `nextjs.org/docs/app/api-reference/file-conventions/proxy`, both fetched live and version-stamped `16.3.6`.
## Rate Limiting and Idempotency Without a New Paid Third-Party Service
- **Upstash Redis / `@upstash/ratelimit`** — the library the Next.js/Vercel ecosystem defaults to for serverless rate limiting, but it's a new external paid-tiered service.
- **Vercel's own WAF rate limiting** — Vercel Firewall's DDoS mitigation, IP blocking, and basic custom rules are free on all plans, but **rate limiting and managed rulesets specifically are priced per-plan features**, not free on Hobby beyond a handful of custom rules. Since Vercel is already the deployment target (not "new"), this is worth flagging as a possible future upgrade path, but don't design the app to depend on it, since it's a paid feature gate, not guaranteed available.
- This is intentionally simple (not a sliding-window log or token bucket with sub-second precision) because the actual threat model here is "a buggy client retry-loops" or "someone scripts the login endpoint," not adversarial high-frequency abuse at scale — fixed-window counting in Postgres is more than sufficient and keeps the whole mechanism auditable in the same database as everything else (fits the "everything server-authoritative and logged" theme of the rest of the app).
- **Confidence: MEDIUM.** The idempotency-key-in-Postgres pattern is well corroborated across multiple independent sources. The "use Postgres instead of Redis for rate limiting" recommendation is a reasoned synthesis given the explicit no-new-third-party constraint plus the small scale, not a pattern that appears as a named "best practice" in official docs — flagged accordingly so this can be revisited if load testing during Phase work shows Postgres write contention on the counters table (very unlikely at this scale, but worth a note for the roadmap's research-flag column).
## Installation
# Core
# Dev dependencies
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
- The idempotency-key table doubles as webhook deduplication storage (external services commonly retry webhooks) — no new mechanism needed, just route webhook POSTs through the same idempotency middleware as player-facing mutations.
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
