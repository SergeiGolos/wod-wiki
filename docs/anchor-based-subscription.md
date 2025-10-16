# Anchor-Based Subscription Model

## Overview

The Anchor-Based Subscription Model is a pattern for decoupling UI components from specific data sources in the WOD Wiki runtime environment. It introduces a layer of indirection that allows UI components to subscribe to stable "anchor" IDs while runtime behaviors dynamically control what data those anchors point to.

## Core Concepts

### What is an Anchor?

An **anchor** is a special memory reference that acts as a named pointer to other memory references. Think of it as a stable bookmark that can be updated to point to different data sources at runtime.

- **Stable ID**: Anchors have semantic, well-known IDs (e.g., `anchor-main-workout-clock`)
- **Dynamic Target**: The data an anchor points to can change at runtime
- **Meta-Entry**: An anchor's value contains search criteria, not the actual data

### Key Components

1. **`MemoryTypeEnum.ANCHOR`**: A new memory type for anchor references
2. **`IAnchorValue`**: Interface defining anchor metadata (search criteria)
3. **`getOrCreateAnchor()`**: Method to create or retrieve anchors
4. **`useAnchorSubscription()`**: React hook for subscribing to anchored data

## Benefits

### Strong Decoupling
UI components don't need to know:
- Which block owns the data
- What memory type contains the data
- When the data source changes

### Centralized Control
Runtime behaviors control the data-to-UI mapping, making the system easier to understand and maintain.

### Enhanced Flexibility
Change data sources at runtime without modifying component code. Perfect for complex workout flows where different blocks may provide similar data types.

### Simplified Components
Components become simpler, more reusable, and easier to test.

## Usage Guide

### 1. Creating an Anchor (Behavior Side)

In a runtime behavior, create or update an anchor to point to your data:

```typescript
import { MemoryTypeEnum } from '../runtime/MemoryTypeEnum';
import { IAnchorValue } from '../runtime/IAnchorValue';

class TimerBehavior implements IRuntimeBehavior {
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const context = block.context;
    const timerBlockId = block.key.toString();

    // 1. Allocate the actual data memory
    const timeSpansRef = context.allocate<TimeSpan[]>(
      MemoryTypeEnum.TIMER_TIME_SPANS,
      [{ start: new Date(), stop: undefined }],
      'public'
    );

    // 2. Create or update anchor to point to this timer's data
    const anchor = context.getOrCreateAnchor('anchor-main-workout-clock');
    anchor.set({
      searchCriteria: {
        ownerId: timerBlockId,
        type: MemoryTypeEnum.TIMER_TIME_SPANS,
        id: null,
        visibility: null
      }
    });

    return [];
  }
}
```

### 2. Subscribing to an Anchor (UI Side)

In a UI component, subscribe to the anchor by its stable ID:

```tsx
import { useAnchorSubscription } from '../runtime/hooks/useAnchorSubscription';

interface ClockDisplayProps {
  anchorId: string;
}

export function ClockDisplay({ anchorId }: ClockDisplayProps) {
  // Subscribe to the anchor - no need to know about block keys or memory types
  const timeSpans = useAnchorSubscription<TimeSpan[]>(anchorId);
  
  // Calculate elapsed time from time spans
  const elapsed = calculateElapsed(timeSpans);
  
  return (
    <div className="clock-display">
      <h2>Workout Timer</h2>
      <span className="time">{formatTime(elapsed)}</span>
    </div>
  );
}

// Usage
<ClockDisplay anchorId="anchor-main-workout-clock" />
```

### 3. Updating an Anchor at Runtime

When a new timed section begins, update the anchor to point to the new timer:

```typescript
// In a transition between workout sections
const newTimerBlockId = 'timer-block-456';

const anchor = context.getOrCreateAnchor('anchor-main-workout-clock');
anchor.set({
  searchCriteria: {
    ownerId: newTimerBlockId,
    type: MemoryTypeEnum.TIMER_TIME_SPANS,
    id: null,
    visibility: null
  }
});

// UI components subscribed to this anchor will automatically
// update to display the new timer's data
```

## API Reference

### `MemoryTypeEnum.ANCHOR`

```typescript
enum MemoryTypeEnum {
  // ... other types
  ANCHOR = 'anchor',
}
```

The memory type identifier for anchor references.

### `IAnchorValue`

```typescript
interface IAnchorValue {
  searchCriteria: Partial<MemorySearchCriteria>;
}
```

The structure of an anchor's value. Contains search criteria used to find the target memory reference(s).

### `IBlockContext.getOrCreateAnchor()`

```typescript
getOrCreateAnchor(anchorId: string): TypedMemoryReference<IAnchorValue>
```

Gets an existing anchor or creates a new one with the specified ID.

**Parameters:**
- `anchorId`: Stable, semantic ID for the anchor (e.g., 'anchor-main-clock')

**Returns:**
- Typed memory reference for the anchor

