# Typed Memory Reference System with Subscription-Based Updates for Clock Pages

## Executive Summary

This document specifies the complete replacement of the current polling-based clock system with a reactive memory reference architecture. The new system extends `TypedMemoryReference<T>` and `RuntimeMemory` with subscription capabilities, enabling components to receive real-time updates when memory locations change. This eliminates the 100ms polling interval in `useTimespan`, replacing it with an event-driven subscription model: `.subscribe((newValue) => { ... })`.

**Scope**: This is a complete refactor of the clock system. All existing clock components (`ClockAnchor`, `useTimespan`) will be rewritten to use the new reactive architecture. No backward compatibility is maintained.

## Current Architecture Analysis

### Existing Clock System

The clock system currently operates through a polling-based architecture:

- **TimeDisplay Component**: Renders time units (days, hours, minutes, seconds) in a structured format
- **ClockAnchor Component**: Receives `CollectionSpan` objects and calculates time using `useTimespan` hook
- **useTimespan Hook**: Implements reactive updates via `setInterval` polling every 100ms for active timers
- **Time Calculation**: Processes `TimeSpan[]` arrays to compute elapsed time from start/stop timestamps

### Current Limitations Requiring Complete Replacement

1. **Performance Overhead**: Continuous polling every 100ms regardless of actual changes
2. **Inefficient Updates**: Multiple components may recalculate identical time values independently
3. **Tight Coupling**: Clock components directly coupled to time calculation logic via `CollectionSpan` objects
4. **Limited Scalability**: No mechanism for other components to receive time updates efficiently
5. **Data Flow Isolation**: `CollectionSpan` objects passed directly to components, bypassing runtime memory system
6. **Missing Runtime Integration**: Clock system operates independently from `RuntimeBlock` lifecycle and behaviors

## Memory Reference Infrastructure

### Existing Memory System

The codebase contains a robust memory reference system:

**RuntimeMemory** (`src/runtime/RuntimeMemory.ts:9-56`)
- Linear storage array for memory locations
- `allocate<T>()`, `get<T>()`, `set<T>()` methods for typed memory access
- Search and release capabilities for memory management

`TypedMemoryReference<T>` (src/runtime/IMemoryReference.ts:15-34`)
- Generic type-safe memory reference implementation
- Encapsulates memory access through getter/setter methods
- Integration with `IRuntimeMemory` interface for backend operations

**Runtime Integration** (`src/runtime/RuntimeBlock.ts:36-44`)
- Runtime blocks allocate typed memory references for state management
- Automatic cleanup on block disposal
- Support for public/private visibility controls

## Reactive Subscription Architecture Design

### Core Subscription Interface

The proposed reactive system extends the existing `TypedMemoryReference<T>` with subscription capabilities:

```typescript
interface IMemorySubscription<T> {
  id: string;
  callback: (newValue: T | undefined, oldValue: T | undefined) => void;
  active: boolean;
}

class TypedMemoryReference<T> {
  private _subscriptions: IMemorySubscription<T>[] = [];

  subscribe(callback: (newValue: T | undefined, oldValue: T | undefined) => void): () => void;
  unsubscribe(subscriptionId: string): void;

  // Enhanced set() method with notification
  set(value: T): void;
}
```

### Memory Change Notification System

**RuntimeMemory Enhancements**
- Observer pattern implementation for change detection
- Subscription management across memory references
- Batched update notifications for performance optimization
- Cleanup mechanism for orphaned subscriptions

**Change Detection Strategy**
- Value comparison using `Object.is()` for primitive types
- Deep comparison for complex object types
- Optional custom comparison functions for specialized types

### Clock Integration Pattern

**Timer Behavior Memory Management**
```typescript
// New behavior for timer-based runtime blocks
export class TimerBehavior implements IRuntimeBehavior {
  private timeSpansRef!: TypedMemoryReference<TimeSpan[]>;
  private isRunningRef!: TypedMemoryReference<boolean>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Allocate timer memory references with public visibility
    // Start with one span that has a start time but no stop time
    const initialSpan: TimeSpan = {
      start: new Date(),
      stop: undefined  // undefined = currently running
    };

    this.timeSpansRef = block.allocate<TimeSpan[]>({
      type: 'timer-time-spans',
      visibility: 'public',
      initialValue: [initialSpan]
    });

    this.isRunningRef = block.allocate<boolean>({
      type: 'timer-is-running',
      visibility: 'public',
      initialValue: true
    });

    return [];
  }

  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Stop the current timer span by adding stop time
    const spans = this.timeSpansRef.get() || [];
    const lastSpan = spans[spans.length - 1];
    
    if (lastSpan && !lastSpan.stop) {
      // Close the last span with current timestamp
      lastSpan.stop = new Date();
      this.timeSpansRef.set([...spans]); // Trigger subscription notification
    }

    this.isRunningRef.set(false);
    return [];
  }

  // Methods to pause/resume timer (creates new spans)
  pause(runtime: IScriptRuntime): void {
    const spans = this.timeSpansRef.get() || [];
    const lastSpan = spans[spans.length - 1];
    
    if (lastSpan && !lastSpan.stop) {
      lastSpan.stop = new Date();
      this.timeSpansRef.set([...spans]);
      this.isRunningRef.set(false);
    }
  }

  resume(runtime: IScriptRuntime): void {
    const spans = this.timeSpansRef.get() || [];
    
    // Add a new span starting now
    const newSpan: TimeSpan = {
      start: new Date(),
      stop: undefined
    };
    
    this.timeSpansRef.set([...spans, newSpan]);
    this.isRunningRef.set(true);
  }
}
```

**Clock Component Subscription Pattern**
```typescript
// React hook for subscribing to timer memory references
export function useMemorySubscription<T>(
  memoryRef: TypedMemoryReference<T> | undefined
): T | undefined {
  const [value, setValue] = useState<T | undefined>(memoryRef?.get());

  useEffect(() => {
    if (!memoryRef) return;

    // Subscribe to memory changes
    const unsubscribe = memoryRef.subscribe((newValue) => {
      setValue(newValue);
    });

    return unsubscribe;
  }, [memoryRef]);

  return value;
}

