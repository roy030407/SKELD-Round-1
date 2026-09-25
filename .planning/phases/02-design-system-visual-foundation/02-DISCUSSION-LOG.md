# Phase 2: Design System & Visual Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-24
**Phase:** 2-design-system-visual-foundation
**Areas discussed:** Landing page content strategy, Component documentation format, Component completeness (voting motif/task rail), Token extraction rigor, Landing content scope, Font loading, Projector variant mechanism

---

## Landing Page Content Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Same visual system, Skeld-specific copy | Reuse layout/spacing/colors/fonts/animations/structure exactly, replace copy with Project Skeld content | ✓ |
| Literal 1:1 clone first, adapt copy later | Reproduce recruitment page content verbatim now, swap copy in a later phase | |
| Hybrid — some sections literal, some replaced | User specifies per-section which stay literal vs. get replaced | |

**User's choice:** Same visual system, Skeld-specific copy (Recommended)
**Notes:** Confirms this is not a literal content clone — visual system is the ground truth, copy is Skeld-specific.

---

## Component Documentation Format

| Option | Description | Selected |
|--------|-------------|----------|
| In-app style guide route | A `/design-system` route inside the Next.js app renders every component/variant live; no new dependency | ✓ |
| Storybook | Dedicated Storybook instance; more tooling setup, new devDependency | |
| Markdown doc + code comments only | DESIGN-SYSTEM.md with snippets; no live-rendered showcase | |

**User's choice:** In-app style guide route (Recommended)
**Notes:** Avoids adding Storybook as a new dependency; keeps the showcase inside the shipped app (dev-gated).

---

## Component Completeness (Voting Motif & Task Rail)

| Option | Description | Selected |
|--------|-------------|----------|
| Visual shells only | Static structure/styling with variant props; no interaction states or animations yet | |
| Include interactive states now | Hover/pressed/selected/loading states and CSS animations (hold-to-reveal, pulse effects) built now | ✓ |

**User's choice:** Include interactive states now
**Notes:** Interactivity here means visual/interaction-state completeness only — not real data-wiring to Phase 4/5 game logic.

---

## Token Extraction Rigor

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright computed-style script | Script loads the live site, dumps computed CSS to JSON/text, cross-checked against screenshots | |
| Manual extraction from screenshots + spot checks | Eyeball values from screenshots (color picker), spot-check a few against live devtools | ✓ |

**User's choice:** Manual extraction from screenshots + spot checks
**Notes:** Playwright still used later for pixel-comparison verification of the final landing page, just not for the token-extraction step itself.

---

## Landing Page Content Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Event essentials + single CTA | Hero: title, tagline, event details, one CTA ("Check In"); other sections minimal/structural placeholders | ✓ |
| Full section-by-section replacement | Every reference section gets a Skeld-equivalent (About, How it works, Team info, FAQ) | |
| I'll specify exact copy now | User dictates exact headline/tagline/section copy | |

**User's choice:** Event essentials + single CTA (Recommended)
**Notes:** Keeps scope tight — avoids inventing elaborate new content sections beyond the reference structure's existing slots.

---

## Font Loading

| Option | Description | Selected |
|--------|-------------|----------|
| next/font/google if available | Identify actual font families; use next/font/google if on Google Fonts — self-hosted, no third-party runtime request | ✓ |
| next/font/local with downloaded files | For custom/licensed fonts not on Google Fonts | |
| Decide once inspected | Let research/planning inspect the site first | |

**User's choice:** next/font/google if the fonts are on Google Fonts (Recommended)
**Notes:** Falls back to next/font/local if the actual fonts turn out not to be on Google Fonts — font identification happens during research.

---

## Projector Variant Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit size prop/variant per component | e.g. `size="projector"` swaps to larger type scale/spacing tokens | ✓ |
| Responsive breakpoint | Custom large-viewport Tailwind breakpoint auto-applies larger-format styles | |

**User's choice:** Explicit size prop/variant per component (Recommended)
**Notes:** Predictable and independently previewable in the `/design-system` route regardless of actual screen size.

---

## Claude's Discretion

- Exact Tailwind v4 `@theme` token naming/structure
- Exact component API/props shape for the base library
- Precise animation timing/easing values not measurable from static screenshots
- File/folder organization for components and design tokens

## Deferred Ideas

- Playwright-based automated computed-style extraction tooling (deferred in favor of manual extraction; revisit if manual proves too imprecise)
- Full section-by-section content rewrite of the landing page (only event essentials + CTA required)
- Real data-wiring of voting motif/task rail to live game/task state (belongs to Phase 5 / Phase 4)
