# UI Alignment Plan

> Comprehensive plan for aligning UI components with the new runtime architecture.

## Executive Summary

The runtime architecture has changed significantly:
- **Memory is block-level**, not runtime-level
- **Stack subscriptions** replace global memory subscriptions
- **Output statements** provide workout history and analytics
- **StartWorkoutAction** is the new entry point for workout initialization

Several UI components use deprecated patterns like `runtime.memory.search()` which no longer exists, causing Storybook crashes and broken functionality.

---

## Architecture Overview

### Old Pattern (Deprecated) ❌

```typescript
// Runtime had a global memory store
const runtime = useRuntimeContext();
const refs = runtime.memory.search({ type: 'timer', ownerId: blockKey });
const timerRef = refs[0];
const value = useMemorySubscription(timerRef);

// Subscribe to global memory changes
runtime.memory.subscribe(() => { ... });
```

### New Pattern (Current) ✅

```typescript
// Memory is on blocks, accessed via stack
import { searchStackMemory } from '@/runtime/utils/MemoryUtils';

const runtime = useRuntimeContext();
const refs = searchStackMemory(runtime, { type: 'timer', ownerId: blockKey });

// Or directly from a block
const timerEntry = block.getMemory('timer');
const value = timerEntry?.value;

// Subscribe to block memory
const unsubscribe = timerEntry?.subscribe((newValue) => { ... });

// Subscribe to stack changes
const unsubscribe = runtime.stack.subscribe((event) => { ... });
```

---

## API Comparison

| Old API (Deprecated) | New API (Current) | Notes |
|---------------------|-------------------|-------|
| `runtime.memory.search(criteria)` | `searchStackMemory(runtime, criteria)` | Utility in `@/runtime/utils/MemoryUtils` |
| `runtime.memory.subscribe(fn)` | `runtime.stack.subscribe(fn)` | Stack events: push/pop/initial |
| N/A | `runtime.subscribeToOutput(fn)` | For workout history/analytics |
| N/A | `runtime.getOutputStatements()` | Get all output statements |
| N/A | `block.getMemory(type)` | Direct block memory access |

---

## Impacted Components

### 🔴 CRITICAL (Broken - Storybook Crash)

| Component | File | Issue | Priority |
|-----------|------|-------|----------|
| **TimerDisplay** | [TimerDisplay.tsx](../src/components/workout/TimerDisplay.tsx) | Uses `runtime.memory.search()` at lines 73, 87, 100 | P0 |
| **RuntimeDebugPanel** | [RuntimeDebugPanel.tsx](../src/components/workout/RuntimeDebugPanel.tsx) | Uses `runtime.memory.subscribe()` at line 134 | P0 |

### 🟡 IMPORTANT (Likely Broken)

| Component | File | Issue | Priority |
|-----------|------|-------|----------|
| RuntimeProvider | [RuntimeProvider.tsx](../src/components/layout/RuntimeProvider.tsx) | May expose deprecated memory API | P1 |
| useDisplayStack hook | [useDisplayStack.ts](../src/clock/hooks/useDisplayStack.ts) | Uses searchStackMemory - OK, but verify | P2 |
| useMemoryVisualization | [useMemoryVisualization.ts](../src/runtime-test-bench/hooks/useMemoryVisualization.ts) | Verify memory access patterns | P2 |

### 🟢 WORKING (Already Updated)

| Component | File | Status |
|-----------|------|--------|
| RuntimeTestBench | [RuntimeTestBench.tsx](../src/runtime-test-bench/RuntimeTestBench.tsx) | Uses StartWorkoutAction ✅ |
| BlockTestBench | [BlockTestBench.tsx](../src/runtime-test-bench/components/BlockTestBench.tsx) | Uses StartWorkoutAction ✅ |
| useBlockMemory | [useBlockMemory.ts](../src/runtime/hooks/useBlockMemory.ts) | Uses block.getMemory() ✅ |

---

## Migration Guide

### Step 1: Replace runtime.memory.search()

**Before:**
```typescript
const controlsRef = useMemo(() => {
  const refs = runtime.memory.search({
    type: 'runtime-controls',
    ownerId: null
  });
  return refs[0] as TypedMemoryReference<RuntimeControls>;
}, [runtime]);
```

