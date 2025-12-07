# Block Types and Behaviors Reference

## Overview

This document provides a comprehensive matrix of all RuntimeBlock types in the Wod.Wiki system, their composed behaviors, and the runtime impact of each behavior. Understanding this composition is essential for debugging workout execution and extending the system.

---

## Quick Reference Matrix

### Block Types Summary

| Block Type | Strategy | Category | Timer | Loop | Completion | History | Sound | Controls |
|------------|----------|----------|-------|------|------------|---------|-------|----------|
| **Root** | RuntimeFactory | Group | ✅ (up) | ✅ | via RootLifecycle | - | - | ✅ |
| **Rounds** | RoundsStrategy | Group | - | ✅ | ✅ | ✅ | - | - |
| **Timer** | TimerStrategy | Record/Group | ✅ | Optional | ✅ | ✅ | ✅ | - |
| **AMRAP** | TimeBoundRoundsStrategy | Group | ✅ (down) | ✅ (infinite) | ✅ | ✅ | ✅ | - |
| **EMOM** | IntervalStrategy | Group | ✅ (down) | ✅ (interval) | ✅ | ✅ | ✅ | - |
| **Effort** | EffortStrategy | Record | ✅ (up) | - | ✅ | ✅ | - | - |
| **Idle** | (inline) | Record | - | - | via IdleBehavior | - | - | ✅ |
| **Group** | GroupStrategy | Group | - | - | ✅ | - | - | - |

---

## Block Types in Detail

### 1. Root Block

**Created by**: `RuntimeFactory.createRuntime()`

**Purpose**: Top-level container that manages the entire workout lifecycle.

**Behaviors**:
| Behavior | Role | Configuration |
|----------|------|---------------|
| `RootLifecycleBehavior` | Lifecycle orchestration | `childGroups: [[id1], [id2], ...]`, `loopType: FIXED`, `totalRounds: 1` |
| `TimerBehavior` | Workout timer | `direction: 'up'`, `role: 'secondary'`, `autoStart: false` |

**State Machine**:
```
MOUNTING → INITIAL_IDLE → EXECUTING → FINAL_IDLE → COMPLETE
```

**Runtime Impact**:
- Creates idle block on mount ("Ready to Start")
- Resumes timer when transitioning to EXECUTING
- Spawns final idle block ("View Analytics") on completion
- Manages global control buttons (Start, Pause, Resume, Next, Complete)

---

### 2. Rounds Block

**Created by**: `RoundsStrategy.compile()` or `new RoundsBlock()`

**Matches**: Statements with `RoundsFragment` but NOT `TimerFragment`

**Purpose**: Manages fixed-round or rep-scheme workouts (e.g., "3 Rounds", "21-15-9")

**Behaviors**:
| Behavior | Role | Configuration |
|----------|------|---------------|
| `LoopCoordinatorBehavior` | Round iteration | `loopType: FIXED or REP_SCHEME`, `totalRounds`, `repScheme?`, `onRoundStart` callback |
| `CompletionBehavior` | Completion detection | Delegates to `loopCoordinator.isComplete()` |
| `HistoryBehavior` | Execution tracking | `label: "Rounds"`, `debugMetadata` with strategy info |

**Runtime Impact**:
- Allocates inherited reps metric (for rep schemes)
- Emits `rounds:changed` on round boundary
- Updates `METRICS_CURRENT` with current round's reps
- JIT-compiles child blocks on each `onNext()`

**Example Config**:
```typescript
// Fixed rounds
{ totalRounds: 3, children: [[2, 3]], repScheme: undefined }

// Rep scheme (21-15-9)
{ totalRounds: 3, children: [[2, 3]], repScheme: [21, 15, 9] }
```

---

### 3. Timer Block

**Created by**: `TimerStrategy.compile()` or `new TimerBlock()`

**Matches**: Statements with `TimerFragment` (no interval or time-bound hints)

**Purpose**: Pure timer blocks for countdown or count-up tracking

