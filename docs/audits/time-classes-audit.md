# Time Classes Audit Report

**Date:** 2025-12-27  
**Purpose:** Identify dead code, inconsistencies, and data shape transformations in time-related classes, and propose simplifications.

---

## Executive Summary

The codebase has **multiple overlapping time span representations** that evolved organically as requirements changed. This audit identified:

- **4 different `TimeSpan` type definitions** with incompatible shapes
- **3 different span container models** (`RuntimeSpan`, `ClockSpan`, `CollectionSpan`)
- **2 dead/unused action classes** (`StartTimerAction`, `StopTimerAction`)
- **1 dead behavior** (`PrimaryClockBehavior`)
- **1 dead model** (`CollectionSpan`)
- **Multiple data shape transformations** required for UI consumption

---

## 1. Inventory of Time-Related Types

### 1.1 Time Span Types (DUPLICATED)

| Type | Location | Shape | Used By |
|------|----------|-------|---------|
| `TimerSpan` | `runtime/models/RuntimeSpan.ts` | `{ started: number, ended?: number }` | `RuntimeSpan`, `TimerBehavior`, `TimerStateManager`, UI hooks |
| `ClockSpan` | `runtime/IRuntimeClock.ts` | `{ start: Date, stop?: Date }` | `RuntimeClock` only |
| `TimeSpan` | `lib/timeUtils.ts` | `{ start: number, stop?: number }` | `calculateDuration()` utility |
| `TimeSpan` | `core/models/CollectionSpan.ts` | `{ start?: Date, stop?: Date }` | **DEAD CODE** - no imports |
| `TimeSpan` | `runtime/actions/StartTimerAction.ts` | `{ start?: Date, stop?: Date }` | **DEAD CODE** - no imports |

**Problem:** Same concept, different shapes. `Date` vs `number` timestamps. Optional vs required fields.

---

### 1.2 Span Container Models

| Model | Location | Purpose | Status |
|-------|----------|---------|--------|
| `RuntimeSpan` | `runtime/models/RuntimeSpan.ts` | Unified block execution tracking | **CANONICAL** |
| `ClockSpan` | `runtime/IRuntimeClock.ts` | Global runtime clock tracking | Active but isolated |
| `CollectionSpan` | `core/models/CollectionSpan.ts` | Legacy execution tracking | **DEAD CODE** |

---

### 1.3 Timer Display Types

| Type | Location | Purpose |
|------|----------|---------|
| `ITimerDisplayEntry` | `clock/types/DisplayTypes.ts` | UI display stack entry |
| `TimerDisplayConfig` | `runtime/models/RuntimeSpan.ts` | Embedded in RuntimeSpan |
| `IDisplayStackState` | `clock/types/DisplayTypes.ts` | Complete UI state container |

**Problem:** `ITimerDisplayEntry` has fields that overlap with but don't match `RuntimeSpan.timerConfig`:
- `format: 'countdown' | 'countup'` vs `format: 'up' | 'down'`
- `accumulatedMs`, `startTime`, `isRunning` are duplicated from RuntimeSpan data

---

## 2. Dead Code Identified

### 2.1 Dead Files (No Imports Found)

| File | Reason |
|------|--------|
| `runtime/actions/StartTimerAction.ts` | Not imported anywhere |
| `runtime/actions/StopTimerAction.ts` | Not imported anywhere |
| `runtime/behaviors/PrimaryClockBehavior.ts` | Not imported anywhere |
| `core/models/CollectionSpan.ts` | Not imported anywhere |

### 2.2 Deprecated/Obsolete Patterns

| Item | Location | Issue |
|------|----------|-------|
| `TimeSpan` export alias | `runtime/behaviors/TimerBehavior.ts:6` | `export type TimeSpan = TimerSpan;` - confusing alias |
| deprecated `timeSpans` field | `runtime/hooks/useTimerReferences.ts:11-12` | Always returns `undefined` |
| deprecated `isRunning` field | `runtime/hooks/useTimerReferences.ts:13-14` | Always returns `undefined` |

---

## 3. Data Shape Transformations

### 3.1 RuntimeSpan → ITimerDisplayEntry

**Location:** `runtime/behaviors/TimerStateManager.ts` (lines 66-78)

```typescript
// Data extracted from RuntimeSpan:
const span = new RuntimeSpan(...);

// Transformed into ITimerDisplayEntry:
const timerAction = new PushTimerDisplayAction({
  id: `timer-${block.key}`,
  ownerId: block.key.toString(),
  timerMemoryId: this.timerRef.id,       // Reference, not data
  label: this.label,
  format: this.direction === 'down' ? 'countdown' : 'countup',  // VALUE MAPPING!
  durationMs: this.durationMs,
  role: finalRole,
  accumulatedMs: 0,                       // CALCULATED from spans
  startTime: autoStart ? startTime : undefined,  // DERIVED
  isRunning: autoStart                    // DERIVED
});
```

