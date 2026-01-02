# Behaviors Overview - Overlap Analysis and Single Responsibility Transition

> **Status**: Planning Document  
> **Author**: AI Assistant  
> **Created**: 2025-01-01  
> **Purpose**: Analyze current behavior architecture and define path to single responsibility behaviors

## Executive Summary

The current behavior system contains significant overlap between behaviors. Many compound behaviors (like `LoopCoordinatorBehavior`) mix multiple responsibilities that should be handled by independent, composable behaviors. This document identifies the overlaps and proposes a transition path to true single responsibility behaviors.

## Current Behavior Categories

### 1. Looping Behaviors

**Current Implementation:**
- `BoundLoopBehavior` - Fixed round counting with pop condition
- `UnboundLoopBehavior` - Infinite looping with tracking
- `SinglePassBehavior` - Single execution then pop
- `LoopCoordinatorBehavior` - Complex orchestration (compound behavior)

**Responsibilities:**
- Round counting and tracking
- Completion detection
- Pop condition evaluation
- Child compilation and pushing (LoopCoordinator)
- Display state updates (LoopCoordinator)
- Round span lifecycle management (LoopCoordinator)

**Overlap Analysis:**
```typescript
// Overlap 1: Round counting is duplicated
BoundLoopBehavior.getRound()     // Reads from RoundPerNextBehavior or RoundPerLoopBehavior
UnboundLoopBehavior.getRound()   // Same logic
SinglePassBehavior.getRound()    // Same logic
```

```typescript
// Overlap 2: Completion detection is duplicated
BoundLoopBehavior.onNext()       // Checks round > totalRounds, pops
SinglePassBehavior.onNext()      // Checks round >= 2, pops
CompletionBehavior               // Generic completion detection
```

```typescript
// Overlap 3: LoopCoordinator is a compound behavior
class LoopCoordinatorBehavior {
  // Handles child compilation (should be ChildRunnerBehavior)
  private advance() { /* CompileAndPushBlockAction */ }
  
  // Handles round tracking (should be RoundTrackingBehavior)
  private getState() { /* rounds calculation */ }
  
  // Handles display updates (should be DisplayBehavior)
  private advance() { /* SetRoundsDisplayAction */ }
  
  // Handles completion (should be CompletionBehavior)
  isComplete() { /* mixed logic */ }
  
  // Handles round spans (should be RoundSpanBehavior)
  private emitRoundChanged() { /* RuntimeSpan creation */ }
  
  // Handles timer restarts (should be TimerBehavior)
  private emitRoundChanged() { /* timerBehavior.restart() */ }
}
```

### 2. Rounds Behaviors

**Current Implementation:**
- `RoundPerLoopBehavior` - Increments round when child index wraps
- `RoundPerNextBehavior` - Increments round on every next() call

**Responsibilities:**
- Round counter management
- Round increment logic

**Overlap Analysis:**
These are actually two different round counting strategies. However, they're tightly coupled to other behaviors:

```typescript
// Tight coupling: Loop behaviors depend on these
BoundLoopBehavior.getRound(block) {
  const nextBehavior = block.getBehavior(RoundPerNextBehavior);
  if (nextBehavior) return nextBehavior.getRound();
  
  const loopBehavior = block.getBehavior(RoundPerLoopBehavior);
  if (loopBehavior) return loopBehavior.getRound();
  
  return 1; // Fallback
}
```

### 3. Timer Behaviors

**Current Implementation:**
- `TimerBehavior` - Core timer implementation
- `BoundTimerBehavior` - Extends TimerBehavior with duration
- `UnboundTimerBehavior` - Extends TimerBehavior without duration

**Responsibilities:**
- Time tracking (elapsed/remaining)
- Timer state management (running/paused)
- Timer lifecycle (start/stop/reset)
- Event emission (timer:started, timer:complete)
- Memory state management

**Overlap Analysis:**
```typescript
// BoundTimerBehavior and UnboundTimerBehavior are just convenience constructors
class BoundTimerBehavior extends TimerBehavior {
  constructor(durationMs, direction = 'down', label, role, autoStart) {
    super(direction, durationMs, label, role, autoStart);
  }
}

class UnboundTimerBehavior extends TimerBehavior {
  constructor(label, role, autoStart) {
    super('up', undefined, label, role, autoStart);
  }
}
```

These are NOT separate behaviors - they're configuration helpers. The actual behavior is `TimerBehavior`.

