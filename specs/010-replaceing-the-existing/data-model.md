# Data Model: Clock & Memory Visualization Stories

**Feature**: 010-replaceing-the-existing  
**Date**: October 6, 2025  
**Status**: Complete

## Overview

This document defines the data structures, interfaces, and relationships for integrating clock displays with timer memory visualization. All types follow TypeScript strict mode and React functional component patterns.

## Core Entities

### 1. TimerMemoryState

Represents the runtime memory allocations for a timer block.

```typescript
interface TimerMemoryState {
  /** Array of time span objects with start/stop timestamps */
  timeSpans: TimeSpan[];
  
  /** Current running state of the timer */
  isRunning: boolean;
  
  /** Unique identifier for the timer block */
  blockKey: string;
  
  /** Memory reference ID for time spans */
  timeSpansRefId: string;
  
  /** Memory reference ID for running state */
  isRunningRefId: string;
}
```

**Source**: Derived from `src/runtime/behaviors/TimerBehavior.ts`

**Usage**: Passed to memory visualization component for display

**Validation Rules**:
- `timeSpans` must be an array (can be empty)
- `isRunning` must be boolean
- `blockKey` must be non-empty string
- Reference IDs must match actual memory references

### 2. TimeSpan

Represents a single time period with optional stop time.

```typescript
interface TimeSpan {
  /** Start timestamp of the time span */
  start: Date;
  
  /** End timestamp (undefined if timer is currently running) */
  stop?: Date;
}
```

**Source**: Existing type from `src/runtime/behaviors/TimerBehavior.ts`

**Usage**: Array of TimeSpans tracks timer history (start/stop/resume)

**Validation Rules**:
- `start` must be valid Date object
- `stop` must be undefined OR a valid Date after `start`
- Multiple spans indicate pause/resume cycles

### 3. ClockMemoryStoryConfig

Configuration for a clock-memory visualization story.

```typescript
interface ClockMemoryStoryConfig {
  /** Duration in milliseconds for the timer */
  durationMs: number;
  
  /** Whether the timer is currently running */
  isRunning: boolean;
  
  /** Optional: Pre-configured time spans for complex scenarios */
  timeSpans?: TimeSpan[];
  
  /** Story title */
  title: string;
  
  /** Story description explaining the scenario */
  description: string;
  
  /** Expected time display (for testing/validation) */
  expectedDisplay?: {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
}
```

**Source**: New interface for story configuration

**Usage**: Props for story render functions

**Validation Rules**:
- `durationMs` must be >= 0
- `isRunning` must be boolean
- If `timeSpans` provided, must be valid TimeSpan array
- `title` must be non-empty string
- `description` must be non-empty string

### 4. TimerMemoryVisualizationProps

Props for the memory visualization component.

```typescript
interface TimerMemoryVisualizationProps {
  /** Reference to time spans memory */
  timeSpansRef: TypedMemoryReference<TimeSpan[]>;
  
  /** Reference to running state memory */
  isRunningRef: TypedMemoryReference<boolean>;
  
  /** Block key for display */
  blockKey: string;
  
  /** Optional: Callback when user hovers over memory */
  onMemoryHover?: (highlighted: boolean) => void;
  
  /** Optional: Highlight state from external source (e.g., clock hover) */
  isHighlighted?: boolean;
}
```

**Source**: New interface for visualization component

**Usage**: React component props

**Validation Rules**:
- Memory references must be valid TypedMemoryReference instances
- `blockKey` must match the memory reference owner
- Callbacks are optional but if provided must be functions

### 5. ClockMemoryHarnessResult

Return value from enhanced TimerTestHarness.

```typescript
interface ClockMemoryHarnessResult {
  /** Runtime instance */
  runtime: ScriptRuntime;
  
  /** Block key string */
  blockKey: string;
  
  /** Runtime block instance */
  block: RuntimeBlock;
  
  /** Timer memory references (NEW) */
  memoryRefs: {
    timeSpans: TypedMemoryReference<TimeSpan[]>;
    isRunning: TypedMemoryReference<boolean>;
  };
}
```

**Source**: Enhanced version of existing TimerTestHarness interface

**Usage**: Render prop pattern for stories

**Validation Rules**:
- All properties must be non-null
- Memory refs must be initialized and valid

## Relationships

### Entity Relationship Diagram

