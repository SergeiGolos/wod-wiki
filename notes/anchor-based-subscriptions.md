# Anchor-Based Subscription Model for UI Data Binding

## 1. Introduction and Motivation

The WOD Wiki runtime environment features a robust, decoupled memory system that allows for real-time state management during a workout. UI components can subscribe to changes in this memory to display live data, such as timers and rep counts.

The existing subscription model, while powerful, requires UI components to have specific knowledge of the data they need to display. A component must know the `ownerId` (typically a block key) and `type` of the memory reference it needs to find and subscribe to. This creates a tight coupling between the UI and the data's underlying structure and ownership.

As the application's complexity grows, this coupling presents challenges:

*   **Lack of Flexibility**: If a UI element needs to display data from a different source (e.g., switching from a block's local timer to a global workout timer), the component's internal logic must be changed.
*   **Boilerplate Code**: Components often repeat the same logic for searching for and subscribing to memory references.
*   **Decentralized Logic**: The responsibility for finding the correct data source is placed on the UI component, rather than being managed by the runtime behaviors that produce the data.

The **Anchor-Based Subscription Model** is a new architectural pattern designed to solve these problems. It introduces a layer of indirection that decouples UI components from specific data implementations, leading to a more flexible, maintainable, and scalable system.

## 2. Core Concepts

This model builds upon the existing runtime memory architecture by introducing a new type of memory reference: the **Anchor**.

### 2.1. Runtime Memory and Memory References

*   **`IRuntimeMemory`**: The central, in-memory store for all dynamic workout data.
*   **`TypedMemoryReference<T>`**: A typed "pointer" to a specific location in the runtime memory. It contains metadata like `id`, `ownerId`, `type`, and `visibility`. UI components subscribe to these references to get live data updates.

### 2.2. The Anchor Reference

An **Anchor** is a special, stable memory reference that acts as a named pointer. Its purpose is to resolve to one or more other memory references that should be displayed in a particular UI context.

*   **Stable Identifier**: An anchor has a well-known, semantic ID (e.g., `anchor-main-workout-clock`). UI components can be hardcoded to this stable ID.
*   **Dynamic Target**: While the anchor's ID is stable, the data it *points to* can be changed dynamically at runtime.

### 2.3. The Anchor's Value (Meta-Entry)

Unlike a standard memory reference that holds a direct value (like a number or a boolean), an anchor's value is a **meta-entry**. This meta-entry is not the data itself, but rather the *information required to find the data*.

This information is typically a search query that can be passed to the `IRuntimeMemory.search()` method.

```typescript
// The structure of the value stored within an anchor reference
interface IAnchorValue {
  // Search criteria used to find the target memory reference(s)
  searchCriteria: Partial<MemorySearchCriteria>; 
}
```

For example, the value of the `anchor-main-workout-clock` might be:
`{ searchCriteria: { ownerId: 'block-xyz-123', type: 'timer-time-spans' } }`

## 3. How It Works: A Detailed Workflow

The following steps illustrate the lifecycle of data from its creation to its display in the UI using the anchor model.

1.  **Data Creation**: A runtime behavior (e.g., `TimerBehavior` for a `Stopwatch` block) is activated. It allocates memory references for the data it manages.
    *   `mem-abc`: A `TypedMemoryReference<TimeSpan[]>` for the timer's time spans.
    *   `mem-def`: A `TypedMemoryReference<boolean>` for the timer's running state.

2.  **Anchor Creation/Update**: The same behavior creates or updates a well-known anchor to point to this new data. It allocates a new memory reference of type `ANCHOR` and sets its value to a search query that can find the data references.
    *   `anchor-main-clock`: A `TypedMemoryReference<IAnchorValue>` is created.
    *   Its value is set to `{ searchCriteria: { ownerId: 'stopwatch-block-id', type: 'timer-time-spans' } }`.

3.  **UI Component Binding**: A UI component, such as `<ClockDisplay>`, is designed to display data from a specific anchor. It is given the anchor's stable ID as a prop.
    ```tsx
    <ClockDisplay anchorId="anchor-main-workout-clock" />
    ```

4.  **Anchor Subscription**: The component uses the `useAnchorSubscription` hook. This hook performs the following steps:
    a.  It searches the runtime memory for the anchor reference with the ID `anchor-main-workout-clock`.
    b.  It subscribes to this anchor reference itself. This is crucial, as it allows the hook to react if the anchor is later updated to point to a *different* timer.
    c.  It reads the anchor's current value (the `IAnchorValue` object).

5.  **Data Resolution and Subscription**:
    a.  The hook uses the `searchCriteria` from the anchor's value to search the runtime memory for the actual data references (`mem-abc` and `mem-def`).
    b.  It then uses the standard `useMemorySubscription` hook internally to subscribe to these data references.

6.  **Data Display**: The `useAnchorSubscription` hook returns the live data (e.g., the calculated elapsed time) to the `<ClockDisplay>` component, which simply renders it.

When a new timed section of the workout begins, its behavior will update the value of the `anchor-main-workout-clock` to point to the new timer's data. The `useAnchorSubscription` hook will detect this change, automatically re-subscribe to the new data sources, and the UI will update seamlessly without the `<ClockDisplay>` component needing any new information.

## 4. Implementation Guide

### 4.1. Add the `ANCHOR` Memory Type

First, extend the `MemoryTypeEnum` to include a type for anchors.

**File**: `src/runtime/MemoryTypeEnum.ts`
```typescript
export enum MemoryTypeEnum {
  // ... existing types
  ANCHOR = 'anchor',
}
```

### 4.2. Create and Update Anchors (Behavior-Side)

Runtime behaviors are responsible for managing the lifecycle of anchors.

```typescript
// Inside a runtime behavior (e.g., TimerBehavior.ts)

// When a timer block is initialized...
const timerBlockId = context.getBlockKey();

// 1. Allocate the actual data memory
const timeSpansRef = context.allocate<TimeSpan[]>(MemoryTypeEnum.TIMER_TIME_SPANS, timerBlockId, []);
const isRunningRef = context.allocate<boolean>(MemoryTypeEnum.TIMER_IS_RUNNING, timerBlockId, false);

// 2. Allocate or update the anchor to point to this timer's data
const anchorRef = context.getOrCreateAnchor('anchor-main-workout-clock');
anchorRef.set({
    searchCriteria: {
        ownerId: timerBlockId,
        type: MemoryTypeEnum.TIMER_TIME_SPANS // The primary data type to look for
    }
});
```

### 4.3. Create the `useAnchorSubscription` Hook

This new hook is the primary interface for UI components to consume data via anchors.

```typescript
// A conceptual implementation of the hook

import { useRuntimeContext } from './context/RuntimeContext';
import { useMemorySubscription } from './useMemorySubscription';
import { MemoryTypeEnum } from './MemoryTypeEnum';

export function useAnchorSubscription<T>(anchorId: string): T | undefined {
  const runtime = useRuntimeContext();

  // 1. Find the anchor reference itself (this should be stable)
  const anchorRef = useMemo(() => {
    const refs = runtime.memory.search({ id: anchorId, type: MemoryTypeEnum.ANCHOR });
    return refs[0] as TypedMemoryReference<IAnchorValue> | undefined;
  }, [runtime, anchorId]);

  // 2. Subscribe to the anchor's value. If it changes, we'll re-run the search.
  const anchorValue = useMemorySubscription(anchorRef);

  // 3. Find the target data reference based on the anchor's value
  const dataRef = useMemo(() => {
    if (!anchorValue?.searchCriteria) return undefined;
    const dataRefs = runtime.memory.search(anchorValue.searchCriteria);
    return dataRefs[0] as TypedMemoryReference<T> | undefined;
  }, [runtime, anchorValue]);

  // 4. Subscribe to the actual data and return it
  return useMemorySubscription(dataRef);
}
```

### 4.4. Subscribing to Anchors in the UI (Component-Side)

UI components become much simpler. They are no longer concerned with searching for data, only with displaying it.

```tsx
// In a component like <ClockDisplay.tsx>

import { useAnchorSubscription } from '../runtime/hooks/useAnchorSubscription';
import { useTimerElapsed } from '../runtime/hooks/useTimerElapsed'; // This hook could be refactored to use the anchor hook

interface ClockDisplayProps {
  anchorId: string;
}

export function ClockDisplay({ anchorId }: ClockDisplayProps) {
  // In a timer-specific scenario, a specialized hook might still be used,
  // but it would use useAnchorSubscription internally.
  
  // For a generic metric display:
  const metricValue = useAnchorSubscription<number>(anchorId);

  return (
    <div>
      <h2>Metric</h2>
      <span>{metricValue ?? 'N/A'}</span>
    </div>
  );
}
```

## 5. Benefits of the Anchor-Based Model

*   **Strong Decoupling**: UI components are completely decoupled from the source and ownership of the data. They only need a stable, semantic anchor ID.
*   **Centralized Control**: The logic for mapping data to the UI is moved into the runtime behaviors, where it belongs. This makes the system's data flow easier to understand and manage.
*   **Enhanced Flexibility**: The data source for a UI element can be changed dynamically at runtime by simply updating an anchor's value. This allows for complex and adaptive UI scenarios without modifying component code.
*   **Simplified UI Components**: Components become simpler, more reusable, and easier to test, as they are no longer responsible for complex data-fetching logic.