**Example:**
```typescript
const anchor = context.getOrCreateAnchor('anchor-main-workout-clock');
anchor.set({
  searchCriteria: {
    ownerId: 'timer-123',
    type: MemoryTypeEnum.TIMER_TIME_SPANS
  }
});
```

### `useAnchorSubscription<T>()`

```typescript
function useAnchorSubscription<T>(anchorId: string): T | undefined
```

React hook for subscribing to data via anchor references.

**Parameters:**
- `anchorId`: The stable ID of the anchor to subscribe to

**Returns:**
- The current value from the resolved data reference, or undefined if not available

**Example:**
```tsx
function TimerDisplay({ anchorId }: { anchorId: string }) {
  const timeSpans = useAnchorSubscription<TimeSpan[]>(anchorId);
  
  if (!timeSpans) {
    return <div>No timer data</div>;
  }
  
  const elapsed = calculateElapsed(timeSpans);
  return <div>{formatTime(elapsed)}</div>;
}
```

## Common Patterns

### Pattern 1: Main Workout Clock

Create a single anchor that always points to the "main" timer for the current workout section:

```typescript
// In each timer behavior
const anchor = context.getOrCreateAnchor('anchor-main-workout-clock');
anchor.set({
  searchCriteria: {
    ownerId: block.key.toString(),
    type: MemoryTypeEnum.TIMER_TIME_SPANS
  }
});

// In UI
<ClockDisplay anchorId="anchor-main-workout-clock" />
```

### Pattern 2: Round-Specific Data

Create anchors for specific workout rounds:

```typescript
// In rounds behavior
const anchor = context.getOrCreateAnchor('anchor-current-round');
anchor.set({
  searchCriteria: {
    ownerId: block.key.toString(),
    type: MemoryTypeEnum.ROUNDS_CURRENT
  }
});

// In UI
const currentRound = useAnchorSubscription<number>('anchor-current-round');
```

### Pattern 3: Multiple Anchors for Complex UI

Create multiple anchors for different UI sections:

```typescript
// Main clock anchor
const clockAnchor = context.getOrCreateAnchor('anchor-main-clock');
clockAnchor.set({ searchCriteria: { ... } });

// Status anchor
const statusAnchor = context.getOrCreateAnchor('anchor-workout-status');
statusAnchor.set({ searchCriteria: { ... } });

// Metrics anchor
const metricsAnchor = context.getOrCreateAnchor('anchor-current-metrics');
metricsAnchor.set({ searchCriteria: { ... } });
```

### Pattern 4: Conditional Anchors

Use partial search criteria for flexible matching:

```typescript
// Find any running timer
const anchor = context.getOrCreateAnchor('anchor-any-active-timer');
anchor.set({
  searchCriteria: {
    type: MemoryTypeEnum.TIMER_IS_RUNNING,
    // No ownerId - will match first running timer
  }
});
```

## Implementation Details

### How It Works

1. **Anchor Creation**: A behavior calls `getOrCreateAnchor()` with a stable ID
2. **Anchor Value**: The behavior sets the anchor's value to search criteria
3. **UI Subscription**: A component uses `useAnchorSubscription()` with the anchor ID
4. **Resolution**: The hook:
   - Finds the anchor by ID
   - Subscribes to the anchor itself
   - Uses the anchor's search criteria to find target data
   - Subscribes to the target data
5. **Reactivity**: When the anchor value changes, the hook automatically:
   - Unsubscribes from old data
   - Finds and subscribes to new data
   - Updates the component

### Memory Management

- Anchors are tracked by their creating context
- When a context is released, its anchors are cleaned up
- Multiple contexts can reference the same anchor (last context to release it wins)
- Anchors always have `public` visibility

### Performance Considerations

- Anchor resolution involves two memory searches (anchor + data)
- The hook uses `useMemo` to minimize unnecessary searches
- Subscriptions are efficiently managed by React's effect system
- No performance impact on non-anchor-based components

## Testing

### Unit Tests

Test anchor functionality independently:

```typescript
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { BlockContext } from '../runtime/BlockContext';
import { MemoryTypeEnum } from '../runtime/MemoryTypeEnum';

describe('Anchor Functionality', () => {
  let runtime: ScriptRuntime;
  let context: BlockContext;

  beforeEach(() => {
    runtime = new ScriptRuntime();
    context = new BlockContext(runtime, 'test-block', 'test-exercise');
  });

  it('should create and resolve anchor', () => {
    // Create data
    const dataRef = context.allocate<number>(
      MemoryTypeEnum.METRIC_VALUES,
      42,
      'public'
    );

    // Create anchor
    const anchor = context.getOrCreateAnchor('anchor-test');
    anchor.set({
      searchCriteria: {
        ownerId: context.ownerId,
        type: MemoryTypeEnum.METRIC_VALUES
      }
    });

    // Verify anchor value
    const anchorValue = anchor.get();
    expect(anchorValue?.searchCriteria.type).toBe(MemoryTypeEnum.METRIC_VALUES);

    // Resolve anchor
    const resolved = runtime.memory.search({
      id: null,
      ownerId: null,
      type: null,
      visibility: null,
      ...anchorValue!.searchCriteria
    });

    expect(resolved[0]).toBe(dataRef);
  });
});
```

