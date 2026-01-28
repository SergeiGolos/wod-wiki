# Task: Update UI to Observe Memory State Changes

> **Status:** 📋 Planning  
> **Priority:** Medium  
> **Estimated Effort:** 3-4 hours

## Overview

Update the UI layer to observe block memory state changes from the new aspect-based behavior system. This involves creating observables for memory state, updating components to consume them, and ensuring reactive UI updates.

---

## Prerequisites

- [x] Aspect behaviors implemented
- [x] Memory types defined (`MemoryTypes.ts`)
- [ ] Strategy migration complete
- [ ] Integration tests passing

---

## Current UI Architecture

The current UI likely uses:
- Direct block property access
- Event-based updates
- Possibly RxJS observables

**Target:** Reactive memory-state-driven UI

---

## Detailed Task Breakdown

### Task 1: Analyze Current UI Integration Points

**Duration:** 30 min

**Steps:**
1. [ ] Identify UI components that display runtime state
2. [ ] Map current data flow (block → component)
3. [ ] Document event subscriptions
4. [ ] List observable patterns in use

**Components to Review:**
```
src/ui/
├── components/
│   ├── Timer/
│   │   ├── TimerDisplay.tsx
│   │   └── TimerControls.tsx
│   ├── Round/
│   │   ├── RoundIndicator.tsx
│   │   └── RoundProgress.tsx
│   ├── Workout/
│   │   ├── WorkoutDisplay.tsx
│   │   └── ActionLabel.tsx
│   └── Controls/
│       ├── NextButton.tsx
│       └── PauseButton.tsx
└── hooks/
    ├── useRuntime.ts
    ├── useTimer.ts
    └── useCurrentBlock.ts
```

**Output:** Component → Memory Type mapping table

---

### Task 2: Create Memory State Observables

**Duration:** 45 min

**File:** `src/runtime/observables/MemoryObservables.ts`

**Steps:**
1. [ ] Create observable factory for memory types
2. [ ] Implement memory change detection
3. [ ] Support selective subscriptions (by type)
4. [ ] Handle unmount cleanup

**API Design:**

```typescript
// MemoryObservables.ts

/**
 * Creates an observable for a specific memory type on a block.
 * Emits whenever the memory value changes.
 */
export function observeMemory<T extends MemoryType>(
  block: IRuntimeBlock,
  type: T
): Observable<MemoryTypeMap[T] | undefined> {
  // Implementation
}

/**
 * Creates an observable for all memory changes on a block.
 */
export function observeAllMemory(
  block: IRuntimeBlock
): Observable<Map<MemoryType, unknown>> {
  // Implementation
}

/**
 * Computed observable for timer display state.
 */
export function observeTimerDisplay(
  block: IRuntimeBlock
): Observable<TimerDisplayState> {
  return observeMemory(block, 'timer').pipe(
    map(timer => ({
      elapsed: calculateElapsed(timer),
      remaining: calculateRemaining(timer),
      formatted: formatTime(timer),
      isRunning: !isPaused(timer)
    }))
  );
}

/**
 * Computed observable for round display state.
 */
export function observeRoundDisplay(
  block: IRuntimeBlock
): Observable<RoundDisplayState> {
  return observeMemory(block, 'round').pipe(
    map(round => ({
      current: round?.current ?? 1,
      total: round?.total,
      label: formatRoundLabel(round)
    }))
  );
}
```

---

### Task 3: Create Memory Change Bus

**Duration:** 30 min

**File:** `src/runtime/observables/MemoryChangeBus.ts`

**Steps:**
1. [ ] Create centralized memory change event bus
2. [ ] Integrate with `RuntimeBlock.setMemoryValue()`
3. [ ] Support block-scoped and global subscriptions
4. [ ] Implement efficient batching

**Implementation:**

