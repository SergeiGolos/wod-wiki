# Anchor-Based Timer Example

This document provides a concrete example of how to implement the anchor-based subscription model with a timer behavior.

## Scenario

We want to create a workout with multiple timed sections. A single UI component should display the currently active timer, automatically switching when the workout transitions between sections.

## Implementation

### 1. Enhanced TimerBehavior with Anchor Support

Here's how to extend `TimerBehavior` to support anchors:

```typescript
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { TypedMemoryReference } from '../IMemoryReference';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { IAnchorValue } from '../IAnchorValue';

export interface TimeSpan {
  start?: Date;
  stop?: Date;
}

export class TimerBehavior implements IRuntimeBehavior {
  private timeSpansRef?: TypedMemoryReference<TimeSpan[]>;
  private isRunningRef?: TypedMemoryReference<boolean>;
  
  constructor(
    private readonly direction: 'up' | 'down' = 'up',
    private readonly durationMs?: number,
    private readonly anchorId?: string  // Optional: ID of anchor to update
  ) {}

  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const context = block.context;
    const blockId = block.key.toString();

    // Allocate memory for timer data
    this.timeSpansRef = context.allocate<TimeSpan[]>(
      MemoryTypeEnum.TIMER_TIME_SPANS,
      [{ start: new Date(), stop: undefined }],
      'public'
    );

    this.isRunningRef = context.allocate<boolean>(
      MemoryTypeEnum.TIMER_IS_RUNNING,
      true,
      'public'
    );

    // If an anchor ID was provided, update it to point to this timer
    if (this.anchorId) {
      const anchor = context.getOrCreateAnchor(this.anchorId);
      anchor.set({
        searchCriteria: {
          ownerId: blockId,
          type: MemoryTypeEnum.TIMER_TIME_SPANS,
          id: null,
          visibility: null
        }
      });
    }

    // ... rest of timer initialization
    return [];
  }

  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Stop timer and clean up
    if (this.timeSpansRef && this.isRunningRef) {
      const spans = this.timeSpansRef.get() || [];
      if (spans.length > 0 && !spans[spans.length - 1].stop) {
        spans[spans.length - 1].stop = new Date();
        this.timeSpansRef.set([...spans]);
      }
      this.isRunningRef.set(false);
    }

    return [];
  }
}
```

### 2. UI Component Using Anchor

Create a clock component that subscribes to the anchor:

```tsx
import React from 'react';
import { useAnchorSubscription } from '../runtime/hooks/useAnchorSubscription';

interface TimeSpan {
  start?: Date;
  stop?: Date;
}

interface WorkoutClockProps {
  anchorId?: string;
  title?: string;
}

/**
 * WorkoutClock displays the timer for the currently active workout section.
 * It subscribes to an anchor, so it automatically updates when the
 * workout transitions to a new timed section.
 */
export function WorkoutClock({ 
  anchorId = 'anchor-main-workout-clock',
  title = 'Workout Timer'
}: WorkoutClockProps) {
  // Subscribe to the anchor - no need to know which timer is active
  const timeSpans = useAnchorSubscription<TimeSpan[]>(anchorId);
  
  // Calculate elapsed time from time spans
  const elapsed = calculateElapsed(timeSpans);
  
  return (
    <div className="workout-clock">
      <h2>{title}</h2>
      {timeSpans ? (
        <div className="time-display">
          {formatTime(elapsed)}
        </div>
      ) : (
        <div className="time-display placeholder">
          --:--
        </div>
      )}
    </div>
  );
}

// Helper function to calculate elapsed time
function calculateElapsed(timeSpans?: TimeSpan[]): number {
  if (!timeSpans || timeSpans.length === 0) {
    return 0;
  }

  let total = 0;
  const now = new Date();

  for (const span of timeSpans) {
    if (span.start) {
      const end = span.stop || now;
      total += end.getTime() - span.start.getTime();
    }
  }

  return total;
}

// Helper function to format time
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
```

### 3. Workout Script with Multiple Timers

Create a workout with multiple timed sections:

```typescript
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { RuntimeBlock } from '../runtime/RuntimeBlock';
import { TimerBehavior } from '../runtime/behaviors/TimerBehavior';

// Create runtime
const runtime = new ScriptRuntime();

// Section 1: Warm-up (5 minutes)
const warmupTimer = new TimerBehavior(
  'up',                              // Count up
  undefined,                         // No duration limit
  'anchor-main-workout-clock'        // Update this anchor
);
const warmupBlock = new RuntimeBlock(
  runtime,
  [1],
  [warmupTimer],
  'Warm-up'
);

// Section 2: AMRAP (20 minutes)
const amrapTimer = new TimerBehavior(
  'down',                            // Count down
  20 * 60 * 1000,                    // 20 minutes
  'anchor-main-workout-clock'        // Update same anchor
);
const amrapBlock = new RuntimeBlock(
  runtime,
  [2],
  [amrapTimer],
  'AMRAP 20'
);

// Section 3: Cool-down (5 minutes)
const cooldownTimer = new TimerBehavior(
  'up',
  undefined,
  'anchor-main-workout-clock'        // Update same anchor
);
const cooldownBlock = new RuntimeBlock(
  runtime,
  [3],
  [cooldownTimer],
  'Cool-down'
);

// Execute workout sections
async function runWorkout() {
  // Start warm-up
  warmupBlock.mount(runtime);
  
  // Wait 5 minutes
  await sleep(5 * 60 * 1000);
  
  // Transition to AMRAP
  warmupBlock.dispose();
  amrapBlock.mount(runtime);
  
  // Wait 20 minutes
  await sleep(20 * 60 * 1000);
  
  // Transition to cool-down
  amrapBlock.dispose();
  cooldownBlock.mount(runtime);
  
  // Wait 5 minutes
  await sleep(5 * 60 * 1000);
  
  // Finish
  cooldownBlock.dispose();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 4. React App Integration

Wire everything together in a React app:

```tsx
import React, { useEffect, useState } from 'react';
import { RuntimeProvider } from '../runtime/context/RuntimeContext';
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { WorkoutClock } from './WorkoutClock';

export function WorkoutApp() {
  const [runtime] = useState(() => new ScriptRuntime());
  const [workoutStarted, setWorkoutStarted] = useState(false);

  useEffect(() => {
    if (workoutStarted) {
      // Initialize and start workout
      runWorkout();
    }
  }, [workoutStarted]);

  return (
    <RuntimeProvider runtime={runtime}>
      <div className="workout-app">
        <header>
          <h1>CrossFit Workout</h1>
        </header>
        
        <main>
          {/* This clock will automatically update as workout sections change */}
          <WorkoutClock anchorId="anchor-main-workout-clock" />
          
          {!workoutStarted && (
            <button onClick={() => setWorkoutStarted(true)}>
              Start Workout
            </button>
          )}
        </main>
      </div>
    </RuntimeProvider>
  );
}
```

## How It Works

### 1. Initialization (Warm-up Phase)

When the warm-up timer starts:
```typescript
// Warm-up timer allocates memory
timeSpansRef = allocate<TimeSpan[]>([{ start: now, stop: undefined }])

// Warm-up timer updates anchor
anchor('anchor-main-workout-clock').set({
  searchCriteria: {
    ownerId: 'warmup-block-id',
    type: 'timer-time-spans'
  }
})
```

The UI component:
```typescript
// WorkoutClock subscribes to anchor
useAnchorSubscription('anchor-main-workout-clock')
  → finds anchor
  → reads anchor.searchCriteria
  → searches for memory with ownerId='warmup-block-id', type='timer-time-spans'
  → subscribes to timeSpansRef
  → displays warm-up timer
```

### 2. Transition (Warm-up → AMRAP)

When transitioning to AMRAP:
```typescript
// Warm-up timer stops
warmupBlock.dispose()

