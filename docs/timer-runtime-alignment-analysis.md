# Timer Runtime Alignment Analysis

**Date:** October 16, 2025  
**Purpose:** Analyze the alignment between runtime interface goals and timer implementation requirements, identifying missing elements needed for complete functionality.

## Executive Summary

The WOD Wiki runtime architecture provides a sophisticated foundation for timer-based workouts, but critical coordination mechanisms are **missing or incomplete** between timer behaviors, child block management, and round-based coordination. This document identifies **7 major gaps** that prevent timer implementations from working correctly.

---

## Part 1: Runtime Goals vs. Current State

### Goal 1: Timer Lifecycle Management ✅ MOSTLY COMPLETE

**Intended Design:**
- Timers should manage time tracking across pause/resume cycles
- Support both count-up (For Time) and countdown (AMRAP) modes
- Emit events at ~100ms intervals for UI updates
- Maintain sub-millisecond internal precision with 0.1s display precision

**Current Implementation:**
- ✅ `TimerBehavior` implements lifecycle correctly (`onPush`, `onPop`, `dispose`)
- ✅ Memory references for `timeSpans` and `isRunning` state
- ✅ Event emission (`timer:started`, `timer:tick`, `timer:complete`)
- ✅ Pause/resume functionality implemented
- ✅ Performance targets met (<50ms lifecycle, ~100ms ticks)

**Status:** **COMPLETE** - Timer lifecycle management works as designed.

---

### Goal 2: Timer-Child Coordination ❌ MISSING CRITICAL ELEMENTS

**Intended Design:**
- TimerBlock should wrap child blocks (RoundsBlock or EffortBlock)
- Timer should coordinate completion: countdown reaches zero OR children complete
- Child completion should stop timer and record exact timestamp
- Timer should emit completion events when appropriate

**Current Gaps:**

#### Gap 2.1: TimerBlock Cannot Manage Children
**Location:** `src/runtime/blocks/TimerBlock.ts` line 79

```typescript
// TODO: If TimerBlock needs to support children in future, add LoopCoordinatorBehavior here
```

**Problem:**
- TimerBlock has NO child management behaviors
- Cannot push child blocks onto stack
- Cannot coordinate with RoundsBlock or EffortBlock
- Timer runs independently without affecting children

**Missing Implementation:**
- `ChildAdvancementBehavior` integration
- `LazyCompilationBehavior` for child compilation
- Coordination logic between timer and child lifecycle

**Impact:** Timer workouts (AMRAP, For Time) cannot execute children.

#### Gap 2.2: No Timer Completion Detection
**Location:** `src/runtime/behaviors/TimerBehavior.ts`

**Problem:**
- TimerBehavior emits `timer:complete` event when countdown reaches zero
- NO behavior listens for this event to trigger block completion
- NO mechanism to complete TimerBlock when timer expires
- Children continue running after timer should have stopped

**Missing Implementation:**
```typescript
// NEEDED: TimerCompletionBehavior
class TimerCompletionBehavior implements IRuntimeBehavior {
  onEvent(event: IEvent, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (event.name === 'timer:complete') {
      // Complete the block and pop from stack
      return [new PopBlockAction()];
    }
    return [];
  }
}
```

**Impact:** Timer countdown completes but workout continues indefinitely.

#### Gap 2.3: Child Completion Doesn't Stop Timer
**Location:** Coordination between `CompletionBehavior` and `TimerBehavior`

**Problem:**
- When children complete, timer keeps running
- No mechanism to detect "all children done" → stop timer
- Timer continues ticking even after workout should end

**Missing Implementation:**
- Child completion detection in TimerBlock
- Timer stop coordination when children complete
- Whichever happens first (timer expires OR children complete) should end workout

**Impact:** Timer shows incorrect times when children complete before countdown.

---

### Goal 3: Round-Based Timer Coordination ❌ COMPLETELY MISSING

**Intended Design:**
- AMRAP workouts: Timer counts down, rounds loop until timer expires
- For Time workouts: Timer counts up, rounds execute sequentially
- Round advancement should inherit timer state
- Timer should control round execution flow

**Current Gaps:**

