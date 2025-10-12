# Timer Strategy and Behavior Proposals

**Created**: 2025-10-11
**Status**: Design Proposal
**Related Documents**:
- `workout-timer-processing-analysis.md` - Workout pattern analysis
- `notes/runtime-behavior-architecture.md` - Behavior architecture analysis
- `notes/runtime-interfaces-catalog.md` - Interface catalog
- `docs/runtime-refactoring-plan.md` - Refactoring roadmap

---

## Behavior Catalog

### Existing Behaviors (From runtime-behavior-architecture.md)

| Behavior | Purpose | Memory Dependencies | Key Actions |
|----------|---------|-------------------|-------------|
| **TimerBehavior** | Time tracking and interval-based event emission | `timeSpansRef`, `isRunningRef` | `StartTimerAction`, `StopTimerAction`, `EmitEventAction('timer:tick')` |
| **RoundsBehavior** | Round progression and variable rep scheme management | `roundsStateRef` | `EmitEventAction('rounds:changed')`, `EmitEventAction('rounds:complete')` |
| **ChildAdvancementBehavior** | Sequential child statement traversal | None | `PushBlockAction` (via LazyCompilationBehavior) |
| **LazyCompilationBehavior** | JIT compilation of child statements on demand | None | `PushBlockAction` |
| **CompletionBehavior** | Generic completion condition detection | None | `EmitEventAction('block:complete')` |
| **CompletionTrackingBehavior** | Child advancement completion monitoring | None | None |
| **ParentContextBehavior** | Parent block reference maintenance | None | None |

### Proposed New Behaviors

| Behavior                          | Purpose                                        | Memory Dependencies                            | Key Actions                                                                     |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| **CountdownTimerBehavior**        | Countdown timing with completion detection     | `timerRef`                                     | `StartTimerAction`, `StopTimerAction`, `EmitEventAction('countdown:completed')` |
| **InfiniteRoundsBehavior**        | Unlimited round counting (for AMRAP)           | `roundCounterRef`                              | `EmitEventAction('round:completed')`                                            |
| **AMRAPCompletionBehavior**       | AMRAP-specific completion logic                | `timerRef`, `roundCounterRef`, `completionRef` | `EmitEventAction('amrap:completed')`, `PopBlockAction`                          |
| **IntervalTimerBehavior**         | Fixed interval timing (EMOM)                   | `intervalRef`                                  | `AdvanceIntervalAction`, `EmitEventAction('emom:minute-started')`               |
| **MinuteCounterBehavior**         | Minute tracking for EMOM workouts              | `minuteRef`, `intervalRef`                     | `EmitEventAction('emom:minute-updated')`                                        |
| **EMOMWorkBehavior**              | Work completion tracking within EMOM intervals | `workRef`, `intervalRef`                       | `EmitEventAction('emom:work-completed')`                                        |
| **PhaseTimerBehavior**            | Alternating work/rest phase timing             | `phaseRef`                                     | `TransitionPhaseAction`, `EmitEventAction('interval:work-started')`             |
| **WorkPhaseBehavior**             | Manages work phase execution                   | `currentPhaseRef`                              | `PushBlockAction` (for work)                                                    |
| **RestPhaseBehavior**             | Manages rest phase execution                   | `currentPhaseRef`                              | `PopBlockAction` (end work)                                                     |
| **RepSchemeBehavior**             | Variable rep scheme management                 | `repSchemeRef`, `dynamicRepsRef`               | `UpdateDynamicRepsAction`, `EmitEventAction('scheme:round-updated')`            |
| **RoundAdvancementBehavior**      | Round progression for variable schemes         | `currentRoundRef`, `repSchemeRef`              | `CompleteRoundAction`                                                           |
| **DynamicRepCompilationBehavior** | Adjusts child compilation with dynamic reps    | `dynamicRepsRef`, `repSchemeRef`               | `PushBlockAction` (with modified reps)                                          |
| **SchemeCompletionBehavior**      | Variable rep scheme completion detection       | `repSchemeRef`                                 | `EmitEventAction('scheme:completed')`, `PopBlockAction`                         |
| **RestTimerBehavior**             | Independent rest period timing                 | `restTimerRef`, `restStateRef`                 | `StartTimerAction`, `StopTimerAction`                                           |
| **WorkRestPhaseBehavior**         | Coordinates work/rest transitions              | `phaseTrackerRef`, `restStateRef`              | `TransitionPhaseAction`, `EmitEventAction('rest:started')`                      |
| **RestCompletionBehavior**        | Rest period completion detection               | `restStateRef`, `phaseTrackerRef`              | `EmitEventAction('rest:completed')`, `PushBlockAction` (next work)              |

### New Action Types Required