```
ClockMemoryStoryConfig
    │
    ├──> TimerTestHarness (creates)
    │         │
    │         ├──> RuntimeBlock
    │         │         │
    │         │         └──> TimerBehavior (onPush)
    │         │                   │
    │         │                   └──> Memory Allocations
    │         │                           ├─> TimeSpan[]
    │         │                           └─> boolean (isRunning)
    │         │
    │         └──> ClockMemoryHarnessResult
    │                   │
    │                   ├──> ClockAnchor (consumes blockKey)
    │                   │         │
    │                   │         └──> useTimerElapsed (reads memory)
    │                   │
    │                   └──> TimerMemoryVisualization (consumes memoryRefs)
    │                             │
    │                             └──> useMemorySubscription (reads memory)
    │
    └──> Story Metadata (title, description)
```

### Data Flow

1. **Story Configuration → Test Harness**:
   ```
   ClockMemoryStoryConfig ---> TimerTestHarness.useMemo()
   ```

2. **Test Harness → Runtime Memory**:
   ```
   TimerTestHarness ---> RuntimeBlock.push()
                    ---> TimerBehavior.onPush()
                    ---> RuntimeMemory.allocate()
   ```

3. **Memory → Components**:
   ```
   TimerMemoryState ---> ClockAnchor (via useTimerElapsed)
                    ---> TimerMemoryVisualization (via props)
   ```

4. **Hover Interaction**:
   ```
   Clock hover ---> setState(highlighted)
            ---> TimerMemoryVisualization receives highlight prop
            
   Memory hover ---> callback(highlighted)
            ---> Clock receives highlight state
   ```

## State Management

### Timer Memory Lifecycle

```
1. Story renders
   └─> TimerTestHarness.useMemo() executes
       └─> Creates RuntimeBlock
           └─> block.push() called
               └─> TimerBehavior.onPush() allocates memory
                   ├─> allocate<TimeSpan[]>(TIMER_MEMORY_TYPES.TIME_SPANS)
                   └─> allocate<boolean>(TIMER_MEMORY_TYPES.IS_RUNNING)

2. Components mount
   ├─> ClockAnchor
   │   └─> useTimerElapsed(blockKey)
   │       └─> useTimerReferences(blockKey) → finds memory refs
   │           └─> useMemorySubscription(timeSpansRef)
   │               └─> Subscribes to memory changes
   │
   └─> TimerMemoryVisualization
       └─> useMemorySubscription(timeSpansRef)
           └─> Subscribes to memory changes

3. Memory updates (for running timers)
   └─> setInterval (in useTimerElapsed)
       └─> Memory values recalculated
           └─> Subscribers notified
               ├─> Clock re-renders
               └─> Memory visualization re-renders

4. Story unmounts
   └─> TimerTestHarness useEffect cleanup
       └─> block.dispose()
           └─> Memory references released
               └─> Subscriptions cleaned up
```

### Hover State Management

**Strategy**: React local state in story wrapper component

```typescript
// In story render function
const [hoveredSection, setHoveredSection] = useState<'clock' | 'memory' | null>(null);

<ClockWrapper
  isHighlighted={hoveredSection === 'clock'}
  onHover={(hovered) => setHoveredSection(hovered ? 'clock' : null)}
/>

<MemoryWrapper
  isHighlighted={hoveredSection === 'memory'}
  onHover={(hovered) => setHoveredSection(hovered ? 'memory' : null)}
/>
```

**Rationale**: Simple, performant, no global state needed

## Memory Constants

### Timer Memory Types

```typescript
// From src/runtime/behaviors/TimerBehavior.ts
export const TIMER_MEMORY_TYPES = {
  TIME_SPANS: 'timer-time-spans',
  IS_RUNNING: 'timer-is-running'
} as const;
```

**Usage**: Identifying timer-specific memory allocations

**Immutability**: Constants defined as `const` assertions

## Derived Data

### Elapsed Time Calculation

```typescript
// Pseudo-code for elapsed time
function calculateElapsed(timeSpans: TimeSpan[]): number {
  return timeSpans.reduce((total, span) => {
    const start = span.start.getTime();
    const stop = span.stop?.getTime() || Date.now();
    return total + (stop - start);
  }, 0);
}
```

**Source**: Implemented in `useTimerElapsed` hook

**Usage**: Clock display and memory visualization

### Time Units Formatting

```typescript
interface TimeUnits {
  days?: number;
  hours?: number;
  minutes: number;
  seconds: number;
}

function formatTimeUnits(elapsedMs: number): TimeUnits {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return { days, hours, minutes, seconds };
}
```