#### Gap 3.1: No AMRAP Strategy Implementation
**Location:** `src/runtime/strategies.ts`

**Problem:**
- `TimeBoundRoundsStrategy` mentioned in docs but NOT IMPLEMENTED
- No strategy to compile `(21-15-9) 20:00 AMRAP` patterns
- Timer and Rounds strategies work independently, cannot combine

**Missing Implementation:**
```typescript
export class TimeBoundRoundsStrategy implements IRuntimeBlockStrategy {
  match(code: ICodeStatement[], runtime: IScriptRuntime): boolean {
    // Match: Timer fragment + Rounds fragment + Action=AMRAP
    const hasTimer = code.some(stmt => 
      stmt.fragments.some(f => f.type === FragmentType.Timer)
    );
    const hasRounds = code.some(stmt => 
      stmt.fragments.some(f => f.type === FragmentType.Rounds)
    );
    return hasTimer && hasRounds;
  }

  compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    // Create TimerBlock wrapping RoundsBlock
    // Configure timer to control round looping
    // Return composite structure
  }
}
```

**Impact:** AMRAP workouts completely non-functional.

#### Gap 3.2: Rounds Don't Loop Within Timer
**Location:** `src/runtime/behaviors/ChildAdvancementBehavior.ts` and `RoundsBehavior.ts`

**Problem from execution analysis:**
- `ChildAdvancementBehavior.onNext()` only advances linearly through children ONCE
- Does NOT loop back to child index 0 for next round
- `RoundsBehavior` tracks rounds but doesn't coordinate with child advancement

**Current Code:**
```typescript
// ChildAdvancementBehavior.onNext()
this.currentChildIndex++; // ❌ INCREMENTS FOREVER, NO LOOPING

if (this.currentChildIndex >= this.children.length) {
  return []; // ❌ STOPS - NO COORDINATION WITH ROUNDS
}
```

**Missing Implementation:**
```typescript
// NEEDED: LoopCoordinatorBehavior
class LoopCoordinatorBehavior implements IRuntimeBehavior {
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const childBehavior = this.getChildBehavior(block);
    const roundsBehavior = this.getRoundsBehavior(block);
    
    if (!childBehavior || !roundsBehavior) return [];
    
    // If at end of children, loop back to start for next round
    if (childBehavior.currentChildIndex >= childBehavior.children.length) {
      if (roundsBehavior.currentRound <= roundsBehavior.totalRounds) {
        childBehavior.currentChildIndex = 0; // RESET for next round
        roundsBehavior.currentRound++; // INCREMENT round
        // Compile first child of next round
        return this.compileNextChild(runtime, block);
      }
    }
    
    return [];
  }
}
```

**Impact:** Rounds execute only once, never loop for subsequent rounds (Fran problem).

#### Gap 3.3: Timer Doesn't Control Round Duration
**Location:** Integration between `TimerBehavior` and `RoundsBehavior`

**Problem:**
- EMOM workouts need timer to signal "start next round every minute"
- Interval workouts need timer to control work/rest periods
- NO mechanism for timer to trigger round advancement

**Missing Implementation:**
- Timer interval events (`timer:interval-complete`)
- Round advancement listening for timer intervals
- Coordination between timer phase and round state

**Impact:** EMOM and interval workouts cannot function.

---

### Goal 4: Metric Inheritance System ❌ PARTIALLY IMPLEMENTED

**Intended Design:**
- Rep counts from rounds (21-15-9) should pass to child blocks
- Timer durations should inherit to children
- Context should flow: RoundsBlock → TimerBlock → EffortBlock

**Current State:**

#### Gap 4.1: Metric Context Not Passed Through JIT Compiler
**Location:** `src/runtime/JitCompiler.ts`

**Problem:**
- `CompilationContext` interface exists but not fully utilized
- `getRepsForCurrentRound()` exists in RoundsBlock but NOT called during child compilation
- Children compile without parent context

**Partial Implementation:**
```typescript
// JitCompiler.compile() has context parameter
compile(nodes: CodeStatement[], runtime: IScriptRuntime, context?: CompilationContext)

// BUT strategies don't USE context for metric inheritance
```