**Display Concern:**
TimerBehavior currently manages its own display state through `TimerStateManager`. This should be separated into a `DisplayTimerBehavior`.

### 4. Reporting Behaviors

**Current Implementation:**
- `TrackRoundAction` - Action that reports round status
- `TrackMetricAction` - Action that reports metric status

**Overlap Analysis:**
These are ACTIONS, not behaviors. They're used by behaviors:

```typescript
// BoundLoopBehavior uses TrackRoundAction
onNext(block, clock) {
  actions.push(new TrackRoundAction(block.key.toString(), round, this.totalRounds));
}
```

**Proposed Behaviors:**
- `ReportRoundsBehavior` - Emits round tracking actions
- `ReportMetricsBehavior` - Emits metric tracking actions

### 5. Display Behaviors

**Current Implementation:**
Display is currently handled in multiple places:
- `TimerBehavior` via `TimerStateManager`
- `LoopCoordinatorBehavior` via `SetRoundsDisplayAction`
- `UpdateDisplayStateAction` for lap timers

**Overlap Analysis:**
```typescript
// Display concerns scattered across behaviors:
TimerBehavior.onPush() {
  // Allocates timer memory for display
  actions.push(...this.stateManager.initialize(block, now.getTime(), this.role, this.autoStart));
}

LoopCoordinatorBehavior.advance() {
  // Updates rounds display
  actions.push(new SetRoundsDisplayAction(currentRound, totalRounds));
}

LoopCoordinatorBehavior.emitRoundChanged() {
  // Updates lap timer display
  actions.push(new UpdateDisplayStateAction({ currentLapTimerMemoryId }));
}
```

**Proposed Behaviors:**
- `DisplayTimerBehavior` - Manages timer display state
- `DisplayRoundsBehavior` - Manages rounds display state
- `DisplayStopwatchBehavior` - Manages stopwatch display state
- `DisplayCurrentTimeBehavior` - Shows current wall-clock time
- `DisplayEmptyBehavior` - Shows placeholder/empty state

### 6. Sound Behaviors

**Current Implementation:**
- `SoundBehavior` - Handles sound cue playback based on timer events

**Responsibilities:**
- Sound cue configuration
- Sound state tracking (triggered/not triggered)
- Event listening (timer:tick)
- Sound playback triggering

**Overlap Analysis:**
This behavior is actually well-designed with single responsibility. However, the proposed behaviors suggest splitting by trigger condition:

```typescript
// Current: Single behavior with configuration
const soundBehavior = new SoundBehavior({
  direction: 'down',
  durationMs: 600000,
  cues: [
    { id: '30-sec', threshold: 30000, sound: 'beep' },
    { id: '10-sec', threshold: 10000, sound: 'beep' }
  ]
});

// Proposed: Separate behaviors for each trigger type?
// This would be MORE coupled, not less
```

**Recommendation:** Keep `SoundBehavior` as-is. Split into multiple behaviors only if configuration complexity grows.

## Proposed Single Responsibility Behaviors

### Core Behaviors (Extract from LoopCoordinator)

#### 1. RoundTrackingBehavior
```typescript
/**
 * Tracks round progression for looping blocks.
 * Responsibility: Maintain round counter, provide round query methods.
 */
export class RoundTrackingBehavior implements IRuntimeBehavior {
  private currentRound: number = 0;
  private totalRounds?: number;
  
  constructor(totalRounds?: number, incrementStrategy: 'per-next' | 'per-loop' = 'per-loop') {
    this.totalRounds = totalRounds;
  }
  
  onPush(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    this.currentRound = 1;
    return [];
  }
  
  onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    if (this.incrementStrategy === 'per-next') {
      this.currentRound++;
    } else {
      const childIndex = block.getBehavior(ChildIndexBehavior);
      if (childIndex?.hasJustWrapped) {
        this.currentRound++;
      }
    }
    return [];
  }
  
  getCurrentRound(): number { return this.currentRound; }
  getTotalRounds(): number | undefined { return this.totalRounds; }
  isComplete(): boolean { 
    return this.totalRounds !== undefined && this.currentRound > this.totalRounds;
  }
}
```

