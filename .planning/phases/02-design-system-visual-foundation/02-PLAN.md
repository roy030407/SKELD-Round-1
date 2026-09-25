# Phase 2: Design System & Visual Foundation — Execution Plan

**Phase:** 02-design-system-visual-foundation
**Status:** Ready to execute
**Mode:** MVP (parallel track to Phase 1)
**Branch:** phase/2-design
**Planned:** 2026-09-25

---

## Goal

Extract the exact visual identity of `rc-nitw.org/freshers` into a reusable Tailwind v4 `@theme` token system and React component library, reproduce the landing page with Skeld-specific copy, build a dev-gated `/design-system` style guide, and implement the security-map voting motif + mission-stage task rail with full interactive CSS states — all without touching any game logic.

---

## Pre-flight: App Scaffold Ownership

> **IMPORTANT:** Phase 1 and Phase 2 run in parallel on separate git branches. The scaffold (`package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`) must be created exactly once. Coordinate as follows:
> - If Phase 1 runs first → Phase 2 merges the scaffold and adds design files on top
> - If Phase 2 runs first → create scaffold here, leave `app/(auth)`, `app/api`, `lib/db` empty for Phase 1
> - File ownership: Phase 2 owns `app/globals.css`, `components/`, `app/page.tsx`, `app/design-system/`, `public/fonts/`, `public/among-us/`, `e2e/`
> - Phase 1 owns `proxy.ts`, `lib/`, `app/(auth)/`, `app/(player)/`, etc.

---

## Waves

### Wave 0: Scaffold, Fonts & Static Assets
*Establishes the visual foundation before any components are built.*

**Tasks:**

**W0-T1 — App scaffold (if not already from Phase 1)**
```bash
npx create-next-app@16.3.6 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack
```
- If Phase 1 already ran this: skip; just ensure we're on the correct branch

**W0-T2 — Install design dependencies**
```bash
npm install clsx                          # conditional class joining (optional but clean)
npm install -D @playwright/test vitest @vitejs/plugin-react
npx playwright install chromium
```

**W0-T3 — Mirror static assets into `public/`**

Download from `rc-nitw.org/freshers` (already authorized — same org's app):
- `public/fonts/VCR_OSD_MONO_1.001.ttf` ← `/VCR_OSD_MONO_1.001.ttf`
- `public/fonts/README.md` ← document DaFont "100% Free" license + author credit
- `public/among-us/red.svg`, `blue.svg`, `cyan.svg`, `yellow.svg`, `green.svg`, `purple.svg` ← `/freshers/among-us/crewmates/{color}.svg` (6 colors)
- `public/branding/robotics-club-nitw.png` ← club logo
- Reference the 6 design screenshots already present in `design-reference/`

**W0-T4 — Root layout with fonts (`app/layout.tsx`)**
```tsx
import { Orbitron, Rajdhani, Bangers, JetBrains_Mono } from "next/font/google"
import localFont from "next/font/local"
import "./globals.css"

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" })
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-rajdhani" })
const bangers = Bangers({ subsets: ["latin"], weight: "400", variable: "--font-bangers" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })
const vcr = localFont({
  src: "../public/fonts/VCR_OSD_MONO_1.001.ttf",
  variable: "--font-vcr",
  display: "swap",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${bangers.variable} ${jetbrains.variable} ${vcr.variable}`}>
      <body className="bg-skeld-void text-white antialiased font-rajdhani">{children}</body>
    </html>
  )
}
```

**W0-T5 — Design tokens in `app/globals.css`**

Manual extraction from `design-reference/` screenshots + live-site devtools spot-check (D-05):
```css
@import "tailwindcss";

