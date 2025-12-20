# Behavior Catalog: Interface & Memory Specification

This document specifies the interfaces and memory patterns for each proposed behavior in the simplified runtime engine.

---

## Memory Type Constants

```typescript
// Memory keys used by behaviors
const MemoryKeys = {
  // Loop/Round state
  LOOP_STATE: 'loop',           // loop:{blockId} → LoopState
  ROUND_DISPLAY: 'rounds',      // rounds:{blockId} → RoundDisplay
  
  // Timer state
  TIMER_STATE: 'timer',         // timer:{blockId} → TimerState
  
  // Display stack
  DISPLAY_TIMER: 'display:timer',   // display:timer → TimerDisplayEntry[]
  DISPLAY_CARD: 'display:card',     // display:card → CardDisplayEntry[]
  
  // Metrics/Tracking
  SPAN: 'span',                 // span:{blockId} → ExecutionSpan
  METRICS: 'metrics',           // metrics:{blockId} → BlockMetrics
  
  // Sound state
  SOUND_STATE: 'sound',         // sound:{blockId} → SoundState
} as const;
```

---

## Memory Type Definitions

```typescript
interface EnumerationState {
	blockId: string;
	index: number;
	total?: number;
}

interface TimerState {
  blockId: string;
  startTime?: number;     // Epoch ms when started
  accumulatedMs: number;  // Total accumulated time
  durationMs?: number;    // For bound timers
  direction: 'up' | 'down';
  isRunning: boolean;
}

interface TimerDisplayEntry {
  id: string;
  ownerId: string;
  format: 'countdown' | 'countup' | 'clock' | 'empty';
  label?: string;
  durationMs?: number;
  role: 'primary' | 'secondary' | 'auto';
}

interface SoundState {
  blockId: string;
  cues: Array<{
    id: string;
    triggered: boolean;
    threshold: number;
  }>;
}
```

---

## Looping Behaviors

### SingleRepeater

**Intent**: Execute children exactly once, then complete.

**Interfaces**: `INextBehavior`

**Memory**: 
- Reads: `loop:{blockId}`
- Writes: `loop:{blockId}`

```typescript
class SingleRepeater extends BaseBehavior implements INextBehavior {
  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    const loopState = ctx.runtime.memory.get<LoopState>(`loop:${ctx.block.id}`);
    
    // Already completed one iteration
    if (loopState && loopState.index >= 1) {
      return []; // Signal completion by returning empty
    }
    
    // First call - advance and mark complete
    ctx.runtime.memory.set(`loop:${ctx.block.id}`, {
      blockId: ctx.block.id,
      index: 1,
      totalIterations: 1,
      isComplete: true
    });
    
    return []; // No more children to push
  }
}
```

---

### BoundRepeater

**Intent**: Execute children N times, tracking current round.

**Interfaces**: `IPushBehavior`, `INextBehavior`

**Memory**:
- Reads: `loop:{blockId}`
- Writes: `loop:{blockId}`

```typescript
class BoundRepeater extends BaseBehavior implements IPushBehavior, INextBehavior {
  constructor(private readonly totalRounds: number) {
    super();
  }

  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    // Initialize loop state
    ctx.runtime.memory.allocate<LoopState>(`loop:${ctx.block.id}`, ctx.block.id, {
      blockId: ctx.block.id,
      index: 0,
      totalIterations: this.totalRounds,
      isComplete: false
    }, 'public');
    
    return [];
  }

  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    const loopState = ctx.runtime.memory.get<LoopState>(`loop:${ctx.block.id}`);
    if (!loopState) return [];
    
    const nextIndex = loopState.index + 1;
    const isComplete = nextIndex >= this.totalRounds;
    
    // Update state
    ctx.runtime.memory.set(`loop:${ctx.block.id}`, {
      ...loopState,
      index: nextIndex,
      isComplete
    });
    
    if (isComplete) {
      return []; // Done - no more children
    }
    
    // Compile and push next child iteration
    return [new PushBlockAction(this.compileChildren(ctx, nextIndex))];
  }
  
  private compileChildren(ctx: IBehaviorContext, round: number): IRuntimeBlock {
    // JIT compile children for this round
    return ctx.runtime.jit.compile(ctx.block.childStatements, ctx.runtime);
  }
}
```

---

### UnboundRepeater