#### 2. RoundCompletionBehavior
```typescript
/**
 * Detects when rounds are complete and pops the block.
 * Responsibility: Completion detection based on round counter.
 */
export class RoundCompletionBehavior implements IRuntimeBehavior {
  private _isComplete = false;
  
  constructor(
    private readonly roundTracking: RoundTrackingBehavior
  ) {}
  
  onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    if (this._isComplete) return [];
    
    if (this.roundTracking.isComplete()) {
      this._isComplete = true;
      return [
        new EmitEventAction('rounds:complete', { 
          round: this.roundTracking.getCurrentRound() 
        }, clock.now),
        new PopBlockAction()
      ];
    }
    
    return [];
  }
}
```

#### 3. RoundSpanBehavior
```typescript
/**
 * Creates and manages RuntimeSpans for each round.
 * Responsibility: Round lifecycle tracking in memory.
 */
export class RoundSpanBehavior implements IRuntimeBehavior {
  private lapTimerRefs: TypedMemoryReference<TimeSpan[]>[] = [];
  
  constructor(
    private readonly roundTracking: RoundTrackingBehavior,
    private readonly repScheme?: number[]
  ) {}
  
  onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    const currentRound = this.roundTracking.getCurrentRound();
    
    // Create new round span
    const roundOwnerId = `${block.key.toString()}-round-${currentRound}`;
    const span = this.createRoundSpan(block, roundOwnerId, currentRound, clock.now);
    block.context.allocate(RUNTIME_SPAN_TYPE, span, 'public');
    
    // Create lap timer
    const lapTimerMemoryId = `timer:lap:${block.key}:${currentRound}`;
    const lapTimerRef = block.context.allocate<TimeSpan[]>(
      lapTimerMemoryId,
      [new TimeSpan(clock.now.getTime())],
      'public'
    );
    this.lapTimerRefs.push(lapTimerRef);
    
    actions.push(new UpdateDisplayStateAction({ currentLapTimerMemoryId: lapTimerMemoryId }));
    
    return actions;
  }
  
  private createRoundSpan(block: IRuntimeBlock, ownerId: string, round: number, startTime: Date): RuntimeSpan {
    // Implementation...
  }
}
```

#### 4. RoundReportingBehavior
```typescript
/**
 * Reports round status to tracker/history.
 * Responsibility: Emit tracking actions.
 */
export class RoundReportingBehavior implements IRuntimeBehavior {
  constructor(
    private readonly roundTracking: RoundTrackingBehavior
  ) {}
  
  onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    return [
      new TrackRoundAction(
        block.key.toString(),
        this.roundTracking.getCurrentRound(),
        this.roundTracking.getTotalRounds()
      )
    ];
  }
}
```

### Display Behaviors

#### 5. DisplayTimerBehavior
```typescript
/**
 * Manages timer display state in memory.
 * Responsibility: Allocate and update timer display memory.
 */
export class DisplayTimerBehavior implements IRuntimeBehavior {
  constructor(
    private readonly timerBehavior: TimerBehavior,
    private readonly role: 'primary' | 'secondary' | 'auto' = 'auto'
  ) {}
  
  onPush(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    const timerMemoryId = `timer:${block.key}:${this.role}`;
    const stateManager = new TimerStateManager(
      this.timerBehavior.direction,
      this.timerBehavior.durationMs,
      this.timerBehavior.label
    );
    return stateManager.initialize(block, clock.now.getTime(), this.role, this.timerBehavior.autoStart);
  }
  
  onDispose(block: IRuntimeBlock): void {
    // Cleanup display state
  }
}
```

#### 6. DisplayRoundsBehavior
```typescript
/**
 * Manages rounds display state.
 * Responsibility: Emit rounds display updates.
 */
export class DisplayRoundsBehavior implements IRuntimeBehavior {
  constructor(
    private readonly roundTracking: RoundTrackingBehavior
  ) {}
  
  onPush(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    return [
      new SetRoundsDisplayAction(
        this.roundTracking.getCurrentRound(),
        this.roundTracking.getTotalRounds() ?? 0
      )
    ];
  }
  
  onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    return [
      new SetRoundsDisplayAction(
        this.roundTracking.getCurrentRound(),
        this.roundTracking.getTotalRounds() ?? 0
      )
    ];
  }
}
```

### Sound Behaviors (Keep Current Design)

#### 7. SoundBehavior (No change needed)
The current `SoundBehavior` is already well-designed. It:
- Has a single responsibility (sound cue playback)
- Uses configuration for flexibility (cues array)
- Properly tracks state to prevent duplicate triggers
- Listens to events without coupling to timer internals