| Action | Purpose | Parameters |
|--------|---------|------------|
| **AdvanceIntervalAction** | Advance to next interval | `intervalNumber: number` |
| **UpdateDynamicRepsAction** | Update movement reps for current round | `reps: Record<string, number>` |
| **TransitionPhaseAction** | Switch between work/rest phases | `newPhase: 'work' | 'rest'` |
| **CompleteRoundAction** | Mark current round as complete | `roundNumber: number` |

---

## Executive Summary

This document proposes specific timer strategy implementations that address the critical gaps identified in the workout timer processing analysis. Building on the composable behavior architecture and the upcoming refactoring plan, we define five new strategy implementations that can handle the complex CrossFit workout patterns currently unsupported by the system.

Each strategy defines:
1. **Memory Allocation Pattern** - Shared memory references for behaviors
2. **Behavior Composition** - Which behaviors and their responsibilities
3. **Action Creation** - Declarative actions emitted by behaviors
4. **CodeStatement Processing** - How workout syntax is interpreted

---

## Table of Contents

1. [Strategy Overview](#strategy-overview)
2. [AMRAP Strategy](#amrap-strategy)
3. [EMOM Strategy](#emom-strategy)
4. [Interval Training Strategy](#interval-training-strategy)
5. [Complex Rep Scheme Strategy](#complex-rep-scheme-strategy)
6. [Rest Period Strategy](#rest-period-strategy)
7. [Behavior Enhancements](#behavior-enhancements)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Testing Strategy](#testing-strategy)

---

## Strategy Overview

### Current Gaps Identified

From `workout-timer-processing-analysis.md`, the current system lacks support for:

1. **AMRAP workouts** with countdown timers (Cindy, Mary)
2. **EMOM intervals** with fixed minute boundaries (Chelsea)
3. **Rest periods** between rounds (Barbara, Nancy)
4. **Complex rep schemes** (21-15-9, pyramids)
5. **Interval training** patterns (StrongFirst workouts)

### Proposed Strategy Hierarchy

```typescript
// New strategy priority order (inserted before existing EffortStrategy)
1. AMRAPStrategy           // "20:00 AMRAP" - countdown + rounds
2. EMOMStrategy           // ":60 EMOM" - interval-based
3. IntervalStrategy       // "20s/10s" - work/rest intervals
4. ComplexRepSchemeStrategy // "(21-15-9)" - variable reps
5. RestPeriodStrategy     // "+ 3:00 Rest" - embedded rest
6. TimerStrategy          // Existing - simple timers
7. RoundsStrategy         // Existing - simple rounds
8. EffortStrategy         // Existing - fallback
```

### Memory Allocation Pattern

All strategies follow the **Strategy-Owned Memory** pattern from the refactoring plan:

```typescript
// Standard pattern for all new strategies
export class ExampleStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        // 1. Create context
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const context = new BlockContext(runtime, blockId);

        // 2. Allocate ALL memory before behaviors
        const memoryRefs = this.allocateMemory(context, statements);

        // 3. Create behaviors with injected memory
        const behaviors = this.createBehaviors(memoryRefs, statements);

        // 4. Return block with context
        return new RuntimeBlock(runtime, sourceIds, behaviors, context, blockKey, "Example");
    }

	// TODO: this should all be done in the compile function no reason to have a private method here.
    private allocateMemory(context: IBlockContext, statements: ICodeStatement[]): MemoryRefs {
        // Allocate all memory references
        return {
            timerState: context.allocate<TimerState>(MemoryTypeEnum.TIMER_STATE, initialTimerState),
            roundsState: context.allocate<RoundsState>(MemoryTypeEnum.ROUNDS_STATE, initialRoundsState),
            intervalState: context.allocate<IntervalState>(MemoryTypeEnum.INTERVAL_STATE, initialIntervalState),
            // ... other memory refs
        };
    }
}
```

---

## AMRAP Strategy

### Purpose

Handles **"As Many Rounds As Possible"** workouts with countdown timers and round counting.

**Syntax Examples:**
- `20:00 AMRAP`
- `15:00 AMRAP`
- `10:00 AMRAP`

**Workouts Supported:** Cindy, Mary, and all countdown timer workouts.

### Memory Allocation

```typescript
interface AMRAPMemoryRefs {
    // Countdown timer (countdown from duration to 0)
    countdownTimer: TypedMemoryReference<TimerState>;

    // Round counter (tracks completed rounds)
    roundCounter: TypedMemoryReference<RoundsState>;

    // Workout completion state
    completionState: TypedMemoryReference<AMRAPCompletionState>;
}

interface TimerState {
    direction: 'down';  // Always countdown for AMRAP
    durationMs: number; // Total workout duration
    elapsedMs: number;  // Current elapsed time
    isRunning: boolean; // Timer running state
}

interface AMRAPCompletionState {
    timeExpired: boolean;
    totalRounds: number;
    completedAt?: Date;
}
```

### Behavior Composition

```typescript
private createBehaviors(memory: AMRAPMemoryRefs, statements: ICodeStatement[]): IRuntimeBehavior[] {
    const behaviors: IRuntimeBehavior[] = [];

    // 1. Countdown Timer Behavior
    behaviors.push(new CountdownTimerBehavior(
        memory.countdownTimer,
        // Countdown direction, auto-complete when reaches zero
    ));

    // 2. Round Counter Behavior
    behaviors.push(new InfiniteRoundsBehavior(
        memory.roundCounter,
        // No fixed limit, count until timer expires
    ));

    // 3. Child Advancement for workout movements
    behaviors.push(new ChildAdvancementBehavior(children));
    behaviors.push(new LazyCompilationBehavior());

    // 4. Completion Detection (timer expired)
    behaviors.push(new AMRAPCompletionBehavior(
        memory.countdownTimer,
        memory.roundCounter,
        memory.completionState
    ));

    // 5. Event Handler for timer completion
    const handler = new AMRAPCompleteHandler(memory.completionState);
    behaviors.push(new EventHandlerBehavior(handler));

    return behaviors;
}
```

### Action Creation

**CountdownTimerBehavior Actions:**
```typescript
onPush(): IRuntimeAction[] {
    return [
        new EmitEventAction('amrap:started', {
            duration: this.durationMs,
            direction: 'down'
        }),
        new StartTimerAction(this.timerRef)
    ];
}

onNext(): IRuntimeAction[] {
    // Check if countdown reached zero
    const timerState = this.timerRef.get();
    if (timerState?.remainingMs <= 0) {
        return [
            new StopTimerAction(this.timerRef),
            new EmitEventAction('amrap:time-expired', {
                finalTime: timerState.elapsedMs,
                roundsCompleted: this.getRoundsCompleted()
            })
        ];
    }
    return [];
}
```

**AMRAPCompletionBehavior Actions:**
```typescript
onNext(): IRuntimeAction[] {
    const timerState = this.timerRef.get();
    const completionState = this.completionRef.get();

    if (timerState?.remainingMs <= 0 && !completionState.timeExpired) {
        // Time expired - mark workout complete
        this.completionRef.set({
            timeExpired: true,
            totalRounds: this.getRoundsCompleted(),
            completedAt: new Date()
        });

        return [
            new EmitEventAction('amrap:completed', {
                rounds: this.getRoundsCompleted(),
                time: timerState.elapsedMs
            }),
            new PopBlockAction() // End workout
        ];
    }
    return [];
}
```

---

## EMOM Strategy

### Purpose

Handles **"Every Minute On the Minute"** workouts with fixed 60-second intervals.

**Syntax Examples:**
- `(30) :60 EMOM`
- `:60 EMOM`
- `15 :45 EMOM`

**Workouts Supported:** Chelsea, and all EMOM-style workouts.

### Memory Allocation

```typescript
interface EMOMMemoryRefs {
    // Interval timer (fixed 60-second intervals)
    intervalTimer: TypedMemoryReference<IntervalState>;

    // Minute counter
    minuteCounter: TypedMemoryReference<MinuteState>;

    // Work completion tracking
    workState: TypedMemoryReference<WorkCompletionState>;
}

interface IntervalState {
    intervalDurationMs: number;  // 60000 for EMOM
    currentIntervalStart: Date;
    currentIntervalNumber: number;
    totalIntervals: number;
}

interface WorkCompletionState {
    currentWorkCompleted: boolean;
    workCompletedAt?: Date;
    waitingForNextInterval: boolean;
}
```

### Behavior Composition

```typescript
private createBehaviors(memory: EMOMMemoryRefs, statements: ICodeStatement[]): IRuntimeBehavior[] {
    const behaviors: IRuntimeBehavior[] = [];

    // 1. Interval Timer Behavior (fixed 60-second intervals)
    behaviors.push(new IntervalTimerBehavior(
        memory.intervalTimer,
        // Fixed interval advancement regardless of work completion
    ));

    // 2. Minute Counter Behavior
    behaviors.push(new MinuteCounterBehavior(
        memory.minuteCounter,
        memory.intervalTimer
    ));

    // 3. Work Completion Behavior
    behaviors.push(new EMOMWorkBehavior(
        memory.workState,
        memory.intervalTimer
    ));

    // 4. Child Advancement (work inside each minute)
    behaviors.push(new ChildAdvancementBehavior(children));
    behaviors.push(new LazyCompilationBehavior());

    // 5. EMOM Completion (all minutes completed)
    behaviors.push(new EMOMCompletionBehavior(
        memory.minuteCounter,
        memory.intervalTimer
    ));

    return behaviors;
}
```

### Action Creation

**IntervalTimerBehavior Actions:**
```typescript
onNext(): IRuntimeAction[] {
    const now = new Date();
    const intervalState = this.intervalRef.get();

    // Check if we need to advance to next minute
    const timeInCurrentInterval = now.getTime() - intervalState.currentIntervalStart.getTime();

    if (timeInCurrentInterval >= intervalState.intervalDurationMs) {
        // Advance to next interval
        const nextInterval = intervalState.currentIntervalNumber + 1;

        if (nextInterval > intervalState.totalIntervals) {
            return [
                new EmitEventAction('emom:completed', {
                    totalIntervals: intervalState.totalIntervals
                }),
                new PopBlockAction()
            ];
        }

        this.intervalRef.set({
            ...intervalState,
            currentIntervalStart: now,
            currentIntervalNumber: nextInterval
        });

        return [
            new EmitEventAction('emom:minute-started', {
                minute: nextInterval,
                timestamp: now
            }),
            new PushBlockAction(this.compileWorkForMinute(nextInterval))
        ];
    }

    return [];
}
```

**EMOMWorkBehavior Actions:**
```typescript
onPush(): IRuntimeAction[] {
    // Reset work completion for new interval
    this.workRef.set({
        currentWorkCompleted: false,
        waitingForNextInterval: false
    });

    return [
        new EmitEventAction('emom:work-started', {
            interval: this.getCurrentInterval()
        })
    ];
}

onNext(): IRuntimeAction[] {
    const workState = this.workRef.get();

    if (!workState.currentWorkCompleted && this.isWorkComplete()) {
        this.workRef.set({
            ...workState,
            currentWorkCompleted: true,
            workCompletedAt: new Date()
        });

        return [
            new EmitEventAction('emom:work-completed', {
                interval: this.getCurrentInterval(),
                completedAt: new Date()
            })
        ];
    }

    return [];
}
```

---

## Interval Training Strategy

### Purpose

Handles **work/rest interval** workouts with custom timing ratios.

**Syntax Examples:**
- `(8) 20s/10s`
- `30s Work / 30s Rest`
- `1:00 Work / :30 Rest`

**Workouts Supported:** Tabata, HIIT, StrongFirst interval workouts.

### Memory Allocation

```typescript
interface IntervalMemoryRefs {
    // Phase timer (work vs rest phases)
    phaseTimer: TypedMemoryReference<PhaseState>;

    // Interval counter
    intervalCounter: TypedMemoryReference<IntervalCounterState>;

    // Current phase state
    currentPhase: TypedMemoryReference<CurrentPhaseState>;
}

interface PhaseState {
    workDurationMs: number;
    restDurationMs: number;
    currentPhaseStart: Date;
    isWorkPhase: boolean;
}

interface IntervalCounterState {
    currentInterval: number;
    totalIntervals: number;
    completedIntervals: number;
}
```

### Behavior Composition

```typescript
private createBehaviors(memory: IntervalMemoryRefs, statements: ICodeStatement[]): IRuntimeBehavior[] {
    const behaviors: IRuntimeBehavior[] = [];

    // 1. Phase Timer Behavior (alternating work/rest)
    behaviors.push(new PhaseTimerBehavior(
        memory.phaseTimer,
        // Alternates between work and rest phases
    ));

    // 2. Interval Counter Behavior
    behaviors.push(new IntervalCounterBehavior(
        memory.intervalCounter,
        memory.phaseTimer
    ));

    // 3. Work Phase Behavior (push work during work phases)
    behaviors.push(new WorkPhaseBehavior(
        memory.currentPhase,
        children
    ));

    // 4. Rest Phase Behavior (handle rest phases)
    behaviors.push(new RestPhaseBehavior(
        memory.currentPhase
    ));

    // 5. Interval Completion Behavior
    behaviors.push(new IntervalCompletionBehavior(
        memory.intervalCounter
    ));

    return behaviors;
}
```

### Action Creation

**PhaseTimerBehavior Actions:**
```typescript
onNext(): IRuntimeAction[] {
    const now = new Date();
    const phaseState = this.phaseRef.get();
    const timeInPhase = now.getTime() - phaseState.currentPhaseStart.getTime();

    const currentPhaseDuration = phaseState.isWorkPhase
        ? phaseState.workDurationMs
        : phaseState.restDurationMs;

    if (timeInPhase >= currentPhaseDuration) {
        // Switch phases
        const newPhase = !phaseState.isWorkPhase;

        this.phaseRef.set({
            ...phaseState,
            currentPhaseStart: now,
            isWorkPhase: newPhase
        });

        if (newPhase) {
            // Starting work phase
            return [
                new EmitEventAction('interval:work-started', {
                    interval: phaseState.currentInterval,
                    phaseStart: now
                }),
                new PushBlockAction(this.compileWorkForCurrentInterval())
            ];
        } else {
            // Starting rest phase
            return [
                new EmitEventAction('interval:rest-started', {
                    interval: phaseState.currentInterval,
                    phaseStart: now
                }),
                new PopBlockAction() // Remove work block
            ];
        }
    }

    return [];
}
```

---

## Complex Rep Scheme Strategy

### Purpose

Handles **variable rep schemes** with descending, ascending, or pyramid patterns.

**Syntax Examples:**
- `(21-15-9)`
- `(10-9-8-7-6-5-4-3-2-1)`
- `(1-2-3-4-5-4-3-2-1)`

**Workouts Supported:** Fran, Diane, Elizabeth, Linda, and all variable rep workouts.

### Memory Allocation

```typescript
interface ComplexRepMemoryRefs {
    // Rep scheme definition
    repScheme: TypedMemoryReference<RepSchemeState>;

    // Current round tracking
    currentRound: TypedMemoryReference<CurrentRoundState>;

    // Dynamic rep values
    dynamicReps: TypedMemoryReference<DynamicRepState>;
}

interface RepSchemeState {
    pattern: number[];        // [21, 15, 9] or [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    currentRound: number;    // 1-indexed
    totalRounds: number;
    schemeType: 'descending' | 'ascending' | 'pyramid' | 'custom';
}

interface DynamicRepState {
    currentReps: Record<string, number>;  // Movement name -> rep count
    repMultiplier: number;                 // For scaling schemes
}
```

### Behavior Composition

```typescript
private createBehaviors(memory: ComplexRepMemoryRefs, statements: ICodeStatement[]): IRuntimeBehavior[] {
    const behaviors: IRuntimeBehavior[] = [];

    // 1. Rep Scheme Behavior (manages variable reps)
    behaviors.push(new RepSchemeBehavior(
        memory.repScheme,
        memory.dynamicReps
    ));

    // 2. Round Advancement Behavior
    behaviors.push(new RoundAdvancementBehavior(
        memory.currentRound,
        memory.repScheme
    ));

    // 3. Dynamic Rep Compilation (adjusts child compilation)
    behaviors.push(new DynamicRepCompilationBehavior(
        memory.dynamicReps,
        memory.repScheme
    ));

    // 4. Child Advancement
    behaviors.push(new ChildAdvancementBehavior(children));

    // 5. Scheme Completion Behavior
    behaviors.push(new SchemeCompletionBehavior(
        memory.repScheme
    ));

    return behaviors;
}
```

### Action Creation

**RepSchemeBehavior Actions:**
```typescript
onPush(): IRuntimeAction[] {
    const scheme = this.repSchemeRef.get();

    return [
        new EmitEventAction('scheme:started', {
            pattern: scheme.pattern,
            type: scheme.schemeType,
            totalRounds: scheme.totalRounds
        })
    ];
}

onNext(): IRuntimeAction[] {
    const scheme = this.repSchemeRef.get();
    const currentRound = scheme.currentRound;

    if (currentRound <= scheme.totalRounds) {
        // Update dynamic reps for current round
        const repsForRound = scheme.pattern[currentRound - 1];

        this.dynamicRepsRef.set({
            currentReps: this.calculateRepsForMovements(repsForRound),
            repMultiplier: 1.0
        });

        return [
            new EmitEventAction('scheme:round-updated', {
                round: currentRound,
                reps: repsForRound,
                movementReps: this.dynamicRepsRef.get().currentReps
            })
        ];
    }

    return [];
}
```

**DynamicRepCompilationBehavior Actions:**
```typescript
onNext(): IRuntimeAction[] {
    const dynamicReps = this.dynamicRepsRef.get();
    const currentChild = this.childAdvancement.getCurrentChild();

    if (currentChild) {
        // Modify compilation context with dynamic reps
        const modifiedChild = this.applyDynamicReps(currentChild, dynamicReps.currentReps);

        return [
            new PushBlockAction(
                this.runtime.jit.compile([modifiedChild], this.runtime)
            )
        ];
    }

    return [];
}
```

---

## Rest Period Strategy

### Purpose

Handles **embedded rest periods** between rounds or workout segments.

**Syntax Examples:**
- `+ 3:00 Rest`
- `:30 Rest`
- `1:00 Rest`

**Workouts Supported:** Barbara, Nancy, and all workouts with built-in rest periods.

### Memory Allocation

```typescript
interface RestMemoryRefs {
    // Rest timer (separate from work timer)
    restTimer: TypedMemoryReference<TimerState>;

    // Rest state tracking
    restState: TypedMemoryReference<RestState>;

    // Work/rest phase tracking
    phaseTracker: TypedMemoryReference<WorkRestPhaseState>;
}

interface RestState {
    isResting: boolean;
    restDurationMs: number;
    restStartedAt?: Date;
    restCompletedAt?: Date;
}

interface WorkRestPhaseState {
    currentPhase: 'work' | 'rest';
    completedWorkRounds: number;
    completedRestPeriods: number;
}
```

### Behavior Composition

```typescript
private createBehaviors(memory: RestMemoryRefs, statements: ICodeStatement[]): IRuntimeBehavior[] {
    const behaviors: IRuntimeBehavior[] = [];

    // 1. Rest Timer Behavior (independent timer for rest periods)
    behaviors.push(new RestTimerBehavior(
        memory.restTimer,
        memory.restState
    ));

    // 2. Work/Rest Phase Behavior (coordinates transitions)
    behaviors.push(new WorkRestPhaseBehavior(
        memory.phaseTracker,
        memory.restState
    ));

    // 3. Rest Completion Behavior
    behaviors.push(new RestCompletionBehavior(
        memory.restState,
        memory.phaseTracker
    ));

    // 4. Main workout behaviors (delegated to other strategies)
    behaviors.push(this.createMainWorkoutBehaviors(statements));

    return behaviors;
}
```

### Action Creation

**WorkRestPhaseBehavior Actions:**
```typescript
onNext(): IRuntimeAction[] {
    const phaseState = this.phaseRef.get();
    const restState = this.restRef.get();

    if (phaseState.currentPhase === 'work' && this.isWorkRoundComplete()) {
        // Transition to rest
        this.phaseRef.set({
            ...phaseState,
            currentPhase: 'rest',
            completedWorkRounds: phaseState.completedWorkRounds + 1
        });

        this.restRef.set({
            isResting: true,
            restDurationMs: this.getRestDuration(),
            restStartedAt: new Date()
        });

        return [
            new EmitEventAction('rest:started', {
                duration: this.getRestDuration(),
                completedWorkRounds: phaseState.completedWorkRounds + 1
            }),
            new StartTimerAction(this.restTimerRef)
        ];
    }

    return [];
}
```

**RestCompletionBehavior Actions:**
```typescript
onNext(): IRuntimeAction[] {
    const restState = this.restRef.get();
    const phaseState = this.phaseRef.get();

    if (restState.isResting && this.isRestComplete()) {
        // Rest complete - transition back to work
        this.restRef.set({
            ...restState,
            isResting: false,
            restCompletedAt: new Date()
        });

        this.phaseRef.set({
            ...phaseState,
            currentPhase: 'work',
            completedRestPeriods: phaseState.completedRestPeriods + 1
        });

        return [
            new EmitEventAction('rest:completed', {
                duration: restState.restDurationMs,
                nextWorkRound: phaseState.completedWorkRounds + 1
            }),
            new StopTimerAction(this.restTimerRef),
            new PushBlockAction(this.compileNextWorkRound())
        ];
    }

    return [];
}
```

---

## Behavior Enhancements

### New Behaviors Required

#### 1. CountdownTimerBehavior
```typescript
export class CountdownTimerBehavior implements IRuntimeBehavior {
    constructor(
        private readonly timerRef: TypedMemoryReference<TimerState>,
        private readonly durationMs: number
    ) {}

    onPush(): IRuntimeAction[] {
        return [
            new StartTimerAction(this.timerRef),
            new EmitEventAction('countdown:started', { duration: this.durationMs })
        ];
    }

    onNext(): IRuntimeAction[] {
        const state = this.timerRef.get();
        const remainingMs = this.durationMs - state.elapsedMs;

        if (remainingMs <= 0) {
            return [
                new StopTimerAction(this.timerRef),
                new EmitEventAction('countdown:completed', { finalTime: state.elapsedMs })
            ];
        }

        return [new EmitEventAction('countdown:tick', { remainingMs })];
    }
}
```

#### 2. IntervalTimerBehavior
```typescript
export class IntervalTimerBehavior implements IRuntimeBehavior {
    constructor(
        private readonly intervalRef: TypedMemoryReference<IntervalState>,
        private readonly intervalMs: number
    ) {}

    onNext(): IRuntimeAction[] {
        const state = this.intervalRef.get();
        const now = new Date();
        const timeInInterval = now.getTime() - state.currentIntervalStart.getTime();

        if (timeInInterval >= this.intervalMs) {
            return [new AdvanceIntervalAction(state.currentIntervalNumber + 1)];
        }

        return [];
    }
}
```

#### 3. EMOMWorkBehavior
```typescript
export class EMOMWorkBehavior implements IRuntimeBehavior {
    constructor(
        private readonly workRef: TypedMemoryReference<WorkCompletionState>,
        private readonly intervalRef: TypedMemoryReference<IntervalState>
    ) {}

    onNext(): IRuntimeAction[] {
        const workState = this.workRef.get();

        if (!workState.currentWorkCompleted && this.isWorkComplete()) {
            this.workRef.set({
                ...workState,
                currentWorkCompleted: true,
                workCompletedAt: new Date()
            });

            return [
                new EmitEventAction('emom:work-completed', {
                    interval: this.intervalRef.get().currentIntervalNumber
                })
            ];
        }

        return [];
    }
}
```

### Enhanced Existing Behaviors

#### TimerBehavior Enhancements
```typescript
// Add to existing TimerBehavior
constructor(
    private readonly direction: 'up' | 'down' = 'up',
    private readonly durationMs?: number,
    private readonly timerRef?: TypedMemoryReference<TimerState>,
    private readonly isRunningRef?: TypedMemoryReference<boolean>,
    private readonly completionAction?: () => IRuntimeAction[]  // New
) {}

// Enhanced completion detection
private checkCompletion(): IRuntimeAction[] {
    if (this.direction === 'down' && this.durationMs !== undefined) {
        const remainingMs = this.durationMs - this.getElapsedMs();
        if (remainingMs <= 0) {
            return this.completionAction?.() || [];
        }
    }
    return [];
}
```

#### RoundsBehavior Enhancements
```typescript
// Add support for variable rep schemes
constructor(
    private readonly totalRounds: number,
    private readonly repScheme?: number[],
    private readonly roundsRef?: TypedMemoryReference<RoundsState>,
    private readonly variableRepsEnabled: boolean = false  // New
) {}

// Enhanced context with dynamic reps
getCompilationContext(): CompilationContext {
    const baseContext = {
        currentRound: this.currentRound,
        totalRounds: this.totalRounds,
        repScheme: this.repScheme,
        getRepsForCurrentRound: () => this.getCurrentRoundReps()
    };

    if (this.variableRepsEnabled && this.repScheme) {
        return {
            ...baseContext,
            dynamicReps: this.repScheme[this.currentRound - 1],
            repMultiplier: this.calculateRepMultiplier()
        };
    }

    return baseContext;
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**After refactoring plan Phase 1-2 complete:**

1. **Create Memory Types**
   ```typescript
   // src/runtime/MemoryTypeEnum.ts additions
   export enum MemoryTypeEnum {
       // Existing types...

       // AMRAP
       AMRAP_COMPLETION = 'amrap-completion',

       // EMOM
       INTERVAL_STATE = 'interval-state',
       MINUTE_STATE = 'minute-state',
       WORK_COMPLETION = 'work-completion',

       // Interval Training
       PHASE_STATE = 'phase-state',
       INTERVAL_COUNTER = 'interval-counter',
       CURRENT_PHASE = 'current-phase',

       // Complex Rep Schemes
       REP_SCHEME = 'rep-scheme',
       DYNAMIC_REPS = 'dynamic-reps',

       // Rest Periods
       REST_STATE = 'rest-state',
       WORK_REST_PHASE = 'work-rest-phase',
   }
   ```

2. **Create Action Types**
   - `AdvanceIntervalAction`
   - `UpdateDynamicRepsAction`
   - `TransitionPhaseAction`
   - `CompleteRoundAction`

3. **Implement Core Behaviors**
   - `CountdownTimerBehavior`
   - `IntervalTimerBehavior`
   - `EMOMWorkBehavior`
   - `RestTimerBehavior`

### Phase 2: Strategy Implementation (Week 3-4)

1. **AMRAPStrategy** - Highest priority (most common pattern)
2. **EMOMStrategy** - High priority (CrossFit Games standard)
3. **RestPeriodStrategy** - Medium priority (enhances existing workouts)
4. **ComplexRepSchemeStrategy** - Medium priority (enables advanced workouts)
5. **IntervalTrainingStrategy** - Low priority (specialized use cases)

### Phase 3: Integration & Testing (Week 5)

1. **Strategy Registration**
   ```typescript
   // src/runtime/strategies.ts
   export const DEFAULT_STRATEGIES: IRuntimeBlockStrategy[] = [
       new AMRAPStrategy(),
       new EMOMStrategy(),
       new IntervalStrategy(),
       new ComplexRepSchemeStrategy(),
       new RestPeriodStrategy(),
       new TimerStrategy(),
       new RoundsStrategy(),
       new EffortStrategy(),  // Fallback
   ];
   ```

2. **Parser Enhancements**
   - Update `timer.parser.ts` to recognize AMRAP/EMOM syntax
   - Add token types for interval patterns
   - Enhanced AST for complex workout structures

3. **Storybook Integration**
   - Update existing workout stories to use new strategies
   - Add new stories for each timer pattern
   - Test all identified workout examples

### Phase 4: Documentation & Examples (Week 6)

1. **Update Documentation**
   - Interface catalog with new memory types
   - Strategy examples and use cases
   - Migration guide for existing workouts

2. **Create Examples**
   - Complete implementations for all identified workouts
   - Performance benchmarks
   - Integration test scenarios

---

## Testing Strategy

### Unit Tests for Each Strategy

```typescript
describe('AMRAPStrategy', () => {
    describe('match()', () => {
        it('should match AMRAP syntax patterns', () => {
            const statements = parse('20:00 AMRAP\n5 Pullups\n10 Pushups');
            expect(strategy.match(statements, mockRuntime)).toBe(true);
        });

        it('should not match non-AMRAP patterns', () => {
            const statements = parse('For Time:\n100 Burpees');
            expect(strategy.match(statements, mockRuntime)).toBe(false);
        });
    });

    describe('compile()', () => {
        it('should allocate correct memory references', () => {
            const block = strategy.compile(amrapStatements, mockRuntime);
            expect(block.context.references).toHaveLength(3); // timer, rounds, completion
        });

        it('should create behaviors in correct order', () => {
            const block = strategy.compile(amrapStatements, mockRuntime);
            const behaviorTypes = block.behaviors.map(b => b.constructor.name);
            expect(behaviorTypes).toContain('CountdownTimerBehavior');
            expect(behaviorTypes).toContain('InfiniteRoundsBehavior');
        });
    });
});
```

### Integration Tests

```typescript
describe('AMRAP Workout Integration', () => {
    it('should execute Cindy workout correctly', async () => {
        const workout = '20:00 AMRAP\n5 Pullups\n10 Pushups\n15 Air Squats';
        const runtime = new ScriptRuntime();

        const results = await runtime.execute(workout);

        expect(results.duration).toBeCloseTo(20 * 60 * 1000, 100); // 20 minutes
        expect(results.roundsCompleted).toBeGreaterThan(0);
        expect(results.completed).toBe(true);
    });

    it('should handle EMOM with rest correctly', async () => {
        const workout = '(15) :60 EMOM\n+ 5 Pullups\n+ 10 Pushups';
        const runtime = new ScriptRuntime();

        const results = await runtime.execute(workout);

        expect(results.intervalsCompleted).toBe(15);
        expect(results.intervalDurations).toEqual(Array(15).fill(60000)); // 60 seconds each
    });
});
```

### Performance Tests

```typescript
describe('Timer Performance', () => {
    it('should maintain 50ms lifecycle requirement', async () => {
        const strategies = [
            new AMRAPStrategy(),
            new EMOMStrategy(),
            new IntervalStrategy()
        ];

        for (const strategy of strategies) {
            const start = performance.now();
            const block = strategy.compile(testStatements, mockRuntime);
            const mountTime = performance.now() - start;

            expect(mountTime).toBeLessThan(50); // 50ms requirement

            // Test all lifecycle methods
            const lifecycleTimes = await measureAllLifecycleMethods(block);
            Object.values(lifecycleTimes).forEach(time => {
                expect(time).toBeLessThan(50);
            });
        }
    });
});
```

### Regression Tests

```typescript
describe('Backward Compatibility', () => {
    it('should not break existing workouts', () => {
        const existingWorkouts = [
            'For Time:\n100 Burpees',
            '(5) \n20 Pullups\n30 Pushups\n40 Situps',
            '21-15-9\nThrusters 95lb\nPullups'
        ];

        existingWorkouts.forEach(workout => {
            expect(() => {
                const runtime = new ScriptRuntime();
                runtime.parse(workout);
            }).not.toThrow();
        });
    });

    it('should maintain existing strategy priority', () => {
        const strategies = getDefaultStrategies();

        // EffortStrategy should still be fallback
        expect(strategies[strategies.length - 1]).toBeInstanceOf(EffortStrategy);

        // TimerStrategy should still handle simple timers
        expect(strategies.some(s => s instanceof TimerStrategy)).toBe(true);
    });
});
```

---

## Success Criteria

### Functional Requirements

✅ **AMRAP Support**: All countdown timer workouts work correctly
✅ **EMOM Support**: Fixed interval workouts advance every minute
✅ **Rest Periods**: Embedded rest periods work between rounds
✅ **Complex Rep Schemes**: Variable rep patterns (21-15-9) supported
✅ **Interval Training**: Work/rest intervals function correctly

### Quality Requirements

✅ **Performance**: All lifecycle methods complete < 50ms
✅ **Memory**: No memory leaks, proper cleanup via `dispose()`
✅ **Compatibility**: Existing workouts continue to work
✅ **Test Coverage**: 95%+ coverage for all new strategies

### Documentation Requirements

✅ **Interface Catalog**: Updated with new memory types and behaviors
✅ **Examples**: Complete implementations for all identified workouts
✅ **Migration Guide**: Clear path for existing workout syntax

---

## Conclusion

This proposal provides a comprehensive solution to the critical timer processing gaps identified in the workout analysis. By leveraging the composable behavior architecture and following the refactoring plan's patterns, we can implement robust timer strategies that support the full spectrum of CrossFit workout patterns.

The **Strategy-Owned Memory** pattern ensures proper resource management, while the **declarative action system** provides clear, testable behavior implementations. The phased implementation approach allows for gradual rollout with thorough testing at each stage.

The proposed strategies will enable the WOD Wiki system to properly handle all workout patterns currently defined in the Storybook stories, providing a solid foundation for future workout format extensions.

---

**Next Steps:**

1. Review and approve this proposal
2. Begin Phase 1 implementation after refactoring plan completion
3. Create detailed implementation tickets for each strategy
4. Set up integration testing framework
5. Schedule regular progress reviews

---

**End of Timer Strategy and Behavior Proposals**