**Missing Implementation:**
```typescript
// NEEDED: Enhanced context passing
interface CompilationContext {
  parentBlock?: IRuntimeBlock;
  inheritedReps?: number; // From RoundsBlock.getRepsForCurrentRound()
  inheritedTimer?: number; // From TimerBlock configuration
  currentRound?: number;  // From RoundsBehavior state
}

// Strategies should extract metrics from context:
compile(code: ICodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock {
  const reps = context?.inheritedReps || this.extractRepsFromFragments(code);
  // Use inherited reps in block configuration
}
```

**Impact:** Rep schemes show exercise names but no rep counts.

#### Gap 4.2: Lazy Compilation Gets Wrong Child Index
**Location:** `src/runtime/behaviors/LazyCompilationBehavior.ts`

**Problem:**
- `LazyCompilationBehavior.onNext()` compiles based on CURRENT child index
- Should compile based on NEXT child index (after advancement)
- Timing issue: compiles before `ChildAdvancementBehavior.onNext()` increments

**Current Code:**
```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const currentChild = childBehavior.getCurrentChild(); // ❌ Gets CURRENT
  const currentIndex = childBehavior.getCurrentChildIndex();
  
  // Compiles at current index, but advancement hasn't happened yet
  const compiledBlock = runtime.jit.compile(...);
}
```

**Missing Implementation:**
- Behavior execution order control
- OR: Change to compile NEXT child explicitly
- OR: Coordinate with ChildAdvancementBehavior to advance THEN compile

**Impact:** First child may not compile, or wrong child compiles at round boundaries.

---

### Goal 5: Initial Block Mounting ❌ MISSING AUTO-START

**Intended Design:**
- When RoundsBlock or TimerBlock is pushed, first child should auto-compile
- User shouldn't need to click "Next" to start workout
- Mount should trigger initial child push

**Current Gaps:**

#### Gap 5.1: No Initial Child Push on Mount
**Location:** `src/runtime/behaviors/RoundsBehavior.ts` `onPush()`

**Problem:**
```typescript
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  this.currentRound = 1;
  // ... memory initialization
  return []; // ❌ NO ACTIONS - Should push first child
}
```

**Missing Implementation:**
```typescript
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  this.currentRound = 1;
  // ... memory initialization
  
  // Auto-start: Push first child
  const firstChild = this.children[0];
  if (firstChild) {
    const compiledBlock = runtime.jit.compile([firstChild], runtime, {
      inheritedReps: this.getRepsForCurrentRound()
    });
    
    if (compiledBlock) {
      return [new PushBlockAction(compiledBlock)];
    }
  }
  
  return [];
}
```

**Impact:** Extra click needed to start workout, confusing UX.

#### Gap 5.2: TimerBlock Doesn't Auto-Start Children
**Location:** `src/runtime/blocks/TimerBlock.ts`

**Problem:**
- TimerBlock constructor sets up timer
- Does NOT set up child management
- Cannot push children even if configured

**Missing Implementation:**
- Add child management behaviors to TimerBlock
- Auto-compile and push first child on mount
- Coordinate timer lifecycle with child execution

**Impact:** Timer runs but no exercises execute.

---

### Goal 6: Event-Driven Coordination ❌ PARTIALLY IMPLEMENTED

**Intended Design:**
- Behaviors should communicate via events
- Timer events should trigger completion
- Round events should trigger UI updates
- Decoupled architecture for extensibility

**Current State:**

#### Gap 6.1: Event Handlers Not Behavior-Based
**Location:** `src/runtime/ScriptRuntime.ts` event handling

**Current Implementation:**
```typescript
// ScriptRuntime.handle() processes ALL handlers in memory
const handlerRefs = this.memory.search({ type: 'handler', ... });
const allHandlers = handlerRefs.map(ref => this.memory.get(ref));

// ✅ This works for cross-block event handling
```

**Problem:**
- Behaviors emit events (`timer:complete`, `rounds:changed`)
- BUT behaviors don't register event handlers
- NO standard pattern for behavior-to-behavior event communication