**Problem:** UI needs pre-calculated values that must be kept in sync with RuntimeSpan.

---

### 3.2 RuntimeSpan → UpdateTimerDisplayAction

**Location:** `runtime/behaviors/TimerStateManager.ts` (lines 134-150)

```typescript
// Must recalculate on every span change:
const active = span.isActive();
const spans = span.spans;
const closedSpans = active ? spans.slice(0, -1) : spans;
const accumulated = closedSpans.reduce((acc, s) => acc + s.duration, 0);
const currentStart = active ? lastSpan?.started : undefined;

new UpdateTimerDisplayAction(`timer-${span.blockId}`, {
  accumulatedMs: accumulated,
  startTime: currentStart,
  isRunning: active
}).do(runtime);
```

**Problem:** Every state change requires manual recalculation and synchronization.

---

### 3.3 Memory → UI Hooks

**Location:** `runtime/hooks/useTimerElapsed.ts`

```typescript
// Hook must derive values from spans array:
const elapsed = useMemo(() => {
  if (timeSpans.length === 0) return 0;
  return timeSpans.reduce((total, span) => {
    const end = span.ended ?? now;
    return total + Math.max(0, end - span.started);
  }, 0);
}, [timeSpans, now]);

// Separately derive isRunning from span state:
const isRunning = timeSpans.length > 0 && 
  timeSpans[timeSpans.length - 1].ended === undefined;
```

**Problem:** Same calculations repeated in multiple places (TimerStateManager, useTimerElapsed, StackedClockDisplay, EnhancedTimerHarness).

---

### 3.4 ClockSpan vs TimerSpan Shapes

**RuntimeClock (ClockSpan):**
```typescript
interface ClockSpan {
  start: Date;    // Date object
  stop?: Date;
}
```

**RuntimeSpan (TimerSpan):**
```typescript
class TimerSpan {
  started: number;  // epoch ms
  ended?: number;
}
```

**Problem:** Can't share utility functions. Different field names (`start`/`stop` vs `started`/`ended`).

---

## 4. Inconsistencies

### 4.1 Timer Direction Naming

| Location | Value |
|----------|-------|
| `TimerBehavior` constructor | `'up' \| 'down'` |
| `RuntimeSpan.TimerDisplayConfig.format` | `'up' \| 'down'` |
| `ITimerDisplayEntry.format` | `'countdown' \| 'countup'` |
| `EnhancedTimerHarnessProps.timerType` | `'countdown' \| 'countup'` |
| `core/types/clock.ts` | `'countdown' \| 'countup'` |

### 4.2 Event Naming

| Expected | Actual Dispatch | Listener |
|----------|-----------------|----------|
| `timer:tick` | `TickEvent` (name: `'tick'`) | `SoundBehavior` waits for `timer:tick` |

**SoundBehavior is never triggered** because `useRuntimeExecution` dispatches `TickEvent` with `name: 'tick'`, not `'timer:tick'`.

### 4.3 timestamp Types

| Class | Timestamp Type |
|-------|----------------|
| `RuntimeClock` | `Date` |
| `TimerSpan` | `number` (epoch ms) |
| `ClockSpan` | `Date` |
| `IEvent.timestamp` | `Date` |
| `BlockLifecycleOptions.startTime` | `Date` |
| `BlockLifecycleOptions.completedAt` | `Date` |

---

## 5. Complexity Hotspots

### 5.1 TimerStateManager

This class is doing too much:
1. Allocating RuntimeSpan to memory
2. Calculating accumulated time from spans
3. Dispatching PushTimerDisplayAction
4. Dispatching PushCardDisplayAction
5. Dispatching UpdateTimerDisplayAction on every change

### 5.2 StackedClockDisplay

Must independently:
1. Search memory for RuntimeSpan
2. Subscribe to changes
3. Run its own polling loop for display updates
4. Recalculate elapsed from spans
5. Derive isRunning from span state

### 5.3 Timer Display State Duplication

The same logical state exists in 3 places:
1. **RuntimeSpan.spans** - Source of truth
2. **ITimerDisplayEntry** - Cached/derived for UI
3. **UI component state** - Polling loop for display

---

## 6. Proposed Simplifications

### 6.1 Unify TimeSpan Types

**Create a single canonical type:**

```typescript
// src/runtime/models/TimeSpan.ts
export class TimeSpan {
  constructor(
    public started: number,  // epoch ms - always number for calculations
    public ended?: number
  ) {}

  static fromDate(start: Date, end?: Date): TimeSpan {
    return new TimeSpan(start.getTime(), end?.getTime());
  }

  get duration(): number {
    const end = this.ended ?? Date.now();
    return Math.max(0, end - this.started);
  }

  get isOpen(): boolean {
    return this.ended === undefined;
  }

  get startDate(): Date { return new Date(this.started); }
  get endDate(): Date | undefined { 
    return this.ended ? new Date(this.ended) : undefined; 
  }
}
```

