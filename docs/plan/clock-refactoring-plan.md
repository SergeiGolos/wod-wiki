# IRuntimeClock Refactoring Plan

## Objective
Simplify the `IRuntimeClock` interface to provide consistent time tracking with `Date` timestamps.

## New Simplified Interface

```typescript
export interface ClockSpan {
    start: Date;
    stop?: Date;
}

export interface IRuntimeClock {
    /** Current wall-clock time as a Date */
    readonly now: Date;
    
    /** Total elapsed milliseconds while running (sum of all spans) */
    readonly elapsed: number;
    
    /** Whether the clock is currently running (has an open span) */
    readonly isRunning: boolean;

    /** All time spans tracked by this clock */
    readonly spans: ReadonlyArray<ClockSpan>;
    
    /** Start the clock, returns the start timestamp for event creation */
    start(): Date;
    
    /** Stop the clock, returns the stop timestamp for event creation */
    stop(): Date;
}
```

---

## Completed Changes ✅

### 1. Interface Updates
- [x] `src/runtime/IRuntimeClock.ts` - Simplified interface with `now: Date`, `elapsed: number`, `start()`/`stop()` returning `Date`
- [x] `src/runtime/RuntimeClock.ts` - Reimplemented with span-based tracking and `createMockClock()` helper
- [x] `src/runtime/IRuntimeBlock.ts` - Changed `BlockLifecycleOptions` to use `Date` instead of `RuntimeTimestamp`

### 2. Core Runtime Updates
- [x] `src/runtime/ScriptRuntime.ts` - Updated to use `clock.now` directly, removed `getTimestamp()` helper
- [x] `src/runtime/RuntimeBlock.ts` - Updated to use `clock.now`, fixed elapsed time calculation
- [x] `src/runtime/PushBlockAction.ts` - Simplified to use `clock.now`
- [x] `src/runtime/PopBlockAction.ts` - Simplified to use `clock.now`
- [x] `src/runtime/RuntimeFactory.ts` - Updated to use `clock.now`

### 3. Behavior Updates
- [x] `src/runtime/behaviors/RootLifecycleBehavior.ts` - Updated to use `runtime.clock.now`
- [x] `src/runtime/behaviors/LoopCoordinatorBehavior.ts` - Updated to use `runtime.clock.now`

---

## Remaining Updates 🔧

### High Priority - TimerBehavior
`src/runtime/behaviors/TimerBehavior.ts` needs significant refactoring:

1. **Remove `RuntimeTimestamp` Import** - The old type no longer exists
2. **Replace `captureTimestamp()` private method** - Use `runtime.clock.now` directly
3. **Update span tracking** - TimerBehavior tracks its own spans for pause/resume, may need rethinking
4. **Handle tick mechanism** - Old clock had `register(ITickable)` for animation frame ticks - TimerBehavior needs own interval

**Key Issue:** TimerBehavior was designed to be called via `onTick()` from the RuntimeClock. The new clock doesn't have tick callbacks. TimerBehavior needs to:
- Use its own `setInterval` or `requestAnimationFrame` for tick updates
- Store runtime reference to emit events
- Track elapsed time using Date differences

### Test Files
- `src/runtime/__tests__/LifecycleTimestamps.test.ts` - Uses old `wallTimeMs` format
- `src/runtime/behaviors/__tests__/TimerBehavior.test.ts` - Uses old mock clock pattern
- Other test files need updating for `Date` instead of number timestamps

---

## Benefits of New Design

1. **Simplicity** - `now` returns `Date` directly, no conversion needed
2. **Consistency** - All timestamps are `Date` objects matching `IEvent.timestamp`
3. **Testability** - `createMockClock()` provides easy test mocking with `advance()` and `setTime()`
4. **Span tracking** - Built-in elapsed time calculation from start/stop spans

---

## Migration Notes

### For Event Creation
Before:
```typescript
const ts = captureRuntimeTimestamp(runtime.clock);
runtime.handle({ name: 'event', timestamp: new Date(ts.wallTimeMs), data: {} });
```

After:
```typescript
runtime.handle({ name: 'event', timestamp: runtime.clock.now, data: {} });
```

### For Lifecycle Timing
Before:
```typescript
const startTime = captureRuntimeTimestamp(runtime.clock, options?.startTime);
```

After:
```typescript
const startTime = options?.startTime ?? runtime.clock.now;
```

### For Tests
Before:
```typescript
const clock = {
  captureTimestamp: vi.fn(() => ({ wallTimeMs: Date.now(), monotonicTimeMs: performance.now() })),
  isRunning: true,
  // ...
};
```

After:
```typescript
import { createMockClock } from '../RuntimeClock';
const clock = createMockClock(new Date('2024-01-01T00:00:00'));
clock.advance(1000); // Advance 1 second
```
