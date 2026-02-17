# Post-Restructure Bug Fix User Stories

These user stories address bugs discovered after the behavior restructure (Phases 0–7). Each story identifies the root cause with specific code references, the goal, and the expected fix.

> **Last audited: 2026-02-16** — see [Audit Results](#audit-results-2026-02-16) below.

---

## Terminology — Time-Related Concepts

These terms must be used consistently across the parser, runtime, and grid view layers. Each term has a single meaning and a single owner.

| Term | Definition | Layer | Usage |
|------|-----------|-------|-------|
| **Time** | The spans collection that a block tracks. Displayed on the grid as a range or timestamp relative to the total session time (e.g., `:00` → `2:30`). | Block | Grid columns show session-relative time ranges; `TimeSpan[]` on the block model. |
| **Timestamp** | The system clock time (`Date.now()`) when a message is logged or an event is recorded. | Runtime | Used internally for span start/end system times; never displayed directly on the grid. |
| **Duration** | A fragment defined by the `CodeStatement` (parsed from the workout script) that tells timer-end behaviors how long the span's elapsed time should run before closing the span. | Parser | Produced by the parser (e.g., `10:00` → `DurationFragment(600000)`); consumed by `TimerEndingBehavior` to decide when to complete. |
| **Elapsed** | The total *running* time of a block — the sum of `(end − start)` for each segment in the block's `Time` spans, excluding paused intervals. | Runtime | Computed by `computeTimerResults()`; written to `fragment:result` memory; displayed on the grid. |
| **Total** | The total wall-clock time that was recorded — last span's end time minus the first span's start time, *including* paused intervals. | Runtime | Computed alongside Elapsed; captures the full calendar duration from first start to final stop. |

### Quick Reference

```
Parser:    "10:00 Run"  →  DurationFragment(600_000)    ← Duration
Block:     TimeSpan[]   →  [:00, 2:30], [3:00, 5:15]    ← Time
Runtime:   Date.now()   →  1708099200000                 ← Timestamp
Runtime:   Σ(end−start) →  285_000 ms                    ← Elapsed  (running only)
Runtime:   last.end − first.start → 315_000 ms           ← Total    (wall-clock)
```

### Rules

1. **Never say "timer"** when you mean Duration, Elapsed, or Total — `timer` is a block type / behavior, not a metric.
2. **Duration is parser-owned** — the runtime reads it but never computes it.
3. **Elapsed excludes pauses; Total includes them** — do not conflate the two.
4. **Time is block-scoped** — it is the raw span data from which Elapsed and Total are derived.
5. **Timestamp is system-scoped** — it anchors spans to real-world clock time but is not a user-facing metric.

---

## Stories

| Story | Bug | Root File(s) | Severity | Status |
|-------|-----|-------------|----------|--------|
| [Story 1](story-1-remove-timer-column.md) | Timer column duplicates Spans column | `gridPresets.ts`, `ReportOutputBehavior.ts` | Low | **Open** |
| [Story 2](story-2-elapsed-total-double-write.md) | Double-write of elapsed/total to fragment:result | `TimerBehavior.ts`, `ReportOutputBehavior.ts`, `SessionRootBlock.ts` | Medium | **Open** |
| [Story 3](story-3-duration-nan.md) | Duration shows "NaN:NaN" | `GridRow.tsx`, `useGridData.ts`, `AnalyticsTransformer.ts` | Low | **Mostly Fixed** |
| [Story 4](story-4-round-tracking.md) | Round counter stuck at 1 | `ChildSelectionBehavior.ts`, `ReEntryBehavior.ts`, `SessionRootBlock.ts` | High | **Fixed** |
| [Story 5](story-5-timer-completion.md) | Timer at zero, block never pops | `TimerEndingBehavior.ts`, `ChildrenStrategy.ts`, `ChildSelectionBehavior.ts` | High | **Fixed** |

## New Issues Discovered During Audit

| Issue | Bug | Root File(s) | Severity |
|-------|-----|-------------|----------|
| [Story 6](story-6-emom-span-erasure.md) | EMOM interval reset erases span history | `TimerEndingBehavior.ts` | **High** |
| [Story 7](story-7-loop-elapsed-zero.md) | Loop blocks report elapsed=0 / total=0 | `GenericLoopStrategy.ts`, `ReportOutputBehavior.ts` | Medium |

---

## Audit Results (2026-02-16)

### Story 4 — Round Tracking: **FIXED** ✅

All three sub-bugs resolved:
- **Bug A** (`allChildrenCompleted` always false): `dispatchedOnLastNext` is now reset to `false` at the top of `onNext()`. In the completion branch, `dispatchNext()` is never called, so the flag stays `false` and the getter correctly returns `true`.
- **Bug B** (`shouldLoop` off-by-one): Changed from `round.current <= round.total` to `round.current < round.total`.
- **Bug C** (behavior ordering): `ReEntryBehavior.onNext()` is now a no-op. Round advancement moved entirely into `ChildSelectionBehavior.advanceRound()`, eliminating the cross-behavior ordering dependency.

### Story 5 — Timer Completion: **FIXED** ✅

All conditions resolved:
- `ChildSelectionBehavior.onNext()` now has an `isComplete` guard at the very top, preventing child dispatch after timer expiry.
- `shouldLoop()` also checks `ctx.block.isComplete` (belt-and-suspenders).
- `CompletedBlockPopBehavior` is now added **unconditionally** to all container blocks by `ChildrenStrategy`, removing the fragile dependency on `hasBehavior(TimerEndingBehavior)`.

### Story 3 — Duration NaN: **MOSTLY FIXED** ⚠️

The review grid display bug is fixed:
- `formatDuration()` in both `GridRow.tsx` and `useGridData.ts` now guards `ms === undefined || isNaN(ms)`.
- Duration computation in `useGridData.ts` uses `typeof === 'number' && !isNaN(...)` instead of nullish coalescing.

Remaining minor gaps:
- `AnalyticsTransformer.ts` still has no NaN guard on `output.elapsed / 1000` (mitigated by downstream guards).
- `calculateElapsed.ts` has a `formatDuration()` that still has **no NaN guard** — can produce `"NaN:NaN"` in fragment images outside the review grid.

### Story 2 — Double-Write: **STILL OPEN** 🔴

Both writers are fully intact:
- `TimerBehavior.onUnmount()` still calls `appendResultFragments()` (append semantics).
- `ReportOutputBehavior.onUnmount()` still independently calls `computeTimerResults()` + `writeResultMemory()` (replace semantics).
- Current behavior ordering (Timer first → Report second) masks the duplicate because Report's replace overwrites Timer's append.
- The structural bug remains — two behaviors independently compute and write the same data; outcome depends entirely on insertion order.
- `ReportOutputBehavior` test `computes timer results and emits completion output on unmount` is **failing** (1 test failure).

### Story 1 — Timer Column: **STILL OPEN** 🔴

None of the three conditions have been addressed:
- `FragmentType.Timer` still listed in `ALL_FRAGMENT_COLUMNS`, `DEFAULT_VISIBLE_COLUMNS`, and `isNumericFragmentType()` in `gridPresets.ts`.
- `FragmentType.Timer` still in `FRAGMENT_GRAPH_COLORS` and `getUnitForColumn()` in `useGraphData.ts`.
- `ReportOutputBehavior.collectStateFragments()` still includes `'timer'` memory tag fragments in state output.

### Promotion / Inheritance System: **WORKING** ✅

The promotion/inheritance system itself is correctly implemented and fully tested (36 tests passing):
- `FragmentPromotionBehavior` writes promoted fragments to `fragment:promote` and `fragment:rep-target`.
- `JitCompiler.compile()` reads promoted fragments via `getFragmentMemoryByVisibility('promote')` and injects them into child statement nodes.
- Origin-based precedence (`compiler` > `parser` > `execution`) works correctly.
- `ChildSelectionBehavior.advanceRound()` refreshes promotion memory on round change.

The promotion system was **not broken**. The prior perception of breakage was likely caused by **Story 4's round-tracking bugs** (now fixed), which prevented the round counter from advancing — making it appear that promotion wasn't propagating updated values.

### NEW — Story 6: EMOM Span History Erasure (**HIGH**)

`TimerEndingBehavior.resetIntervalState()` **replaces all spans** with a single new span on each EMOM interval reset:
```typescript
spans: [new TimeSpan(now)]  // ALL previous spans ERASED
```
For an EMOM with 10 intervals, `computeTimerResults()` on final unmount sees only the **last interval's** span. Result: `elapsed` = last interval duration only (e.g., 60s instead of 600s), `spans` contains 1 entry instead of 10.

**Affected**: All EMOM/interval blocks compiled by `IntervalLogicStrategy`.

### NEW — Story 7: Loop Blocks Report elapsed=0, total=0 (**MEDIUM**)

`GenericLoopStrategy` adds `ReportOutputBehavior` but **no** `TimerBehavior`. When `ReportOutputBehavior.computeTimerResults()` runs and finds no `'timer'` memory, it falls to the no-timer fallback:
```typescript
new ElapsedFragment(0, blockKey, now)   // always 0
new TotalFragment(0, blockKey, now)     // always 0
```
A 3-round loop running for 5 minutes reports elapsed=0, total=0.

**Affected**: Rounds-based blocks (e.g., `"3 Rounds"`) compiled by `GenericLoopStrategy`.

---

## Recommended Fix Order (Updated)

1. **[Story 6](story-6-emom-span-erasure.md)** (EMOM span erasure) — **HIGH** — timer values critically wrong for all EMOM blocks
2. **[Story 2](story-2-elapsed-total-double-write.md)** (Double-write) — **MEDIUM** — structural cleanup; unify timer result ownership in `ReportOutputBehavior` only; remove `appendResultFragments` from `TimerBehavior`
3. **[Story 7](story-7-loop-elapsed-zero.md)** (Loop elapsed=0) — **MEDIUM** — loop blocks need wall-clock elapsed tracking even without a timer
4. **[Story 1](story-1-remove-timer-column.md)** (Timer column) — **LOW** — cosmetic grid cleanup
5. ~~**[Story 4](story-4-round-tracking.md)**~~ — **FIXED**
6. ~~**[Story 5](story-5-timer-completion.md)**~~ — **FIXED**
7. ~~**[Story 3](story-3-duration-nan.md)**~~ — **MOSTLY FIXED** (residual gap in runtime `formatDuration`)

## Dependency Graph (Updated)

```
Story 6 (EMOM span erasure) — independent, highest priority
    │
Story 2 (Double-write cleanup)
    │
    └── Story 7 (Loop elapsed=0) — benefits from unified timer-result ownership

Story 1 (Timer column) — independent

Story 3 (Duration NaN) — residual gap in calculateElapsed.ts formatDuration()

Story 4 (Round tracking) — FIXED
Story 5 (Timer completion) — FIXED
```