@theme {
  /* Fonts (CSS vars injected by layout.tsx) */
  --font-orbitron: var(--font-orbitron), ui-sans-serif;
  --font-rajdhani: var(--font-rajdhani), ui-sans-serif;
  --font-bangers: var(--font-bangers), cursive;
  --font-mono: var(--font-jetbrains), ui-monospace;
  --font-pixel: var(--font-vcr), "Courier New", monospace;

  /* Colors — extract from screenshots; spot-check against live CSS */
  --color-skeld-void: #05070a;       /* deep space background */
  --color-skeld-panel: #0a1628;      /* amber panel dark base */
  --color-skeld-amber: #f59e0b;      /* amber border / primary accent */
  --color-skeld-amber-dim: #b45309;  /* dimmed amber for borders */
  --color-skeld-red: #dc2626;        /* imposter red */
  --color-skeld-glow-red: #ff4d4d;   /* glowing red button halo */
  --color-skeld-cyan: #22d3ee;       /* crewmate cyan accent */
  --color-skeld-green: #16a34a;      /* success / safe states */
  --color-skeld-gold: #fbbf24;       /* leaderboard gold */
  --color-skeld-silver: #94a3b8;     /* leaderboard silver */
  --color-skeld-bronze: #b45309;     /* leaderboard bronze */

  /* Projector scale multipliers */
  --scale-projector: 1.5;

  /* Radii */
  --radius-panel: 1rem;
  --radius-pill: 9999px;

  /* Shadows / glows */
  --shadow-glow-red: 0 0 24px color-mix(in oklab, var(--color-skeld-glow-red) 60%, transparent);
  --shadow-glow-amber: 0 0 16px color-mix(in oklab, var(--color-skeld-amber) 50%, transparent);
  --shadow-glow-cyan: 0 0 16px color-mix(in oklab, var(--color-skeld-cyan) 50%, transparent);
}

