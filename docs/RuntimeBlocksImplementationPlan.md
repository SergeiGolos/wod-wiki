# RuntimeBlocks Implementation Plan

## Phase 1: Critical Missing Components

### 1.1 TimerBlock Implementation

**File:** `src/core/runtime/blocks/TimerBlock.ts`

```typescript
import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeBlock } from "./RuntimeBlock";
import { StartTimerAction } from "../actions/StartTimerAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetButtonAction } from "../outputs/SetButtonAction";
import { SetTimerStateAction, TimerState } from "../outputs/SetTimerStateAction";
import { SetDurationAction } from "../outputs/SetDurationAction";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { StartEvent } from "../inputs/StartEvent";
import { StopEvent } from "../inputs/StopEvent";

/**
 * RuntimeBlock for standalone timer statements (duration only, no metrics)
 * Handles scenarios like "30s", "2m", "1m30s"
 */
export class TimerBlock extends RuntimeBlock {
  constructor(sources: JitStatement[]) {
    super(sources);
    this.leaf = true; // Mark as leaf-level execution block
    
    // Add handler for user completion
    this.handlers.push(new CompleteHandler());
  }

  /**
   * Called when the timer block is entered
   * Sets up the timer state and UI controls
   */
  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    const duration = this.duration;
    const timerState = duration ? TimerState.RUNNING_COUNTDOWN : TimerState.RUNNING_COUNTUP;
    
    const actions: IRuntimeAction[] = [
      new StartTimerAction(new StartEvent()),
      new SetTimerStateAction(timerState, "primary"),
      new SetButtonAction("system", [endButton, pauseButton]),
      new SetButtonAction("runtime", [completeButton])
    ];

    // Add duration reporting for countdown timers
    if (duration) {
      actions.push(new SetDurationAction(duration, "primary"));
    }

    return actions;
  }

  /**
   * Called when advancing to next statement (completion)
   */
  protected onNext(runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PopBlockAction()];
  }

  /**
   * Called when leaving the timer block
   * Cleans up timer state
   */
  protected onLeave(runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StopTimerAction(new StopEvent()),
      new SetTimerStateAction(TimerState.STOPPED, "primary")
    ];
  }

  /**
   * Called when the timer actually starts running
   */
  protected onBlockStart(runtime: ITimerRuntime): IRuntimeAction[] {
    // Timer blocks are simple - no additional setup needed
    return [];
  }

  /**
   * Called when the timer stops running
   */
  protected onBlockStop(runtime: ITimerRuntime): IRuntimeAction[] {
    // Timer blocks are simple - no additional cleanup needed
    return [];
  }
}
```

### 1.2 BlockTimerStrategy Implementation

**File:** `src/core/runtime/blocks/strategies/BlockTimerStrategy.ts`

```typescript
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { TimerBlock } from "../TimerBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating TimerBlock runtime blocks
 * Handles statements with duration only (no effort, reps, children, or rounds)
 * 
 * Examples:
 * - "30s"
 * - "2m"  
 * - "1m30s"
 */
export class BlockTimerStrategy implements IRuntimeBlockStrategy {
  /**
   * Check if this strategy can handle the given nodes
   * Criteria: Has duration, but no effort, reps, children, or rounds
   */
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean {
    return nodes.every(node => {
      const hasDuration = node.durations().length > 0;
      const hasEffort = node.efforts().length > 0;
      const hasRepetitions = node.repetitions().length > 0;
      const hasChildren = node.children.length > 0;
      const hasRounds = node.rounds().length > 0;
      
      // Must have duration, but nothing else
      return hasDuration && !hasEffort && !hasRepetitions && !hasChildren && !hasRounds;
    });
  }

  /**
   * Compile the nodes into a TimerBlock
   */
  compile(
    nodes: JitStatement[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    return new TimerBlock(nodes);
  }
}
```

### 1.3 GroupCountdownStrategy Implementation

**File:** `src/core/runtime/blocks/strategies/GroupCountdownStrategy.ts`