**Do not split into:**
- `PlaySoundAtElapsedTimeBehavior` - This is configuration, not behavior
- `PlaySoundAtRemainingTimeBehavior` - This is configuration, not behavior
- `PlaySoundsOnStartBehavior` - Use `onPush` lifecycle or event-based config
- `PlaySoundsOnNextBehavior` - Use `onNext` lifecycle or event-based config
- `PlaySoundsOnStopBehavior` - Use `onPop` lifecycle or event-based config

Instead, extend `SoundBehavior` configuration to support multiple trigger events:

```typescript
interface SoundBehaviorConfig {
  direction: 'up' | 'down';
  durationMs?: number;
  cues: SoundCue[];
  triggerEvents?: Array<'timer:tick' | 'timer:started' | 'timer:complete' | 'next' | 'push'>;
}

interface SoundCue {
  id: string;
  threshold?: number; // For timer-based triggers
  sound: string;
  volume?: number;
  triggerEvent?: string; // Override default trigger
}
```

## Transition Plan

### Phase 1: Extract Round Management (Week 1-2)

**Goal:** Extract round tracking from `LoopCoordinatorBehavior` and loop behaviors.

1. Create `RoundTrackingBehavior`
2. Create `RoundCompletionBehavior`
3. Create `RoundSpanBehavior`
4. Create `RoundReportingBehavior`
5. Update strategies to use new behaviors instead of `BoundLoopBehavior`, `UnboundLoopBehavior`, `SinglePassBehavior`

**Migration Example:**
```typescript
// Before (RoundsStrategy)
const behaviors: IRuntimeBehavior[] = [
  new BoundLoopBehavior(totalRounds),
  new RoundPerLoopBehavior(),
  new ChildIndexBehavior(children.length),
  new ChildRunnerBehavior(childGroups)
];

// After (RoundsStrategy)
const behaviors: IRuntimeBehavior[] = [
  new ChildIndexBehavior(children.length),
  new RoundTrackingBehavior(totalRounds, 'per-loop'),
  new RoundCompletionBehavior(roundTracking), // Pass reference
  new RoundSpanBehavior(roundTracking),
  new RoundReportingBehavior(roundTracking),
  new ChildRunnerBehavior(childGroups)
];
```

### Phase 2: Separate Display Concerns (Week 3)

**Goal:** Extract display logic from behaviors into dedicated display behaviors.

1. Create `DisplayTimerBehavior`
2. Create `DisplayRoundsBehavior`
3. Remove display logic from `TimerBehavior` and `LoopCoordinatorBehavior`
4. Update strategies to include display behaviors

**Migration Example:**
```typescript
// Before (TimerStrategy)
const behaviors: IRuntimeBehavior[] = [
  new BoundTimerBehavior(durationMs, 'down'),
  new CompletionBehavior(/* ... */)
];

// After (TimerStrategy)
const timerBehavior = new BoundTimerBehavior(durationMs, 'down');
const behaviors: IRuntimeBehavior[] = [
  timerBehavior,
  new DisplayTimerBehavior(timerBehavior, 'primary'),
  new CompletionBehavior(/* ... */)
];
```

### Phase 3: Refine LoopCoordinatorBehavior (Week 4)

**Goal:** Simplify `LoopCoordinatorBehavior` to only handle child compilation coordination.

1. Remove round tracking from `LoopCoordinatorBehavior` (use `RoundTrackingBehavior`)
2. Remove display updates from `LoopCoordinatorBehavior` (use `DisplayRoundsBehavior`)
3. Remove completion detection from `LoopCoordinatorBehavior` (use `CompletionBehavior`)
4. Remove round span management from `LoopCoordinatorBehavior` (use `RoundSpanBehavior`)
5. Keep only: Child compilation coordination, JIT compilation orchestration

**Result:**
```typescript
class LoopCoordinatorBehavior {
  private index: number = -1;
  private isWaitingForInterval: boolean = false;
  
  constructor(
    private readonly config: LoopConfig,
    private readonly roundTracking: RoundTrackingBehavior,
    private readonly completionBehavior: CompletionBehavior
  ) {}
  
  onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    if (this.isWaitingForInterval) return [];
    
    const now = clock.now;
    return this.advance(block, now);
  }
  
  private advance(block: IRuntimeBlock, now: Date): IRuntimeAction[] {
    this.index++;
    const state = this.getState();
    
    // Check completion via delegate
    if (this.completionBehavior.isComplete()) {
      return [];
    }
    
    // Compile and push next child group
    const childGroupIds = this.config.childGroups[state.position];
    return [new CompileAndPushBlockAction(childGroupIds, { startTime: now })];
  }
}
```