```typescript
// MemoryChangeBus.ts

interface MemoryChangeEvent<T extends MemoryType = MemoryType> {
  blockKey: string;
  type: T;
  value: MemoryTypeMap[T];
  previousValue: MemoryTypeMap[T] | undefined;
  timestamp: number;
}

export class MemoryChangeBus {
  private subject = new Subject<MemoryChangeEvent>();

  /**
   * Emit a memory change event.
   * Called by RuntimeBlock.setMemoryValue()
   */
  emit<T extends MemoryType>(event: MemoryChangeEvent<T>): void {
    this.subject.next(event);
  }

  /**
   * Subscribe to all memory changes.
   */
  observe(): Observable<MemoryChangeEvent> {
    return this.subject.asObservable();
  }

  /**
   * Subscribe to memory changes for a specific block.
   */
  observeBlock(blockKey: string): Observable<MemoryChangeEvent> {
    return this.subject.pipe(
      filter(e => e.blockKey === blockKey)
    );
  }

  /**
   * Subscribe to a specific memory type across all blocks.
   */
  observeType<T extends MemoryType>(type: T): Observable<MemoryChangeEvent<T>> {
    return this.subject.pipe(
      filter(e => e.type === type)
    ) as Observable<MemoryChangeEvent<T>>;
  }
}

// Singleton instance
export const memoryChangeBus = new MemoryChangeBus();
```

---

### Task 4: Update RuntimeBlock to Emit Changes

**Duration:** 20 min

**File:** `src/runtime/RuntimeBlock.ts`

**Steps:**
1. [ ] Import `memoryChangeBus`
2. [ ] Update `setMemoryValue()` to emit changes
3. [ ] Track previous value for change detection
4. [ ] Optionally batch rapid updates

**Code Changes:**

```typescript
// In RuntimeBlock.ts

import { memoryChangeBus } from './observables/MemoryChangeBus';

public setMemoryValue<T extends MemoryType>(
  type: T,
  value: MemoryTypeMap[T]
): void {
  const previousValue = this.memory.get(type)?.value as MemoryTypeMap[T] | undefined;
  
  // Update memory
  this.memory.set(type, new SimpleMemoryEntry(type, value));
  
  // Emit change
  memoryChangeBus.emit({
    blockKey: this.key.toString(),
    type,
    value,
    previousValue,
    timestamp: Date.now()
  });
}
```

---

### Task 5: Create React Hooks for Memory Consumption

**Duration:** 45 min

**File:** `src/ui/hooks/useBlockMemory.ts`

**Steps:**
1. [ ] Create `useBlockMemory<T>()` hook
2. [ ] Create `useTimerState()` convenience hook
3. [ ] Create `useRoundState()` convenience hook
4. [ ] Create `useDisplayState()` convenience hook
5. [ ] Handle unmount cleanup

**Implementation:**

```typescript
// useBlockMemory.ts

import { useEffect, useState } from 'react';
import { MemoryType, MemoryTypeMap } from '@/runtime/memory/MemoryTypes';
import { observeMemory } from '@/runtime/observables/MemoryObservables';

/**
 * React hook to subscribe to memory state changes.
 */
export function useBlockMemory<T extends MemoryType>(
  block: IRuntimeBlock | undefined,
  type: T
): MemoryTypeMap[T] | undefined {
  const [state, setState] = useState<MemoryTypeMap[T] | undefined>(
    block?.getMemory(type)?.value
  );

  useEffect(() => {
    if (!block) return;

    const subscription = observeMemory(block, type).subscribe(setState);
    return () => subscription.unsubscribe();
  }, [block, type]);

  return state;
}

/**
 * Convenience hook for timer state.
 */
export function useTimerState(block: IRuntimeBlock | undefined) {
  return useBlockMemory(block, 'timer');
}

/**
 * Convenience hook for round state.
 */
export function useRoundState(block: IRuntimeBlock | undefined) {
  return useBlockMemory(block, 'round');
}

/**
 * Convenience hook for display state.
 */
export function useDisplayState(block: IRuntimeBlock | undefined) {
  return useBlockMemory(block, 'display');
}

/**
 * Hook for derived timer display values.
 */
export function useTimerDisplay(block: IRuntimeBlock | undefined) {
  const timer = useTimerState(block);
  const [now, setNow] = useState(Date.now());

  // Update 'now' every animation frame for smooth countdown
  useEffect(() => {
    if (!timer) return;
    
    let running = true;
    const tick = () => {
      if (running) {
        setNow(Date.now());
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
    
    return () => { running = false; };
  }, [timer]);

  if (!timer) return null;

  return {
    elapsed: calculateElapsed(timer.spans, now),
    remaining: timer.durationMs 
      ? Math.max(0, timer.durationMs - calculateElapsed(timer.spans, now))
      : undefined,
    formatted: formatTime(timer, now),
    direction: timer.direction,
    isComplete: timer.durationMs 
      ? calculateElapsed(timer.spans, now) >= timer.durationMs
      : false
  };
}
```

---

### Task 6: Update Timer Display Component

**Duration:** 30 min

