# Playground Failing Tests — Root-Cause Analysis & Proposed Fixes

**Scope:** `playground/src` test suite (`bun run test:playground`)
**Snapshot (before):** 190 pass · 2 skip · **55 fail** · 247 tests / 25 files
**Status (after fixes):** ✅ **245 pass · 2 skip · 0 fail** · 25 files (`bun run test:playground`)
**Date:** 2026-05-31

> **Implemented.** See the *Implementation log* at the bottom for exactly what
> changed. Headline: the root causes below were all confirmed and fixed without
> touching any playground production module.

> **Headline finding:** None of the 55 failures are caused by a bug in the
> playground's *production* code. **53 of 55** are caused by the **test harness**
> (lack of test isolation + a missing environment polyfill); **2 of 55** are
> **stale/incorrect tests** whose production code is correct. Every failing file
> passes — or nearly passes — when run on its own.

---

## How to reproduce the triage

```bash
# Full suite (55 fail)
bun run test:playground

# Any single failing file in isolation (passes, except the 3 noted below)
bun test playground/src/nav/panels --preload ./tests/unit-setup.ts          # 72 pass / 0 fail
bun test playground/src/services/journalWorkout.test.ts --preload ./tests/unit-setup.ts  # 15 pass / 0 fail
```

The contrast between "fails in the full run" and "passes alone" is the signal that
the defect lives in **shared global state between files**, not in the modules under test.

---

## The dominant root cause — process-global `mock.module` with no teardown

Bun runs every test file in **one process**. `mock.module(path, factory)` registers a
module override that is **global for the whole process and is never torn down**. Eleven
playground test files call `mock.module`, and several replace **real, widely-imported
modules with *partial* stubs**:

