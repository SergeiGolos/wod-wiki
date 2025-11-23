# Fix: Runtime Execution Loop & React Update Depth

## Issue
The user reported a "Maximum update depth exceeded" warning in `useRuntimeExecution.ts`.
This was caused by a race condition in the `start()` function of the `useRuntimeExecution` hook.

## Root Cause
The `start()` function was executing the first step synchronously BEFORE setting the interval.
```typescript
// OLD CODE
executeStep(); // If this calls stop(), stop() tries to clear intervalRef.current (which is null)
intervalRef.current = setInterval(executeStep, ...); // Interval starts anyway
```

If `executeStep()` determined the runtime was complete (or errored), it would call `stop()`.
`stop()` would attempt to clear `intervalRef.current`, but since the interval hadn't been assigned yet, it failed.
The interval would then be created and continue running, causing `executeStep()` to be called repeatedly.
Each call would trigger `stop()` (setting status to 'idle') and `setStepCount(0)`, while `start()` had set status to 'running'.
This rapid state thrashing likely caused the React update depth warning or at least a severe performance issue.

## Fix
Swapped the order of operations in `start()`:
```typescript
// NEW CODE
intervalRef.current = setInterval(executeStep, ...); // Set interval first
executeStep(); // Then execute step. If it calls stop(), stop() can correctly clear the interval.
```

## Fix 2: Removed Immediate Execution & Optimized Layout

### Issue
The "Maximum update depth exceeded" error persisted.
This was likely due to `start()` calling `executeStep()` synchronously, which updated state, which triggered a re-render, which somehow re-triggered the loop (possibly through `RuntimeLayout` effects).

### Fix
1. **`useRuntimeExecution.ts`**: Removed the immediate `executeStep()` call in `start()`. Now execution starts after the first 20ms tick. This ensures `start()` returns immediately and breaks any synchronous update chain.
2. **`RuntimeLayout.tsx`**: Added deep comparison checks (via JSON.stringify and length checks) to `setRuntimeSegments` and `setActiveSegmentId` to prevent state updates when data hasn't changed.

### Verification
- Updated `useRuntimeExecution.test.ts` to reflect the 20ms delay in start.
- Tests passed.

## Additional Changes
- Updated `ScriptRuntime.ts` to fix TypeScript errors related to `MemorySearchCriteria` (missing required fields).
