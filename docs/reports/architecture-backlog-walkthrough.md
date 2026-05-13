# WOD Wiki Architecture Backlog Walkthrough

**Parent backlog:** [WOD-213](paperclip://issues/WOD-213) — WOD Wiki architecture improvement backlog  
**Purpose:** Give a practical walkthrough of each ticket in the architecture backlog, including why it matters, what it improves, and what to watch out for during refactoring.

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
