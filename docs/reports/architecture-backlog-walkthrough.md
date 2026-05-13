# WOD Wiki Architecture Backlog Walkthrough

**Parent backlog:** [WOD-213](paperclip://issues/WOD-213) — WOD Wiki architecture improvement backlog  
**Purpose:** Give a practical walkthrough of each ticket in the architecture backlog, including why it matters, what it improves, what to watch out for during refactoring, and where to capture feedback on what was already fixed.

---

## Feedback: what has already been fixed?

Use this section to feed back which items are already addressed in the repo, partially addressed, or still open.

| Ticket | Current impression | Notes |
|---|---|---|
| WOD-214 | ☐ already fixed / ☐ partial / ☐ open | runtime-test-bench audit or rewire |
| WOD-216 | ☐ already fixed / ☐ partial / ☐ open | components fan-out reduction |
| WOD-219 | ☐ already fixed / ☐ partial / ☐ open | duplicate core/runtime types |
| WOD-221 | ☐ already fixed / ☐ partial / ☐ open | barrel export cleanup |
| WOD-222 | ☐ already fixed / ☐ partial / ☐ open | Storybook dependency hygiene |
| WOD-223 | ☐ already fixed / ☐ partial / ☐ open | architecture regression guardrails |

If you already know a ticket is fixed, add the proof here before doing more refactoring:
- file(s) changed
- commit / branch reference if available
- what behavior or structure is now different
- whether any follow-up cleanup is still needed

---

## How to use this document

Treat each ticket as an incremental architecture move, not a rewrite. The goal is to reduce coupling, cut dead surface area, and make the codebase easier to reason about without destabilizing the editor/runtime experience.

---

## WOD-214 — Audit and decommission or rewire `runtime-test-bench`

**Status:** ✅ DONE (2026-05-13)

### Summary
The `runtime-test-bench` subsystem has been fully decommissioned. Production-facing components were moved to the `runtime` layer, and dead code has been removed.

---

## WOD-216 — Reduce `components` layer fan-out

**Status:** 🏗️ IN PROGRESS

### What this ticket is about
The `components` layer imports from many top-level modules. Applying layer discipline: components should not directly import from `runtime`, `services`, or `parser`.

---

## WOD-219 — Consolidate duplicate types between `core` and `runtime` contracts

**Status:** 📅 TODO

---

## WOD-221 — Trim barrel exports and dead re-exports

**Status:** 📅 TODO

---

## WOD-222 — Add Storybook dependency hygiene and CI guardrails

**Status:** 📅 TODO

---

## WOD-223 — Add architecture regression checks to the repo

**Status:** 📅 TODO

---

## Bottom line

The architecture backlog is focused on stopping the bleeding with guardrails, removing duplication, and re-establishing clear ownership boundaries.
