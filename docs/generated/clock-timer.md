# Clock & Timer

Timer components and utilities for workout timing display and control.

## Overview

The clock module provides:

- **Clock Components** - React timer displays
- **Clock Hooks** - Timer state management
- **Timer Utilities** - Time formatting and conversion
- **Clock Providers** - Shared timer context

## Clock Components

### TimerDisplay

Main timer display component showing elapsed/remaining time.

**Purpose:** Large, readable display of workout timer with controls.

**Props:**

```typescript
interface TimerDisplayProps {
  time: number;  // Time in milliseconds
  direction: 'up' | 'down';  // Count-up or countdown
  isActive: boolean;
  isPaused: boolean;
  onPause?: () => void;
  onResume?: () => void;
}
```

**Example:**

```typescript
<TimerDisplay 
  time={elapsedMs}
  direction={timerDirection}
  isActive={isRunning}
  isPaused={isPaused}
  onPause={handlePause}
  onResume={handleResume}
/>
```

### RefinedTimerDisplay

Enhanced timer display with lap tracking and formatting.

**Features:**
- Lap-specific timer display
- Round information overlay
- Progress indication
- Compact mode option

**Props:**

```typescript
interface RefinedTimerDisplayProps {
  elapsed: number;
  remaining?: number;
  direction: 'up' | 'down';
  laps?: LapInfo[];
  currentLap?: number;
  showLaps?: boolean;
  compact?: boolean;
}
```

**Example:**

```typescript
<RefinedTimerDisplay 
  elapsed={30000}
  remaining={120000}
  direction="down"
  laps={[
    { number: 1, time: 45000 },
    { number: 2, time: 30000 }
  ]}
  currentLap={2}
  showLaps={true}
/>
```

## Clock Hooks

### useClock

Hook for managing clock state and timer lifecycle.

```typescript
const { 
  start, 
  pause, 
  resume, 
  reset, 
  elapsed, 
  isRunning 
} = useClock();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `start` | `() => void` | Start clock |
| `pause` | `() => void` | Pause clock |
| `resume` | `() => void` | Resume from paused |
| `reset` | `() => void` | Reset to zero |
| `elapsed` | `number` | Elapsed milliseconds |
| `isRunning` | `boolean` | Clock running state |

**Example:**

```typescript
function WorkoutTimer() {
  const clock = useClock();
  
  return (
    <div>
      <button onClick={clock.start}>Start</button>
      <button onClick={clock.pause}>Pause</button>
      <button onClick={clock.reset}>Reset</button>
      <p>Elapsed: {formatTime(clock.elapsed)}</p>
    </div>
  );
}
```

### useWorkoutClock

Hook for workout-specific clock with timer integration.

**Features:**
- Integrates with runtime clock
- Emits timer events
- Supports pause/resume
- Tracks active block

**Example:**

```typescript
const {
  elapsed,
  remaining,
  isActive,
  controls
} = useWorkoutClock(runtime);

return (
  <div>
    <TimerDisplay time={elapsed} direction={timerDirection} />
    <div className="controls">
      <Button onClick={controls.start}>Start</Button>
      <Button onClick={controls.pause}>Pause</Button>
      <Button onClick={controls.resume}>Resume</Button>
    </div>
  </div>
);
```

### useTimer

Simple timer hook for interval-based timers.

**Purpose:** Manages countdown/count-up timers with periodic updates.

**Example:**

```typescript
const { 
  time, 
  start, 
  pause, 
  reset, 
  isComplete 
} = useTimer(durationMs, intervalMs);

return (
  <div>
    <div className="timer">{formatTime(time)}</div>
    {isComplete && <div className="complete">Complete!</div>}
  </div>
);
```

## Time Utilities

### formatTime

Formats milliseconds into readable time string.

```typescript
function formatTime(ms: number, format?: 'mm:ss' | 'hh:mm:ss'): string
```

**Examples:**

```typescript
formatTime(65000);              // "01:05"
formatTime(3665000);            // "01:01:05"
formatTime(3665000, 'hh:mm:ss'); // "1:01:05"
```

### parseTime

Parses time string into milliseconds.

```typescript
function parseTime(timeString: string): number
```

**Examples:**

```typescript
parseTime("5:00");     // 300000
parseTime("1:30:00");   // 5400000
parseTime("30s");       // 30000
```

### formatDuration

Formats duration with units.

```typescript
function formatDuration(ms: number, precision: number = 0): string
```

**Examples:**

```typescript
formatDuration(65000);              // "1m 5s"
formatDuration(3665000);            // "1h 1m 5s"
formatDuration(65000, 1);          // "1m 5.0s"
```

## Clock Types

### ClockState

```typescript
interface ClockState {
  elapsed: number;
  remaining?: number;
  isRunning: boolean;
  isPaused: boolean;
  direction: 'up' | 'down';
}
```

### LapInfo

```typescript
interface LapInfo {
  number: number;
  time: number;  // Elapsed time in ms
  label?: string;
}
```

### TimerControls

```typescript
interface TimerControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
}
```

## Clock Providers

### ClockProvider

React context provider for clock state.

**Purpose:** Shares clock state across component tree.

**Example:**

```typescript
import { ClockProvider } from '@/clock';

function App() {
  return (
    <ClockProvider>
      <WorkoutTimer />
      <LapDisplay />
    </ClockProvider>
  );
}

function WorkoutTimer() {
  const { elapsed, controls } = useClockContext();
  
  return (
    <div>
      <TimerDisplay time={elapsed} />
      <Button onClick={controls.start}>Start</Button>
    </div>
  );
}
```

## Performance Considerations

### Update Frequency

Clock components should balance:
- **Smooth updates** - High frequency (16-60fps)
- **Performance** - Not too frequent for battery/CPU

**Recommendations:**
- Display: 60fps for smooth countdown
- Logic: 10-20fps for state updates
- Backend events: As published by runtime

### Optimization Tips

1. **Use useMemo** for expensive formatting
2. **Debounce rapid updates**
3. **Avoid re-renders** with React.memo
4. **Use requestAnimationFrame** for animations

**Example:**

```typescript
const formattedTime = useMemo(() => {
  return formatTime(elapsedMs);
}, [elapsedMs]);

<TimerDisplay time={formattedTime} />
```

## See Also

- [Runtime System](./runtime-system.md) - RuntimeClock integration
- [Runtime Lifecycle](../runtime-action-lifecycle.md) - Timer events
- [Services](./services.md) - AudioService for timer sounds