**Behaviors**:
| Behavior | Role | Configuration |
|----------|------|---------------|
| `TimerBehavior` | Time tracking | `direction`, `durationMs`, `label`, `role: 'primary'` |
| `HistoryBehavior` | Execution tracking | `label: "Timer"`, `debugMetadata` |
| `SoundBehavior` | Audio cues | Countdown: 3-2-1 ticks + buzzer; Count-up: start beep |
| `LoopCoordinatorBehavior` | (Optional) Child management | Only if statement has children |
| `CompletionBehavior` | Completion detection | Timer expire or children complete |

**Runtime Impact**:
- Registers with `RuntimeClock` for tick updates
- Emits `timer:tick` events with elapsed/remaining time
- Emits `timer:complete` when countdown reaches 0
- Can pause/resume via behavior methods

---

### 4. AMRAP Block (Time-Bound Rounds)

**Created by**: `TimeBoundRoundsStrategy.compile()`

**Matches**: `TimerFragment` + (`RoundsFragment` OR `behavior.time_bound` hint)

**Purpose**: "As Many Rounds As Possible" within a time limit

**Behaviors**:
| Behavior | Role | Configuration |
|----------|------|---------------|
| `TimerBehavior` | Countdown timer | `direction: 'down'`, `durationMs`, `role: 'secondary'` |
| `HistoryBehavior` | Execution tracking | `label: "AMRAP"`, `debugMetadata: ['amrap', 'time_bound']` |
| `SoundBehavior` | Countdown audio | 3-2-1 ticks + final buzzer |
| `LoopCoordinatorBehavior` | Infinite rounds | `loopType: TIME_BOUND`, `totalRounds: Infinity` |
| `CompletionBehavior` | Completion detection | Timer expiry via `timerBehavior.isComplete()` |

**Runtime Impact**:
- Loops children indefinitely until timer expires
- `LoopCoordinatorBehavior` checks `timerBehavior.isComplete()` on each advance
- Tracks completed rounds via `loopCoordinator.getCompletedRounds()`

---

### 5. EMOM Block (Interval)

**Created by**: `IntervalStrategy.compile()`

**Matches**: `TimerFragment` + `behavior.repeating_interval` hint

**Purpose**: "Every Minute On the Minute" interval training

**Behaviors**:
| Behavior | Role | Configuration |
|----------|------|---------------|
| `TimerBehavior` | Interval countdown | `direction: 'down'`, `durationMs: intervalDurationMs`, `role: 'primary'` |
| `SoundBehavior` | Interval audio | Countdown cues for each interval |
| `LoopCoordinatorBehavior` | Interval iteration | `loopType: INTERVAL`, `totalRounds`, `intervalDurationMs` |
| `HistoryBehavior` | Execution tracking | `label: "EMOM"`, `debugMetadata: ['emom', 'interval']` |
| `CompletionBehavior` | Completion detection | All intervals complete |

**Runtime Impact**:
- Timer resets at each interval boundary (`timerBehavior.restart()`)
- `isWaitingForInterval` flag pauses child advancement until timer fires
- Listens for `timer:complete` event to advance to next interval
- Creates lap timer refs for each interval

---

### 6. Effort Block

**Created by**: `EffortStrategy.compile()` or `new EffortBlock()`

**Matches**: No `TimerFragment`, no `RoundsFragment` (fallback strategy)

**Purpose**: Individual exercise tracking with rep counts

**Behaviors**:
| Behavior | Role | Configuration |
|----------|------|---------------|
| `NextEventBehavior` | Force-complete flag | Sets `_forceComplete` on 'next' event |
| `CompletionBehavior` | Completion detection | `isComplete() OR _forceComplete`, triggers on `['reps:updated', 'next']` |
| `TimerBehavior` | Segment timing | `direction: 'up'`, `role: 'secondary'` |
| `HistoryBehavior` | (via strategy) | `label: "Effort"`, `debugMetadata` |

**Runtime Impact**:
- Updates `METRICS_CURRENT` on rep changes
- Syncs metrics to `ExecutionSpan` for analytics
- Emits `reps:updated` and `reps:complete` events
- Supports incremental (`incrementRep()`) or bulk (`setReps()`) entry