### Phase 4: Remove Deprecated Behaviors (Week 5)

**Goal:** Clean up old behaviors after migration is complete.

1. Deprecate `BoundLoopBehavior`
2. Deprecate `UnboundLoopBehavior`
3. Deprecate `SinglePassBehavior`
4. Deprecate `RoundPerLoopBehavior` (logic moved to `RoundTrackingBehavior`)
5. Deprecate `RoundPerNextBehavior` (logic moved to `RoundTrackingBehavior`)
6. Deprecate `BoundTimerBehavior` and `UnboundTimerBehavior` (use `TimerBehavior` directly)

**Migration Path:**
```typescript
// Add deprecation warnings
export class BoundLoopBehavior implements IRuntimeBehavior {
  constructor(private readonly totalRounds: number) {
    console.warn('[DEPRECATED] BoundLoopBehavior is deprecated. Use RoundTrackingBehavior + RoundCompletionBehavior instead.');
  }
}
```

### Phase 5: Documentation and Testing (Week 6)

**Goal:** Ensure all behaviors are well-documented and tested.

1. Add TSDoc comments to all new behaviors
2. Create Storybook stories for behavior compositions
3. Add unit tests using `BehaviorTestHarness`
4. Update architecture documentation
5. Create migration guide for contributors

## Behavior Composition Patterns

### Pattern 1: Fixed Rounds Loop
```typescript
const roundTracking = new RoundTrackingBehavior(5, 'per-loop');
const behaviors: IRuntimeBehavior[] = [
  new ChildIndexBehavior(children.length),
  roundTracking,
  new RoundCompletionBehavior(roundTracking),
  new RoundSpanBehavior(roundTracking),
  new RoundReportingBehavior(roundTracking),
  new DisplayRoundsBehavior(roundTracking),
  new ChildRunnerBehavior(childGroups)
];
```

### Pattern 2: Time-Bound Rounds (AMRAP)
```typescript
const timerBehavior = new TimerBehavior('down', 600000); // 10 minutes
const roundTracking = new RoundTrackingBehavior(undefined, 'per-loop');
const behaviors: IRuntimeBehavior[] = [
  new ChildIndexBehavior(children.length),
  timerBehavior,
  new DisplayTimerBehavior(timerBehavior, 'primary'),
  roundTracking,
  new CompletionBehavior((block, now) => timerBehavior.isComplete(now), ['timer:complete']),
  new RoundSpanBehavior(roundTracking),
  new RoundReportingBehavior(roundTracking),
  new DisplayRoundsBehavior(roundTracking),
  new ChildRunnerBehavior(childGroups)
];
```

### Pattern 3: Interval Timer (EMOM)
```typescript
const timerBehavior = new TimerBehavior('down', 60000); // 1 minute intervals
const roundTracking = new RoundTrackingBehavior(10, 'per-loop'); // 10 rounds
const behaviors: IRuntimeBehavior[] = [
  new ChildIndexBehavior(children.length),
  timerBehavior,
  new DisplayTimerBehavior(timerBehavior, 'primary'),
  roundTracking,
  new IntervalCompletionBehavior(timerBehavior, roundTracking),
  new RoundSpanBehavior(roundTracking),
  new RoundReportingBehavior(roundTracking),
  new DisplayRoundsBehavior(roundTracking),
  new ChildRunnerBehavior(childGroups)
];
```

### Pattern 4: Single Execution
```typescript
const roundTracking = new RoundTrackingBehavior(1, 'per-next');
const behaviors: IRuntimeBehavior[] = [
  roundTracking,
  new RoundCompletionBehavior(roundTracking),
  new ChildRunnerBehavior(childGroups)
];
```

## Benefits of Single Responsibility Behaviors

### 1. Testability
Each behavior can be tested in isolation without complex setup:

```typescript
describe('RoundTrackingBehavior', () => {
  it('should increment rounds per loop', () => {
    const harness = new BehaviorTestHarness();
    const behavior = new RoundTrackingBehavior(3, 'per-loop');
    
    harness.push(new MockBlock('test', [behavior]));
    expect(behavior.getCurrentRound()).toBe(1);
    
    // Simulate child index wrap
    behavior.onNext(harness.block, harness.clock);
    expect(behavior.getCurrentRound()).toBe(2);
  });
});
```

### 2. Reusability
Behaviors can be mixed and matched for different use cases:

```typescript
// Reuse RoundTrackingBehavior for different completion conditions
const roundTracking = new RoundTrackingBehavior(5, 'per-loop');

// Complete by rounds
new RoundCompletionBehavior(roundTracking);

// Complete by time
new CompletionBehavior((block) => timerBehavior.isComplete());

// Complete manually
new CompletionBehavior((block) => block.context.get('manual-complete') === true);
```

### 3. Flexibility
Easy to add new behaviors without modifying existing ones:

```typescript
// Add sound support to any timer block
behaviors.push(new SoundBehavior({
  direction: 'down',
  durationMs: 60000,
  cues: [{ id: 'warning', threshold: 10000, sound: 'beep' }]
}));

// Add analytics tracking
behaviors.push(new AnalyticsBehavior('amrap-timer'));
```

### 4. Maintainability
Changes to one aspect don't affect others:

```typescript
// Change display logic without touching timer logic
class DisplayTimerBehaviorV2 implements IRuntimeBehavior {
  // New display implementation
}

// Change round counting logic without touching completion logic
class RoundTrackingBehaviorV2 implements IRuntimeBehavior {
  // New round tracking implementation
}
```

## Risks and Mitigations

### Risk 1: Increased Number of Behaviors
**Concern:** More behavior classes = more complexity
**Mitigation:** Create factory functions and composition helpers:

```typescript
// Factory for common patterns
function createFixedRoundsLoop(totalRounds: number, childGroups: number[][]): IRuntimeBehavior[] {
  const roundTracking = new RoundTrackingBehavior(totalRounds, 'per-loop');
  return [
    new ChildIndexBehavior(childGroups.length),
    roundTracking,
    new RoundCompletionBehavior(roundTracking),
    new RoundSpanBehavior(roundTracking),
    new RoundReportingBehavior(roundTracking),
    new DisplayRoundsBehavior(roundTracking),
    new ChildRunnerBehavior(childGroups)
  ];
}

// Usage
const behaviors = createFixedRoundsLoop(5, [[1], [2], [3]]);
```

### Risk 2: Behavior Dependencies
**Concern:** Behaviors need references to other behaviors
**Mitigation:** Use dependency injection and constructor parameters:

```typescript
// Explicit dependencies
const roundTracking = new RoundTrackingBehavior(5);
const behaviors = [
  roundTracking,
  new RoundCompletionBehavior(roundTracking), // Explicit dependency
  new DisplayRoundsBehavior(roundTracking)    // Explicit dependency
];
```

### Risk 3: Breaking Changes
**Concern:** Existing code depends on current behaviors
**Mitigation:** Gradual migration with deprecation warnings:

```typescript
// Keep old behaviors working internally
export class BoundLoopBehavior implements IRuntimeBehavior {
  constructor(totalRounds: number) {
    console.warn('[DEPRECATED] Use RoundTrackingBehavior + RoundCompletionBehavior');
  }
  
  // Internal implementation uses new behaviors
  private roundTracking = new RoundTrackingBehavior(totalRounds);
  private completion = new RoundCompletionBehavior(this.roundTracking);
  
  onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
    return this.completion.onNext(block, clock);
  }
}
```

## Conclusion

The current behavior system has significant overlap between loop behaviors, timer behaviors, and display concerns. By transitioning to single responsibility behaviors:

1. **Loop behaviors** become: `RoundTrackingBehavior` + `RoundCompletionBehavior` + `RoundSpanBehavior`
2. **Timer behaviors** stay: `TimerBehavior` (remove convenience subclasses)
3. **Display behaviors** become: `DisplayTimerBehavior` + `DisplayRoundsBehavior` + etc.
4. **Sound behaviors** stay: `SoundBehavior` (already well-designed)
5. **Reporting behaviors** become: `RoundReportingBehavior` + `MetricReportingBehavior`

The transition should be gradual, starting with round management extraction and moving to display separation. Old behaviors should be kept with deprecation warnings during the migration period.

## Next Steps

1. **Review this document** with the development team
2. **Create proof-of-concept** for `RoundTrackingBehavior`
3. **Update strategy patterns** to use new behaviors
4. **Begin Phase 1 migration** (round management extraction)
5. **Document learnings** and adjust plan as needed

---

**Related Documentation:**
- [Runtime System](./runtime-system.md)
- [Block Types and Behaviors Reference](../block-types-behaviors-reference.md)
- [Runtime Action Lifecycle](../runtime-action-lifecycle.md)