### Integration Tests

Test the React hook behavior:

```typescript
import { renderHook } from '@testing-library/react';
import { useAnchorSubscription } from '../hooks/useAnchorSubscription';
import { RuntimeProvider } from '../context/RuntimeContext';

it('should subscribe to anchored data', () => {
  const runtime = new ScriptRuntime();
  const context = new BlockContext(runtime, 'test-block', 'test-exercise');
  
  // Setup data and anchor
  context.allocate<number>(MemoryTypeEnum.METRIC_VALUES, 42, 'public');
  const anchor = context.getOrCreateAnchor('anchor-test');
  anchor.set({
    searchCriteria: {
      ownerId: context.ownerId,
      type: MemoryTypeEnum.METRIC_VALUES
    }
  });

  // Test hook
  const wrapper = ({ children }) => (
    <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
  );

  const { result } = renderHook(
    () => useAnchorSubscription<number>('anchor-test'),
    { wrapper }
  );

  expect(result.current).toBe(42);
});
```

## Migration Guide

### From Direct Memory Subscription

**Before:**
```tsx
function ClockDisplay({ blockKey }: { blockKey: string }) {
  const runtime = useRuntimeContext();
  
  // Component needs to know about memory types and block ownership
  const timeSpansRef = useMemo(() => {
    const refs = runtime.memory.search({
      ownerId: blockKey,
      type: MemoryTypeEnum.TIMER_TIME_SPANS,
      id: null,
      visibility: null
    });
    return refs[0] as TypedMemoryReference<TimeSpan[]>;
  }, [runtime, blockKey]);
  
  const timeSpans = useMemorySubscription(timeSpansRef);
  // ... render logic
}
```

**After:**
```tsx
function ClockDisplay({ anchorId }: { anchorId: string }) {
  // Component only needs the stable anchor ID
  const timeSpans = useAnchorSubscription<TimeSpan[]>(anchorId);
  // ... render logic
}
```

## Best Practices

1. **Use Semantic Anchor IDs**: Choose descriptive, stable IDs like `anchor-main-workout-clock`
2. **Create Anchors Early**: Set up anchors in behavior initialization (onPush)
3. **Update Anchors Transitionally**: Update anchors during state transitions
4. **Keep Components Simple**: UI components should only know anchor IDs
5. **Document Anchor Contracts**: Clearly document what data type each anchor provides
6. **Test Anchor Resolution**: Write tests that verify anchor resolution works correctly
7. **Handle Undefined Data**: Always handle the case where anchored data doesn't exist

## Troubleshooting

### Anchor Returns Undefined

**Symptom**: `useAnchorSubscription` returns undefined

**Possible Causes:**
1. Anchor doesn't exist - check anchor ID spelling
2. Anchor has no value - verify behavior sets anchor value
3. Search criteria doesn't match any data - check ownerId and type
4. Data hasn't been allocated yet - verify timing of allocation

**Debug:**
```typescript
// Check if anchor exists
const anchors = runtime.memory.search({
  id: 'anchor-main-clock',
  type: MemoryTypeEnum.ANCHOR,
  ownerId: null,
  visibility: null
});
console.log('Anchor found:', anchors.length > 0);

// Check anchor value
const anchor = anchors[0];
const value = anchor?.value();
console.log('Anchor value:', value);

// Check if target data exists
const data = runtime.memory.search({
  id: null,
  ownerId: null,
  type: null,
  visibility: null,
  ...value?.searchCriteria
});
console.log('Target data found:', data.length > 0);
```

### Anchor Not Updating

**Symptom**: Anchor points to old data after update

**Possible Causes:**
1. Anchor value not being set - verify `anchor.set()` is called
2. React not re-rendering - check component dependencies
3. Multiple anchors with same ID - ensure only one anchor per ID

**Solution**: Verify anchor subscription is reactive and re-renders on changes.

## Examples

See the test file `tests/unit/runtime/AnchorSubscription.test.ts` for comprehensive examples of:
- Creating and retrieving anchors
- Setting and updating anchor values
- Resolving anchors to data
- Testing anchor subscriptions
- Handling edge cases

## Future Enhancements

Possible future improvements to the anchor system:

1. **Anchor Validation**: Type-safe anchor IDs with TypeScript literal types
2. **Anchor Registry**: Central registry of well-known anchor IDs
3. **Multi-Target Anchors**: Support for anchors pointing to multiple data sources
4. **Anchor Priorities**: Priority system for resolving multiple matches
5. **Anchor History**: Track anchor value changes over time for debugging
6. **Anchor Middleware**: Intercept and transform anchored data before delivery

## Conclusion

The Anchor-Based Subscription Model provides a powerful abstraction for decoupling UI components from runtime data sources. By introducing stable anchor IDs and dynamic resolution, it enables flexible, maintainable, and scalable workout runtime systems.

For questions or feedback, please refer to the project documentation or create an issue in the GitHub repository.