| Mocked module | Files that globally replace it | What the stub omits |
|---|---|---|
| `react-router-dom` | `lib/routes.test.tsx`, `views/ListViews.test.tsx`, `canvas/MarkdownCanvasPage.test.tsx`, `pages/PlaygroundRedirect.test.tsx`, `hooks/useJournalZipProcessor.test.ts` | `MemoryRouter`, `useLocation`, `Link`, `Routes`, `Route`, … (everything the stub didn't list) |
| `playgroundDB` (`./playgroundDB`, `../services/playgroundDB`) | `services/paletteDataSources.test.ts`, `services/journalWorkout.test.ts`, `views/ListViews.test.tsx`, `hooks/useJournalZipProcessor.test.ts`, `hooks/usePlaygroundContent.test.ts` | `PlaygroundDBService` (named export) in some stubs |
| `@/services/db/IndexedDBService` | `services/paletteDataSources.test.ts`, `nav/.../EffortsNavPanel.test.tsx`, `views/ListViews.test.tsx` | varies |

Because the override is global and order-dependent, the **first** file to register a
partial stub poisons **every later** file that imports the real module. Two concrete
failure shapes result:

1. **Missing named export → load-time `SyntaxError`.**
   `paletteDataSources.test.ts` registers
   `mock.module('./playgroundDB', () => ({ playgroundDB: {...} }))` — with **no
   `PlaygroundDBService`**. When `journalWorkout.ts` later does
   `import { playgroundDB, PlaygroundDBService } from './playgroundDB'`, it resolves to
   the stub and throws:
   `SyntaxError: Export named 'PlaygroundDBService' not found in module '…/playgroundDB.ts'`.

2. **Real component → renders `null`.**
   The nav panels use the *real* `react-router-dom` (`MemoryRouter`, `useLocation`,
   route matching). Once another file swaps `react-router-dom` for a partial stub, the
   panels can't resolve their route/location, the route guard returns `null`, and the
   DOM is empty — every `getByText`/`getByRole` then fails against
   `<body><div /></body>`.

**Verified bisections**

```text
paletteDataSources.test.ts + journalWorkout.test.ts        → 15 fail  (playgroundDB stub leak)
dateUtils/parseJournalDate/journalEntryFlow + journalWorkout → 0 fail  (no router/db stub)
useJournalZipProcessor.test.ts + usePlaygroundContent.test.ts → 2 fail (router/db stub leak)
nav/panels (alone)                                          → 0 fail
```

---

## Failure inventory (all 55)

### Category A — `mock.module` pollution · 46 failures
**Verdict: production code correct · tests correct in isolation · harness defect.**

| File | # | Symptom in full run | Leaked stub responsible |
|---|---|---|---|
| `services/journalWorkout.test.ts` | 15 | `SyntaxError: Export named 'PlaygroundDBService' not found` | `paletteDataSources.test.ts` → `./playgroundDB` |
| `nav/panels/__tests__/CollectionsNavPanel.test.tsx` | 13 | component renders `null`; `Unable to find … text/role` | `react-router-dom` partial stub |
| `nav/panels/__tests__/EffortsNavPanel.test.tsx` | 10 | renders `null`; `<body><div /></body>` | `react-router-dom` / `IndexedDBService` stub |
| `hooks/useShowPlaygrounds.test.ts` | 3 | localStorage assertions fail under leaked globals | upstream stub + shared `localStorage` |
| `nav/panels/__tests__/FeedsNavPanel.test.tsx` | 3 | renders `null` | `react-router-dom` partial stub |
| `nav/panels/__tests__/JournalNavPanel.test.tsx` | 2 | renders `null` | `react-router-dom` partial stub |

<details><summary>Individual test names (Category A)</summary>

- **journalWorkout** — writes the backlink to the source workout note when provided; falls back to the category route when no explicit source note is provided; creates a new journal entry when one does not exist; appends to an existing journal entry; uses current date when no date is provided; wraps content in wod block by default; does not wrap content when wrapInWod is false; handles collections that do not exist; trims trailing whitespace from wod content; handles special characters in workout names; handles leap year dates; handles single-digit month and day padding; handles multi-line wod content; sets updatedAt timestamp correctly; trims existing content before appending
- **CollectionsNavPanel** — render category filters on /collections; render collection categories; highlight active categories; navigate to collection with category filter; render parent collection and sibling workouts; highlight active workout; show sibling workouts; navigate to collection when clicking name; render buttons with proper roles; apply spacing/layout classes; apply active button styles; apply inactive button styles; apply header styling
- **EffortsNavPanel** — render origin filters; render discipline filters; highlight active origin filter; render recent workouts header; show "All efforts" back link; show empty state when no recent workouts; show loading state; render workout result items with date and time; render buttons with proper roles; apply proper layout classes
- **FeedsNavPanel** — render calendar and session list; show back button to feed list; highlight active feed item
- **JournalNavPanel** — should not show tag chips on entry page; should not show date filter badge on entry page
- **useShowPlaygrounds** — defaults to false when localStorage is empty; writes the boolean to localStorage when changed; gracefully handles invalid localStorage values

</details>

---

### Category B — missing `indexedDB` in the jsdom test environment · 7 failures
**Verdict: production code correct · test-infrastructure gap.**

- File: `hooks/useJournalZipProcessor.test.ts`
- Alone, the file errors with `ReferenceError: indexedDB is not defined`
  (an *"Unhandled error between tests"*); in the full run the 7 tests time out.
- `tests/unit-setup.ts` builds a JSDOM window but **does not define `indexedDB`**
  (`grep -c indexedDB tests/unit-setup.ts → 0`). A code path reachable from the hook's
  dependency graph (the real `playgroundDB` / IndexedDB singleton) touches global
  `indexedDB` at evaluation time even though the test stubs `../services/playgroundDB`.

Failing tests: redirects to /journal when no zip parameter is provided; creates entry
and redirects for today without date param; sets pending-confirmation state for past
dates; creates entry directly for future dates; sets error state and redirects on
invalid date format; returns onConfirmBackdate callback for past dates; sets error
state for invalid dates.

---

### Category C — stale / incorrect tests · 2 failures
**Verdict: production code correct · the *test* is wrong.**

#### C1 · `hooks/usePlaygroundContent.test.ts` — "flushes pending debounced content when unmounted…"
- Assertion: `expect(savedPages).toHaveLength(1)` → received `0`.
- The hook **does** flush on unmount: `useEditorSave` registers an unmount cleanup that
  calls `flush() → doSave(value)`. But `doSave` chains the write through
  `inflightRef.current.then(...)` — i.e. the mock `savePage` runs on a **microtask**,
  *after* the synchronous `unmount()` returns.
- The test reads `savedPages` **synchronously** right after `unmount()`, before the
  microtask has run. The save is fire-and-forget by design (navigation guards can't
  await React cleanup), so the value lands one tick later.
- **The test races the implementation.** Fix the test, not the hook:
  ```ts
  unmount();
  await waitFor(() => expect(savedPages).toHaveLength(1));
  ```

#### C2 · `views/queriable-list/JournalDateScroll.test.tsx` — "does not prepend future dates on mount until the user scrolls"
- Assertion: after simulating a scroll, `expect(querySelectorAll('[id]').length).toBe(15)`
  → received `8` (mount renders 8; prepend never happens).
- The component suppresses sentinel firing until the **mount scroll settles**, and
  releases that suppression on the native **`scrollend`** event (with a `scrollY`-stability
  poll fallback) — see `JournalDateScroll.tsx` ~L298–334.
- The test dispatches a plain **`scroll`** event (`window.dispatchEvent(new Event('scroll'))`)
  and triggers the intersection *while suppression is still active*, so the prepend is
  correctly ignored. The test encodes an **older suppression-release model**.
- **The test is stale.** Fix the test to match the current contract, e.g. dispatch
  `scrollend` (and/or advance `scrollY` so the poll settles) **before** triggering the
  top-sentinel intersection. The mock `IntersectionObserver` must also re-fire after
  suppression clears, since `recheckSentinels()` re-observes rather than re-invoking the
  callback.

---

## Proposed solutions (ranked)

### 1. Stop globally clobbering real, shared modules (fixes most of Category A)
`react-router-dom` works fine under jsdom — the nav-panel tests already use the **real**
`MemoryRouter` and pass alone. The five files that `mock.module('react-router-dom', …)`
are the poison source.

- **Preferred:** delete those router stubs and render through a real `MemoryRouter`
  with `initialEntries`. Removes the leak entirely and tests behaviour closer to prod.
- Where a stub is genuinely needed, make it **total** (re-export everything via
  `...(await import('react-router-dom'))` then override the few members), so later files
  still get the missing exports.

### 2. Make module stubs complete + co-located teardown (fixes the `playgroundDB` `SyntaxError`)
Every `mock.module('…/playgroundDB', …)` must export **both** `playgroundDB` **and**
`PlaygroundDBService`. Longer term, register module mocks behind an `afterAll` restore so
they don't outlive the file. (Note: Bun has no first-class per-file un-register for
`mock.module`; until it does, completeness + restoration discipline is the guardrail.)