**Intent**: Execute children indefinitely until externally stopped.

**Interfaces**: `IPushBehavior`, `INextBehavior`

**Memory**:
- Reads: `loop:{blockId}`
- Writes: `loop:{blockId}`

```typescript
class UnboundRepeater extends BaseBehavior implements IPushBehavior, INextBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    ctx.runtime.memory.allocate<LoopState>(`loop:${ctx.block.id}`, ctx.block.id, {
      blockId: ctx.block.id,
      index: 0,
      totalIterations: undefined, // Unbound
      isComplete: false
    }, 'public');
    
    return [];
  }

  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    const loopState = ctx.runtime.memory.get<LoopState>(`loop:${ctx.block.id}`);
    if (!loopState || loopState.isComplete) return [];
    
    // Always advance (never completes on its own)
    ctx.runtime.memory.set(`loop:${ctx.block.id}`, {
      ...loopState,
      index: loopState.index + 1
    });
    
    // Push next iteration
    return [new PushBlockAction(this.compileChildren(ctx))];
  }
  
  private compileChildren(ctx: IBehaviorContext): IRuntimeBlock {
    return ctx.runtime.jit.compile(ctx.block.childStatements, ctx.runtime);
  }
}
```

---

## Rounds Behaviors

### RoundPerBlock

**Intent**: Track rounds where each block execution = 1 round.

**Interfaces**: `IPushBehavior`, `IPopBehavior`

**Memory**:
- Reads: Parent's `loop:{parentId}`
- Writes: `rounds:{blockId}`

```typescript
class RoundPerBlock extends BaseBehavior implements IPushBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    // Read parent's loop state to get current round
    const parentId = ctx.runtime.stack.blocks.at(-2)?.key.toString();
    const parentLoop = parentId 
      ? ctx.runtime.memory.get<LoopState>(`loop:${parentId}`)
      : null;
    
    const currentRound = parentLoop ? parentLoop.index + 1 : 1;
    const totalRounds = parentLoop?.totalIterations;
    
    ctx.runtime.memory.allocate<RoundDisplay>(`rounds:${ctx.block.id}`, ctx.block.id, {
      current: currentRound,
      total: totalRounds
    }, 'public');
    
    return [];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    // Cleanup memory on pop
    ctx.runtime.memory.release(`rounds:${ctx.block.id}`);
    return [];
  }
}
```

---

### RoundPerLoop

**Intent**: Track rounds where each loop iteration = 1 round.

**Interfaces**: `INextBehavior`

**Memory**:
- Reads: `loop:{blockId}`
- Writes: `rounds:{blockId}`

```typescript
class RoundPerLoop extends BaseBehavior implements INextBehavior {
  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    const loopState = ctx.runtime.memory.get<LoopState>(`loop:${ctx.block.id}`);
    if (!loopState) return [];
    
    // Update round display based on loop state
    ctx.runtime.memory.set<RoundDisplay>(`rounds:${ctx.block.id}`, {
      current: loopState.index + 1, // 1-based display
      total: loopState.totalIterations
    });
    
    return [];
  }
}
```

---

## Timer Behaviors

### UnboundTimedBehavior

**Intent**: Count-up timer with no end condition.

**Interfaces**: `IPushBehavior`, `IPopBehavior`

**Memory**:
- Reads: -
- Writes: `timer:{blockId}`

```typescript
class UnboundTimedBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  constructor(private readonly label: string = 'Timer') {
    super();
  }

  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    const now = Date.now();
    
    ctx.runtime.memory.allocate<TimerState>(`timer:${ctx.block.id}`, ctx.block.id, {
      blockId: ctx.block.id,
      startTime: now,
      accumulatedMs: 0,
      direction: 'up',
      isRunning: true
    }, 'public');
    
    return [
      new RegisterClockAction(ctx.block.id), // Register for tick updates
      new EmitEventAction('timer:started', { blockId: ctx.block.id })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    const timerState = ctx.runtime.memory.get<TimerState>(`timer:${ctx.block.id}`);
    
    if (timerState?.isRunning && timerState.startTime) {
      // Calculate final elapsed time
      const finalElapsed = Date.now() - timerState.startTime + timerState.accumulatedMs;
      ctx.runtime.memory.set(`timer:${ctx.block.id}`, {
        ...timerState,
        accumulatedMs: finalElapsed,
        isRunning: false
      });
    }
    
    return [
      new UnregisterClockAction(ctx.block.id),
      new EmitEventAction('timer:stopped', { blockId: ctx.block.id })
    ];
  }
}
```