**Source**: Logic in `ClockAnchor` component

**Usage**: Formatted display in clock

## Validation Rules

### Timer Configuration Validation

```typescript
function validateClockMemoryConfig(config: ClockMemoryStoryConfig): boolean {
  // Duration validation
  if (config.durationMs < 0) return false;
  
  // Time spans validation
  if (config.timeSpans) {
    for (const span of config.timeSpans) {
      if (!(span.start instanceof Date)) return false;
      if (span.stop && !(span.stop instanceof Date)) return false;
      if (span.stop && span.stop <= span.start) return false;
    }
  }
  
  // String validation
  if (!config.title || !config.description) return false;
  
  return true;
}
```

### Memory Reference Validation

```typescript
function validateMemoryReferences(
  timeSpansRef: TypedMemoryReference<TimeSpan[]>,
  isRunningRef: TypedMemoryReference<boolean>,
  blockKey: string
): boolean {
  // Check references exist
  if (!timeSpansRef || !isRunningRef) return false;
  
  // Check owner matches
  if (timeSpansRef.ownerId !== blockKey) return false;
  if (isRunningRef.ownerId !== blockKey) return false;
  
  // Check types
  if (timeSpansRef.type !== TIMER_MEMORY_TYPES.TIME_SPANS) return false;
  if (isRunningRef.type !== TIMER_MEMORY_TYPES.IS_RUNNING) return false;
  
  return true;
}
```

## Error States

### Missing Memory References

**Condition**: Timer memory not allocated or disposed  
**Display**: Error message in memory visualization  
**Recovery**: N/A (programming error, should not occur with proper harness)

### Invalid Time Spans

**Condition**: Stop time before start time, invalid Date objects  
**Display**: Warning in memory visualization, show raw values  
**Recovery**: Display error state, allow story to function

### Zero Duration

**Condition**: No elapsed time (legitimate state)  
**Display**: Placeholder `--:--` in clock, "No time spans" in memory  
**Recovery**: Not an error, valid empty state

## Performance Considerations

### Memory Subscription Overhead

**Issue**: Each subscription adds event listener  
**Solution**: Minimal subscriptions (2 per story: timeSpans + isRunning)  
**Impact**: Negligible (< 1ms overhead)

### Hover State Updates

**Issue**: Frequent state updates during mouse movement  
**Solution**: CSS hover where possible, debounce hover callbacks if needed  
**Impact**: Should be < 16ms (60fps) for smooth interaction

### Time Calculation Memoization

**Issue**: Recalculating elapsed time on every render  
**Solution**: Already implemented in `useMemo` in `useTimerElapsed`  
**Impact**: Efficient, only recalculates when timeSpans change

## TypeScript Interfaces Summary

Complete interface definitions for implementation:

```typescript
// === Existing Types (from codebase) ===
interface TimeSpan {
  start: Date;
  stop?: Date;
}

interface TypedMemoryReference<T> {
  id: string;
  ownerId: string;
  type: string;
  visibility: 'public' | 'private';
  get(): T | undefined;
  set(value: T): void;
  subscribe(callback: (newValue: T | undefined, oldValue: T | undefined) => void): () => void;
}

// === New Types (to be created) ===
interface ClockMemoryStoryConfig {
  durationMs: number;
  isRunning: boolean;
  timeSpans?: TimeSpan[];
  title: string;
  description: string;
  expectedDisplay?: {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
}

interface TimerMemoryState {
  timeSpans: TimeSpan[];
  isRunning: boolean;
  blockKey: string;
  timeSpansRefId: string;
  isRunningRefId: string;
}

interface TimerMemoryVisualizationProps {
  timeSpansRef: TypedMemoryReference<TimeSpan[]>;
  isRunningRef: TypedMemoryReference<boolean>;
  blockKey: string;
  onMemoryHover?: (highlighted: boolean) => void;
  isHighlighted?: boolean;
}

interface ClockMemoryHarnessResult {
  runtime: ScriptRuntime;
  blockKey: string;
  block: RuntimeBlock;
  memoryRefs: {
    timeSpans: TypedMemoryReference<TimeSpan[]>;
    isRunning: TypedMemoryReference<boolean>;
  };
}
```

## Next Steps

This data model is ready for contract generation. All interfaces are well-defined, validation rules are clear, and relationships are documented.

**Phase 1 Continuation**:
1. Generate component contracts based on these interfaces
2. Create test fixtures for each story scenario
3. Define contract tests for memory visualization component