### 3. Isolate the process boundary (defence-in-depth for all of Category A)
Because `mock.module` is process-global, the only fully robust isolation is **one process
per file**. Options: split `test:playground` to invoke files in separate `bun test` runs,
or group the `mock.module`-heavy files into their own run. Heavier, but eliminates
order-dependent flakiness permanently.

### 4. Add an `indexedDB` polyfill to `tests/unit-setup.ts` (fixes Category B)
Register `fake-indexeddb` (or a minimal stub) in `unit-setup.ts` so any module that
touches global `indexedDB` at import time has a backing store. This also lets
`useJournalZipProcessor` tests use the real persistence path instead of partial stubs.

### 5. Repair the two stale tests (fixes Category C)
- `usePlaygroundContent`: wrap the post-unmount assertion in `await waitFor(...)`.
- `JournalDateScroll`: drive `scrollend` (+ `scrollY` stability) before triggering the
  intersection, matching the component's current suppression-release contract.

---

## Architectural note (why the harness leaks in the first place)

The tests reach for process-global `mock.module` because the production modules expose
**shallow seams**: the nav panels and hooks consume collaborators as **direct imports of
singletons** (`import { playgroundDB } from './playgroundDB'`,
`import { useLocation } from 'react-router-dom'`) rather than receiving them at an
injectable seam. With no seam to substitute a collaborator *locally*, the only lever a
test has is to replace the module *globally* — and that lever has process-wide blast
radius.