**Key Methods**:
```typescript
incrementRep(): void    // Add 1 rep
setReps(count: number): void  // Set specific count
markComplete(): void    // Force completion
```

---

### 7. Idle Block

**Created by**: `RootLifecycleBehavior.createIdleBlock()`

**Purpose**: Waiting states before/after workout execution

**Behaviors**:
| Behavior | Role | Configuration |
|----------|------|---------------|
| `IdleBehavior` | Pop trigger & UI controls | `popOnNext?`, `popOnEvents?`, `buttonLabel`, `buttonAction` |

**Runtime Impact**:
- Allocates `runtime-controls` with configured button
- Collects duration metric on pop
- Records `RuntimeMetric` with time value

**Configurations**:
```typescript
// Start idle
{ 
  label: 'Ready', 
  popOnEvents: ['next'],
  buttonLabel: 'Start Workout',
  buttonAction: 'timer:start'
}

// End idle
{ 
  label: 'Finished',
  popOnEvents: ['stop', 'view-results'],
  buttonLabel: 'View Analytics',
  buttonAction: 'view:analytics'
}
```

---

### 8. Group Block

**Created by**: `GroupStrategy.compile()`

**Matches**: Statements with children OR `behavior.group` hint

**Purpose**: Structural container for nested exercises

**Behaviors**:
| Behavior | Role | Configuration |
|----------|------|---------------|
| `CompletionBehavior` | Placeholder | Currently `() => true` (needs full implementation) |

**Status**: ⚠️ Partial implementation - see GroupStrategy TODO

---

## Behaviors Reference

### Core Behaviors

#### LoopCoordinatorBehavior

**Purpose**: Central loop execution manager

**Configuration**:
```typescript
interface LoopConfig {
  childGroups: number[][];     // Child statement ID groups
  loopType: LoopType;          // FIXED | REP_SCHEME | TIME_BOUND | INTERVAL
  totalRounds?: number;        // For fixed/interval types
  repScheme?: number[];        // For REP_SCHEME type [21, 15, 9]
  intervalDurationMs?: number; // For INTERVAL type
  onRoundStart?: (runtime, roundIndex) => void;
}
```

**State Tracking**:
```typescript
interface LoopState {
  index: number;     // Total advancements
  position: number;  // index % childGroups.length
  rounds: number;    // Math.floor(index / childGroups.length)
}
```

**Lifecycle Hooks**:
- `onPush()`: Delegates to `onNext()` for first child
- `onNext()`: Advances loop, JIT-compiles next child group
- `onEvent()`: Handles `timer:complete` for INTERVAL type
- `onPop()`: Closes current round span

**Events Emitted**: `rounds:changed` (via display state update)

---

#### TimerBehavior

**Purpose**: Time tracking with pause/resume support

**Configuration**:
```typescript
constructor(
  direction: 'up' | 'down',
  durationMs?: number,        // Required for countdown
  label: string = 'Timer',
  role: 'primary' | 'secondary' | 'auto' = 'auto',
  autoStart: boolean = true
)
```

**State Management**:
- Uses `TimerStateManager` internally
- Maintains multiple `TimeSpan` entries for pause/resume
- Calculates elapsed from sum of all completed spans + active span

**Lifecycle Hooks**:
- `onPush()`: Initializes memory, starts timer if `autoStart`
- `onPop()`: Declares completion, syncs final metrics
- `onTick()`: Updates display state, emits `timer:tick`, checks completion

**Events Emitted**:
- `timer:started`
- `timer:tick` (with `blockId`, `elapsedMs`, `remainingMs`, `direction`)
- `timer:complete`
- `timer:paused`
- `timer:resumed`

**Memory Allocated**:
- `timer:{blockId}` - Array of `TimeSpan`
- `display-timer-state` - Current timer display values

---

#### CompletionBehavior

**Purpose**: Generic completion detection and block popping

**Configuration**:
```typescript
constructor(
  condition: (runtime, block) => boolean,
  triggerEvents?: string[],    // Events to check condition on
  checkOnPush: boolean = false,
  checkOnNext: boolean = true
)
```