---

### BoundTimedBehavior

**Intent**: Countdown timer that signals completion at zero.

**Interfaces**: `IPushBehavior`, `INextBehavior`, `IPopBehavior`

**Memory**:
- Reads: `timer:{blockId}`
- Writes: `timer:{blockId}`

```typescript
class BoundTimedBehavior extends BaseBehavior implements IPushBehavior, INextBehavior, IPopBehavior {
  constructor(
    private readonly durationMs: number,
    private readonly label: string = 'Timer'
  ) {
    super();
  }

  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    const now = Date.now();
    
    ctx.runtime.memory.allocate<TimerState>(`timer:${ctx.block.id}`, ctx.block.id, {
      blockId: ctx.block.id,
      startTime: now,
      accumulatedMs: 0,
      durationMs: this.durationMs,
      direction: 'down',
      isRunning: true
    }, 'public');
    
    return [
      new RegisterClockAction(ctx.block.id),
      new EmitEventAction('timer:started', { 
        blockId: ctx.block.id, 
        durationMs: this.durationMs 
      })
    ];
  }

  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    // Check if timer has completed (called by tick handler)
    const timerState = ctx.runtime.memory.get<TimerState>(`timer:${ctx.block.id}`);
    if (!timerState || !timerState.isRunning) return [];
    
    const elapsed = timerState.startTime 
      ? Date.now() - timerState.startTime + timerState.accumulatedMs
      : timerState.accumulatedMs;
    
    if (elapsed >= this.durationMs) {
      // Timer complete
      ctx.runtime.memory.set(`timer:${ctx.block.id}`, {
        ...timerState,
        accumulatedMs: this.durationMs,
        isRunning: false
      });
      
      return [
        new EmitEventAction('timer:complete', { blockId: ctx.block.id }),
        new PopBlockAction()
      ];
    }
    
    return [];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [new UnregisterClockAction(ctx.block.id)];
  }
}
```

---

## Reporting Behaviors

### ReportRoundsBehavior

**Intent**: Emit round information to display system.

**Interfaces**: `INextBehavior`

**Memory**:
- Reads: `rounds:{blockId}` or `loop:{blockId}`
- Writes: -

```typescript
class ReportRoundsBehavior extends BaseBehavior implements INextBehavior {
  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    // Try rounds display first, fall back to loop state
    const rounds = ctx.runtime.memory.get<RoundDisplay>(`rounds:${ctx.block.id}`);
    const loopState = ctx.runtime.memory.get<LoopState>(`loop:${ctx.block.id}`);
    
    const current = rounds?.current ?? (loopState ? loopState.index + 1 : 1);
    const total = rounds?.total ?? loopState?.totalIterations;
    
    return [
      new DisplayAction('update', 'rounds', { current, total })
    ];
  }
}
```

---

### ReportMetricsBehavior

**Intent**: Collect and report block metrics to execution span.

**Interfaces**: `IPushBehavior`, `IPopBehavior`

**Memory**:
- Reads: `span:{blockId}`, block fragments
- Writes: `span:{blockId}` metrics

```typescript
class ReportMetricsBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    // Extract metrics from block fragments
    const metrics = this.extractMetrics(ctx.block.fragments);
    
    return [
      new TrackAction('record', 'metric', {
        blockId: ctx.block.id,
        metrics,
        timestamp: Date.now()
      })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    // Finalize metrics on completion
    const timerState = ctx.runtime.memory.get<TimerState>(`timer:${ctx.block.id}`);
    
    return [
      new TrackAction('record', 'metric', {
        blockId: ctx.block.id,
        metrics: {
          duration: timerState?.accumulatedMs,
          completedAt: Date.now()
        }
      })
    ];
  }
  
  private extractMetrics(fragments: ICodeFragment[][]): Record<string, unknown> {
    // Extract reps, weight, distance from fragments
    const flat = fragments.flat();
    return {
      reps: flat.find(f => f.fragmentType === 'Rep')?.value,
      weight: flat.find(f => f.fragmentType === 'Resistance')?.value,
      distance: flat.find(f => f.fragmentType === 'Distance')?.value
    };
  }
}
```