**File:** `src/ui/components/Timer/TimerDisplay.tsx`

**Steps:**
1. [ ] Replace direct block access with hook
2. [ ] Use `useTimerDisplay()` for derived values
3. [ ] Add loading/empty states
4. [ ] Ensure smooth countdown animation

**Before:**
```tsx
function TimerDisplay({ block }) {
  // Direct access, may not be reactive
  const elapsed = block.getElapsed();
  return <div>{formatTime(elapsed)}</div>;
}
```

**After:**
```tsx
function TimerDisplay({ block }) {
  const display = useTimerDisplay(block);
  
  if (!display) return null;
  
  return (
    <div className={styles.timer}>
      <span className={styles.time}>{display.formatted}</span>
      {display.remaining !== undefined && (
        <span className={styles.remaining}>
          -{formatTime(display.remaining)}
        </span>
      )}
    </div>
  );
}
```

---

### Task 7: Update Round Display Component

**Duration:** 20 min

**File:** `src/ui/components/Round/RoundIndicator.tsx`

**Steps:**
1. [ ] Replace direct access with `useRoundState()`
2. [ ] Use `useDisplayState()` for formatted round string
3. [ ] Handle unbounded rounds

**Implementation:**
```tsx
function RoundIndicator({ block }) {
  const round = useRoundState(block);
  const display = useDisplayState(block);
  
  if (!round) return null;
  
  return (
    <div className={styles.roundIndicator}>
      {display?.roundDisplay ?? `Round ${round.current}`}
      {round.total && (
        <progress value={round.current} max={round.total} />
      )}
    </div>
  );
}
```

---

### Task 8: Update Control Buttons

**Duration:** 20 min

**File:** `src/ui/components/Controls/ControlButtons.tsx`

**Steps:**
1. [ ] Subscribe to `controls:init` event
2. [ ] Render dynamic buttons from controls state
3. [ ] Handle button actions via event dispatch

**Implementation:**
```tsx
function ControlButtons({ runtime }) {
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  
  useEffect(() => {
    const unsub = runtime.events.subscribe('controls:init', (event) => {
      setButtons(event.data.buttons);
    });
    return unsub;
  }, [runtime]);
  
  return (
    <div className={styles.controls}>
      {buttons.filter(b => b.visible).map(button => (
        <Button
          key={button.id}
          variant={button.variant}
          disabled={!button.enabled}
          onClick={() => runtime.dispatchEvent(button.eventName)}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}
```

---

### Task 9: Integration Testing with UI

**Duration:** 30 min

**File:** `src/ui/__tests__/MemoryIntegration.test.tsx`

**Test Cases:**
1. [ ] Timer display updates on memory change
2. [ ] Round indicator updates on next()
3. [ ] Controls render from controls:init event
4. [ ] Display state drives label changes
5. [ ] Components handle undefined memory gracefully

---

### Task 10: Performance Optimization

**Duration:** 20 min

**Steps:**
1. [ ] Add `useMemo` for derived calculations
2. [ ] Consider `useTransition` for non-urgent updates
3. [ ] Implement shallow comparison for memory objects
4. [ ] Profile re-render frequency

---

## File Structure

```
src/
├── runtime/
│   └── observables/
│       ├── index.ts
│       ├── MemoryChangeBus.ts
│       └── MemoryObservables.ts
└── ui/
    ├── hooks/
    │   ├── useBlockMemory.ts
    │   └── useTimerDisplay.ts
    └── components/
        ├── Timer/
        │   └── TimerDisplay.tsx (updated)
        ├── Round/
        │   └── RoundIndicator.tsx (updated)
        └── Controls/
            └── ControlButtons.tsx (updated)
```

---

## Verification Checklist

| Check | Command |
|-------|---------|
| Type Check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Unit Tests | `npx vitest run src/ui` |
| Storybook | `npm run storybook` (visual verification) |
| E2E Tests | `npx playwright test` |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Over-rendering | Use React.memo, shallow comparison |
| Memory leaks | Cleanup subscriptions in useEffect |
| Stale state | Use refs for rapidly changing values |
| Animation jank | Use requestAnimationFrame for timers |

---

## Success Criteria

- [ ] All components use memory hooks
- [ ] UI updates reactively on memory changes
- [ ] No excessive re-renders (< 5/sec normal operation)
- [ ] Timer countdown smooth (60fps)
- [ ] All existing functionality preserved
- [ ] New hook tests passing