**After:**
```typescript
import { searchStackMemory } from '@/runtime/utils/MemoryUtils';

const controlsRef = useMemo(() => {
  const refs = searchStackMemory(runtime, {
    type: 'runtime-controls',
    ownerId: null
  });
  return refs[0] as TypedMemoryReference<RuntimeControls>;
}, [runtime]);
```

### Step 2: Replace runtime.memory.subscribe()

**Before:**
```typescript
useEffect(() => {
  const unsubscribe = runtime.memory.subscribe(() => {
    setSnapshotVersion(v => v + 1);
  });
  return unsubscribe;
}, [runtime]);
```

**After:**
```typescript
useEffect(() => {
  // Subscribe to stack changes
  const unsubscribeStack = runtime.stack.subscribe((event) => {
    setSnapshotVersion(v => v + 1);
  });
  
  return () => {
    unsubscribeStack();
  };
}, [runtime]);
```

### Step 3: Use Block-Based Hooks When Possible

**Preferred pattern (when you have a block reference):**
```typescript
import { useBlockMemory, useTimerState } from '@/runtime/hooks';

function BlockTimer({ block }: { block: IRuntimeBlock }) {
  // Generic memory access
  const display = useBlockMemory(block, 'display');
  
  // Or use typed helper hooks
  const timerState = useTimerState(block);
  const roundState = useRoundState(block);
  
  return <div>{timerState?.elapsed}</div>;
}
```

### Step 4: Subscribe to Stack for Block Changes

```typescript
import { useRuntimeContext } from '@/runtime/context/RuntimeContext';

function WorkoutDisplay() {
  const runtime = useRuntimeContext();
  const [blocks, setBlocks] = useState<IRuntimeBlock[]>([]);
  
  useEffect(() => {
    const unsubscribe = runtime.stack.subscribe((event) => {
      if (event.type === 'initial') {
        setBlocks([...event.blocks]);
      } else if (event.type === 'push') {
        setBlocks(prev => [...prev, event.block]);
      } else if (event.type === 'pop') {
        setBlocks(prev => prev.filter(b => b !== event.block));
      }
    });
    
    return unsubscribe;
  }, [runtime]);
  
  return (
    <div>
      {blocks.map(block => (
        <BlockCard key={block.key.value} block={block} />
      ))}
    </div>
  );
}
```

---

## Detailed Fix Plan: TimerDisplay.tsx

### Current Code (Broken)

```typescript
// Line 69
const runtime = useRuntimeContext();

// Line 73 - BROKEN: runtime.memory doesn't exist
const controlsRef = useMemo(() => {
  const refs = runtime.memory.search({
    type: 'runtime-controls',
    id: null,
    ownerId: null,
    visibility: null
  });
  return refs.length > 0 ? (refs[refs.length - 1] as TypedMemoryReference<RuntimeControls>) : undefined;
}, [runtime]);
```

### Fixed Code

```typescript
import { searchStackMemory } from '../../runtime/utils/MemoryUtils';

// Line 69
const runtime = useRuntimeContext();

// Line 73 - FIXED: Use searchStackMemory utility
const controlsRef = useMemo(() => {
  const refs = searchStackMemory(runtime, {
    type: 'runtime-controls',
    ownerId: null
  });
  return refs.length > 0 ? (refs[refs.length - 1] as TypedMemoryReference<RuntimeControls>) : undefined;
}, [runtime]);
```

### Changes Required

| Line | Change |
|------|--------|
| 1-20 | Add import for `searchStackMemory` |
| 73-79 | Replace `runtime.memory.search()` with `searchStackMemory(runtime, ...)` |
| 87-94 | Replace `runtime.memory.search()` with `searchStackMemory(runtime, ...)` |
| 100-107 | Replace `runtime.memory.search()` with `searchStackMemory(runtime, ...)` |

---

## Detailed Fix Plan: RuntimeDebugPanel.tsx

### Current Code (Broken)

```typescript
// Line 134 - BROKEN: runtime.memory doesn't exist
const unsubscribe = runtime.memory.subscribe(() => {
  setSnapshotVersion(v => v + 1);
});
```

### Fixed Code

```typescript
// Line 134 - FIXED: Use stack.subscribe
const unsubscribeStack = runtime.stack.subscribe(() => {
  setSnapshotVersion(v => v + 1);
});
```

### Additional Considerations

The RuntimeDebugPanel also uses a polling interval for stack changes:
```typescript
// Line 140-142
const intervalId = setInterval(() => {
  setSnapshotVersion(v => v + 1);
}, 100);
```

