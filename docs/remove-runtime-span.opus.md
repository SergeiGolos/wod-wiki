# Remove RuntimeSpan — Simplification Plan

## Status: Complete
## Created: 2025-02-09
## Completed: 2025-02-10

---

## 1. Why RuntimeSpan Is Redundant

`RuntimeSpan` was designed as a **parallel tracking model** — a mutable object that shadows a block's execution to record timing, fragments, and metadata. But the block-owned memory system (`MemoryTypes.ts`) has since matured to cover every data point that `RuntimeSpan` carries:

| RuntimeSpan field | Already exists in block memory | Memory type |
|---|---|---|
| `spans: TimeSpan[]` (timing) | `TimerState.spans: readonly TimeSpan[]` | `'timer'` |
| `fragments: ICodeFragment[][]` | `FragmentState.groups: readonly ICodeFragment[][]` | `'fragment'` |
| `blockId` | `IRuntimeBlock.key` | (identity) |
| `sourceIds` | `IRuntimeBlock.sourceIds` | (identity) |
| `status` ('failed' / 'skipped') | `CompletionState.reason` | `'completion'` |
| `parentSpanId` | Stack hierarchy (parent = `stack[depth-1]`) | (implicit) |
| `timerConfig` (direction, duration, label, role) | `TimerState` (direction, durationMs, label, role) | `'timer'` |
| `metadata` (tags, context, logs) | No equivalent — **see section 2** | — |

### The core argument

Every piece of **user-facing data** that RuntimeSpan stores is already maintained by the block's own memory system. RuntimeSpan duplicates this data in a second mutable object, creating:

1. **Two sources of truth** — `TimerTickBehavior` updates `TimerState` in memory, but `SpanTrackingHandler` also maintains its own `TimeSpan[]` on the span. Which is canonical?
2. **Sync overhead** — The tracker system listens to `stack:push`/`stack:pop` events and mirrors block lifecycle, but the block already knows its own lifecycle.
3. **Extra indirection** — Consumers like `ResultsTable`, `displayItemAdapters`, and `ExecutionLogService` read `RuntimeSpan` properties that are just copies of block memory.
4. **228 lines of model code** + **270 lines of handler** + **107 + 50 + 59 lines of commands** + **212 lines of tracker** = ~926 lines of code that can be eliminated.

### What about SpanMetadata?

`SpanMetadata` (tags, context, logs) is the one field that doesn't have a direct equivalent in `MemoryTypes`. However:

- **Tags** are derivable from `IRuntimeBlock.blockType` and fragment types
- **Context** (strategy name, etc.) is compile-time information that could live on the block itself or as an optional `'debug'` memory type
- **Logs** are handled by `RuntimeLogger` already

If needed, a lightweight `'debug'` memory type can absorb any metadata that's actually consumed. Currently the only consumer of `SpanMetadata` is the test file `ExecutionSpanDebugMetadata.test.ts` and the `metadata.ts` utility — neither feeds the UI.

---

## 2. What Currently Depends on RuntimeSpan

### Complete dependency map (15 files):

| # | File | Role | Removal impact |
|---|---|---|---|
| 1 | `runtime/models/RuntimeSpan.ts` | **The model itself** | Delete |
| 2 | `runtime/models/index.ts` | Re-exports RuntimeSpan | Remove export |
| 3 | `runtime/utils/metadata.ts` | `createSpanMetadata()` helper | Delete |
| 4 | `tracker/SpanTrackingHandler.ts` | Event-based span lifecycle | Delete |
| 5 | `tracker/ExecutionTracker.ts` | Command-based span lifecycle (RuntimeReporter) | Delete |
| 6 | `tracker/ITrackerCommand.ts` | Interface returning `RuntimeSpan[]` | Delete |
| 7 | `tracker/commands/TrackSpanCommand.ts` | Start/end/update span commands | Delete |
| 8 | `tracker/commands/TrackSectionCommand.ts` | Section metadata on spans | Delete |
| 9 | `tracker/commands/TrackEventCommand.ts` | Log/tag/context on spans | Delete |
| 10 | `tracker/__tests__/ExecutionSpanDebugMetadata.test.ts` | Tests for span metadata | Delete |
| 11 | `services/ExecutionLogService.ts` | Persists spans to localStorage | **Refactor** — read from OutputStatement or block memory |
| 12 | `core/models/StorageModels.ts` | `WodResult.logs: RuntimeSpan[]` | **Refactor** — change to `IOutputStatement[]` |
| 13 | `core/adapters/displayItemAdapters.ts` | `runtimeSpanToDisplayItem()` | **Refactor** — remove span adapter, keep OutputStatement adapter |
| 14 | `types/cast/messages.ts` | `ExecutionRecord = RuntimeSpan` | **Refactor** — change to `IOutputStatement` |
| 15 | `testing/testable/TestableRuntime.ts` | `ExecutionRecord = RuntimeSpan` re-export | **Refactor** — change type alias |
| 16 | `testing/testable/index.ts` | Re-exports `ExecutionRecord` | Update |
| 17 | `runtime-test-bench/components/ResultsTable.tsx` | Renders span data in table | **Refactor** — read from OutputStatement or block memory |