// Updated ClockAnchor component
export const ClockAnchor: React.FC<ClockAnchorProps> = ({ blockKey }) => {
  // Retrieve memory references from runtime context
  const runtime = useRuntimeContext();
  const timeSpansRef = runtime.memory.search({ 
    type: 'timer-time-spans', 
    ownerId: blockKey 
  })[0] as TypedMemoryReference<TimeSpan[]>;
  
  const isRunningRef = runtime.memory.search({
    type: 'timer-is-running',
    ownerId: blockKey
  })[0] as TypedMemoryReference<boolean>;

  // Subscribe to time span changes
  const timeSpans = useMemorySubscription(timeSpansRef);
  const isRunning = useMemorySubscription(isRunningRef);

  // Calculate total elapsed time from all spans
  const elapsed = useMemo(() => {
    if (!timeSpans || timeSpans.length === 0) return 0;

    return timeSpans.reduce((total, span) => {
      if (!span.start) return total;
      
      // If no stop time, timer is running - use current time
      const stop = span.stop?.getTime() || Date.now();
      const start = span.start.getTime();
      return total + (stop - start);
    }, 0);
  }, [timeSpans]);

  // Poll for updates when timer is running
  useEffect(() => {
    if (!isRunning) return;

    // Update every 100ms to show current time for running timer
    const interval = setInterval(() => {
      // Force re-render by triggering useMemo recalculation
      setUpdateTrigger(prev => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Format time units (recalculates when elapsed changes or updateTrigger increments)
  const timeUnits = useMemo(() => {
    const totalSeconds = Math.floor(elapsed / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const units: TimeValue[] = [];
    if (days > 0) {
      units.push({ value: String(days).padStart(2, '0'), label: 'Days' });
    }
    if (hours > 0 || days > 0) {
      units.push({ value: String(hours).padStart(2, '0'), label: 'Hours' });
    }
    if (minutes > 0 || hours > 0 || days > 0) {
      units.push({ value: String(minutes).padStart(2, '0'), label: 'Minutes' });
    }
    units.push({ value: String(seconds).padStart(2, '0'), label: 'Seconds' });

    return units;
  }, [elapsed, updateTrigger]);

  return <TimeDisplay timeUnits={timeUnits} />;
}
```

## Implementation Strategy

### Phase 1: Core Subscription Infrastructure

**Enhanced TypedMemoryReference**
- Extend existing `TypedMemoryReference<T>` class with subscription methods
- Implement subscription lifecycle management (subscribe/unsubscribe)
- Add change notification to `set()` method
- Ensure thread-safe subscription operations

**RuntimeMemory Observer Integration**
- Integrate observer pattern into `RuntimeMemory.set()` method
- Implement subscription cleanup on memory reference release
- Add performance monitoring for subscription operations

### Phase 2: Clock System Integration

**Time Reference Allocation**
- Define timestamp memory reference types (`start-time`, `stop-time`, `is-running`)
- Extend runtime blocks to allocate clock-specific memory references
- Implement memory reference registration interface for clock components

**Clock Component Enhancement**
- Replace `useTimespan` polling with subscription-based updates
- Implement subscription cleanup on component unmount
- Add error handling for subscription failures

### Phase 3: Performance Optimization

**Batched Updates**
- Implement update batching for high-frequency changes
- Add configurable update throttling for different metric types
- Optimize memory reference search and access patterns

**Memory Management**
- Implement subscription cleanup on component lifecycle events
- Add memory leak detection for orphaned subscriptions
- Optimize memory usage for large numbers of subscriptions

## React Context Integration

### RuntimeProvider Context

Components need access to the `IScriptRuntime` instance to query memory references. This requires a new React Context:

```typescript
// src/runtime/context/RuntimeContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { IScriptRuntime } from '../IScriptRuntime';

const RuntimeContext = createContext<IScriptRuntime | undefined>(undefined);

export interface RuntimeProviderProps {
  runtime: IScriptRuntime;
  children: ReactNode;
}

export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({ 
  runtime, 
  children 
}) => {
  return (
    <RuntimeContext.Provider value={runtime}>
      {children}
    </RuntimeContext.Provider>
  );
};

export function useRuntimeContext(): IScriptRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) {
    throw new Error('useRuntimeContext must be used within RuntimeProvider');
  }
  return runtime;
}
```

### Story Integration Pattern

Stories must execute runtime and provide context:

```typescript
// stories/clock/Clock.stories.tsx
import { RuntimeProvider } from '../../src/runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';

export const Default: StoryObj = {
  render: () => {
    const runtime = new ScriptRuntime();
    const script = parseWorkout('For Time: 30 Jumping Jacks');
    runtime.execute(script);
    
    return (
      <RuntimeProvider runtime={runtime}>
        <ClockAnchor blockKey="block-001" />
      </RuntimeProvider>
    );
  }
};
```

## Technical Implementation Details

### Subscription API Design

**TypedMemoryReference.subscribe()**
```typescript
subscribe(
  callback: (newValue: T | undefined, oldValue: T | undefined) => void,
  options?: {
    immediate?: boolean;  // Call callback immediately with current value
    throttle?: number;    // Minimum milliseconds between notifications
  }
): () => void;  // Returns unsubscribe function
```

**Use Example**
```typescript
// Clock component subscribes to timestamp updates
const unsubscribe = timestampRef.subscribe(
  (newTime, oldTime) => {
    console.log(`Time updated from ${oldTime} to ${newTime}`);
    updateClockDisplay(newTime);
  },
  { immediate: true, throttle: 100 }
);

// Cleanup on component unmount
useEffect(() => unsubscribe, []);
```

### Memory Reference Type System

**Timer Memory Reference Types**
```typescript
// src/runtime/types/MemoryTypes.ts
export const TIMER_MEMORY_TYPES = {
  TIME_SPANS: 'timer-time-spans',      // TimeSpan[] - array of start/stop pairs
  IS_RUNNING: 'timer-is-running',      // boolean - current running state
} as const;

export type TimerMemoryType = typeof TIMER_MEMORY_TYPES[keyof typeof TIMER_MEMORY_TYPES];

// TimeSpan structure matches existing CollectionSpan.TimeSpan
export interface TimeSpan {
  start?: Date;
  stop?: Date;
}
```

**Type-Safe Memory Reference Retrieval**
```typescript
// Helper function for type-safe reference lookup
export function getTimerReference<T>(
  runtime: IScriptRuntime,
  blockKey: string,
  type: TimerMemoryType
): TypedMemoryReference<T> | undefined {
  const refs = runtime.memory.search({ 
    type, 
    ownerId: blockKey,
    visibility: 'public' 
  });
  return refs[0] as TypedMemoryReference<T> | undefined;
}

// Usage in components
const startTimeRef = getTimerReference<Date>(
  runtime, 
  blockKey, 
  TIMER_MEMORY_TYPES.START_TIME
);
```

## API Reference

### TypedMemoryReference Extensions

```typescript
export class TypedMemoryReference<T> implements IMemoryReference {
  // Existing methods
  get(): T | undefined;
  set(value: T): void;

  // NEW: Subscription methods
  subscribe(
    callback: (newValue: T | undefined, oldValue: T | undefined) => void,
    options?: SubscriptionOptions
  ): () => void;
  
  unsubscribe(subscriptionId: string): void;
  hasSubscribers(): boolean;
}

export interface SubscriptionOptions {
  immediate?: boolean;   // Call callback immediately with current value
  throttle?: number;     // Min milliseconds between notifications
}
```

### RuntimeMemory Extensions

```typescript
export class RuntimeMemory implements IRuntimeMemory {
  // Existing methods
  allocate<T>(type: string, ownerId: string, initialValue?: T, visibility?: 'public' | 'private'): TypedMemoryReference<T>;
  get<T>(reference: TypedMemoryReference<T>): T | undefined;
  set<T>(reference: TypedMemoryReference<T>, value: T): void;
  search(criteria: Nullable<IMemoryReference>): IMemoryReference[];
  release(reference: IMemoryReference): void;

  // NEW: Observer pattern support
  private notifySubscribers<T>(reference: TypedMemoryReference<T>, newValue: T, oldValue: T | undefined): void;
}
```

### TimerBehavior

```typescript
// src/runtime/behaviors/TimerBehavior.ts
export interface TimeSpan {
  start?: Date;
  stop?: Date;
}

export class TimerBehavior implements IRuntimeBehavior {
  private timeSpansRef?: TypedMemoryReference<TimeSpan[]>;
  private isRunningRef?: TypedMemoryReference<boolean>;

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
  
  // Timer control methods
  pause(runtime: IScriptRuntime): void;
  resume(runtime: IScriptRuntime): void;
  
  // Utility methods
  getTimeSpans(): TimeSpan[];
  getTotalElapsed(): number;
  isRunning(): boolean;
}
```

### React Hooks

```typescript
// src/runtime/hooks/useMemorySubscription.ts
export function useMemorySubscription<T>(
  memoryRef: TypedMemoryReference<T> | undefined
): T | undefined;

// src/runtime/hooks/useTimerReferences.ts
export interface TimerReferences {
  timeSpans: TypedMemoryReference<TimeSpan[]> | undefined;
  isRunning: TypedMemoryReference<boolean> | undefined;
}

export function useTimerReferences(blockKey: string): TimerReferences;

// src/runtime/hooks/useTimerElapsed.ts
export interface UseTimerElapsedResult {
  elapsed: number;          // Total milliseconds across all spans
  isRunning: boolean;       // Current running state
  timeSpans: TimeSpan[];    // Array of start/stop pairs
}

export function useTimerElapsed(blockKey: string): UseTimerElapsedResult;

// src/runtime/hooks/useRuntimeContext.ts
export function useRuntimeContext(): IScriptRuntime;
```

### Updated Component Interfaces

```typescript
// src/clock/anchors/ClockAnchor.tsx
export interface ClockAnchorProps {
  blockKey: string;  // Changed from CollectionSpan
  format?: 'compact' | 'full';
}

// src/clock/components/TimeDisplay.tsx (unchanged)
export interface TimeDisplayProps {
  timeUnits: TimeValue[];
}

export interface TimeValue {
  value: string;
  label: string;
}
```

### Error Handling and Edge Cases

**Missing Memory References**
- Component queries may return empty arrays if block not yet pushed
- `useMemorySubscription` must handle `undefined` references gracefully
- Display placeholder values (e.g., `--:--`) when references unavailable

**Runtime Context Errors**
- `useRuntimeContext()` throws if called outside `RuntimeProvider`
- All clock components require wrapping in `RuntimeProvider`
- Development mode warnings for missing context

**Memory Reference Lifecycle**
- Subscriptions must cleanup when memory references released
- `RuntimeMemory.release()` notifies subscribers before deletion
- Components handle reference invalidation by displaying last known value

**Subscription Memory Leaks**
- `useMemorySubscription` must return cleanup function from `useEffect`
- Multiple subscriptions to same reference are supported
- Memory reference disposal triggers automatic unsubscribe for all subscribers

**Block Key Mismatch**
- Component `blockKey` prop must match `RuntimeBlock.key.toString()`
- Invalid block keys result in empty memory search results
- Consider block key validation in development mode

## Testing Strategy

### Unit Tests

**TypedMemoryReference Subscription Tests** (`src/runtime/IMemoryReference.test.ts`)
- `.subscribe()` returns unsubscribe function
- Callback invoked when `.set()` called
- Multiple subscribers receive same notification
- Unsubscribe prevents future callbacks
- Subscription to released memory reference throws/warns

**RuntimeMemory Observer Tests** (`src/runtime/RuntimeMemory.test.ts`)
- Memory location changes trigger subscriber callbacks
- Subscribers only notified for their specific references
- Memory release cleans up all subscriptions
- Search and subscription interaction

**TimerBehavior Tests** (`src/runtime/behaviors/TimerBehavior.test.ts`)
- `onPush()` allocates timer memory references with correct types
- References initialized with appropriate default values
- `onPop()` updates stop time and running state
- Memory references marked as public visibility
- Multiple timer behaviors don't conflict

### Integration Tests

**Clock Component Integration** (`tests/integration/ClockSubscription.test.tsx`)
- `RuntimeProvider` provides context to nested components
- `ClockAnchor` queries runtime memory successfully
- `useMemorySubscription` triggers re-renders on memory changes
- Component unmount cleans up subscriptions
- Multiple components subscribe to same memory references

**Runtime Execution Flow** (`tests/integration/TimerRuntime.test.ts`)
- Execute workout script creates runtime blocks
- `TimerBehavior` attached to appropriate blocks
- Memory references allocated during block push
- Clock components discover references via search
- Block disposal cleans up memory and subscriptions

### Story Tests (Storybook)

**Visual Regression Tests** (`tests/stories/Clock.test.tsx`)
- Clock displays correctly with runtime context
- Placeholder shown when no memory references available
- Time updates reflect memory changes
- Component responds to start/stop state changes

### Performance Tests

**Subscription Performance** (`tests/performance/SubscriptionBench.test.ts`)
- Measure subscription notification latency
- Test with 100+ concurrent subscriptions
- Memory overhead per subscription
- Comparison vs. old polling system (expect 90%+ reduction in CPU)

**Memory Leak Tests** (`tests/performance/MemoryLeak.test.ts`)
- Create and destroy 1000+ runtime blocks
- Verify subscriptions cleaned up
- Memory usage returns to baseline
- No orphaned references in RuntimeMemory

## Performance Considerations

### Subscription Overhead Analysis

**Memory Impact**
- Minimal overhead per subscription (~16 bytes for subscription metadata)
- Efficient subscription lookup using Map-based indexing
- Automatic cleanup prevents memory accumulation

**CPU Performance**
- Change notifications only occur when values actually change
- Batching reduces notification frequency for rapid updates
- Optional throttling prevents excessive callback execution

### Scalability Assessment

**Subscription Capacity**
- Target support for 10,000+ concurrent subscriptions
- Linear time complexity for subscription operations
- Memory usage scales proportionally to active subscriptions

**Update Frequency Optimization**
- Timestamp updates typically occur at timer start/stop events
- High-frequency updates (e.g., running timers) use throttled notifications
- Batch updates reduce component re-render frequency

## Integration Benefits

### Architectural Advantages

1. **Decoupled Design**: Clock components receive updates without knowledge of timing sources
2. **Type Safety**: Generic TypeScript interfaces ensure compile-time type checking
3. **Performance**: Elimination of polling reduces CPU usage and improves responsiveness
4. **Scalability**: Subscription model supports multiple observers for single data sources
5. **Testability**: Mockable memory references enable isolated unit testing

### Developer Experience Improvements

1. **Intuitive API**: `.subscribe()` pattern familiar to developers from reactive programming
2. **Automatic Cleanup**: Subscription management prevents memory leaks
3. **TypeScript Support**: Full type safety and IDE autocompletion
4. **Debugging Support**: Memory reference inspection for debugging state changes

## Complete System Replacement Strategy

### Implementation Approach

This is a **complete replacement** of the existing clock architecture. All clock-related code will be refactored to integrate with the runtime memory system.

**Components to Replace**:
- `useTimespan` hook → `useMemorySubscription` hook
- `ClockAnchor` component → Rewritten to consume memory references
- `CollectionSpan` direct prop passing → Runtime memory reference injection
- Manual time calculation → `TimerBehavior` runtime behavior

**Components to Extend**:
- `TypedMemoryReference<T>` → Add subscription methods
- `RuntimeMemory` → Add observer pattern and change notifications
- `RuntimeBlock` → Add timer-specific memory allocation
- `IRuntimeBehavior` → New `TimerBehavior` for timestamp management

### Implementation Timeline

**Phase 1** (2-3 weeks): Core Subscription Infrastructure
- Extend `TypedMemoryReference<T>` with `.subscribe()`, `.unsubscribe()` methods
- Implement observer pattern in `RuntimeMemory.set()`
- Add subscription lifecycle management (cleanup on memory release)
- Unit tests for subscription functionality and memory leak prevention

**Phase 2** (2-3 weeks): Runtime Integration & Timer Behavior
- Create `TimerBehavior` implementing `IRuntimeBehavior`
- Allocate timer memory references in `RuntimeBlock.push()`
- Implement timestamp update logic in behavior hooks
- Add memory reference type constants for timer data
- Unit tests for timer behavior lifecycle

**Phase 3** (1-2 weeks): Clock Component Replacement
- Replace `useTimespan` with `useMemorySubscription<Date>` hook
- Rewrite `ClockAnchor` to receive memory references via context
- Update `TimeDisplay` to work with subscription-based time values
- Remove `CollectionSpan` prop passing from clock components
- Integration tests for complete clock flow

**Phase 4** (1 week): Story & Documentation Updates
- Update `Clock.stories.tsx` to demonstrate runtime integration
- Replace manual `CollectionSpan` creation with runtime execution
- Update all clock-related documentation
- Performance benchmarking vs. old polling system

### Deliverables Checklist

**Core Infrastructure**:
- [ ] `TypedMemoryReference<T>` with `.subscribe()` method
- [ ] `RuntimeMemory` observer pattern implementation
- [ ] Subscription cleanup on memory reference release
- [ ] Unit tests for subscription system (>90% coverage)

**Runtime Integration**:
- [ ] `TimerBehavior` implementing `IRuntimeBehavior`
- [ ] Memory reference allocation in `RuntimeBlock`
- [ ] Timer memory type constants
- [ ] Unit tests for timer behavior lifecycle

**React Components**:
- [ ] `RuntimeProvider` context component
- [ ] `useRuntimeContext()` hook
- [ ] `useMemorySubscription<T>()` hook
- [ ] `useTimerReferences()` hook
- [ ] Updated `ClockAnchor` component (no `CollectionSpan` props)
- [ ] Integration tests for component subscriptions

**Documentation**:
- [ ] API reference documentation
- [ ] Migration guide for clock components
- [ ] Performance comparison benchmarks
- [ ] Updated Storybook stories with runtime context

**Testing & Validation**:
- [ ] Unit test suite (all new code)
- [ ] Integration test suite (clock + runtime)
- [ ] Memory leak tests
- [ ] Performance benchmarks
- [ ] Storybook visual regression tests

**Code Removal**:
- [ ] Delete old `useTimespan` hook implementation
- [ ] Remove `CollectionSpan` prop passing in clock components
- [ ] Clean up unused time calculation logic
- [ ] Remove polling-based update code

## Complete Data Flow Architecture

### Runtime Execution to UI Rendering

**1. Runtime Block Creation & Behavior Attachment**
```typescript
// Strategy pattern creates RuntimeBlock with TimerBehavior
class TimerStrategy implements IRuntimeBlockStrategy {
  compile(metrics: RuntimeMetric[], runtime: IScriptRuntime): IRuntimeBlock {
    const behaviors = [
      new TimerBehavior(),
      new ParentContextBehavior(),
      new CompletionTrackingBehavior()
    ];
    return new RuntimeBlock(runtime, sourceIds, behaviors);
  }
}
```

**2. Memory Reference Allocation During Push**
```typescript
// RuntimeBlock.push() → TimerBehavior.onPush()
block.push(); // Triggers all behavior onPush hooks
// TimerBehavior allocates public memory references:
// - timer-start-time: Date (initialized to current time)
// - timer-stop-time: Date | null (initialized to null)
// - timer-is-running: boolean (initialized to true)
```

**3. Memory Reference Discovery by Components**
```typescript
// React component queries runtime memory for references
const runtime = useRuntimeContext(); // Provided via React Context
const refs = runtime.memory.search({ 
  type: 'timer-start-time', 
  ownerId: blockKey 
});
const startTimeRef = refs[0] as TypedMemoryReference<Date>;
```

**4. Component Subscription to Memory Changes**
```typescript
// useMemorySubscription hook manages subscription lifecycle
const startTime = useMemorySubscription(startTimeRef);
// Internally calls: startTimeRef.subscribe((newValue) => setValue(newValue))
// Returns unsubscribe function on component unmount
```

**5. Memory Updates Trigger Component Re-renders**
```typescript
// Runtime behavior updates memory when timer state changes
const spans = timeSpansRef.get() || [];
spans[spans.length - 1].stop = new Date(); // Close current span
timeSpansRef.set([...spans]); // Triggers notification

// → RuntimeMemory.set() notifies all subscribers
// → TypedMemoryReference triggers subscription callbacks
// → React setState in useMemorySubscription
// → Component re-renders with new time value
```

**6. Polling Optimization for Running Timers**

The new system **significantly reduces polling** but doesn't eliminate it entirely:

```typescript
// OLD SYSTEM: Always polls every 100ms regardless of timer state
useEffect(() => {
  const interval = setInterval(calculateTime, 100);  // ALWAYS RUNNING
  return () => clearInterval(interval);
}, [timeSpans]);  // Re-creates interval on every timeSpans change

// NEW SYSTEM: Polls only when timer is actually running
useEffect(() => {
  if (!isRunning) return;  // NO POLLING when timer stopped
  
  const interval = setInterval(() => {
    setUpdateTrigger(prev => prev + 1);  // Just increments counter
  }, 100);
  
  return () => clearInterval(interval);
}, [isRunning]);  // Only subscribes to isRunning changes, not timeSpans

// Benefits:
// - Zero polling for completed timers
// - Subscription-based updates for start/stop/pause/resume events
// - Polling only calculates display time, not fetching data
// - Single interval shared across all timer displays (future optimization)
```

### Eliminating CollectionSpan Direct Prop Passing

**Current Pattern (To Remove)**:
```typescript
// Stories manually create CollectionSpan
const defaultSpan: CollectionSpan = {
  blockKey: 'Jumping Jacks',
  timeSpans: [{ start: new Date(Date.now() - 185000), stop: new Date() }],
  metrics: [...],
};

// Props passed directly to components
<ClockAnchor span={defaultSpan} />
```

**New Pattern (Runtime-Driven)**:
```typescript
// Stories execute runtime to populate memory
const runtime = new ScriptRuntime();
const script = parseWorkout('For Time: 30 Jumping Jacks');
runtime.execute(script);

// Components receive runtime context, not props
<RuntimeProvider runtime={runtime}>
  <ClockAnchor blockKey="block-001" />
</RuntimeProvider>

// ClockAnchor queries runtime.memory for timer references
// No direct props needed
```

### Time Span Collection Model

**Understanding TimeSpan Arrays**

The timer system uses an array of `TimeSpan` objects to track elapsed time across pause/resume cycles:

```typescript
export interface TimeSpan {
  start?: Date;   // When this segment started
  stop?: Date;    // When this segment stopped (undefined = currently running)
}

// Example: Timer started, paused, resumed, stopped
const timeSpans: TimeSpan[] = [
  { start: new Date('2025-01-01T10:00:00'), stop: new Date('2025-01-01T10:05:00') },  // 5 min
  { start: new Date('2025-01-01T10:10:00'), stop: new Date('2025-01-01T10:12:00') },  // 2 min
  { start: new Date('2025-01-01T10:15:00'), stop: undefined }                         // Running
];
// Total elapsed: 7 minutes + (now - 10:15:00)
```

**Key Behaviors**:

1. **Timer Start**: Create first span with `start: new Date()`, `stop: undefined`
2. **Timer Running**: Last span has `stop: undefined`, use `Date.now()` for calculations
3. **Timer Pause**: Set `stop: new Date()` on last span
4. **Timer Resume**: Add new span with `start: new Date()`, `stop: undefined`
5. **Timer Complete**: Set `stop: new Date()` on last span, `isRunning: false`

**Clock Display Logic**:

```typescript
// Calculate total elapsed time from all spans
const totalMilliseconds = timeSpans.reduce((total, span) => {
  if (!span.start) return total;
  
  // Use stop time if available, otherwise current time (for running timers)
  const endTime = span.stop?.getTime() || Date.now();
  const startTime = span.start.getTime();
  
  return total + (endTime - startTime);
}, 0);

// Determine if timer is currently running
const isRunning = timeSpans.some(span => span.start && !span.stop);
```

**Why Not Single Start/Stop?**

Workout timers may pause and resume multiple times (rest periods, equipment adjustments, etc.). Using an array of spans allows:
- Accurate total time tracking across interruptions
- Historical record of pause/resume events
- Future analytics on workout patterns

### Memory Reference Lifecycle Management

**Allocation**: `RuntimeBlock.push()` → `TimerBehavior.onPush()` → `block.allocate()`
**Usage**: Components subscribe via `useMemorySubscription()`
**Updates**: Behaviors call `.set()` on references, triggering notifications
**Cleanup**: `RuntimeBlock.pop()` → `TimerBehavior.onPop()` → `RuntimeBlock.dispose()` → `RuntimeMemory.release()`
**Subscription Cleanup**: Component unmount triggers unsubscribe function

### New Memory Reference Types

```typescript
export const TIMER_MEMORY_TYPES = {
  TIME_SPANS: 'timer-time-spans',      // TimeSpan[] - array of start/stop pairs
  IS_RUNNING: 'timer-is-running',      // boolean - current running state
} as const;
```

### CollectionSpan Migration

**Current CollectionSpan Structure** (to be removed from clock components):
```typescript
// src/CollectionSpan.ts
export class CollectionSpan {  
  blockKey?: string;
  duration?: number;
  timeSpans: TimeSpan[] = [];  // ← This data moves to memory
  metrics: Metric[] = [];  
}
```

**New Memory-Based Structure**:
```typescript
// Timer data stored in RuntimeMemory, not passed as props
// Block key used to query memory references
const timeSpansRef = runtime.memory.search({ 
  type: 'timer-time-spans', 
  ownerId: blockKey 
})[0];

// TimeSpan structure remains the same
export interface TimeSpan {
  start?: Date;
  stop?: Date;
}
```

**Migration Mapping**:
- `CollectionSpan.blockKey` → Component `blockKey` prop (used for memory lookup)
- `CollectionSpan.timeSpans` → Memory reference `timer-time-spans`
- `CollectionSpan.duration` → Calculated from `timeSpans` array
- `CollectionSpan.metrics` → Separate memory references (out of scope for timer system)

## Conclusion

This specification defines a **complete replacement** of the WOD Wiki clock system, transitioning from polling-based updates to a reactive memory reference architecture. The new system deeply integrates clock functionality with the existing runtime infrastructure through:

1. **Runtime Behavior Integration**: `TimerBehavior` manages timer lifecycle within `RuntimeBlock` execution
2. **Memory-Based State**: All timer state stored in `RuntimeMemory` via typed references
3. **Subscription-Based Updates**: Components subscribe to memory changes, eliminating polling
4. **Type-Safe References**: Generic `TypedMemoryReference<T>` provides compile-time type safety
5. **Lifecycle Management**: Automatic cleanup of memory and subscriptions on block disposal

**Key Benefits**:
- **Performance**: Eliminates 100ms polling interval, updates only when state changes
- **Scalability**: Multiple components can subscribe to same memory references efficiently  
- **Testability**: Mock memory references enable isolated unit testing
- **Architecture**: Clock system now first-class citizen in runtime execution model

**Breaking Changes**:
- `CollectionSpan` no longer passed as props to clock components
- `useTimespan` hook removed entirely, replaced with `useMemorySubscription`
- Clock components require `RuntimeProvider` context
- Stories must execute runtime to populate memory references

**Success Criteria**:
- Zero polling intervals in clock components
- All timer state managed through runtime memory
- Component re-renders only on actual state changes
- No memory leaks from orphaned subscriptions
- Comprehensive unit and integration test coverage