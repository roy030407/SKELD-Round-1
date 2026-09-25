# Phase 1: Foundation, Data Model, Registration & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-25
**Phase:** 01-foundation-data-model-registration-auth
**Areas discussed:** Staff login mechanism, Mock adapter fixture realism, CSV adapter format, Walking Skeleton
**Note:** Discussion started in Claude Code (`skeld-phase1-foundation`) and was interrupted when org disabled Claude Code subscription access. Completed/recovered in Cursor (`Skeld Task 1`) from screenshots + captured summary.

---

## Staff Login Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Seeded staff accounts (username + password) | Separate staff credentials per role; same sessions table pattern as players | ✓ (Recommended / You decide) |
| Shared staff invite codes | Single code per role pasted at a staff login screen | |
| Reuse player-code flow with special staff rows | Treat staff as fake "players" with roll numbers | |

**User's choice:** You decide (Recommended) → seeded staff accounts
**Notes:** Staff are not players and have no roll numbers. Three roles in scope for staff auth: monitor, admin, display.

---

## Mock Adapter Fixture Realism

| Option | Description | Selected |
|--------|-------------|----------|
| ~25×6 realistic fixtures | Plausible teams/players/roll numbers for load-like local testing | ✓ |
| Tiny toy fixtures (2–3 teams) | Minimal data for unit tests only | |
| Generate fixtures procedurally at seed time | No checked-in fixture file; generate on demand | |

**User's choice:** ~25×6 realistic mock fixtures (captured in Claude Code summary)
**Notes:** Must support later shuffle/gating tests without rewriting seed data.

---

## CSV Adapter Format

| Option | Description | Selected |
|--------|-------------|----------|
| Claude-defined schema | Columns defined during planning to match adapter fields; documented with sample | ✓ |
| Match an existing official export format | Wait for organizers' CSV shape | |
| JSON-lines instead of CSV | Alternate fallback format | |

**User's choice:** Claude-defined CSV schema (captured in Claude Code summary)
**Notes:** Event-day fallback; same interface as mock (REG-03/REG-04).

---

## Walking Skeleton

| Option | Description | Selected |
|--------|-------------|----------|
| login → role-appropriate page | Minimal stubs per role proving auth + RBAC end-to-end | ✓ |
| Schema + adapters only (no UI path) | Backend-only foundation; UI deferred entirely | |
| Full check-in UI in Phase 1 | Expand skeleton into Phase 4 check-in work | |

**User's choice:** login → role-appropriate page (captured in Claude Code summary)
**Notes:** Walking Skeleton / MVP mode per ROADMAP. Security baseline still applies to everything touched.

---

## Areas Not Discussed (left to Claude's discretion / research)

- Exact staff vs users table modeling
- Exact CSV column names
- Display auth: password vs long-lived display code (must still use sessions + role checks)
- Stub route naming

---

*Phase: 01-foundation-data-model-registration-auth*
*Discussion recovered: 2026-09-25*