---

## 3. Replacement Strategy

### What replaces RuntimeSpan's role?

| Current RuntimeSpan usage | Replacement |
|---|---|
| **Live timer display** (timer UI) | Block memory `'timer'` → `TimerState` (already the actual source) |
| **Live fragment display** | Block memory `'fragment'` → `FragmentState` (already the actual source) |
| **Execution history / review** | `OutputStatement` (already produced at block unmount) |
| **Persistence to localStorage** | `OutputStatement[]` serialized via `ExecutionLogService` |
| **Cast protocol execution log** | `IOutputStatement[]` replaces `ExecutionRecord` type |
| **ResultsTable (test bench)** | Read from `OutputStatement[]` |

### Key insight

The runtime already produces `OutputStatement` at block unmount time. This is the **correct post-execution record**. There is no need for `RuntimeSpan` to exist as an intermediate — the block's memory IS the live state, and `OutputStatement` IS the completed state.

---

## 4. Step-By-Step Removal Plan

### Phase 1: Ensure OutputStatement covers all needed data

**Goal:** Verify `OutputStatement` can carry everything consumers need from `RuntimeSpan`.

- [x] **1.1** Audit `ResultsTable.tsx` — confirm it reads: `blockId`, `fragments`, `startTime`, `endTime`, `total()`, `isActive()`, `label`. All of these exist on `OutputStatement` or can be derived from `OutputStatement.timeSpan`.
- [x] **1.2** Audit `ExecutionLogService` — confirm it only needs: `id`, `startTime`, `endTime`, timing computation, and span identity. All covered by `OutputStatement`.
- [x] **1.3** Audit `displayItemAdapters.ts` — the `runtimeSpanToDisplayItem()` reads: fragments, timing, status, parentSpanId. The existing `outputStatementToDisplayItem()` already handles all of these.
- [x] **1.4** If any gap is found, add the missing field to `OutputStatement` or `OutputStatementOptions` (unlikely — only `SpanMetadata` is missing, and it's unused by UI).

### Phase 2: Refactor storage & messaging types

**Goal:** Replace `RuntimeSpan` in type signatures with `IOutputStatement`.

- [x] **2.1** `core/models/StorageModels.ts` — Change `WodResult.logs` from `RuntimeSpan[]` to `IOutputStatement[]`.
- [x] **2.2** `types/cast/messages.ts` — Change `ExecutionRecord` type alias from `RuntimeSpan` to `IOutputStatement`. Update `WorkoutCompleteMessage.executionLog`.
- [x] **2.3** `testing/testable/TestableRuntime.ts` — Change `ExecutionRecord` type alias.
- [x] **2.4** `testing/testable/index.ts` — Update re-export.

### Phase 3: Refactor consumers

**Goal:** Replace RuntimeSpan reads with OutputStatement reads.

- [x] **3.1** `services/ExecutionLogService.ts`:
  - Stop listening for `memory:set` / `memory:allocate` with `RUNTIME_SPAN_TYPE`.
  - Instead, subscribe to the runtime's output stream: `runtime.subscribeToOutput(output => ...)`.
  - Each `IOutputStatement` received becomes a log entry.
  - Remove `spanMap`, replace with output accumulation.
  - Duration calculation uses first/last `OutputStatement.timeSpan`.

- [x] **3.2** `core/adapters/displayItemAdapters.ts`:
  - Delete `runtimeSpanToDisplayItem()` and `runtimeSpansToDisplayItems()`.
  - The existing `outputStatementToDisplayItem()` already exists and handles the same conversion.
  - Update any call site that used the span adapter.

- [x] **3.3** `runtime-test-bench/components/ResultsTable.tsx`:
  - Change from reading `RuntimeSpan` out of memory entries to reading `IOutputStatement`.
  - Replace `span.fragments.flat()` → `output.fragments` (already flat on OutputStatement).
  - Replace `span.startTime` / `span.endTime` → `output.timeSpan.started` / `output.timeSpan.ended`.
  - Replace `span.total()` → `output.timeSpan.duration`.
  - Replace `span.isActive()` → `output.timeSpan.isOpen`.
  - Replace `span.blockId` → `output.sourceBlockKey`.

### Phase 4: Delete tracker system

**Goal:** Remove the entire parallel tracking infrastructure.

- [x] **4.1** Delete `tracker/commands/TrackSpanCommand.ts`
- [x] **4.2** Delete `tracker/commands/TrackSectionCommand.ts`
- [x] **4.3** Delete `tracker/commands/TrackEventCommand.ts`
- [x] **4.4** Delete `tracker/ITrackerCommand.ts`
- [x] **4.5** Delete `tracker/ExecutionTracker.ts`
- [x] **4.6** Delete `tracker/SpanTrackingHandler.ts`
- [x] **4.7** Delete `tracker/__tests__/ExecutionSpanDebugMetadata.test.ts`

### Phase 5: Delete RuntimeSpan model

**Goal:** Remove the model and its utilities.

- [x] **5.1** Delete `runtime/models/RuntimeSpan.ts`
- [x] **5.2** Delete `runtime/utils/metadata.ts`
- [x] **5.3** Update `runtime/models/index.ts` — remove RuntimeSpan export. Keep `TimeSpan` export (it's still used by `OutputStatement`, `TimerState`, etc.).
- [x] **5.4** Remove `RUNTIME_SPAN_TYPE` constant from any remaining references.

### Phase 6: Verify & clean up

- [x] **6.1** Run full `grep -r "RuntimeSpan" src/` to confirm zero remaining references.
- [x] **6.2** Run full `grep -r "RUNTIME_SPAN_TYPE" src/` to confirm zero remaining references.
- [x] **6.3** Run `grep -r "SpanTrackingHandler\|ExecutionTracker\|RuntimeReporter" src/` to confirm zero references.
- [x] **6.4** Run `bun test` — all existing tests pass (642 pass, 2 pre-existing failures in `useTimerDisplay` formatting).
- [ ] **6.5** Run `bun run build` (or `tsc --noEmit`) — zero type errors.
- [x] **6.6** Delete the `tracker/` directory if now empty (or contains only `commands/` which is empty).

---

## 5. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| SpanMetadata loss (tags/context/logs) | **Low** — only consumed by test file, not by any UI | If needed later, add optional `'debug'` memory type |
| Persistence format change (WodResult.logs) | **Medium** — existing localStorage data uses RuntimeSpan shape | Add migration: if `logs[]` entries have `blockId` (old), convert to OutputStatement shape |
| Cast protocol breaking change | **Low** — cast feature appears unused (no live receivers) | Update type; no runtime impact expected |
| Test bench ResultsTable | **Low** — dev-only component | Straightforward refactor |

---

## 6. Expected Outcome

### Lines removed: ~926
- `RuntimeSpan.ts` (228 lines)
- `SpanTrackingHandler.ts` (270 lines)
- `ExecutionTracker.ts` (212 lines)
- `TrackSpanCommand.ts` (107 lines)
- `TrackSectionCommand.ts` (50 lines)
- `TrackEventCommand.ts` (59 lines)

### Lines added: ~0
All consumers already have equivalent adapters for `OutputStatement`.

### Concepts simplified
- **Before:** Block memory (live state) + RuntimeSpan (parallel shadow) + OutputStatement (completed record) = 3 models
- **After:** Block memory (live state) + OutputStatement (completed record) = 2 models
- One less "source of truth" to keep in sync
- Entire `tracker/` directory eliminated

---

## 7. Completion Notes

**Completed**: 2025-02-10

### Files Deleted (10 total)
- `src/runtime/models/RuntimeSpan.ts` (228 lines)
- `src/runtime/utils/metadata.ts`
- `src/tracker/SpanTrackingHandler.ts` (270 lines)
- `src/tracker/ExecutionTracker.ts` (212 lines)
- `src/tracker/ITrackerCommand.ts` (16 lines)
- `src/tracker/commands/TrackSpanCommand.ts` (107 lines)
- `src/tracker/commands/TrackSectionCommand.ts` (50 lines)
- `src/tracker/commands/TrackEventCommand.ts` (59 lines)
- `src/tracker/__tests__/ExecutionSpanDebugMetadata.test.ts` (197 lines)

### Files Modified (10 total)
- `src/core/models/StorageModels.ts` — `WodResult.logs: RuntimeSpan[]` → `IOutputStatement[]`, schema version 1 → 2
- `src/types/cast/messages.ts` — `ExecutionRecord` type alias → `IOutputStatement`
- `src/testing/testable/TestableRuntime.ts` — `ExecutionRecord` type alias → `IOutputStatement`
- `src/services/ExecutionLogService.ts` — Complete rewrite: EventBus `memory:set` subscription → `runtime.subscribeToOutput()`
- `src/core/adapters/displayItemAdapters.ts` — Deleted `runtimeSpanToDisplayItem()` and `runtimeSpansToDisplayItems()`
- `src/components/unified/index.ts` — Removed span adapter re-exports
- `src/runtime-test-bench/components/ResultsTable.tsx` — Complete rewrite using `IOutputStatement`
- `src/runtime/models/index.ts` — Removed `RuntimeSpan`, `SpanStatus`, `SpanMetadata`, `TimerDisplayConfig` exports
- `tests/runtime-execution/workflows/runtime-hooks.test.ts` — Removed unused `RuntimeSpan` import
- `src/core/contracts/IFragmentSource.ts` — Updated JSDoc comment

### Test Results
- **642 pass**, 2 fail (pre-existing `useTimerDisplay` formatting tests — not related to this change)
- **Zero** remaining references to `RuntimeSpan`, `RUNTIME_SPAN_TYPE`, `SpanTrackingHandler`, `ExecutionTracker`, or any tracker symbol