**Migration:**
1. Update `RuntimeSpan` to use this class (already does via `TimerSpan`)
2. Update `RuntimeClock` to use `TimeSpan` instead of `ClockSpan`
3. Delete `ClockSpan`, `CollectionSpan.TimeSpan`, `StartTimerAction.TimeSpan`, `timeUtils.TimeSpan`

### 6.2 Unify Timer Direction Naming

**Standardize on `'up' | 'down'` everywhere:**

```typescript
// clock/types/DisplayTypes.ts
format: 'up' | 'down';  // Was 'countdown' | 'countup'
```

Or vice versa. Pick one and use it consistently.

### 6.3 Eliminate ITimerDisplayEntry Duplication

**Option A: Derive from RuntimeSpan directly**

Remove cached fields from `ITimerDisplayEntry`:
```typescript
interface ITimerDisplayEntry {
  id: string;
  ownerId: string;
  spanMemoryRef: string;  // Just the reference
  role?: 'primary' | 'secondary' | 'auto';
  buttons?: IDisplayButton[];
}
```

UI components read `RuntimeSpan` directly and calculate `elapsed`, `isRunning` locally.

**Option B: Computed getters on RuntimeSpan**

Add getters to RuntimeSpan that UI can use:
```typescript
class RuntimeSpan {
  get accumulatedMs(): number { /* closed spans sum */ }
  get activeStartTime(): number | undefined { /* if running */ }
  get displayFormat(): 'countdown' | 'countup' { 
    return this.timerConfig?.format === 'down' ? 'countdown' : 'countup';
  }
}
```

### 6.4 Fix timer:tick Event

**Option A: Rename TickEvent**
```typescript
export class TickEvent implements IEvent {
  readonly name: string = 'timer:tick';  // Was 'tick'
  // ...add elapsedMs, remainingMs, blockId
}
```

**Option B: Remove SoundBehavior's tick dependency**

Have `SoundBehavior` calculate thresholds on its own schedule using RuntimeSpan data, rather than waiting for external events.

### 6.5 Delete Dead Code

```powershell
# Files to delete:
rm src/runtime/actions/StartTimerAction.ts
rm src/runtime/actions/StopTimerAction.ts
rm src/runtime/behaviors/PrimaryClockBehavior.ts
rm src/core/models/CollectionSpan.ts

# Also remove from exports in index files
```

### 6.6 Simplify TimerStateManager

Split responsibilities:
1. `TimerMemoryManager` - Allocates/manages RuntimeSpan in memory
2. Move display action dispatch to the UI layer (subscriptions handle sync)

---

## 7. Migration Checklist

| Task | Priority | Effort |
|------|----------|--------|
| Delete dead code (4 files) | High | Low |
| Unify TimeSpan types | High | Medium |
| Standardize direction naming | Medium | Low |
| Fix timer:tick event mismatch | High | Low |
| Remove deprecated useTimerReferences fields | Low | Low |
| Eliminate ITimerDisplayEntry duplication | Medium | High |
| Simplify TimerStateManager | Low | Medium |

---

## 8. Appendix: File References

### Core Time Classes
- `src/runtime/models/RuntimeSpan.ts` - **KEEP, CANONICAL**
- `src/runtime/RuntimeClock.ts` - Keep, refactor to use unified TimeSpan
- `src/runtime/IRuntimeClock.ts` - Refactor ClockSpan

### Behaviors
- `src/runtime/behaviors/TimerBehavior.ts` - Keep
- `src/runtime/behaviors/TimerStateManager.ts` - Simplify
- `src/runtime/behaviors/SoundBehavior.ts` - Fix timer:tick dependency
- `src/runtime/behaviors/PrimaryClockBehavior.ts` - **DELETE**

### Actions
- `src/runtime/actions/TimerDisplayActions.ts` - Keep
- `src/runtime/actions/StartTimerAction.ts` - **DELETE**
- `src/runtime/actions/StopTimerAction.ts` - **DELETE**

### Hooks
- `src/runtime/hooks/useTimerElapsed.ts` - Keep
- `src/runtime/hooks/useTimerReferences.ts` - Remove deprecated fields
- `src/clock/hooks/useDisplayStack.ts` - Keep

### Types
- `src/clock/types/DisplayTypes.ts` - Simplify ITimerDisplayEntry
- `src/core/types/clock.ts` - Standardize naming
- `src/lib/timeUtils.ts` - Remove duplicate TimeSpan

### Dead Code
- `src/core/models/CollectionSpan.ts` - **DELETE**