**Missing Implementation:**
```typescript
// NEEDED: Behavior event handler registration
interface IRuntimeBehavior {
  // ... existing methods
  
  registerEventHandlers?(runtime: IScriptRuntime, block: IRuntimeBlock): IEventHandler[];
}

// CompletionBehavior should listen for timer:complete
class CompletionBehavior implements IRuntimeBehavior {
  registerEventHandlers(runtime: IScriptRuntime, block: IRuntimeBlock): IEventHandler[] {
    return [{
      id: `${block.key}-completion-handler`,
      name: 'timer-completion',
      handler: (event, runtime) => {
        if (event.name === 'timer:complete') {
          return [new PopBlockAction()];
        }
        return [];
      }
    }];
  }
}
```

**Impact:** Events emitted but not handled, no inter-behavior coordination.

---

### Goal 7: Performance and Resource Management ✅ IMPLEMENTED

**Intended Design:**
- Lifecycle methods complete in <50ms
- Stack operations <1ms
- Memory cleanup prevents leaks
- Consumer-managed disposal pattern

**Current State:**
- ✅ TimerBehavior.dispose() properly clears intervals
- ✅ Constructor-based initialization pattern implemented
- ✅ Consumer-managed disposal documented and enforced
- ✅ Performance targets met in tests

**Status:** **COMPLETE** - Resource management works as designed.

---

## Part 2: Critical Missing Implementations

### Priority 1: CRITICAL - Enable Basic Timer Functionality

#### 1.1 Add Child Management to TimerBlock
**Files:** `src/runtime/blocks/TimerBlock.ts`

**Implementation:**
```typescript
export class TimerBlock extends RuntimeBlock {
  constructor(
    runtime: IScriptRuntime,
    sourceIds: number[],
    private readonly config: TimerBlockConfig
  ) {
    const timerBehavior = new TimerBehavior(config.direction, config.durationMs);
    const completionBehavior = new CompletionBehavior(() => {
      // Complete when timer expires OR children complete
      const timerDone = this.timerBehavior.getRemainingMs() === 0;
      const childrenDone = !this.stack.current; // No active child
      return timerDone || childrenDone;
    });
    
    const behaviors = [timerBehavior, completionBehavior];
    
    // ADD CHILD MANAGEMENT if config.children exists
    if (config.children && config.children.length > 0) {
      const childBehavior = new ChildAdvancementBehavior(config.children);
      const lazyCompilation = new LazyCompilationBehavior(config.children);
      behaviors.push(childBehavior, lazyCompilation);
    }
    
    super(runtime, sourceIds, behaviors, "Timer");
    this.timerBehavior = timerBehavior;
  }
}
```

**Test Validation:**
- Timer should compile with children
- Children should push onto stack when timer starts
- Timer should coordinate with child lifecycle

---

#### 1.2 Implement LoopCoordinatorBehavior
**Files:** `src/runtime/behaviors/LoopCoordinatorBehavior.ts` (NEW)

**Purpose:** Coordinate child looping with round advancement

**Implementation:**
```typescript
export class LoopCoordinatorBehavior implements IRuntimeBehavior {
  constructor(private readonly mode: 'rounds' | 'timed-rounds' | 'intervals') {}
  
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const childBehavior = this.findBehavior<ChildAdvancementBehavior>(block, 'ChildAdvancement');
    const roundsBehavior = this.findBehavior<RoundsBehavior>(block, 'Rounds');
    
    if (!childBehavior || !roundsBehavior) return [];
    
    // Check if at end of children
    if (childBehavior.currentChildIndex >= childBehavior.children.length) {
      // For rounds mode: loop back to start for next round
      if (this.mode === 'rounds' || this.mode === 'timed-rounds') {
        if (roundsBehavior.currentRound < roundsBehavior.totalRounds) {
          // Reset child index for next round
          childBehavior.currentChildIndex = 0;
          roundsBehavior.currentRound++;
          
          // Compile first child of next round
          const firstChild = childBehavior.children[0];
          const compiledBlock = runtime.jit.compile([firstChild], runtime, {
            inheritedReps: roundsBehavior.getRepsForCurrentRound(),
            currentRound: roundsBehavior.currentRound
          });
          
          if (compiledBlock) {
            return [new PushBlockAction(compiledBlock)];
          }
        } else {
          // All rounds complete
          return [new EmitEventAction({ name: 'rounds:complete' })];
        }
      }
    }
    
    return [];
  }
  
  private findBehavior<T>(block: IRuntimeBlock, typeName: string): T | undefined {
    // Duck-type behavior search
    if (!(block as any).behaviors) return undefined;
    return (block as any).behaviors.find((b: any) => 
      b.constructor.name.includes(typeName)
    );
  }
}
```