/* Space background grain texture */
body {
  background-image: radial-gradient(ellipse at center, #0a1628 0%, #05070a 70%);
  min-height: 100svh;
}

/* Keyframe animations */
@keyframes pulse-glow {
  0%, 100% { box-shadow: var(--shadow-glow-red); opacity: 1; }
  50% { box-shadow: 0 0 40px color-mix(in oklab, var(--color-skeld-glow-red) 80%, transparent); opacity: 0.85; }
}

@keyframes float-crew {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}

@keyframes spin-ring {
  from { stroke-dashoffset: 283; }
  to { stroke-dashoffset: 0; }
}
```

> **Note on token values:** The hex values above are best-effort samples from screenshot color-picking. During execution, run a color picker over `design-reference/*.png` and spot-check 3-5 values against `rc-nitw.org/freshers` devtools → update values as needed. Document each source in a comment inline.

**W0-T6 — Playwright config (`playwright.config.ts`)**
```typescript
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  projects: [{ name: "chromium", use: { viewport: { width: 390, height: 844 } } }],
})
```

**Success check:** `npm run dev` starts; fonts load (no FOUT); background is deep space dark; `npx playwright install chromium` succeeds.

---

### Wave 1: Base Component Library
*Every reusable primitive. No game logic — only visual completeness.*

**Tasks:**

**W1-T1 — Size type (`lib/design/sizes.ts`)**
```typescript
export type Size = "default" | "projector"
```

**W1-T2 — `Panel` component (`components/ui/panel.tsx`)**
```tsx
// Amber-bordered dark panel — used for Mission Briefing, leaderboard, word reveal, admin surfaces
// Props: size, variant ("default"|"amber"|"red"), className, children
// data-size drives projector variants via Tailwind data-* selectors
```
- `default`: `rounded-[var(--radius-panel)] border border-skeld-amber/80 bg-skeld-panel/90 p-4`
- `projector`: `data-[size=projector]:p-8 data-[size=projector]:text-xl`
- Amber/red variants adjust border color

**W1-T3 — `Button` component (`components/ui/button.tsx`)**
- Variants: `primary` (amber glow), `danger` (red glow), `ghost`
- States: default, hover (glow intensifies), active/pressed (scale 0.97), disabled (opacity-50)
- `size` prop: default vs projector (larger text + padding)
- `data-size=projector` Tailwind variant for all projector overrides

**W1-T4 — `StatusPill` component (`components/ui/status-pill.tsx`)**
- Variants: `open`, `waiting`, `closed`, `complete` — colored text + border (no background)
- Rounded-full; `size` prop scales text/padding

**W1-T5 — `Card` component (`components/ui/card.tsx`)**
- Bordered card with optional color accent (crewmate color or gold/silver/bronze)
- `size` prop
- `accent` prop: `"red" | "blue" | "cyan" | "yellow" | "green" | "purple" | "gold" | "silver" | "bronze" | null`
- Used for leaderboard rows, intel grid, comms cards

**W1-T6 — `EmergencyBanner` component (`components/ui/emergency-banner.tsx`)**
- The red "EMERGENCY MEETING" style banner text with glow
- Font: `font-bangers tracking-widest text-skeld-glow-red`
- `pulse-glow` CSS animation on the text shadow

**W1-T7 — `HeroTitle` component (`components/ui/hero-title.tsx`)**
- Large Orbitron heading + Rajdhani subtitle pattern
- Used for page titles, section headers

**W1-T8 — `InfoCard` component (`components/ui/info-card.tsx`)**
- Compact card for event stats (date / time / venue)
- Icon + label + value layout; amber accent border

**Success check:** All components render in isolation without errors; `npm run build` passes.

---

### Wave 2: Interactive Components — Voting Motif & Task Rail
*The two complex components explicitly required by D-04 with full interactive CSS states.*

**Tasks:**

**W2-T1 — `VotingMotif` component (`components/ui/voting-motif.tsx`)**
Based on `Screenshot 2026-09-24 153622.png` (security map X + center voting circle + room diamonds):
- Center circle: large round element with "EMERGENCY MEETING" text in VCR font
- Surrounding: up to 6 crewmate-colored diamond/card slots (one per tablemate)
- CSS states per card:
  - `idle`: dim border, opacity 0.7
  - `voted`: bright crewmate-color border + glow
  - `eliminated`: reduced opacity + strikethrough label
  - `you`: highlighted with "YOU" badge
- `size` prop: default (mobile) → projector (larger circle + cards)
- `data-testid="voting-motif"` for Playwright
- Props: `players: Array<{ id, name, color, hasVoted, isEliminated, isYou }>`; not wired to real votes

**W2-T2 — `TaskRail` component (`components/ui/task-rail.tsx`)**
Based on `Screenshot 2026-09-24 153607.png` (mission stages colored-label list):
- Vertical list of tasks: Task 1, Task 2, Task 3, Task 4
- Each task: colored left-border label chip + task name + `StatusPill`
- Color coding: Task 1 = red, Task 2 = cyan, Task 3 = green, Task 4 = amber
- CSS states per task:
  - `locked`: gray text, `StatusPill` "locked"
  - `open`: full color, glowing left border
  - `in-progress`: color + pulsing indicator dot
  - `complete`: muted color + `StatusPill` "complete" + checkmark
- `size` prop
- Props: `tasks: Array<{ number, name, status: 'locked'|'open'|'in-progress'|'complete' }>`
- `data-testid="task-rail"` for Playwright

**W2-T3 — `HoldToReveal` component (`components/ui/hold-to-reveal-button.tsx`)**
Based on `Screenshot 2026-09-24 153615.png` (domed red button):
- **Client component** (`"use client"`)
- Large round button; hold pointer-down to fill a circular SVG progress ring
- States: `idle` (static), `holding` (ring animates via `spin-ring` keyframe), `revealed` (shows content slot), `released-early` (resets)
- Amber panel wrapper; content revealed is a slot (`children`) — not wired to any actual word
- `duration`: configurable prop (default 2000ms, matches "hold to reveal" UX)
- `data-testid="hold-to-reveal"` for Playwright

**W2-T4 — Nav pill (`components/ui/nav-pill.tsx`)**
- Small rounded pill for navigation items; `active` state; Rajdhani font

**Success check:** Interactive components render; holding `HoldToReveal` shows the ring animation; VotingMotif displays crewmate colors; TaskRail shows correct status styles.

---

### Wave 3: Landing Page
*The public-facing marketing page. Skeld content, rc-nitw.org visual system.*

**Tasks:**

**W3-T1 — Landing page (`app/page.tsx`)**

Sections (matching reference structure from screenshots, Skeld content per D-01/D-02):

1. **Hero section** (`Screenshot 153551.png`):
   - Space background with subtle crewmate float animation
   - `EmergencyBanner` with "PROJECT SKELD" or "ROUND 1: AMONG US"
   - `HeroTitle`: "Project Skeld" (Orbitron) / "Round 1 Recruitment Event" (Rajdhani)
   - Event essentials: 26 September · 5 PM · NAB
   - Primary CTA: `<Button variant="primary" size="default">Check In</Button>` → `<Link href="/check-in">` (stub route)
   - 3-4 floating crewmate SVGs with `animate-[float-crew_3s_ease-in-out_infinite]`, `data-testid="crewmate"`

2. **Event Intel / Mission Briefing** (`Screenshot 153559.png`):
   - `Panel` with amber label chip "MISSION BRIEFING"
   - 2×2 `InfoCard` grid: EVENT TYPE, TEAMS, TASKS, VENUE
   - Content: Among Us-themed descriptions of Round 1 format

3. **Mission Stages** (`Screenshot 153607.png`):
   - `TaskRail` rendered in landing context with all-`locked` status (visual only)
   - Brief description per task (imposter game, cipher, bomb defusal, kahoot)

4. **Check In CTA** (`Screenshot 153615.png`):
   - Large `HoldToReveal`-style red CTA section
   - WhatsApp/comms panel stub with `StatusPill`

5. **Communications / POC** (`Screenshot 153636.png`):
   - `Card` grid for contact info (placeholder names/roles)
   - Footer with club logo + "ROBOTICS CLUB NIT WARANGAL"

**W3-T2 — Stub `/check-in` route (CTA target)**
- `app/check-in/page.tsx` — renders "CHECK-IN COMING SOON — login flow is Phase 1"
- Will be replaced when Phase 1 auth is merged

**W3-T3 — Mobile-first layout verification**
- All sections: single-column on 390px viewport, grid/columns on tablet+
- Test by resizing browser; `npx playwright test e2e/landing.visual.spec.ts` at 390×844

**Success check:** Landing page renders all sections; fonts correct; crewmate float visible; "Check In" CTA present; mobile viewport looks right.

---

### Wave 4: `/design-system` Style Guide
*The living documentation route — every component + all variants rendered live.*

**Tasks:**

**W4-T1 — Design system page (`app/design-system/page.tsx`)**

Dev-gate:
```tsx
import { notFound } from "next/navigation"
if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_SYSTEM !== "1") {
  notFound()
}
```

Sections (rendered live):
1. **Typography** — all font families at various weights/sizes (Orbitron, Rajdhani, Bangers, JetBrains Mono, VCR OSD Mono)
2. **Color palette** — all `skeld-*` tokens as swatches with hex labels
3. **Buttons** — all variants (primary, danger, ghost) × sizes (default, projector) × states (normal, hover, active, disabled)
4. **Panels** — default, amber, red variants × sizes
5. **Cards** — all accent colors × sizes
6. **Status Pills** — all statuses × sizes
7. **Task Rail** — default size / projector size side-by-side, demo with one task per status
8. **Voting Motif** — 6-player demo with various states (voted, eliminated, you) × sizes
9. **Hold-To-Reveal** — interactive demo × sizes
10. **Emergency Banner** — live glow animation

Each section: `<h2 className="font-orbitron text-sm uppercase text-skeld-amber">` heading + component grid with `size="default"` and `size="projector"` columns side by side.

**W4-T2 — Token extraction log (`app/globals.css` or `lib/design/TOKEN-EXTRACTION.md`)**
- For each extracted token: source (which screenshot filename or devtools spot-check), extracted value
- Example comment in `globals.css`:
  ```css
  /* --color-skeld-void: #05070a — from Screenshot 153551, background, devtools confirmed */
  ```

**Success check:** `GET /design-system` in dev renders all components; production returns 404.

---

### Wave 5: Playwright Visual Tests
*Locks the visual baseline so later phases don't accidentally drift.*

**Tasks:**

**W5-T1 — Design system smoke test (`e2e/design-system.smoke.spec.ts`)**
```typescript
test("renders core components", async ({ page }) => {
  test.skip(process.env.NODE_ENV === "production")
  await page.goto("/design-system")
  await expect(page.getByText(/Panel/i)).toBeVisible()
  await expect(page.getByText(/Voting/i)).toBeVisible()
  await expect(page.getByText(/Task Rail/i)).toBeVisible()
  await expect(page.getByText(/Hold to Reveal/i)).toBeVisible()
})
```

**W5-T2 — Component visual baselines (`e2e/components.visual.spec.ts`)**
```typescript
test("Panel default and projector", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/design-system")
  const section = page.locator("[data-testid=panel-section]")
  await expect(section).toHaveScreenshot("panel-variants.png")
})
// Similar for Button, TaskRail, VotingMotif, HoldToReveal
```
- Use `animations: "disabled"` (from playwright config)
- Mask `.crewmate` elements for landing test

**W5-T3 — Landing visual baseline (`e2e/landing.visual.spec.ts`)**
```typescript
test("hero matches baseline", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await expect(page).toHaveScreenshot("landing-full.png", {
    fullPage: true,
    mask: [page.locator("[data-testid=crewmate]")],
  })
})
test("Check In CTA is visible", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("link", { name: /check in/i })).toBeVisible()
})
```

**W5-T4 — Generate baselines**
- `npx playwright test --update-snapshots` on first run to commit baseline PNGs
- Subsequent runs: `npx playwright test` must pass without `--update-snapshots`

**Success check:** `npx playwright test e2e/` — all tests pass. No new colors/fonts introduced outside `globals.css`.

---

## Success Criteria Mapping

| Criterion | Wave | Test |
|-----------|------|------|
| Design tokens centralized in `@theme`; all other code imports from there | W0-T5 | W5 style guide smoke |
| Landing page visually matches reference screenshots | W3 | W5-T3 + manual side-by-side |
| Component library exists with panel, card, pill, button, voting motif, task rail | W1+W2 | W5-T1 + W5-T2 |
| Components render mobile-first; projector variant via `size` prop | W1+W2 | W5-T2 (390×844 + projector column) |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phase 1 scaffold conflict on `app/layout.tsx` | Medium | Merge pain | Establish file ownership before parallel execution; Phase 2 creates layout; Phase 1 adds auth routes only |
| VCR OSD Mono license uncertainty | Low | Visual fallback | DaFont marks "100% Free"; document in `public/fonts/README.md`; worst case swap for another pixel font |
| Live site `rc-nitw.org/freshers` changes before event | Low | Token drift | Ground truth is `design-reference/` screenshots; only spot-check live; don't depend on live site for baselines |
| Playwright screenshot flakes from animations | Medium | CI noise | `animations: "disabled"` in playwright config + `reducedMotion: "reduce"` in tests; mask crewmate elements |
| Token hex values off from screenshots | Medium | Visual mismatch | Mark all approximate values with `/* APPROXIMATE */` comment; do color-picker pass during W0-T5 execution |

---

## Dependencies

- Phase 1 (Foundation): Parallel — Phase 2 must not implement any auth, session, or game logic
- Phase 8 (Display/Projector): Depends on Phase 2's design tokens and components being present in main

---

## Plan Verification

Before executing, verify:
- [ ] `design-reference/` contains 6 screenshots (confirmed: ✓)
- [ ] Network access to `rc-nitw.org/freshers` for asset download + spot-check (confirmed: ✓ during research)
- [ ] Node.js v22.22.0 available (confirmed: ✓)
- [ ] Playwright CLI available (confirmed: v1.63.0 ✓)
- [ ] Coordination with Phase 1 on scaffold ownership established

---

*Plan created: 2026-09-25*
*Phase: 02-design-system-visual-foundation*
*Status: Ready to execute on phase/2-design branch*