// AMRAP timer starts and updates anchor
anchor('anchor-main-workout-clock').set({
  searchCriteria: {
    ownerId: 'amrap-block-id',  // Changed!
    type: 'timer-time-spans'
  }
})
```

The UI component:
```typescript
// WorkoutClock's anchor subscription detects change
useAnchorSubscription detects anchor value changed
  → unsubscribes from warm-up timeSpansRef
  → searches for memory with ownerId='amrap-block-id'
  → subscribes to new AMRAP timeSpansRef
  → component re-renders with AMRAP timer data
```

### 3. Throughout Workout

The same `WorkoutClock` component continues to display the active timer:
- Warm-up: Displays count-up timer for warm-up
- AMRAP: Displays countdown timer for AMRAP
- Cool-down: Displays count-up timer for cool-down

**No props changed!** The component's `anchorId` prop stays constant.

## Benefits Demonstrated

### 1. Single Component, Multiple Data Sources
One `WorkoutClock` component displays three different timers without knowing about:
- Block IDs
- When transitions occur
- How many sections exist

### 2. Declarative Data Binding
Behaviors declare: "I am the main workout clock"
```typescript
new TimerBehavior('up', undefined, 'anchor-main-workout-clock')
```

UI declares: "Show me the main workout clock"
```tsx
<WorkoutClock anchorId="anchor-main-workout-clock" />
```

### 3. Automatic Cleanup
When a timer block is disposed:
- Its memory is released
- The anchor automatically points to the new timer
- UI seamlessly transitions

### 4. Easy Testing
Test the component independently:
```typescript
it('displays timer from anchor', () => {
  const runtime = new ScriptRuntime();
  const context = new BlockContext(runtime, 'test', 'test');
  
  // Setup test data
  context.allocate<TimeSpan[]>(
    MemoryTypeEnum.TIMER_TIME_SPANS,
    [{ start: new Date(Date.now() - 5000) }],
    'public'
  );
  
  const anchor = context.getOrCreateAnchor('anchor-test-clock');
  anchor.set({
    searchCriteria: {
      ownerId: 'test',
      type: MemoryTypeEnum.TIMER_TIME_SPANS
    }
  });
  
  const { getByText } = render(
    <RuntimeProvider runtime={runtime}>
      <WorkoutClock anchorId="anchor-test-clock" />
    </RuntimeProvider>
  );
  
  expect(getByText(/0:05/)).toBeInTheDocument();
});
```

## Variations

### Multiple Clocks

Display multiple timers simultaneously:

```tsx
<WorkoutClock 
  anchorId="anchor-main-clock" 
  title="Main Timer" 
/>
<WorkoutClock 
  anchorId="anchor-rest-clock" 
  title="Rest Timer" 
/>
<WorkoutClock 
  anchorId="anchor-total-clock" 
  title="Total Time" 
/>
```

Each anchor can point to a different timer, or the same timer with different formatting.

### Conditional Anchors

Use anchors for optional timers:

```tsx
function WorkoutDisplay({ showRestTimer }: { showRestTimer: boolean }) {
  return (
    <>
      <WorkoutClock anchorId="anchor-main-clock" />
      {showRestTimer && (
        <WorkoutClock anchorId="anchor-rest-clock" />
      )}
    </>
  );
}
```

### Composite Anchors

Combine multiple anchors for complex UI:

```tsx
function WorkoutDashboard() {
  const timeSpans = useAnchorSubscription<TimeSpan[]>('anchor-main-clock');
  const isRunning = useAnchorSubscription<boolean>('anchor-clock-running');
  const currentRound = useAnchorSubscription<number>('anchor-current-round');
  
  return (
    <div className="dashboard">
      <ClockDisplay timeSpans={timeSpans} isRunning={isRunning} />
      <RoundDisplay round={currentRound} />
    </div>
  );
}
```

## Conclusion

The anchor-based subscription model enables flexible, maintainable workout UIs by decoupling components from specific data sources. The timer example demonstrates how a single UI component can seamlessly display data from multiple runtime blocks without any awareness of the underlying complexity.

This pattern scales to complex workout flows with multiple sections, parallel timers, and dynamic transitions, all while keeping components simple and testable.