---

## Display Behaviors

### DisplayTimerBehavior

**Intent**: Push countdown timer display entry.

**Interfaces**: `IPushBehavior`, `IPopBehavior`

**Memory**:
- Reads: `timer:{blockId}`
- Writes: display stack (via action)

```typescript
class DisplayTimerBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  constructor(
    private readonly label: string,
    private readonly role: 'primary' | 'secondary' | 'auto' = 'auto'
  ) {
    super();
  }

  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    const timerState = ctx.runtime.memory.get<TimerState>(`timer:${ctx.block.id}`);
    
    return [
      new DisplayAction('push', 'timer', {
        id: `timer-${ctx.block.id}`,
        ownerId: ctx.block.id,
        format: 'countdown',
        label: this.label,
        durationMs: timerState?.durationMs,
        role: this.role
      })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [
      new DisplayAction('pop', 'timer', { id: `timer-${ctx.block.id}` })
    ];
  }
}
```

---

### DisplayStopwatchBehavior

**Intent**: Push count-up stopwatch display entry.

**Interfaces**: `IPushBehavior`, `IPopBehavior`

**Memory**:
- Reads: `timer:{blockId}`
- Writes: display stack (via action)

```typescript
class DisplayStopwatchBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  constructor(
    private readonly label: string,
    private readonly role: 'primary' | 'secondary' | 'auto' = 'auto'
  ) {
    super();
  }

  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    return [
      new DisplayAction('push', 'timer', {
        id: `timer-${ctx.block.id}`,
        ownerId: ctx.block.id,
        format: 'countup',
        label: this.label,
        role: this.role
      })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [
      new DisplayAction('pop', 'timer', { id: `timer-${ctx.block.id}` })
    ];
  }
}
```

---

### DisplayCurrentTimeBehavior

**Intent**: Push current wall-clock time display.

**Interfaces**: `IPushBehavior`, `IPopBehavior`

**Memory**:
- Reads: -
- Writes: display stack (via action)

```typescript
class DisplayCurrentTimeBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    return [
      new DisplayAction('push', 'timer', {
        id: `clock-${ctx.block.id}`,
        ownerId: ctx.block.id,
        format: 'clock',
        label: 'Time',
        role: 'secondary'
      })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [
      new DisplayAction('pop', 'timer', { id: `clock-${ctx.block.id}` })
    ];
  }
}
```

---

### DisplayEmptyTimerBehavior

**Intent**: Push empty/placeholder timer display.

**Interfaces**: `IPushBehavior`, `IPopBehavior`

**Memory**:
- Reads: -
- Writes: display stack (via action)

```typescript
class DisplayEmptyTimerBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  constructor(private readonly label: string = '') {
    super();
  }

  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    return [
      new DisplayAction('push', 'timer', {
        id: `empty-${ctx.block.id}`,
        ownerId: ctx.block.id,
        format: 'empty',
        label: this.label,
        role: 'secondary'
      })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [
      new DisplayAction('pop', 'timer', { id: `empty-${ctx.block.id}` })
    ];
  }
}
```

---

## Sound Behaviors

### PlaySoundAtElapsedTime

**Intent**: Play sound when elapsed time reaches threshold.

**Interfaces**: `IPushBehavior`, `IPopBehavior`  
**Note**: Uses event handler internally, not INextBehavior

**Memory**:
- Reads: `timer:{blockId}` (via tick handler)
- Writes: `sound:{blockId}`