**Lifecycle Hooks**:
- `onPush()`: Checks if `checkOnPush` enabled
- `onNext()`: Checks if `checkOnNext` enabled
- `onEvent()`: Checks if event name in `triggerEvents`

**Events Emitted**: `block:complete`

**Actions Returned**: `PopBlockAction` when complete

---

#### HistoryBehavior

**Purpose**: Execution span creation and lifecycle tracking

**Configuration**:
```typescript
interface HistoryBehaviorConfig {
  label?: string;
  debugMetadata?: DebugMetadata;
}
```

**Lifecycle Hooks**:
- `onPush()`: Creates `ExecutionSpan` in memory, extracts compiled metrics
- `onPop()`: Updates span with `endTime`, sets `status: 'completed'`
- `onDispose()`: Cleanup (currently no-op)

**Memory Allocated**:
- `execution-span` with owner = blockId
- `METRICS_CURRENT` update with startTime

---

#### SoundBehavior

**Purpose**: Audio cue playback synchronized with timer

**Configuration**:
```typescript
interface SoundBehaviorConfig {
  direction: 'up' | 'down';
  durationMs?: number;         // Required for countdown
  cues: SoundCue[];
}

interface SoundCue {
  id: string;
  threshold: number;           // ms remaining (down) or elapsed (up)
  sound: string;               // Audio file key
  volume?: number;             // 0.0 - 1.0
}
```

**Lifecycle Hooks**:
- `onPush()`: Initializes sound state, registers `timer:tick` handler
- `onPop()`: Unsubscribes from events

**Events Listened**: `timer:tick`

**Actions Returned**: `PlaySoundAction` when threshold met

**Predefined Sounds**:
```typescript
PREDEFINED_SOUNDS = {
  TICK: 'tick',
  BUZZER: 'buzzer',
  START: 'start'
}
```

---

#### IdleBehavior

**Purpose**: Waiting state with configurable exit triggers

**Configuration**:
```typescript
interface IdleBehaviorConfig {
  label?: string;
  popOnNext?: boolean;         // Pop on any onNext() call
  popOnEvents?: string[];      // Pop when specific events received
  buttonLabel?: string;        // UI button text
  buttonAction?: string;       // Event to emit on button click
}
```

**Lifecycle Hooks**:
- `onPush()`: Allocates `runtime-controls` with button
- `onNext()`: Returns `PopBlockAction` if `popOnNext`
- `onEvent()`: Returns `PopBlockAction` if event in `popOnEvents`
- `onPop()`: Collects duration metric, releases controls

**Memory Allocated**: `runtime-controls`

---

#### RuntimeControlsBehavior

**Purpose**: Dynamic UI button management

**Methods**:
```typescript
registerButton(button: RuntimeButton): void
unregisterButton(buttonId: string): void
clearButtons(): void
setDisplayMode(mode: 'timer' | 'clock'): void
```

**Memory Allocated**: `runtime-controls`

**UI Impact**: Controls which buttons appear in timer display

---

#### RootLifecycleBehavior

**Purpose**: Orchestrates entire workout lifecycle

**Internal Components**:
- Wraps `LoopCoordinatorBehavior` for child execution
- Contains `RuntimeControlsBehavior` for button management

**State Machine**:
```
MOUNTING → INITIAL_IDLE → EXECUTING → FINAL_IDLE → COMPLETE
```

**Event Handlers**:
- `timer:start`: Pops initial idle, starts workout
- `timer:pause` / `timer:resume`: Toggles timer state
- `timer:next`: Pops current leaf block
- `timer:complete`: Force completes workout

---

#### PrimaryClockBehavior

**Purpose**: Registers block as primary clock source for UI

**Status**: ⚠️ Uses legacy runtime.memory.write() - needs update

---

## Strategy → Behavior Mapping