```typescript
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { TimedGroupBlock } from "../TimedGroupBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating TimedGroupBlock runtime blocks for countdown scenarios
 * Handles groups with time constraints (AMRAPs, EMOMs, etc.)
 * 
 * Examples:
 * - "5m AMRAP { pullups; pushups }"
 * - "12m EMOM { 10 burpees }"
 * - "20m { run 400m; rest }"
 */
export class GroupCountdownStrategy implements IRuntimeBlockStrategy {
  /**
   * Check if this strategy can handle the given nodes
   * Criteria: Has duration AND has children (group scenario)
   */
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean {
    return nodes.every(node => {
      const hasDuration = node.durations().length > 0;
      const hasChildren = node.children.length > 0;
      
      return hasDuration && hasChildren;
    });
  }

  /**
   * Compile the nodes into a TimedGroupBlock
   */
  compile(
    nodes: JitStatement[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    // TimedGroupBlock expects a single JitStatement
    if (nodes.length !== 1) {
      console.warn('GroupCountdownStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    return new TimedGroupBlock(nodes[0]);
  }
}
```

### 1.4 Missing Action Implementation

**File:** `src/core/runtime/outputs/SetDurationAction.ts`

```typescript
import { OutputAction } from '../OutputAction';

/**
 * Action to report duration information to the UI
 * Used for progress bars and timer displays
 */
export class SetDurationAction extends OutputAction {
  constructor(public duration: number, public timerName: string) {
    super('SET_DURATION');
  }

  getData() {
    return {
      timerName: this.timerName,
      duration: this.duration
    };
  }
}
```

## Phase 2: Strategy Registration

### 2.1 Update RuntimeJitStrategies

**File:** `src/core/runtime/RuntimeJitStrategies.ts`

```typescript
import { BlockTimerStrategy } from "./blocks/strategies/BlockTimerStrategy";
import { GroupCountdownStrategy } from "./blocks/strategies/GroupCountdownStrategy";

// Add imports at top of file

constructor() {
  this.addStrategy(new BlockRootStrategy());    
  
  // Group strategies (higher priority)
  this.addStrategy(new GroupRepeatingStrategy());
  this.addStrategy(new GroupCountdownStrategy()); // ← Add this
          
  // Single block strategies (lower priority)
  this.addStrategy(new BlockTimerStrategy()); // ← Add this
  this.addStrategy(new BlockEffortStrategy());    
}
```

## Phase 3: Enhanced Tick Handling

### 3.1 Timer Context System

**File:** `src/core/runtime/timer/TimerContext.ts`

```typescript
import { TimerState } from "../outputs/SetTimerStateAction";
import { BlockKey } from "@/core/BlockKey";

export interface TimerContext {
  state: TimerState;
  duration?: number;
  startTime: Date;
  blockKey: BlockKey;
  type: "primary" | "secondary";
  name: string;
}

export class TimerManager {
  private primaryTimer?: TimerContext;
  private secondaryTimer?: TimerContext;

  setPrimaryTimer(context: TimerContext): void {
    this.primaryTimer = { ...context, type: "primary" };
  }

  setSecondaryTimer(context: TimerContext): void {
    this.secondaryTimer = { ...context, type: "secondary" };
  }

  getPrimaryTimer(): TimerContext | undefined {
    return this.primaryTimer;
  }

  getSecondaryTimer(): TimerContext | undefined {
    return this.secondaryTimer;
  }

  clearPrimaryTimer(): void {
    this.primaryTimer = undefined;
  }

  clearSecondaryTimer(): void {
    this.secondaryTimer = undefined;
  }

  clearAllTimers(): void {
    this.primaryTimer = undefined;
    this.secondaryTimer = undefined;
  }
}
```

### 3.2 Specialized Tick Handlers

**File:** `src/core/runtime/inputs/CountdownTickHandler.ts`

```typescript
import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { CompleteEvent } from "./CompleteEvent";
import { TimerContext } from "../timer/TimerContext";
import { SpanDuration } from "@/core/Duration";

/**
 * Specialized tick handler for countdown timers
 * Monitors duration and triggers completion when time expires
 */
export class CountdownTickHandler extends EventHandler {
  protected eventType: string = 'countdown-tick';

  protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    const block = runtime.trace.current();
    if (!block || !block.duration) {
      return [];
    }

    const spans = block.getSpanBuilder().Spans();
    const elapsed = new SpanDuration(spans);
    const remaining = block.duration - (elapsed?.original ?? 0);

    if (remaining <= 0) {
      return [
        new NotifyRuntimeAction(new CompleteEvent(event.timestamp))
      ];
    }

    return [];
  }
}
```

## Phase 4: Testing Strategy

### 4.1 Unit Tests for TimerBlock