With stack subscriptions, this polling may become unnecessary. Consider removing it after adding stack subscription.

---

## New Hooks to Consider

### useStackBlocks Hook

Create a new hook for reactive stack access:

```typescript
// src/runtime/hooks/useStackBlocks.ts
import { useState, useEffect } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';

export function useStackBlocks(): readonly IRuntimeBlock[] {
  const runtime = useRuntimeContext();
  const [blocks, setBlocks] = useState<readonly IRuntimeBlock[]>(runtime.stack.blocks);
  
  useEffect(() => {
    const unsubscribe = runtime.stack.subscribe((event) => {
      setBlocks([...runtime.stack.blocks]);
    });
    
    return unsubscribe;
  }, [runtime]);
  
  return blocks;
}

export function useCurrentBlock(): IRuntimeBlock | undefined {
  const blocks = useStackBlocks();
  return blocks[blocks.length - 1];
}
```

### useOutputStatements Hook

Create a hook for workout history and analytics:

```typescript
// src/runtime/hooks/useOutputStatements.ts
import { useState, useEffect } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { IOutputStatement } from '@/core/models/OutputStatement';

export function useOutputStatements(): IOutputStatement[] {
  const runtime = useRuntimeContext();
  const [outputs, setOutputs] = useState<IOutputStatement[]>(runtime.getOutputStatements());
  
  useEffect(() => {
    const unsubscribe = runtime.subscribeToOutput((output) => {
      setOutputs(runtime.getOutputStatements());
    });
    
    return unsubscribe;
  }, [runtime]);
  
  return outputs;
}
```

---

## Implementation Phases

### Phase 1: Fix Critical Breakages (Immediate)

1. **Fix TimerDisplay.tsx**
   - Replace 3 occurrences of `runtime.memory.search()` with `searchStackMemory()`
   - Verify Storybook loads without crash
   - Test timer functionality

2. **Fix RuntimeDebugPanel.tsx**
   - Replace `runtime.memory.subscribe()` with `runtime.stack.subscribe()`
   - Remove unnecessary polling interval
   - Verify debug panel updates on stack changes

### Phase 2: Create Foundation Hooks (1-2 days)

1. Create `useStackBlocks` hook
2. Create `useCurrentBlock` hook
3. Create `useOutputStatements` hook
4. Export from `@/runtime/hooks/index.ts`

### Phase 3: Migrate Remaining Components (3-5 days)

1. Audit all components using deprecated patterns
2. Update each component using new hooks
3. Add tests for migrated components
4. Update Storybook stories

### Phase 4: Documentation & Cleanup (1 day)

1. Update UI Layer documentation ([05-ui-layer.md](../docs/layers/05-ui-layer.md))
2. Add migration guide to README
3. Mark deprecated APIs with `@deprecated` JSDoc
4. Remove deprecated code after migration period

---

## Testing Strategy

### Unit Tests

Each migrated component should have tests verifying:
- Correct subscription to stack changes
- Proper cleanup on unmount
- Memory reference updates trigger re-renders

### Integration Tests

- Verify workout start → timer display → completion flow
- Test stack push/pop triggers UI updates
- Validate output statements appear in history

### Storybook Stories

Each component should have stories demonstrating:
- Default state (empty stack)
- Active state (with blocks on stack)
- Transition states (push/pop animations)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing UI during migration | High | Phase migration, fix critical first |
| Memory leaks from improper cleanup | Medium | Use `useEffect` cleanup patterns, test unmount |
| Performance regression | Low | Stack subscriptions are efficient, remove polling |
| Missing edge cases | Medium | Comprehensive testing, Storybook stories |

---

## Success Criteria

1. ✅ Storybook loads without crashes
2. ✅ Timer displays update correctly during workout
3. ✅ Debug panel shows real-time stack state
4. ✅ All unit tests pass
5. ✅ No `runtime.memory` references in codebase
6. ✅ Documentation updated

---

## References

- [IRuntimeStack Contract](../src/runtime/contracts/IRuntimeStack.ts)
- [IScriptRuntime Contract](../src/runtime/contracts/IScriptRuntime.ts)
- [searchStackMemory Utility](../src/runtime/utils/MemoryUtils.ts)
- [Runtime Hooks Index](../src/runtime/hooks/index.ts)
- [UI Layer Documentation](../docs/layers/05-ui-layer.md)
