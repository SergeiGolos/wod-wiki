# Track View: Missing Stack Sections — Diagnostic Report

## Summary

After the behavior refactoring, the Track view's section display is failing to show the full
stack of active blocks. The root cause is a combination of **two separate rendering pipelines**
that each have independent filtering issues, leading to blocks being silently dropped from the UI.

---

## How the Track View Renders Sections

The Track view has **two independent section displays**, each with its own data source:

### 1. Stack-Driven Display (Right Panel — `RefinedTimerDisplay`)

```
RuntimeStack.subscribe()
  → useStackSnapshot() → useSnapshotBlocks()
    → useStackFragmentSources()
      → RefinedTimerDisplay.stackItems
```

This pipeline shows **blocks currently on the stack** as cards in the left panel of the timer display.

### 2. History Log (Left Panel — `TimerIndexPanel`)

```
runtime.subscribeToOutput()
  → useOutputStatements()
    → RuntimeHistoryLog.outputs
      → FragmentSourceList
```

This pipeline shows **output statements** emitted by behaviors during `onMount` and `onUnmount`.

---

## Issue 1: Blocks Without `fragment:display` Memory Are Invisible

### Root Cause

`useStackFragmentSources()` in [useStackDisplay.ts](src/runtime/hooks/useStackDisplay.ts#L246-L298) filters out blocks
that lack a `fragment:display` memory entry:

```typescript
// line 279-280
const displayEntry = block.getMemory('fragment:display');
if (!displayEntry) return;  // ← BLOCK SILENTLY DROPPED
```

`fragment:display` memory is **only allocated** by `BlockBuilder.build()` in
[BlockBuilder.ts](src/runtime/compiler/BlockBuilder.ts#L117-L128):

```typescript
if (this.fragments && this.fragments.length > 0) {
    const fragmentMemory = new FragmentMemory(this.fragments);
    block.allocateMemory('fragment', fragmentMemory);
    const displayMemory = new DisplayFragmentMemory(block.key.toString(), fragmentMemory);
    block.allocateMemory('fragment:display', displayMemory);
}
```

### Affected Block Types

| Block Type | Created Via | Has `fragment:display`? | Visible in Stack View? |
|---|---|---|---|
| **Root (Workout)** | `WorkoutRootStrategy` → `new RuntimeBlock(...)` | **NO** | **NO** — filtered by `blockType === 'Root'` check |
| **Idle (Start/End)** | `IdleBlockStrategy` → `new RuntimeBlock(...)` | **NO** | **NO** — no displayEntry |
| **Effort (simple)** | `EffortFallbackStrategy` → `BlockBuilder` | **NO** — `setFragments()` never called | **NO** — `fragments` is undefined |
| Timer | `GenericTimerStrategy` → `BlockBuilder` | YES | YES |
| Rounds/Loop | `GenericLoopStrategy` → `BlockBuilder` | YES | YES |
| AMRAP | `AmrapLogicStrategy` → `BlockBuilder` | YES | YES |
| Interval/EMOM | `IntervalLogicStrategy` → `BlockBuilder` | YES | YES |
| Group | `GenericGroupStrategy` → `BlockBuilder` | YES | YES |

**Impact**: Simple effort blocks (e.g., `10 Push-ups`, `Run 400m`) and idle/transition blocks are
**never displayed** in the stack view panel. A workout like:

```
5 Rounds
  10 Push-ups       ← MISSING from stack view
  15 Squats         ← MISSING from stack view
  Run 400m          ← MISSING from stack view
```

...would show only the "5 Rounds" parent card, not the active child effort.

### Fix Options

**Option A — `EffortFallbackStrategy` should call `setFragments()`**:  
The strategy currently sets label but not fragments. Adding fragment allocation:

```typescript
// In EffortFallbackStrategy.apply():
const fragmentGroups = [statement.fragments.filter(f => f.origin !== 'runtime')];
if (fragmentGroups[0].length > 0) {
    builder.setFragments(fragmentGroups);
}
```

**Option B — `useStackFragmentSources()` should fall back for blocks without fragment:display**:  
Create a lightweight fragment source from the block's label when no memory exists.

**Option C — Blocks built via `new RuntimeBlock()` should allocate their own display memory**:  
`WorkoutRootStrategy.build()` and `IdleBlockStrategy.build()` should create `DisplayFragmentMemory` after construction.

---

## Issue 2: Root Block Filtering Hides the Workout Container

### Root Cause

`useStackFragmentSources()` has an explicit filter at [useStackDisplay.ts](src/runtime/hooks/useStackDisplay.ts#L283):

```typescript
// Skip root blocks without meaningful labels
if (block.blockType === 'Root' && !block.label) return;
```

The root block from `WorkoutRootStrategy` has `blockType: 'Root'` and `label: 'Workout'`,
so it **passes** this filter. However, it still gets dropped by the subsequent
`fragment:display` check because `WorkoutRootStrategy` bypasses `BlockBuilder`.

If the root block's label were ever empty, it would be double-filtered.

### Fix

The root block should either:
1. Allocate `DisplayFragmentMemory` in `WorkoutRootStrategy.build()`, or
2. Be explicitly handled by `useStackFragmentSources()` as a special case

---

## Issue 3: History Log Filters Active Segments

### Root Cause

`TimerIndexPanel` passes `showActive={false}` to `RuntimeHistoryLog` at 
[TimerIndexPanel.tsx](src/components/layout/TimerIndexPanel.tsx#L61):

```tsx
<RuntimeHistoryLog
  ...
  showActive={false}
/>
```

`RuntimeHistoryLog` then filters out any output with `status === 'active'` at
[RuntimeHistoryLog.tsx](src/components/history/RuntimeHistoryLog.tsx#L89):

```typescript
if (!showActive) {
  displayEntries = displayEntries.filter(entry => entry.status !== 'active');
}
```

Output with `outputType === 'segment'` is classified as `'active'` at
[RuntimeHistoryLog.tsx](src/components/history/RuntimeHistoryLog.tsx#L61-L63):

```typescript
if (output.outputType === 'segment') {
  status = 'active';
}
```

**Impact**: The history log (left panel) only shows **completed** blocks. Currently-executing
blocks are invisible there — they should be shown by the stack view (right panel), but many
are invisible there too (Issue 1).

### Why This Design Exists

The intent was to split the display:
- **History log** (left) → shows completed work (what you did)
- **Stack view** (right) → shows active work (what you're doing now)

But with blocks missing from Stack View, active work can fall into a gap where neither
panel displays it.

---

## Issue 4: `SegmentOutputBehavior` Not Applied to All Blocks

### Root Cause

Not all block types include `SegmentOutputBehavior`:

| Block Type | Output Behavior | Emits Mount Segment? | Emits Unmount Completion? |
|---|---|---|---|
| Timer | `TimerOutputBehavior` | NO | YES (completion only) |
| Rounds/Loop | `RoundOutputBehavior` + `HistoryRecordBehavior` | NO (milestone only) | YES (event only) |
| AMRAP | `TimerOutputBehavior` + `RoundOutputBehavior` + `HistoryRecordBehavior` | NO | YES |
| **Effort** | `SegmentOutputBehavior` | **YES** | **YES** |
| Root | `HistoryRecordBehavior` | NO | NO (event only) |
| Idle | None | NO | NO |
| Group | `HistoryRecordBehavior` | NO | NO (event only) |

`HistoryRecordBehavior` emits an event (`history:record`), not an output statement via
`ctx.emitOutput()`. So Group, Root, and Idle blocks **never appear in the history log** either.

Only blocks using `SegmentOutputBehavior` or `TimerOutputBehavior` produce entries that
show up in `RuntimeHistoryLog`.

---

## Issue 5: Stack Snapshot Timing — Stale Snapshot on Rapid Pushes

### Potential Issue

`useStackSnapshot()` in [useStackSnapshot.ts](src/runtime/hooks/useStackSnapshot.ts#L38-L55) subscribes once
on mount:

```typescript
useEffect(() => {
  const unsubscribe = runtime.subscribeToStack((s) => {
    setSnapshot(s);
  });
  return unsubscribe;
}, [runtime]);
```

During an execution "turn" (via `ExecutionContext`), multiple actions can fire in sequence:
1. `PopBlockAction` → pops child → parent gets `NextAction`
2. `ChildRunnerBehavior.onNext()` → returns `CompileChildBlockAction`
3. `CompileChildBlockAction` → returns `PushBlockAction`

Each push/pop fires a stack notification synchronously. React batches `setState` calls, so
the snapshot seen by `useSnapshotBlocks()` will be the **final state** after all actions
in the turn complete. This is correct for the final view.

However, there's a subtle issue: the `blocks` array in the snapshot comes from
`RuntimeStack.blocks` which creates a new reversed copy on each access. If React
batches **only the last** `setSnapshot` call, intermediate blocks that were pushed
and popped within a single turn would never be "seen" by the hook.

**Impact**: Short-lived blocks (e.g., an effort that immediately completes) may never
appear in the stack view.

---

## Consolidated Issue Map

```
┌───────────────────────────────────────────────────────────────┐
│                     TRACK VIEW                                │
│                                                               │
│  ┌─────────────────┐        ┌──────────────────────────────┐  │
│  │  History Log     │        │  Stack View (Timer Display)  │  │
│  │  (TimerIndexPan) │        │  (RefinedTimerDisplay)       │  │
│  │                  │        │                              │  │
│  │  Data Source:    │        │  Data Source:                 │  │
│  │  Output Stmts    │        │  Stack Blocks                │  │
│  │                  │        │                              │  │
│  │  FILTERS:        │        │  FILTERS:                    │  │
│  │  ❌ showActive=  │        │  ❌ No fragment:display?     │  │
│  │     false        │        │     → SKIP                   │  │
│  │                  │        │  ❌ Root + no label?          │  │
│  │  MISSING:        │        │     → SKIP                   │  │
│  │  - Active segs   │        │                              │  │
│  │  - Root block    │        │  MISSING:                    │  │
│  │  - Idle blocks   │        │  - Effort blocks (no frags)  │  │
│  │  - Group blocks  │        │  - Root block (no frags)     │  │
│  │                  │        │  - Idle blocks (no frags)    │  │
│  └─────────────────┘        └──────────────────────────────┘  │
│                                                               │
│  RESULT: Many blocks appear in NEITHER panel                  │
└───────────────────────────────────────────────────────────────┘
```

---

## Recommended Fixes (Priority Order)

### P0 — Effort blocks must have fragment:display memory

**File**: [src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts](src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts)

Add `setFragments()` call with the statement's fragments so `BlockBuilder.build()`
allocates `FragmentMemory` and `DisplayFragmentMemory`.

### P0 — `useStackFragmentSources()` should handle blocks without fragment:display

**File**: [src/runtime/hooks/useStackDisplay.ts](src/runtime/hooks/useStackDisplay.ts)

When a block has no `fragment:display` memory but has a label, create a synthetic
`FragmentSourceEntry` so it still appears in the stack view. This is the safety-net
fix for any block type that bypasses `BlockBuilder`.

### P1 — Idle blocks should be visible on stack

**File**: [src/runtime/compiler/strategies/IdleBlockStrategy.ts](src/runtime/compiler/strategies/IdleBlockStrategy.ts)

Allocate `DisplayFragmentMemory` in `build()`, or make `useStackFragmentSources()`
handle Idle blocks as a special case.

### P1 — Consistency: All directly-constructed blocks need fragment:display

**Files**: `WorkoutRootStrategy.ts`, `IdleBlockStrategy.ts`

Both use `new RuntimeBlock(...)` directly, skipping `BlockBuilder`. Either:
- Migrate them to use `BlockBuilder`, or
- Add manual `DisplayFragmentMemory` allocation after construction.

### P2 — Group/Root blocks should emit output statements

**File**: Various behaviors

`HistoryRecordBehavior` emits events, not output statements. Add `SegmentOutputBehavior`
to Group blocks so they appear in the history log.

### P2 — Consider showing active items in history log

**File**: [src/components/layout/TimerIndexPanel.tsx](src/components/layout/TimerIndexPanel.tsx)

Change `showActive={false}` to `showActive={true}` or add a separate active section
at the top/bottom of the history log so users can see what's currently executing.

---

## Test Plan

1. **Unit**: Verify `EffortFallbackStrategy` allocates `fragment:display` memory
2. **Unit**: Verify `useStackFragmentSources()` returns entries for blocks without display memory
3. **Integration**: Run a multi-section workout (e.g., `5 Rounds: 10 Push-ups, 15 Squats`)
   and verify all child blocks appear in stack view as they execute
4. **Visual**: Check Storybook runtime stories show effort blocks in the stack panel
5. **Regression**: Ensure Timer/AMRAP/Rounds blocks still display correctly
