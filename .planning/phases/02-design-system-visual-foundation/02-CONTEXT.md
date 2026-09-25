# Phase 2: Design System & Visual Foundation - Context

**Gathered:** 2026-09-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract the exact visual identity of rc-nitw.org/freshers (the Robotics Club NIT Warangal general freshers recruitment page) into a reusable, centralized design-token system (colors, fonts, spacing, animations) plus a base component library (panels, cards, status pills, buttons, the security-map voting motif, mission-stage task rail), and reproduce the landing/marketing surface pixel-for-pixel in visual system while adapting content to Project Skeld's Round 1 event. Ground truth: the six reference screenshots in `design-reference/` plus Playwright-inspected computed styles from the live site. This phase does not implement any game logic, scoring, or backend — it produces the visual foundation every later screen (login, task rail, voting, word reveal, results, leaderboard, admin, projector) will build from without introducing new colors or fonts.

</domain>

<decisions>
## Implementation Decisions

### Landing Page Content Strategy
- **D-01:** Reuse the reference site's exact visual system (layout, spacing, colors, fonts, animations, section structure) but replace copy with Project Skeld-specific content — this is NOT a literal 1:1 content clone.
- **D-02:** Minimum landing page content: "Project Skeld" title/hero, tagline, event essentials (26 September, 5 PM, NAB), and a single primary CTA button ("Check In" → routes toward the login/check-in flow, which is out of scope for this phase but the CTA target should be a stubbed/placeholder route). Other sections from the reference (about, footer, etc.) can stay structurally present using the same visual language, filled with minimal/placeholder Skeld-relevant content rather than fully rewritten section-by-section — do not invent elaborate new copy/content sections beyond what the reference page's structure already has slots for.

### Component Library Documentation
- **D-03:** Document the component library via an in-app style guide route (e.g. `/design-system`) inside the Next.js app itself, rendering every component and its variants live. No new external tool/dependency (no Storybook). This route should be excluded from production visibility (e.g. gated behind a dev-only check or `NODE_ENV !== 'production'`) since it's an internal reference, not a public part of the app.

### Component Completeness (Voting Motif & Task Rail)
- **D-04:** Build the security-map "EMERGENCY MEETING" voting motif and mission-stage task rail with full interactive states now, not just static visual shells — hover/pressed/selected/loading states and CSS animations (e.g. the hold-to-reveal round button for word reveal per PROJECT.md's reuse mapping, pulse/glow effects) should be implemented in this phase. These components will NOT be wired to real data or game logic yet (no live votes, no real task state) — interactivity here means visual/interaction-state completeness (CSS states, Storybook-style prop-driven variants), not functional wiring to Phase 4/5 backend logic.

### Token Extraction Method
- **D-05:** Use manual extraction: pick colors/fonts/spacing values from the six reference screenshots (e.g. using a color picker on the images) and spot-check a handful of values against the live site's browser devtools computed styles. Do NOT build a dedicated Playwright extraction script that dumps computed CSS automatically — that's more tooling than this phase needs. Playwright is still used for pixel-comparison verification of the final landing page against the reference screenshots (per ROADMAP.md's "Playwright-verify against the live site"), just not for the token-extraction step itself.

### Font Loading
- **D-06:** Identify the actual font families used by rc-nitw.org/freshers (inspect screenshots and/or live site). If they are available on Google Fonts, load them via `next/font/google` (self-hosted by Next.js at build time, no external runtime request, no new third-party service). If the fonts turn out to be custom/licensed and not on Google Fonts, fall back to `next/font/local` with sourced font files, respecting licensing. Font identification happens during research/planning, not decided further here.

### Projector Variant Mechanism
- **D-07:** Implement the "larger-format projector variant" as an explicit size prop/variant on each component (e.g. `size="projector"` or equivalent), not a responsive breakpoint. This makes the projector variant predictable and independently previewable in the `/design-system` style guide route regardless of actual viewport width, and matches DESIGN-04's framing of it as "a variant of the same components" rather than a separate responsive breakpoint.

### Claude's Discretion
- Exact Tailwind v4 `@theme` token naming/structure (per CLAUDE.md's tech stack guidance: CSS-first config, tokens as literal CSS custom properties).
- Exact component API/props shape for the base library (panel, card, status pill, button variants) — follow standard reusable-component conventions.
- Precise animation timing/easing values not visible/measurable from screenshots — approximate reasonably and note as approximation if exactness can't be derived from static images.
- File/folder organization for components and design tokens within the Next.js app structure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Ground Truth
- `design-reference/` — six reference screenshots from rc-nitw.org/freshers (ground truth for pixel-accurate extraction); also verify against the live site directly via Playwright per ROADMAP.md
- `.planning/PROJECT.md` §Requirements → "Design" — exact reuse mapping: voting screen reuses security-map center-circle "EMERGENCY MEETING" motif with one crewmate card per tablemate in game color; word reveal uses an amber panel with a hold-to-reveal round button; leaderboard uses amber panel with ranked bordered cards, gold/silver/bronze accents for top 3; task rail uses mission-stages colored-label list with status pills; admin reuses same panels/components with no new colors

### Requirements
- `.planning/REQUIREMENTS.md` (DESIGN-01 through DESIGN-04, lines ~108-111) — full requirement text for design token extraction, landing reproduction, cross-screen reuse, and mobile-first/projector-variant requirements

### Tech Stack & Project Constraints
- `CLAUDE.md` (project root) — fixed tech stack (Next.js 16 App Router, TypeScript strict, Tailwind v4 CSS-first `@theme` config, Drizzle, zod); "Design fidelity" constraint (no creative reinterpretation, verified against screenshots and computed styles); Tailwind v4 CSS-first config pattern details

### Roadmap
- `.planning/ROADMAP.md` §Phase 2 — goal, success criteria, and this phase's dependency-free "parallel track" status relative to Phase 1

</canonical_refs>

<code_context>
## Existing Code Insights

This is a greenfield project — no application source code exists yet (only `.planning/` docs and `design-reference/` screenshots). No reusable assets, established patterns, or integration points to inventory. Phase 2 establishes the design-token and component foundation from scratch; Phase 8 (Display/Projector) is the only other phase that explicitly depends on Phase 2's output.

</code_context>

<specifics>
## Specific Ideas

- Landing page CTA should target "Check In" language, matching the app's actual entry flow (Phase 1's auth), even though that flow isn't built in this phase.
- The `/design-system` style guide route must render every component variant live (not just document them in markdown) so later phases can visually verify reuse.
- Hold-to-reveal round button (word reveal), pulse/glow effects, and other interaction states for the voting motif and task rail are explicitly in scope now, ahead of their real data-wiring in Phase 4/5.

</specifics>

<deferred>
## Deferred Ideas

- Playwright-based automated computed-style extraction tooling — considered and explicitly deferred in favor of manual extraction (see D-05); could be revisited if manual extraction proves too imprecise during execution.
- Full section-by-section content rewrite of the landing page (about/FAQ/team sections) — deferred; only event essentials + CTA are required content, per D-02.
- Real data-wiring of the voting motif and task rail to live game/task state — belongs to Phase 5 (Task 1 engine) and Phase 4 (Check-in & Task Gating) respectively.

None — discussion stayed within phase scope otherwise.

</deferred>

---

*Phase: 2-design-system-visual-foundation*
*Context gathered: 2026-09-24*