The durable fix that removes the whole class of failure is to **deepen these seams**:
pass route/location and the persistence adapter into the panels/hooks (props or a small
context adapter) so a test substitutes one adapter at the seam instead of mutating a
shared module. That change concentrates the persistence/routing knowledge in one place
(locality) and makes the interface the test surface — but it touches production code and
should be scoped as a follow-up, separate from the low-risk harness fixes above.

---

## Summary table

| Category | Files | Failures | Verdict | Fix target |
|---|---|---|---|---|
| A — `mock.module` pollution | journalWorkout, Collections/Efforts/Feeds/JournalNavPanel, useShowPlaygrounds | 46 | code ✅ / tests ✅ in isolation | harness (stop global module clobbering) |
| B — missing `indexedDB` | useJournalZipProcessor | 7 | code ✅ | harness (polyfill in `unit-setup.ts`) |
| C1 — async flush asserted sync | usePlaygroundContent | 1 | code ✅ / **test wrong** | test (`await waitFor`) |
| C2 — stale scroll model | JournalDateScroll | 1 | code ✅ / **test stale** | test (`scrollend` not `scroll`) |
| **Total** | | **55** | | |

---

## Implementation log (what actually shipped)

A key empirical finding shaped the fix for Category A: **Bun 1.3.9 cannot
un-register a `mock.module` override.** Neither `mock.restore()` nor re-registering
the real module in `afterAll` restores it for later files (verified with a minimal
two-file experiment). So "complete the stubs + tear them down" is not achievable —
the only reliable isolation is a fresh process per file.

| Fix | Category | Change | Result |
|---|---|---|---|
| `indexedDB` polyfill | B | Added `fake-indexeddb` (dev dep) and `import 'fake-indexeddb/auto'` at the top of `tests/unit-setup.ts`. The `IndexedDBService` singleton calls `openDB()` at import time; jsdom has no `indexedDB`. | `useJournalZipProcessor` no longer throws `ReferenceError: indexedDB is not defined`. |
| Complete the router stub | B/A | `hooks/useJournalZipProcessor.test.ts` now stubs `useLocation` (the hook reads `location.pathname`); previously it only "worked" by leaking another file's stub. | File passes in isolation (8/8). |
| Await async flush | C1 | `hooks/usePlaygroundContent.test.ts` wraps the post-unmount assertion in `await waitFor(...)`. The hook flushes on a microtask by design. | 1/1. |
| Match `scrollend` model | C2 | `views/queriable-list/JournalDateScroll.test.tsx` retries `dispatchEvent('scroll')` + intersection inside `waitFor`, so the assertion no longer races the mount `requestAnimationFrame` that arms the top sentinel. | 1/1. |
| **Per-file process isolation** | A | New `tests/run-isolated.ts` runs each playground test file in its own `bun test` process and aggregates results. `test:playground` now points at it; the old single-process command is preserved as `test:playground:shared`. | Eliminates all cross-file `mock.module` pollution. |

**Files touched (no playground production code):**

- `tests/unit-setup.ts` — IndexedDB polyfill
- `tests/run-isolated.ts` — new isolated runner
- `package.json` — `test:playground` → isolated runner; added `test:playground:shared`
- `playground/src/hooks/useJournalZipProcessor.test.ts` — complete router stub
- `playground/src/hooks/usePlaygroundContent.test.ts` — `await waitFor`
- `playground/src/views/queriable-list/JournalDateScroll.test.tsx` — `scrollend`-aware timing
- `package.json` / lockfile — `fake-indexeddb` dev dependency

**Verification**

- `bun run test:playground` → **245 pass / 0 fail / 2 skip** across 25 files (exit 0).
- `bun run test` (src/) → **2479 pass / 9 fail** — identical to the pre-change baseline
  (the 9 are pre-existing, unrelated to IndexedDB; verified by stashing the setup change).

**Follow-up not done here (intentional):** the architectural deepening — passing
route/location and the persistence adapter into the panels/hooks at an injectable
seam so tests never need global module mocks — remains a separate task because it
touches production code.