```typescript
class PlaySoundAtElapsedTime extends BaseBehavior implements IPushBehavior, IPopBehavior {
  private handlerId?: string;

  constructor(
    private readonly thresholdMs: number,
    private readonly sound: string,
    private readonly volume: number = 1.0
  ) {
    super();
  }

  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    this.handlerId = `sound-elapsed-${ctx.block.id}-${this.thresholdMs}`;
    
    // Initialize sound state
    ctx.runtime.memory.allocate<SoundState>(`sound:${ctx.block.id}`, ctx.block.id, {
      blockId: ctx.block.id,
      cues: [{ id: this.handlerId, triggered: false, threshold: this.thresholdMs }]
    }, 'private');
    
    // Register tick handler
    return [
      new RegisterEventHandlerAction('timer:tick', {
        id: this.handlerId,
        handler: (event, runtime) => this.onTick(event, runtime, ctx.block.id)
      })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [new UnregisterEventHandlerAction('timer:tick', this.handlerId!)];
  }

  private onTick(event: IEvent, runtime: IScriptRuntime, blockId: string): IRuntimeAction[] {
    if (event.data?.blockId !== blockId) return [];
    
    const soundState = runtime.memory.get<SoundState>(`sound:${blockId}`);
    const cue = soundState?.cues.find(c => c.id === this.handlerId);
    
    if (!cue || cue.triggered) return [];
    
    const elapsed = event.data?.elapsedMs ?? 0;
    if (elapsed >= this.thresholdMs) {
      // Mark triggered and play sound
      runtime.memory.set(`sound:${blockId}`, {
        ...soundState!,
        cues: soundState!.cues.map(c => 
          c.id === this.handlerId ? { ...c, triggered: true } : c
        )
      });
      
      return [new PlaySoundAction(this.sound, this.volume)];
    }
    
    return [];
  }
}
```

---

### PlaySoundAtRemainingTime

**Intent**: Play sound when remaining time reaches threshold (countdown).

**Interfaces**: `IPushBehavior`, `IPopBehavior`

**Memory**:
- Reads: `timer:{blockId}` (via tick handler)
- Writes: `sound:{blockId}`

```typescript
class PlaySoundAtRemainingTime extends BaseBehavior implements IPushBehavior, IPopBehavior {
  private handlerId?: string;

  constructor(
    private readonly thresholdMs: number,
    private readonly sound: string,
    private readonly volume: number = 1.0
  ) {
    super();
  }

  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    this.handlerId = `sound-remaining-${ctx.block.id}-${this.thresholdMs}`;
    
    ctx.runtime.memory.allocate<SoundState>(`sound:${ctx.block.id}`, ctx.block.id, {
      blockId: ctx.block.id,
      cues: [{ id: this.handlerId, triggered: false, threshold: this.thresholdMs }]
    }, 'private');
    
    return [
      new RegisterEventHandlerAction('timer:tick', {
        id: this.handlerId,
        handler: (event, runtime) => this.onTick(event, runtime, ctx.block.id)
      })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [new UnregisterEventHandlerAction('timer:tick', this.handlerId!)];
  }

  private onTick(event: IEvent, runtime: IScriptRuntime, blockId: string): IRuntimeAction[] {
    if (event.data?.blockId !== blockId) return [];
    
    const soundState = runtime.memory.get<SoundState>(`sound:${blockId}`);
    const cue = soundState?.cues.find(c => c.id === this.handlerId);
    
    if (!cue || cue.triggered) return [];
    
    const remaining = event.data?.remainingMs ?? Infinity;
    if (remaining <= this.thresholdMs) {
      runtime.memory.set(`sound:${blockId}`, {
        ...soundState!,
        cues: soundState!.cues.map(c => 
          c.id === this.handlerId ? { ...c, triggered: true } : c
        )
      });
      
      return [new PlaySoundAction(this.sound, this.volume)];
    }
    
    return [];
  }
}
```

---

### PlaySoundsOnStart

**Intent**: Play sound when block starts (pushed).

**Interfaces**: `IPushBehavior`

**Memory**: None

```typescript
class PlaySoundsOnStart extends BaseBehavior implements IPushBehavior {
  constructor(
    private readonly sound: string,
    private readonly volume: number = 1.0
  ) {
    super();
  }

  onPush(_ctx: IBehaviorContext): IRuntimeAction[] {
    return [new PlaySoundAction(this.sound, this.volume)];
  }
}
```

---

### PlaySoundsOnNext

**Intent**: Play sound on each next/advancement.

**Interfaces**: `INextBehavior`

**Memory**: None

```typescript
class PlaySoundsOnNext extends BaseBehavior implements INextBehavior {
  constructor(
    private readonly sound: string,
    private readonly volume: number = 1.0
  ) {
    super();
  }

  onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
    return [new PlaySoundAction(this.sound, this.volume)];
  }
}
```

---

### PlaySoundsOnStop

**Intent**: Play sound when block completes (popped).

**Interfaces**: `IPopBehavior`

**Memory**: None