**Test Validation:**
- Fran workout (21-15-9) should execute all 3 rounds
- Each round should loop through children
- Round counter should increment correctly

---

#### 1.3 Implement TimeBoundRoundsStrategy
**Files:** `src/runtime/strategies.ts`

**Purpose:** Compile AMRAP workouts with timer + rounds

**Implementation:**
```typescript
export class TimeBoundRoundsStrategy implements IRuntimeBlockStrategy {
  match(code: ICodeStatement[], runtime: IScriptRuntime): boolean {
    if (code.length === 0) return false;
    
    const stmt = code[0];
    const hasTimer = stmt.fragments.some(f => f.type === FragmentType.Timer);
    const hasRounds = stmt.fragments.some(f => f.type === FragmentType.Rounds);
    const hasAMRAP = stmt.fragments.some(f => 
      f.type === FragmentType.Action && f.value === 'AMRAP'
    );
    
    return hasTimer && hasRounds && hasAMRAP;
  }
  
  compile(code: ICodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock {
    const stmt = code[0];
    
    // Extract timer configuration
    const timerFragment = stmt.fragments.find(f => f.type === FragmentType.Timer);
    const durationMs = timerFragment?.value; // milliseconds
    
    // Extract rounds configuration
    const roundsFragment = stmt.fragments.find(f => f.type === FragmentType.Rounds);
    const repScheme = roundsFragment?.value; // e.g., [21, 15, 9]
    
    // Get children from statement
    const children = stmt.children[0]?.map(id => 
      runtime.script.statements.find(s => s.id === id)
    ).filter(Boolean) || [];
    
    // Create composite block structure:
    // TimerBlock wrapping RoundsBlock wrapping children
    
    // 1. Create RoundsBlock
    const roundsBehavior = new RoundsBehavior(repScheme);
    const childAdvancement = new ChildAdvancementBehavior(children);
    const loopCoordinator = new LoopCoordinatorBehavior('timed-rounds');
    const lazyCompilation = new LazyCompilationBehavior(children);
    
    const roundsBlock = new RuntimeBlock(
      runtime,
      [stmt.id],
      [roundsBehavior, childAdvancement, loopCoordinator, lazyCompilation],
      "Rounds"
    );
    
    // 2. Create TimerBlock wrapping RoundsBlock
    const timerConfig: TimerBlockConfig = {
      direction: 'down', // AMRAP counts down
      durationMs,
      children: [roundsBlock]
    };
    
    return new TimerBlock(runtime, [stmt.id], timerConfig);
  }
}
```

**Strategy Precedence:** Should be FIRST (before TimerStrategy and RoundsStrategy)

**Test Validation:**
- `(21-15-9) 20:00 AMRAP Thrusters, Pullups` should compile as TimerBlock(RoundsBlock(children))
- Timer should count down from 20:00
- Rounds should loop until timer expires
- Rep counts should decrease (21 → 15 → 9 → 21 → ...)

---

### Priority 2: HIGH - Metric Inheritance

#### 2.1 Enhanced CompilationContext Usage
**Files:** `src/runtime/CompilationContext.ts`, all strategies

**Implementation:**
```typescript
export interface CompilationContext {
  parentBlock?: IRuntimeBlock;
  inheritedMetrics?: {
    reps?: number;
    duration?: number;
    resistance?: number;
  };
  roundState?: {
    currentRound: number;
    totalRounds: number;
    repScheme?: number[];
  };
}

// Update strategies to USE context:
export class EffortStrategy implements IRuntimeBlockStrategy {
  compile(code: ICodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock {
    // Extract reps from context OR fragments
    const inheritedReps = context?.inheritedMetrics?.reps;
    const fragmentReps = this.extractRepsFromFragments(code);
    const reps = inheritedReps ?? fragmentReps;
    
    // Use in block configuration
    return new RuntimeBlock(runtime, [code[0].id], [
      new EffortBehavior(reps)
    ], "Effort");
  }
}
```