```
┌─────────────────────────┬───────────────────────────────────────────────────────┐
│ Strategy                │ Behaviors Created                                      │
├─────────────────────────┼───────────────────────────────────────────────────────┤
│ EffortStrategy          │ NextEventBehavior, CompletionBehavior, TimerBehavior, │
│                         │ HistoryBehavior                                        │
├─────────────────────────┼───────────────────────────────────────────────────────┤
│ RoundsStrategy          │ LoopCoordinatorBehavior, CompletionBehavior,          │
│                         │ HistoryBehavior                                        │
├─────────────────────────┼───────────────────────────────────────────────────────┤
│ TimerStrategy           │ TimerBehavior, HistoryBehavior, SoundBehavior,        │
│                         │ [LoopCoordinatorBehavior], CompletionBehavior          │
├─────────────────────────┼───────────────────────────────────────────────────────┤
│ TimeBoundRoundsStrategy │ TimerBehavior, HistoryBehavior, SoundBehavior,        │
│                         │ LoopCoordinatorBehavior, CompletionBehavior            │
├─────────────────────────┼───────────────────────────────────────────────────────┤
│ IntervalStrategy        │ TimerBehavior, SoundBehavior,                          │
│                         │ LoopCoordinatorBehavior, HistoryBehavior,             │
│                         │ CompletionBehavior                                     │
├─────────────────────────┼───────────────────────────────────────────────────────┤
│ GroupStrategy           │ CompletionBehavior (placeholder)                       │
└─────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## Strategy Matching Priority

Strategies are evaluated in order. First match wins:

1. **IntervalStrategy** - Timer + `behavior.repeating_interval` hint
2. **TimeBoundRoundsStrategy** - Timer + (Rounds OR `behavior.time_bound` hint)
3. **TimerStrategy** - Timer fragment OR `behavior.timer` hint
4. **RoundsStrategy** - Rounds fragment (no Timer)
5. **GroupStrategy** - Has children OR `behavior.group` hint
6. **EffortStrategy** - Fallback (no Timer, no Rounds)

---

## Memory Types Allocated by Behaviors

| Memory Type | Owner | Visibility | Allocated By |
|-------------|-------|------------|--------------|
| `timer:{blockId}` | blockId | public | TimerBehavior |
| `display-timer-state` | runtime | public | TimerBehavior |
| `execution-span` | blockId | public | HistoryBehavior, ExecutionTracker |
| `METRICS_CURRENT` | runtime | public | EffortBlock, RoundsBlock, HistoryBehavior |
| `METRIC_REPS` | blockId | inherited | RoundsStrategy |
| `runtime-controls` | blockId | public | IdleBehavior, RuntimeControlsBehavior |
| `sound-state-{blockId}` | blockId | private | SoundBehavior |
| `timer:lap:{blockId}:{round}` | blockId | public | LoopCoordinatorBehavior |

---

## Event Flow Diagram

```
                          RuntimeClock.tick()
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ TimerBehavior   │
                        │   onTick()      │
                        └────────┬────────┘
                                 │ emit timer:tick
                                 ▼
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
      ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
      │ SoundBehavior │  │ Display State │  │ Completion    │
      │  handleEvent  │  │   Update      │  │    Check      │
      └───────┬───────┘  └───────────────┘  └───────┬───────┘
              │                                      │
              ▼                                      │ if complete
      PlaySoundAction                                ▼
                                            emit timer:complete
                                                     │
                                                     ▼
                                       ┌─────────────────────┐
                                       │ LoopCoordinator     │
                                       │   onEvent           │
                                       │  (INTERVAL type)    │
                                       └──────────┬──────────┘
                                                  │
                                                  ▼
                                          advance to next
                                              round
```

---

## Summary

The Wod.Wiki runtime uses a **behavior composition pattern** where:

1. **Strategies** match workout patterns and compose appropriate behaviors
2. **Behaviors** are single-purpose units that handle specific concerns
3. **Blocks** are the containers that orchestrate behavior execution
4. **Actions** are the atomic operations that modify runtime state

This design allows:
- Easy addition of new workout types by composing existing behaviors
- Testability of individual behaviors in isolation
- Clear separation between timer logic, completion detection, and history tracking
- Flexible configuration via behavior parameters
