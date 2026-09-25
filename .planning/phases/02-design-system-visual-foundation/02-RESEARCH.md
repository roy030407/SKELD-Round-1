# Phase 02: Design System & Visual Foundation - Research

**Researched:** 2026-09-25
**Domain:** Design-token extraction, Tailwind v4 `@theme`, Next.js App Router UI foundation, Playwright visual regression
**Confidence:** HIGH (fonts/stack/patterns verified against live site CSS + official docs); MEDIUM (exact hex/spacing matrix still needs manual picker pass during execution)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Reuse the reference site's exact visual system (layout, spacing, colors, fonts, animations, section structure) but replace copy with Project Skeld-specific content — this is NOT a literal 1:1 content clone.
- **D-02:** Minimum landing page content: "Project Skeld" title/hero, tagline, event essentials (26 September, 5 PM, NAB), and a single primary CTA button ("Check In" → routes toward the login/check-in flow, which is out of scope for this phase but the CTA target should be a stubbed/placeholder route). Other sections from the reference (about, footer, etc.) can stay structurally present using the same visual language, filled with minimal/placeholder Skeld-relevant content rather than fully rewritten section-by-section — do not invent elaborate new copy/content sections beyond what the reference page's structure already has slots for.
- **D-03:** Document the component library via an in-app style guide route (e.g. `/design-system`) inside the Next.js app itself, rendering every component and its variants live. No new external tool/dependency (no Storybook). This route should be excluded from production visibility (e.g. gated behind a dev-only check or `NODE_ENV !== 'production'`) since it's an internal reference, not a public part of the app.
- **D-04:** Build the security-map "EMERGENCY MEETING" voting motif and mission-stage task rail with full interactive states now, not just static visual shells — hover/pressed/selected/loading states and CSS animations (e.g. the hold-to-reveal round button for word reveal per PROJECT.md's reuse mapping, pulse/glow effects) should be implemented in this phase. These components will NOT be wired to real data or game logic yet (no live votes, no real task state) — interactivity here means visual/interaction-state completeness (CSS states, Storybook-style prop-driven variants), not functional wiring to Phase 4/5 backend logic.
- **D-05:** Use manual extraction: pick colors/fonts/spacing values from the six reference screenshots (e.g. using a color picker on the images) and spot-check a handful of values against the live site's browser devtools computed styles. Do NOT build a dedicated Playwright extraction script that dumps computed CSS automatically — that's more tooling than this phase needs. Playwright is still used for pixel-comparison verification of the final landing page against the reference screenshots (per ROADMAP.md's "Playwright-verify against the live site"), just not for the token-extraction step itself.
- **D-06:** Identify the actual font families used by rc-nitw.org/freshers (inspect screenshots and/or live site). If they are available on Google Fonts, load them via `next/font/google` (self-hosted by Next.js at build time, no external runtime request, no new third-party service). If the fonts turn out to be custom/licensed and not on Google Fonts, fall back to `next/font/local` with sourced font files, respecting licensing. Font identification happens during research/planning, not decided further here.
- **D-07:** Implement the "larger-format projector variant" as an explicit size prop/variant on each component (e.g. `size="projector"` or equivalent), not a responsive breakpoint. This makes the projector variant predictable and independently previewable in the `/design-system` style guide route regardless of actual viewport width, and matches DESIGN-04's framing of it as "a variant of the same components" rather than a separate responsive breakpoint.

### Claude's Discretion
- Exact Tailwind v4 `@theme` token naming/structure (per CLAUDE.md's tech stack guidance: CSS-first config, tokens as literal CSS custom properties).
- Exact component API/props shape for the base library (panel, card, status pill, button variants) — follow standard reusable-component conventions.
- Precise animation timing/easing values not visible/measurable from screenshots — approximate reasonably and note as approximation if exactness can't be derived from static images.
- File/folder organization for components and design tokens within the Next.js app structure.

### Deferred Ideas (OUT OF SCOPE)
- Playwright-based automated computed-style extraction tooling — considered and explicitly deferred in favor of manual extraction (see D-05); could be revisited if manual extraction proves too imprecise during execution.
- Full section-by-section content rewrite of the landing page (about/FAQ/team sections) — deferred; only event essentials + CTA are required content, per D-02.
- Real data-wiring of the voting motif and task rail to live game/task state — belongs to Phase 5 (Task 1 engine) and Phase 4 (Check-in & Task Gating) respectively.

None — discussion stayed within phase scope otherwise.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DESIGN-01 | Design tokens (colors, fonts, spacing, animations) extracted from rc-nitw.org/freshers via six screenshots + Playwright-inspected computed styles, centralized for reuse | Manual extraction workflow (D-05); live CSS font/color inventory below; Tailwind v4 `@theme` as single source; spot-check protocol |
| DESIGN-02 | Landing/marketing surfaces reproduce layout, copy style, and assets exactly (not interpretation) | Section → component map from screenshots; Skeld copy + Check In CTA (D-01/D-02); asset mirror paths from live site; Playwright visual baselines |
| DESIGN-03 | Every other screen built from same tokens/components — no new colors/fonts | Base component library + `/design-system` living style guide (D-03); reuse mapping from PROJECT.md Design section |
| DESIGN-04 | Player layouts mobile-first; projector is larger-format variant of same language | `size="default" \| "projector"` prop (D-07); mobile-first Tailwind defaults; projector scale tokens |
</phase_requirements>

## Summary

Phase 2 must land a **faithful visual foundation** for every later Skeld screen: centralized Tailwind v4 design tokens, a reusable React component set (panels, cards, pills, buttons, security-map voting motif, mission-stage task rail), a Skeld-copy landing page that matches the reference visual system, and a **dev-gated** in-app `/design-system` showcase — all without Storybook, without a Playwright token-dump script, and without wiring game logic.

Live-site inspection of `https://rc-nitw.org/freshers` (2026-09-25) confirms the reference is already Project Skeld–branded Among Us UI and exposes an exact font stack: **Orbitron, Rajdhani, Bangers, JetBrains Mono** (Google Fonts → `next/font/google`) plus **VCR OSD Mono** (local TTF at `/VCR_OSD_MONO_1.001.ttf` → `next/font/local`). Background/space tokens cluster around `#05070a` / `#030712`; neon reds, gold/amber panels, and cyan accents dominate interactive chrome. Crewmate SVGs and club logo assets are served from known `/freshers/among-us/...` and logo paths and should be mirrored into `public/` for fidelity.

Because Phase 1 may scaffold Next.js in parallel, Phase 2 must target a **stable app-layout contract** (`app/globals.css` `@theme`, `components/ui/*`, marketing + design-system routes) that merges cleanly whether Phase 1 or Phase 2 creates the app first.

**Primary recommendation:** Centralize all visual values in Tailwind v4 `@theme` CSS variables; load fonts via `next/font` CSS variables; implement components with an explicit `size` prop using `data-size` + Tailwind `data-[size=projector]:*` utilities (no Storybook, no CVA required); verify with Playwright `toHaveScreenshot` against component baselines and full-page landing shots (mask floating/animated crewmates), plus a short manual side-by-side against `design-reference/`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens (`@theme`) | Frontend Server (SSR) / Build CSS | CDN/Static (compiled CSS) | Tokens live in `globals.css`; Tailwind compiles utilities at build time |
| Font loading | Frontend Server (SSR) | CDN/Static (self-hosted font files) | `next/font` downloads/self-hosts at build; applied via root layout CSS variables |
| Static assets (crewmates, logo, VCR font) | CDN / Static (`public/`) | — | Served as static files; no DB |
| Base UI components | Browser / Client (interactive states) + SSR | — | Server Components by default; client only where hold-to-reveal / hover animation needs event handlers |
| Landing / marketing page | Frontend Server (SSR) | Browser | Mostly static SSR page; CTA is a link stub |
| `/design-system` style guide | Frontend Server (SSR) | Browser | Dev-gated route; renders live component variants |
| Visual regression tests | API / Backend (test runner) | Browser (Playwright Chromium) | Playwright drives headless browser; baselines in git |
| Game/auth/scoring logic | — | — | **Out of scope** this phase |

## Project Constraints (from .cursor/rules/)

No `.cursor/rules/` directory found in the project root at research time. Actionable constraints instead come from `CLAUDE.md` / PROJECT.md and apply to this phase:

- Fixed stack: Next.js App Router, TypeScript strict, Tailwind v4 CSS-first `@theme`, no creative reinterpretation of rc-nitw.org/freshers
- No new third-party **services** without asking (npm libs OK if already in stack / discretionary UI helpers)
- No hardcoded domains; env-only
- SEC-09: no `dangerouslySetInnerHTML`, no `eval`, no inline event handlers
- Design fidelity verified against screenshots + computed styles, not "inspired by"

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `16.3.6` [VERIFIED: npm registry] | App Router, `next/font`, Route Handlers later | Fixed by project; fonts + routing |
| React | `19.x` (via Next 16) [CITED: nextjs.org engines] | UI components | Required peer of Next 16 |
| TypeScript | `5.x` strict | Typed component props (`size`, variants) | Fixed by project |
| Tailwind CSS | `4.3.3` [VERIFIED: npm registry] | Utility styling + `@theme` tokens | Fixed; CSS-first config [CITED: tailwindcss.com/docs/theme] |
| `@tailwindcss/postcss` | `4.3.3` [VERIFIED: npm registry] | PostCSS plugin for Tailwind v4 | Official v4 Next integration path [CITED: STACK.md / Tailwind v4 blog] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@playwright/test` | `1.63.0` [VERIFIED: npm registry] | Visual regression + smoke | Landing + component screenshot baselines |
| `vitest` | `5.0.2` [VERIFIED: npm registry] | Unit tests for pure helpers (token maps, class builders) | Optional small pure-fn tests; STACK.md standard |
| `clsx` | `2.1.1` [VERIFIED: npm registry] | Conditional class joining | Optional; prefer if class strings get noisy |
| `next/font/google` + `next/font/local` | (built into Next) | Self-hosted fonts | Required (D-06) — not a separate package |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-app `/design-system` | Storybook | Locked out by D-03 — extra dependency/tooling |
| `size="projector"` prop | CSS breakpoint (`xl:` / custom) | Locked out by D-07 — not previewable at phone width |
| Manual token pick + spot-check | Playwright computed-style dump script | Locked out by D-05 |
| `data-size` + Tailwind variants | `class-variance-authority` (CVA) | CVA is fine and npm-legitimate, but unnecessary if `data-[size=projector]:` covers variants; skip to keep deps lean |
| `next/font` | Runtime Google Fonts `<link>` | Violates no-runtime-third-party / CSP hygiene; `next/font` self-hosts at build |

**Installation (when app scaffold exists or is created):**

```bash
npx create-next-app@16 . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"
# or merge into Phase 1 scaffold if already present
npm install clsx   # optional
npm install -D @playwright/test vitest @vitejs/plugin-react
npx playwright install chromium
```

**Version verification (2026-09-25):** `next@16.3.6`, `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3`, `@playwright/test@1.63.0`, `vitest@5.0.2`, `clsx@2.1.1` via `npm view`.

## Package Legitimacy Audit

> slopcheck `install` defaulted to **PyPI** on this machine and produced false `[SLOP]` for scoped npm packages (`@playwright/test`, `@tailwindcss/postcss`, `class-variance-authority`). Those results are **not authoritative** for this Node phase. Legitimacy below is from **npm registry + official docs/repos**.

| Package | Registry | Age / provenance | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|------------------|-----------|-------------|-----------|-------------|
| `next` | npm | Mature (Vercel) | High | github.com/vercel/next.js | PyPI false-OK | Approved — use npm package, not PyPI `next` |
| `tailwindcss` | npm | Mature | High | github.com/tailwindlabs/tailwindcss | PyPI false-OK | Approved |
| `@tailwindcss/postcss` | npm | Official Tailwind v4 | High | github.com/tailwindlabs/tailwindcss | PyPI false-SLOP | Approved [VERIFIED: npm + Tailwind docs] |
| `@playwright/test` | npm | Microsoft | High | github.com/microsoft/playwright | PyPI false-SLOP | Approved [VERIFIED: npm + playwright.dev] |
| `vitest` | npm | Vite org | High | github.com/vitest-dev/vitest | PyPI false-SUS | Approved [VERIFIED: npm + STACK.md] |
| `clsx` | npm | lukeed | High | github.com/lukeed/clsx | PyPI false-OK | Approved optional |
| `class-variance-authority` | npm | joe-bell/cva | High | github.com/joe-bell/cva | PyPI false-SLOP | **Not required** — prefer `data-size` pattern; if added later, Approved on npm |

**Packages removed due to slopcheck [SLOP] verdict:** none (PyPI verdicts discarded; no npm SLOP).
**Packages flagged as suspicious [SUS]:** none on npm after registry verification.

**Postinstall scripts:** Checked via `npm view <pkg> scripts.postinstall` for clsx / cva / tailwind-merge / playwright / vitest / postcss — no suspicious network postinstalls observed for recommended install set. Playwright browser binaries install via explicit `npx playwright install` (expected).

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│ design-reference/*.png  +  rc-nitw.org/freshers (spot-check)    │
│            │ manual color/spacing pick (D-05)                     │
│            ▼                                                      │
│   app/globals.css  (@import "tailwindcss"; @theme { ... })        │
│            │ CSS vars → Tailwind utilities                        │
│            ▼                                                      │
│   app/layout.tsx  (next/font → --font-orbitron, --font-rajdhani, │
│                    --font-bangers, --font-mono, --font-pixel)     │
│            │                                                      │
│   ┌────────┴────────┬──────────────────┬──────────────────────┐ │
│   ▼                 ▼                  ▼                      ▼ │
│ public/assets   components/ui/*   app/page.tsx          app/     │
│ crewmates/logo  Panel Card Pill   (landing / marketing) design-  │
│ VCR.ttf         Button VotingMotif Check In → /check-in stub   system/│
│                 TaskRail HoldReveal  (Skeld copy D-01/02)      (dev) │
│                        │                                          │
│                        ▼                                          │
│              Playwright toHaveScreenshot                          │
│              (component + landing baselines)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```text
app/
├── globals.css                 # @import "tailwindcss"; @theme tokens; keyframes
├── layout.tsx                  # fonts → CSS variables on <html>
├── page.tsx                    # Landing / marketing (Skeld copy + Check In CTA)
├── design-system/
│   └── page.tsx                # Dev-gated living style guide (D-03)
└── check-in/
    └── page.tsx                # Stub target for CTA (placeholder; Phase 1 auth later)
components/
├── ui/
│   ├── panel.tsx
│   ├── card.tsx
│   ├── status-pill.tsx
│   ├── button.tsx
│   ├── emergency-banner.tsx
│   ├── hold-to-reveal-button.tsx   # client component
│   ├── voting-motif.tsx            # security-map center + diamonds
│   ├── task-rail.tsx               # mission-stages list + pills
│   └── nav-pill.tsx                # optional marketing chrome
├── marketing/
│   └── landing-sections.tsx        # hero, event intel, stages, contacts shells
└── providers/                      # none required this phase
public/
├── fonts/VCR_OSD_MONO_1.001.ttf
├── branding/robotics-club-nitw.png
└── among-us/crewmates/{red,blue,cyan,yellow,green,purple}.svg
lib/
└── design/
    ├── tokens.ts                   # optional TS re-exports / docs only — CSS is source of truth
    └── sizes.ts                    # Size = "default" | "projector"
e2e/
├── landing.visual.spec.ts
├── design-system.smoke.spec.ts
└── components.visual.spec.ts
design-reference/                   # ground-truth screenshots (already present)
```

### Pattern 1: Tailwind v4 CSS-first tokens

**What:** Declare all brand colors, fonts, radii, shadows/glows, and projector scale multipliers in `@theme` so utilities like `bg-skeld-void`, `text-skeld-amber`, `shadow-skeld-glow-red` exist app-wide.
**When to use:** Always — single source for DESIGN-01/03.
**Example:**

```css
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

@theme {
  --font-orbitron: var(--font-orbitron), ui-sans-serif, system-ui, sans-serif;
  --font-rajdhani: var(--font-rajdhani), ui-sans-serif, system-ui, sans-serif;
  --font-bangers: var(--font-bangers), cursive;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
  --font-pixel: var(--font-vcr), "Courier New", monospace;

  --color-skeld-void: #05070a;
  --color-skeld-panel: #0a1628;
  --color-skeld-amber: #f59e0b;
  --color-skeld-cyan: #22d3ee;
  --color-skeld-red: #dc2626;
  --color-skeld-glow-red: #ff4d4d;
  /* …complete after manual picker pass */

  --shadow-skeld-glow-red: 0 0 24px color-mix(in oklab, var(--color-skeld-glow-red) 70%, transparent);
  --radius-panel: 1rem;
}
```

### Pattern 2: Font loading with CSS variables

**What:** Load Google fonts via `next/font/google` and VCR via `next/font/local`; expose `--font-*` on `<html>`.
**When to use:** Root layout only (D-06).
**Example:**

```tsx
// Source: https://nextjs.org/docs/app/getting-started/fonts
import { Orbitron, Rajdhani, Bangers, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
});
const bangers = Bangers({ subsets: ["latin"], weight: "400", variable: "--font-bangers" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const vcr = localFont({
  src: "../public/fonts/VCR_OSD_MONO_1.001.ttf",
  variable: "--font-vcr",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${rajdhani.variable} ${bangers.variable} ${jetbrains.variable} ${vcr.variable}`}
    >
      <body className="bg-skeld-void text-white antialiased">{children}</body>
    </html>
  );
}
```

**Font inventory (verified from live CSS 2026-09-25)** [VERIFIED: rc-nitw.org CSS chunks]:

| Role | Family | Load path |
|------|--------|-----------|
| Display / tech headings | Orbitron | `next/font/google` [CITED: fonts.google.com/specimen/Orbitron] |
| UI / nav / section labels | Rajdhani | `next/font/google` [CITED: fonts.google.com/specimen/Rajdhani] |
| Accent display | Bangers | `next/font/google` [CITED: fonts.google.com/specimen/Bangers] |
| Body / terminal mono | JetBrains Mono | `next/font/google` [CITED: fonts.google.com/specimen/JetBrains+Mono] |
| Pixel / voting circle text | VCR OSD Mono | `next/font/local` from mirrored `VCR_OSD_MONO_1.001.ttf` (live site serves `/VCR_OSD_MONO_1.001.ttf`) |

### Pattern 3: Projector via `size` prop + `data-size`

**What:** Explicit prop, not breakpoint (D-07).
**When to use:** Every reusable UI component.

```tsx
type Size = "default" | "projector";

export function Panel({
  size = "default",
  className,
  children,
}: {
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-size={size}
      className={[
        "rounded-[var(--radius-panel)] border border-skeld-amber/80 bg-skeld-panel/90 p-4",
        "data-[size=projector]:p-8 data-[size=projector]:text-xl",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
```

### Pattern 4: Dev-gated style guide

**What:** `/design-system` returns 404 (or redirect home) in production.
**When to use:** Style guide route only (D-03).

```tsx
import { notFound } from "next/navigation";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_SYSTEM !== "1") {
    notFound();
  }
  // render every component variant + size="projector" column
  return <>{/* … */}</>;
}
```

### Pattern 5: Hold-to-reveal (visual only)

**What:** Client component with pointer-down / pointer-up / pointer-leave driving CSS progress ring; no game payload.
**When to use:** Word-reveal building block (D-04 / PROJECT.md reuse mapping).

### Anti-Patterns to Avoid

- **Inventing new hexes “for contrast”** — violates DESIGN-03 / design fidelity constraint; extend only from extracted tokens.
- **Storybook or other design tooling** — D-03 forbids.
- **`size` via `@media (min-width: …)` for projector** — D-07 forbids.
- **Playwright script that dumps entire computed style tree for tokens** — D-05 forbids; use Playwright only for verification screenshots.
- **Hardcoding `rc-nitw.org` as APP_URL** — env-only domains.
- **Putting auth/gating logic in landing CTA** — CTA is a stub link only.
- **`dangerouslySetInnerHTML` for glowing text** — SEC-09; use CSS/`text-shadow` utilities.
- **Creative reinterpretation via ui-ux-pro-max “improve the vibe”** — CONTEXT/PROJECT forbid; skill may only help organize token *structure*, never restyle.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font optimization / FOUT | Manual `@font-face` + CDN links | `next/font/google` + `next/font/local` | Build-time self-host, no Google runtime request [CITED: nextjs.org fonts] |
| Design tokens as JS theme object | Custom ThemeProvider / CSS-in-JS | Tailwind v4 `@theme` | Project stack + utility generation [CITED: tailwindcss.com/docs/theme] |
| Visual regression | Manual eyeball-only forever | Playwright `toHaveScreenshot` | Built-in pixelmatch; OS-stable if baselines committed from one env [CITED: playwright.dev/docs/test-snapshots] |
| Component variant matrix docs | Markdown screenshots only | Live `/design-system` route | Locked D-03 |
| Hold-to-reveal game engine | Server timers / vote state | CSS + pointer events only | Real wiring is Phase 5 |

**Key insight:** Fidelity risk is **drift** (new colors/fonts in later phases), not missing frameworks — centralize tokens early and make `/design-system` the reuse contract.

## Common Pitfalls

### Pitfall 1: Pixel-compare landing to live site without masking copy/CTA
**What goes wrong:** Tests fail forever because D-01/D-02 change CTA to “Check In” and trim copy.
**Why it happens:** ROADMAP says “verify against live site,” but CONTEXT overrides content.
**How to avoid:** Compare (a) component chrome against design-reference crops, (b) full-page landing against **our** committed baselines, (c) optional live-site compare with text/CTA masked via Playwright `mask` / `stylePath`.
**Warning signs:** First visual test run fails only on glyph/CTA pixels.

### Pitfall 2: Floating crewmate / glow animation nondeterminism
**What goes wrong:** Screenshot flakes from CSS animations and sprite positions.
**Why it happens:** Live site uses animated/scattered crewmates and pulsing glows.
**How to avoid:** `animations: "disabled"` in Playwright, wait for `networkidle` + font ready, mask `.crewmate` layers, freeze glow via `stylePath` that sets `animation: none !important`.
**Warning signs:** Diffs concentrate on edges of sprites and red button halos.

### Pitfall 3: Parallel Phase 1 scaffold collision
**What goes wrong:** Two agents create conflicting `app/layout.tsx` / Tailwind configs.
**Why it happens:** Phase 1 and 2 are parallel and both greenfield.
**How to avoid:** Agree file ownership: Phase 1 owns auth/routes/proxy/env; Phase 2 owns `globals.css` `@theme`, `components/ui/*`, marketing page, `/design-system`. If Phase 2 runs first, create minimal Next scaffold and leave stub role pages empty for Phase 1.
**Warning signs:** Duplicate `tailwind.config.ts` (v3 style) fighting CSS-first `@theme`.

### Pitfall 4: Treating Tailwind default palette as “close enough”
**What goes wrong:** Later screens use `bg-red-600` instead of extracted `skeld-red`, breaking DESIGN-03.
**Why it happens:** Defaults look similar under time pressure.
**How to avoid:** Prefer `@theme` skeld-* tokens; optional ESLint restriction on raw palette utilities in `components/` (discretionary); style guide lists only approved tokens.
**Warning signs:** New hexes appear in PR diffs outside `globals.css`.

### Pitfall 5: Forgetting VCR OSD Mono local file / license note
**What goes wrong:** Pixel text falls back to Courier; voting motif looks wrong.
**Why it happens:** Only Google fonts were loaded.
**How to avoid:** Mirror `VCR_OSD_MONO_1.001.ttf` into `public/fonts/` (same filename as live site); document DaFont “100% Free” / author commercial-use comments in a short `public/fonts/README.md` [CITED: dafont.com/vcr-osd-mono.font] — confidence MEDIUM on license text (retain author readme with file).
**Warning signs:** Computed `font-family` on voting circle is not VCR OSD Mono.

### Pitfall 6: Building the full registration form as “landing”
**What goes wrong:** Scope explodes into forms that belong to the marketing site, not Round 1 check-in auth.
**Why it happens:** Screenshots include REGISTER / crewmate terminal.
**How to avoid:** Per D-02, keep structural shells with placeholder content; primary interactive CTA is **Check In** → stub route. Do not implement multi-crewmate registration submit in this phase.
**Warning signs:** Form POST handlers appear in Phase 2 PRs.

## Code Examples

### Playwright visual comparison

```ts
// Source: https://playwright.dev/docs/test-snapshots
import { test, expect } from "@playwright/test";

test.describe("landing visual", () => {
  test("hero matches baseline", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator("[data-testid=crewmate]")],
    });
  });
});

test.describe("design-system smoke", () => {
  test("renders core components", async ({ page }) => {
    test.skip(process.env.CI === "1" && process.env.ENABLE_DESIGN_SYSTEM !== "1");
    await page.goto("/design-system");
    await expect(page.getByText(/Panel/i)).toBeVisible();
    await expect(page.getByText(/Voting/i)).toBeVisible();
    await expect(page.getByText(/Task rail/i)).toBeVisible();
  });
});
```

### Mobile-first default + projector column in style guide

```tsx
<section className="grid gap-8 md:grid-cols-2">
  <div>
    <h2 className="font-orbitron text-sm uppercase">Default (mobile)</h2>
    <TaskRail size="default" items={demoItems} />
  </div>
  <div>
    <h2 className="font-orbitron text-sm uppercase">Projector</h2>
    <TaskRail size="projector" items={demoItems} />
  </div>
</section>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` theme extend | CSS `@theme` in `globals.css` | Tailwind v4.0 (2025) | Tokens are CSS variables + utilities [CITED: tailwindcss.com/blog/tailwindcss-v4] |
| `middleware.ts` for gates | `proxy.ts` (Next 16) | Next.js 16.0.0 | Phase 1 concern; design-system gate can use route-level `notFound` without waiting on proxy |
| Storybook for component catalogs | In-app route | Project decision D-03 | Zero extra design toolchain |
| Manual-only visual QA | Playwright `toHaveScreenshot` | Playwright built-in | Repeatable baselines |

**Deprecated/outdated:**
- Tailwind v3 JS config as primary token home — do not introduce for this greenfield app.
- Runtime `fonts.googleapis.com` links — replaced by `next/font` self-hosting.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | VCR OSD Mono commercial use is acceptable for this club event app based on DaFont “100% Free” + author comments | Fonts | If license is personal-only, must obtain permission or swap pixel face (visual delta) |
| A2 | Mirroring crewmate SVGs / logo from rc-nitw.org/freshers is authorized because this app is the same org’s Round 1 tool | Assets | If assets must stay hotlinked or replaced, plan an asset-permission step |
| A3 | Animation timings (pulse period, glow intensity) approximated from static screenshots are acceptable when marked | Discretion | May need live-site stopwatch/devtools tweak during execution |
| A4 | `data-size` + Tailwind variant selectors are sufficient without CVA | Standard Stack | If variants explode, add CVA later (npm-OK) |
| A5 | Live site already being “Project Skeld” means landing visual parity is primarily layout/chrome + CTA swap, not a full rebrand | Landing | If organizers change live site before event, refresh `design-reference/` |

## Open Questions

1. **Asset licensing / Among Us artwork**
   - What we know: Live site already ships crewmate SVGs and intro PNGs under `/freshers/among-us/`.
   - What's unclear: Whether Round 1 app should vendor copies or whether organizers want a reduced asset set.
   - Recommendation: Vendor the six crewmate SVGs + club logo used on marketing chrome; skip intro “Shhh” animation assets unless needed for landing fidelity. Flag for human confirm if legal sensitivity rises.

2. **How strict is “pixel-for-pixel” vs Skeld copy (D-01)?**
   - What we know: CONTEXT allows content changes; ROADMAP wording is stricter.
   - What's unclear: Acceptance threshold for full-page diff %.
   - Recommendation: Planner sets `maxDiffPixelRatio` ~0.01–0.02 on chrome-only tests; treat full-page as baseline of **our** landing, with human checklist vs `design-reference/`.

3. **Who creates `create-next-app` if Phase 1 and 2 start together?**
   - What we know: Both phases are greenfield/parallel.
   - What's unclear: Execution order in Cursor.
   - Recommendation: First phase to execute owns scaffold; second merges into it. Document ownership in both PLAN.md files identically.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js 16 | ✓ | v22.22.0 (≥20.9.0 required) | — |
| npm | installs | ✓ | 10.9.3 | — |
| Playwright CLI | visual tests | ✓ | 1.63.0 | — |
| Chromium (Playwright) | screenshots | ? | install via `npx playwright install chromium` | Must install in Wave 0 |
| ctx7 CLI | doc lookup | ✗ | — | WebFetch / official docs (used) |
| Live network to rc-nitw.org | font/asset spot-check | ✓ (verified this session) | — | Use `design-reference/` offline |
| App scaffold (`package.json`) | implementation | ✗ | — | Wave 0: create-next-app or wait for Phase 1 |
| PostgreSQL / Supabase | — | n/a | — | Not required for Phase 2 |

**Missing dependencies with no fallback:**
- Next.js app scaffold (must be created by Phase 1 or Phase 2 Wave 0 before component work)

**Missing dependencies with fallback:**
- Playwright Chromium browsers — install command above
- ctx7 — official docs WebFetch already used

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright Test `1.63.0` (visual + smoke); Vitest `5.0.2` (optional pure helpers) |
| Config file | `playwright.config.ts` (Wave 0 — does not exist yet); `vitest.config.ts` optional |
| Quick run command | `npx playwright test e2e/design-system.smoke.spec.ts e2e/components.visual.spec.ts` |
| Full suite command | `npx playwright test e2e/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-01 | Tokens exist in `@theme` and drive utilities (sample colors/fonts resolvable) | smoke + unit | `npx playwright test e2e/design-system.smoke.spec.ts`; optional `npx vitest run lib/design` | ❌ Wave 0 |
| DESIGN-02 | Landing layout/chrome matches baseline; Check In CTA present | visual + smoke | `npx playwright test e2e/landing.visual.spec.ts` | ❌ Wave 0 |
| DESIGN-03 | Style guide renders Panel, Card, Pill, Button, VotingMotif, TaskRail, HoldToReveal — no ad-hoc hex in components (manual/PR checklist + smoke) | smoke | `npx playwright test e2e/design-system.smoke.spec.ts` | ❌ Wave 0 |
| DESIGN-04 | Each core component has `size="projector"` preview; default is mobile-friendly viewport | visual | `npx playwright test e2e/components.visual.spec.ts` (viewport 390×844 + projector column shot) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx playwright test e2e/design-system.smoke.spec.ts`
- **Per wave merge:** `npx playwright test e2e/`
- **Phase gate:** Full Playwright visual suite green + human side-by-side vs `design-reference/` screenshots for hero, panels, voting motif, and CTA

### Wave 0 Gaps

- [ ] Next.js 16 app scaffold with Tailwind v4 CSS-first (`@import "tailwindcss"` + `@theme`) — if Phase 1 has not created it
- [ ] `playwright.config.ts` with `expect.toHaveScreenshot` defaults (`maxDiffPixelRatio`, `animations: "disabled"`)
- [ ] `e2e/landing.visual.spec.ts` — DESIGN-02
- [ ] `e2e/components.visual.spec.ts` — DESIGN-04
- [ ] `e2e/design-system.smoke.spec.ts` — DESIGN-01/03
- [ ] `npx playwright install chromium`
- [ ] Mirror assets: VCR font, six crewmate SVGs, club logo into `public/`
- [ ] Manual token sheet artifact (optional `lib/design/TOKEN-EXTRACTION.md` or comments in `globals.css`) listing picked hexes + which screenshot/devtools spot-check sourced them

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (stub CTA only) | — |
| V3 Session Management | no | — |
| V4 Access Control | partial | Dev-gate `/design-system` so it is not a public production surface (D-03) |
| V5 Input Validation | minimal | No mutating APIs this phase; link-only CTA |
| V6 Cryptography | no | — |
| V5 / XSS | yes | SEC-09: no `dangerouslySetInnerHTML` / `eval`; text via React children only |
| Supply chain | yes | Vendor fonts/assets deliberately; no random npm UI kits |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via HTML injection in marketing copy | Tampering | React text nodes only; no raw HTML |
| Production exposure of internal style guide | Information disclosure | `notFound()` when `NODE_ENV === "production"` unless explicit env override |
| Font/CDN supply-chain at runtime | Tampering | `next/font` build-time self-host; no Google runtime |
| Accidental secret in client bundle | Information disclosure | No secrets in this phase; still avoid `NEXT_PUBLIC_` for anything sensitive |

## Screenshot → Component Map (planner aid)

| Reference shot (mtime name) | Dominant UI | Components to extract |
|-----------------------------|-------------|------------------------|
| `Screenshot 2026-09-24 153551.png` | Hero, emergency banner, event date/time/venue cards, primary CTA | `EmergencyBanner`, `HeroTitle`, `InfoCard`, `Button` (primary glow), space background |
| `Screenshot 2026-09-24 153559.png` | Event Intel / Mission Briefing panel + 2×2 intel grid | `Panel` (amber border + label chip), `Card` grid |
| `Screenshot 2026-09-24 153607.png` | Mission Stages & Tasks two-column list + register terminal chrome | `TaskRail` (colored labels), `Panel`, form shells (non-functional) |
| `Screenshot 2026-09-24 153615.png` | Domed red Emergency Meeting button + WhatsApp/comms panel + status pill | `HoldToReveal` / round CTA, `StatusPill`, `Panel` |
| `Screenshot 2026-09-24 153622.png` | Security map X + center voting circle + room diamonds | `VotingMotif` (core DESIGN-03 reuse for Task 1 voting) |
| `Screenshot 2026-09-24 153636.png` | Communications / POC cards + Airlock CTA footer | `Card` (colored glow borders), `Button`, footer `Panel` |

**PROJECT.md reuse mapping (must be expressible from this library):**
- Voting → security-map center circle + crewmate-colored cards
- Word reveal → amber panel + hold-to-reveal round button
- Leaderboard → amber panel + ranked bordered cards (gold/silver/bronze accents as tokens)
- Task rail → mission-stages colored labels + status pills
- Admin → same panels only

## Sources

### Primary (HIGH confidence)

- Live site HTML/CSS: `https://rc-nitw.org/freshers` + `/_next/static/chunks/*.css` (2026-09-25) — fonts (`Orbitron`, `Rajdhani`, `Bangers`, `JetBrains Mono`, `VCR OSD Mono`), asset paths, color samples
- Tailwind theme docs: https://tailwindcss.com/docs/theme — `@theme` namespaces
- Tailwind v4 announcement: https://tailwindcss.com/blog/tailwindcss-v4 — CSS-first config
- Next.js fonts: https://nextjs.org/docs/app/getting-started/fonts — `next/font/google` / local self-host
- Playwright snapshots: https://playwright.dev/docs/test-snapshots — `toHaveScreenshot`
- npm registry (`npm view`, 2026-09-25): next, tailwindcss, @tailwindcss/postcss, @playwright/test, vitest, clsx
- Google Fonts specimens: Orbitron, Rajdhani, Bangers, JetBrains Mono
- Phase CONTEXT / REQUIREMENTS / ROADMAP / PROJECT.md Design section / STACK.md (project research)

### Secondary (MEDIUM confidence)

- DaFont VCR OSD Mono page + author commercial-use comments — license posture
- Community Next.js + Playwright visual testing writeups — masking/animations patterns (cross-checked with official Playwright options)

### Tertiary (LOW confidence)

- Exact glow blur radii / animation durations from static PNGs — approximate during implementation and spot-check on live site

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified on npm; Tailwind/Next patterns from official docs
- Architecture: HIGH — maps cleanly to locked D-01…D-07 and greenfield parallel Phase 1
- Fonts/assets inventory: HIGH — taken from live CSS/HTML
- Exact token hex matrix: MEDIUM — samples from CSS + screenshots; full picker pass remains an execution task (D-05)
- Pitfalls: HIGH — parallel scaffold, visual flake, and copy-vs-pixel conflicts are concrete

**Research date:** 2026-09-25  
**Valid until:** ~2026-10-25 (stack stable); refresh if rc-nitw.org/freshers redesigns before the event