**Test Validation:**
- Fran: "Thrusters" should receive reps=21 in round 1
- Fran: "Thrusters" should receive reps=15 in round 2
- Context should flow: RoundsBlock → compilation → EffortBlock

---

#### 2.2 Fix LazyCompilationBehavior Timing
**Files:** `src/runtime/behaviors/LazyCompilationBehavior.ts`

**Implementation:**
```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const childBehavior = this.getChildBehavior(block);
  if (!childBehavior) return [];
  
  // Get NEXT child index (after advancement)
  const nextIndex = childBehavior.getCurrentChildIndex() + 1;
  
  // Check bounds
  if (nextIndex >= this.children.length) {
    return []; // Let LoopCoordinatorBehavior handle looping
  }
  
  const nextChild = this.children[nextIndex];
  if (!nextChild) return [];
  
  // Get current round context for metric inheritance
  const roundsBehavior = this.getRoundsBehavior(block);
  const context: CompilationContext = {
    parentBlock: block,
    inheritedMetrics: {
      reps: roundsBehavior?.getRepsForCurrentRound()
    },
    roundState: roundsBehavior ? {
      currentRound: roundsBehavior.currentRound,
      totalRounds: roundsBehavior.totalRounds,
      repScheme: roundsBehavior.repScheme
    } : undefined
  };
  
  // Compile with context
  const compiledBlock = runtime.jit.compile([nextChild], runtime, context);
  
  if (compiledBlock) {
    return [new PushBlockAction(compiledBlock)];
  }
  
  return [];
}
```

**Test Validation:**
- First child should compile correctly
- Subsequent children should compile with proper context
- Round boundaries should maintain context

---

### Priority 3: MEDIUM - Auto-Start and UX

#### 3.1 Auto-Push First Child on Mount
**Files:** `src/runtime/behaviors/RoundsBehavior.ts`, `src/runtime/blocks/TimerBlock.ts`

**Implementation:**
```typescript
// RoundsBehavior
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  this.currentRound = 1;
  // ... memory initialization
  
  // Auto-start: compile and push first child
  const childBehavior = this.getChildBehavior(block);
  if (childBehavior && childBehavior.children.length > 0) {
    const firstChild = childBehavior.children[0];
    const compiledBlock = runtime.jit.compile([firstChild], runtime, {
      inheritedMetrics: { reps: this.getRepsForCurrentRound() },
      roundState: {
        currentRound: this.currentRound,
        totalRounds: this.totalRounds,
        repScheme: this.repScheme
      }
    });
    
    if (compiledBlock) {
      return [new PushBlockAction(compiledBlock)];
    }
  }
  
  return [];
}
```

**Test Validation:**
- Pushing RoundsBlock should auto-push first child
- No manual "Next" click needed to start
- Timer should start immediately when block mounted

---

### Priority 4: LOW - Event-Driven Behavior Coordination

#### 4.1 Behavior Event Handler Registration
**Files:** `src/runtime/IRuntimeBehavior.ts`, all behaviors

**Implementation:**
```typescript
export interface IRuntimeBehavior {
  // ... existing methods
  
  /**
   * Optional: Register event handlers for this behavior.
   * Called during block initialization.
   */
  registerEventHandlers?(runtime: IScriptRuntime, block: IRuntimeBlock): IEventHandler[];
}

// Example: CompletionBehavior listens for timer:complete
export class CompletionBehavior implements IRuntimeBehavior {
  registerEventHandlers(runtime: IScriptRuntime, block: IRuntimeBlock): IEventHandler[] {
    return [{
      id: `${block.key}-timer-completion`,
      name: 'timer-completion-handler',
      handler: (event: IEvent, runtime: IScriptRuntime) => {
        if (event.name === 'timer:complete' && this.shouldComplete(runtime, block)) {
          return [new PopBlockAction()];
        }
        return [];
      }
    }];
  }
}
```