**File:** `src/core/runtime/blocks/TimerBlock.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TimerBlock } from './TimerBlock';
import { JitStatement } from '@/core/JitStatement';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { TimerState } from '../outputs/SetTimerStateAction';

describe('TimerBlock', () => {
  const mockRuntime = {} as ITimerRuntime;

  it('should create countdown timer for duration statements', () => {
    const statement = createMockStatement(30000); // 30 seconds
    const block = new TimerBlock([statement]);
    
    const actions = block.enter(mockRuntime);
    
    const timerStateAction = actions.find(a => a.name === 'SET_TIMER_STATE');
    expect(timerStateAction).toBeDefined();
    expect((timerStateAction as any).state).toBe(TimerState.RUNNING_COUNTDOWN);
  });

  it('should be marked as leaf block', () => {
    const statement = createMockStatement(30000);
    const block = new TimerBlock([statement]);
    
    expect(block.leaf).toBe(true);
  });

  it('should include complete handler', () => {
    const statement = createMockStatement(30000);
    const block = new TimerBlock([statement]);
    
    expect(block.handlers.length).toBeGreaterThan(0);
    expect(block.handlers.some(h => h.constructor.name === 'CompleteHandler')).toBe(true);
  });
});

function createMockStatement(duration?: number): JitStatement {
  return {
    duration: () => ({ original: duration }),
    durations: () => duration ? [{ original: duration }] : [],
    efforts: () => [],
    repetitions: () => [],
    children: [],
    // ... other mock methods
  } as any;
}
```

### 4.2 Integration Tests for Strategy Selection

**File:** `src/core/runtime/RuntimeJitStrategies.test.ts`

```typescript
describe('RuntimeJitStrategies - Timer Block Selection', () => {
  it('should select TimerBlock for duration-only statements', () => {
    const strategies = new RuntimeJitStrategies();
    const statement = createTimerStatement(30000); // 30s timer
    
    const block = strategies.compile([statement], mockRuntime);
    
    expect(block).toBeInstanceOf(TimerBlock);
  });

  it('should select TimedGroupBlock for group countdown scenarios', () => {
    const strategies = new RuntimeJitStrategies();
    const statement = createGroupStatement(300000, ['pullups', 'pushups']); // 5m AMRAP
    
    const block = strategies.compile([statement], mockRuntime);
    
    expect(block).toBeInstanceOf(TimedGroupBlock);
  });

  it('should prefer TimerBlock over EffortBlock for pure duration', () => {
    const strategies = new RuntimeJitStrategies();
    const statement = createTimerStatement(30000);
    
    const block = strategies.compile([statement], mockRuntime);
    
    expect(block).toBeInstanceOf(TimerBlock);
    expect(block).not.toBeInstanceOf(EffortBlock);
  });
});
```

## Phase 5: Documentation Updates

### 5.1 Update RuntimeBlocks.md

Add new sections for:
- TimerBlock lifecycle and behavior
- BlockTimerStrategy selection criteria
- GroupCountdownStrategy usage patterns
- Timer state management examples

### 5.2 Update Architecture Documentation

Update Core/Runtime.md with:
- New block type descriptions
- Strategy selection flowchart updates
- Timer handling architecture changes

## Implementation Checklist

### Phase 1: Core Components
- [ ] Implement TimerBlock class
- [ ] Implement BlockTimerStrategy class  
- [ ] Implement GroupCountdownStrategy class
- [ ] Implement SetDurationAction class
- [ ] Add comprehensive unit tests

### Phase 2: Integration
- [ ] Register new strategies in RuntimeJitStrategies
- [ ] Update import statements
- [ ] Test strategy selection priority
- [ ] Verify existing functionality unchanged

### Phase 3: Enhanced Timer Management
- [ ] Implement TimerContext interface
- [ ] Implement TimerManager class
- [ ] Create specialized tick handlers
- [ ] Refactor existing tick handling

### Phase 4: UI Integration
- [ ] Update UI components to handle SetDurationAction
- [ ] Test timer state transitions
- [ ] Verify countdown/countup behavior
- [ ] Test progress reporting

### Phase 5: Documentation & Testing
- [ ] Update all relevant documentation
- [ ] Create comprehensive integration tests
- [ ] Test all scenario combinations
- [ ] Performance testing for tick handling

## Risk Mitigation

### Backward Compatibility
- All existing block types remain unchanged
- Strategy registration is additive (new strategies added)
- No breaking changes to public interfaces

### Performance Considerations
- Timer handling refactoring may need optimization
- Tick event frequency should be monitored
- Memory usage of multiple timer contexts

### Testing Coverage
- All new components need full unit test coverage
- Integration tests for strategy selection
- End-to-end tests for complete workflows
- Performance benchmarks for tick handling