```typescript
class PlaySoundsOnStop extends BaseBehavior implements IPopBehavior {
  constructor(
    private readonly sound: string,
    private readonly volume: number = 1.0
  ) {
    super();
  }

  onPop(_ctx: IBehaviorContext): IRuntimeAction[] {
    return [new PlaySoundAction(this.sound, this.volume)];
  }
}
```

---

## Summary: Interface Implementation Matrix

| Behavior | IPush | INext | IPop | Memory Read | Memory Write |
|----------|:-----:|:-----:|:----:|-------------|--------------|
| **Looping** |
| SingleRepeater | - | ✓ | - | `loop:{id}` | `loop:{id}` |
| BoundRepeater | ✓ | ✓ | - | `loop:{id}` | `loop:{id}` |
| UnboundRepeater | ✓ | ✓ | - | `loop:{id}` | `loop:{id}` |
| **Rounds** |
| RoundPerBlock | ✓ | - | ✓ | parent `loop:` | `rounds:{id}` |
| RoundPerLoop | - | ✓ | - | `loop:{id}` | `rounds:{id}` |
| **Timer** |
| UnboundTimedBehavior | ✓ | - | ✓ | - | `timer:{id}` |
| BoundTimedBehavior | ✓ | ✓ | ✓ | `timer:{id}` | `timer:{id}` |
| **Reporting** |
| ReportRoundsBehavior | - | ✓ | - | `rounds:{id}`, `loop:{id}` | - |
| ReportMetricsBehavior | ✓ | - | ✓ | `span:{id}`, `timer:{id}` | `span:{id}` |
| **Display** |
| DisplayTimerBehavior | ✓ | - | ✓ | `timer:{id}` | display stack |
| DisplayStopwatchBehavior | ✓ | - | ✓ | `timer:{id}` | display stack |
| DisplayCurrentTimeBehavior | ✓ | - | ✓ | - | display stack |
| DisplayEmptyTimerBehavior | ✓ | - | ✓ | - | display stack |
| **Sound** |
| PlaySoundAtElapsedTime | ✓ | - | ✓ | `timer:{id}` | `sound:{id}` |
| PlaySoundAtRemainingTime | ✓ | - | ✓ | `timer:{id}` | `sound:{id}` |
| PlaySoundsOnStart | ✓ | - | - | - | - |
| PlaySoundsOnNext | - | ✓ | - | - | - |
| PlaySoundsOnStop | - | - | ✓ | - | - |

---

## Example Compositions

### AMRAP Block (10 minutes, unbound rounds)

```typescript
const amrapBlock = composeBehaviors([
  new BoundTimedBehavior(600000, 'AMRAP'),     // 10 min countdown
  new UnboundRepeater(),                        // Loop forever
  new RoundPerLoop(),                           // Track rounds
  new DisplayTimerBehavior('AMRAP', 'primary'), // Countdown display
  new ReportRoundsBehavior(),                   // Update rounds UI
  new ReportMetricsBehavior(),                  // Track metrics
  new PlaySoundAtRemainingTime(10000, 'beep'),  // 10 sec warning
  new PlaySoundsOnStop('buzzer')                // End buzzer
]);
```

### For Time Block (3 rounds, stopwatch)

```typescript
const forTimeBlock = composeBehaviors([
  new UnboundTimedBehavior('For Time'),            // Count-up timer
  new BoundRepeater(3),                            // 3 rounds
  new RoundPerLoop(),                              // Track rounds
  new DisplayStopwatchBehavior('For Time', 'primary'),
  new ReportRoundsBehavior(),
  new ReportMetricsBehavior(),
  new PlaySoundsOnStart('beep'),                   // Start beep
  new PlaySoundsOnStop('buzzer')                   // Finish buzzer
]);
```

### EMOM Block (10 minutes, 1 min intervals)

```typescript
const emomBlock = composeBehaviors([
  new BoundTimedBehavior(60000, 'Interval'),    // 1 min per interval
  new BoundRepeater(10),                         // 10 intervals
  new RoundPerLoop(),
  new DisplayTimerBehavior('EMOM', 'primary'),
  new ReportRoundsBehavior(),
  new PlaySoundAtRemainingTime(5000, 'tick'),    // 5 sec warning
  new PlaySoundsOnNext('beep')                   // New interval beep
]);
```

---

*Document created: December 2024*
*Reference: Runtime Cycle canvas diagram*