**Test Validation:**
- Timer:complete event should trigger block completion
- Rounds:changed event should trigger UI updates
- Cross-behavior event communication works

---

## Part 3: Implementation Priority and Testing Strategy

### Phase 1: Basic Timer-Child Coordination (Week 1)
**Goal:** Get timers working with children

**Tasks:**
1. Add child management to TimerBlock
2. Implement auto-start on mount
3. Fix LazyCompilationBehavior timing

**Tests:**
- Single timer with single child (basic For Time)
- Timer completion stops workout
- Child completion stops timer

**Success Criteria:** `20:00 For Time: 100 Squats` executes correctly

---

### Phase 2: Round Looping (Week 2)
**Goal:** Get multi-round workouts working

**Tasks:**
1. Implement LoopCoordinatorBehavior
2. Fix ChildAdvancementBehavior looping
3. Implement metric inheritance

**Tests:**
- Fran workout (21-15-9) executes all 3 rounds
- Rep counts decrease correctly
- Round counter increments

**Success Criteria:** `(21-15-9) Thrusters 95lb, Pullups` completes 3 rounds

---

### Phase 3: AMRAP and Intervals (Week 3)
**Goal:** Get timed round workouts working

**Tasks:**
1. Implement TimeBoundRoundsStrategy
2. Timer controls round duration
3. EMOM interval support

**Tests:**
- `(21-15-9) 20:00 AMRAP Thrusters, Pullups` loops rounds until timer expires
- EMOM intervals trigger round advancement
- Timer completion stops round looping

**Success Criteria:** All AMRAP and EMOM workouts execute correctly

---

### Phase 4: Polish and Events (Week 4)
**Goal:** Event-driven coordination and edge cases

**Tasks:**
1. Behavior event handler registration
2. Cross-behavior event communication
3. Edge case handling (empty rounds, zero duration, etc.)

**Tests:**
- All event types emitted and handled
- Behaviors coordinate via events
- Edge cases handled gracefully

**Success Criteria:** Complete test coverage, no known bugs

---

## Part 4: Summary of Missing Elements

### Critical Missing Implementations
1. ❌ **LoopCoordinatorBehavior** - Child looping with round advancement
2. ❌ **TimeBoundRoundsStrategy** - AMRAP workout compilation
3. ❌ **TimerBlock child management** - Timer wrapping children
4. ❌ **Metric inheritance through compilation** - Rep counts to children
5. ❌ **Auto-start on mount** - First child auto-push
6. ❌ **Timer completion coordination** - Timer expiry stops children
7. ❌ **Behavior event handlers** - Inter-behavior event communication

### Partially Implemented (Needs Completion)
1. ⚠️ **CompilationContext** - Interface exists but not fully used
2. ⚠️ **LazyCompilationBehavior** - Timing issue with child index
3. ⚠️ **ChildAdvancementBehavior** - No looping support
4. ⚠️ **RoundsBehavior** - No coordination with child looping

### Complete and Working
1. ✅ **TimerBehavior** - Time tracking and events
2. ✅ **Memory system** - State persistence and search
3. ✅ **Resource management** - Lifecycle and disposal
4. ✅ **Event emission** - Timer and round events
5. ✅ **Performance targets** - <50ms lifecycle, ~100ms ticks

---

## Conclusion

The runtime architecture is **well-designed** but **incomplete**. The missing coordination mechanisms are the primary blocker to timer functionality. Implementing the 7 critical missing elements in the proposed 4-phase approach will enable:

1. ✅ Basic timer workouts (For Time)
2. ✅ Multi-round workouts (Fran)
3. ✅ AMRAP timed rounds
4. ✅ EMOM intervals
5. ✅ Complete metric inheritance
6. ✅ Seamless UX (auto-start)

**Estimated Timeline:** 4 weeks for complete implementation and testing.

**Recommendation:** Start with Phase 1 (Basic Timer-Child Coordination) to unblock basic timer functionality, then proceed sequentially through phases.
