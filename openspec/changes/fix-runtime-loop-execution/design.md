# Design: Fix Runtime Loop Execution

**Change ID**: `fix-runtime-loop-execution`  
**Status**: Draft  
**Created**: 2025-10-12

## Architecture Overview

This design replaces the fragmented behavior coordination model with a unified loop coordinator that manages all aspects of iterative workout execution. The new architecture consolidates three separate behaviors into one cohesive component while adding missing metric inheritance capabilities.

## Current Architecture Problems

### Fragmented Behavior Model

**Current State:**
```
RoundsBlock
├── RoundsBehavior (tracks round count)
├── ChildAdvancementBehavior (advances through children)
└── LazyCompilationBehavior (compiles next child)
```

**Problems:**
1. **No Communication**: Behaviors don't share state or coordinate
2. **Unclear Ownership**: No single source of truth for loop position
3. **Timing Issues**: Execution order of behaviors is undefined
4. **Missing Coordination**: Round transitions don't trigger child resets

### Child Advancement Bug

**Current Logic:**
```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.currentChildIndex >= this.children.length) {
        return [];  // ❌ Stops instead of looping
    }
    this.currentChildIndex++;  // ❌ No modulo, just increments
    // ... compile child
}
```

**Problem:** Linear advancement without looping mechanism.

### Round Tracking Disconnect

**Current Logic:**
```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this.currentRound++;  // ❌ Increments every next(), not per round
    // ... emit events
    return [];  // ❌ No actions to trigger child compilation
}
```

**Problem:** Rounds increment on every `next()` instead of when completing all children.

## Proposed Architecture

### Unified Loop Coordinator

**New Structure:**
```
RoundsBlock
└── LoopCoordinatorBehavior
    ├── Loop State (index, position, rounds)
    ├── Loop Type Logic (fixed, repScheme, timeBound, interval)
    ├── Child Compilation (with context)
    └── Completion Detection (type-aware)
```

**Benefits:**
1. **Single Source of Truth**: All loop state in one place
2. **Clear Ownership**: Coordinator owns child cycling and round tracking
3. **Proper Coordination**: Round boundaries naturally detected
4. **Context Passing**: Compilation context flows through one path

### Loop State Model

**Core State Variables:**
```typescript
interface LoopState {
  // Primary state - increments on every next()
  index: number;        // 0, 1, 2, 3, 4, 5, 6... (total advancements)
  
  // Derived state - calculated from index
  position: number;     // index % childGroups.length (which child to compile)
  rounds: number;       // Math.floor(index / childGroups.length) (completed rounds)
}
```

**Example - Fran Workout: `(21-15-9) Thrusters, Pullups`**

| next() call | index | position | rounds | action |
|------------|-------|----------|--------|--------|
| mount | -1 | - | - | Push Thrusters (21) |
| 1st | 0 | 0 | 0 | Push Pullups (21) |
| 2nd | 1 | 1 | 0 | Push Thrusters (15) - round wrap! |
| 3rd | 2 | 0 | 1 | Push Pullups (15) |
| 4th | 3 | 1 | 1 | Push Thrusters (9) - round wrap! |
| 5th | 4 | 0 | 2 | Push Pullups (9) |
| 6th | 5 | 1 | 2 | Complete (rounds >= 3) |
| 7th | 6 | 0 | 3 | Already complete |

**Key Insight:** 
- Position cycles: 0, 1, 0, 1, 0, 1...
- Rounds increment when position wraps: 0, 0, 1, 1, 2, 2, 3
- Completion check: `rounds >= totalRounds` (3)

### Loop Type Variations

All loop types use the same state model but different completion logic:

#### 1. Fixed Rounds Loop
**Pattern:** `(3) Pullups, Pushups, Situps`

```typescript
isComplete(runtime: IScriptRuntime): boolean {
  const rounds = Math.floor(this.index / this.childGroups.length);
  return rounds >= this.totalRounds;  // Simple numeric comparison
}
```

#### 2. Rep Scheme Loop
**Pattern:** `(21-15-9) Thrusters, Pullups`

```typescript
isComplete(runtime: IScriptRuntime): boolean {
  const rounds = Math.floor(this.index / this.childGroups.length);
  return rounds >= this.repScheme.length;  // Compare to scheme length
}

getRepsForCurrentRound(): number {
  const rounds = Math.floor(this.index / this.childGroups.length);
  return this.repScheme[rounds];  // Index into scheme array
}
```

#### 3. Time-Bound Loop (AMRAP)
**Pattern:** `20:00 AMRAP Pullups, Pushups, Squats`

```typescript
isComplete(runtime: IScriptRuntime): boolean {
  // Ignore rounds count, only check timer
  return runtime.timer.isExpired();  // Loop until time runs out
}

getCompletedRounds(): number {
  // Rounds can go to infinity
  return Math.floor(this.index / this.childGroups.length);
}
```

#### 4. Interval Loop (EMOM)
**Pattern:** `(30) :60 EMOM + Pullups, + Pushups`

```typescript
isComplete(runtime: IScriptRuntime): boolean {
  const rounds = Math.floor(this.index / this.childGroups.length);
  return rounds >= this.totalRounds;  // Fixed rounds like type 1
}

onIntervalComplete(): void {
  // Reset timer but keep index/position/rounds
  // Next interval starts immediately
}
```

### Child Group Handling

**Critical Discovery:** Children are stored as **groups**, not flat arrays.

**Structure:**
```typescript
children: number[][]  // Array of groups
```

**Example with Compose (`+`):**
```
(3) + 5 Pullups, + 10 Pushups, 20 Squats

children: [[2, 3], [4]]
           ^^^^^^^  ^^^
           Group 0  Group 1
```

**Loop Progression:**
- position=0 → compile group [2, 3] (both exercises together)
- position=1 → compile group [4] (single exercise)
- position=0 → compile group [2, 3] again (round 2)
- position=1 → compile group [4] again (round 2)
- ...continues for 3 rounds

**Compose Groups Execute Together:**
- Group [2, 3] means "Pullups AND Pushups in same segment"
- Not sequential - both happen before moving to next group
- Used for supersets, complexes, or timed intervals

### Metric Inheritance System

**Problem:** Rep schemes exist in parent but never reach children.

**Current State:**
```typescript
// In RoundsBlock
getRepsForCurrentRound(): number {
  return this.repScheme[this.currentRound - 1];  // Has data
}

// In EffortBlock  
// ❌ No way to access parent's reps
```

**Proposed Solution - Compilation Context:**

```typescript
interface CompilationContext {
  // Round information
  round: number;           // 1-indexed for display (1, 2, 3...)
  totalRounds?: number;    // Total rounds in workout
  
  // Repetition information
  reps?: number;           // Reps for current round (21, 15, 9...)
  
  // Position information
  position: number;        // Child group position (0, 1, 2...)
  
  // Timing information (for EMOM)
  intervalDurationMs?: number;  // Interval length in ms
  
  // Parent context chain
  parent?: CompilationContext;  // For nested blocks
}
```

**Context Flow:**
```
RoundsBlock.onNext()
  ↓
  Calculate: round=1, reps=21, position=0
  ↓
  Create CompilationContext { round: 1, reps: 21, position: 0 }
  ↓
  JitCompiler.compile(childGroup, context)
  ↓
  EffortStrategy.compile(statement, context)
  ↓
  new EffortBlock({ reps: context.reps })  ← Receives 21
```

**Implementation:**

```typescript
// In LoopCoordinatorBehavior
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const position = this.index % this.childGroups.length;
  const rounds = Math.floor(this.index / this.childGroups.length);
  
  // Build context
  const context: CompilationContext = {
    round: rounds + 1,  // 1-indexed
    position: position,
    totalRounds: this.totalRounds,
  };
  
  // Add reps if rep scheme exists
  if (this.repScheme && rounds < this.repScheme.length) {
    context.reps = this.repScheme[rounds];
  }
  
  // Compile with context
  const childGroup = this.childGroups[position];
  const compiledBlock = runtime.jit.compile(childGroup, runtime, context);
  
  this.index++;  // Increment after compilation
  return [new PushBlockAction(compiledBlock)];
}

// In JitCompiler
compile(
  statements: CodeStatement[],
  runtime: IScriptRuntime,
  context?: CompilationContext
): IRuntimeBlock | null {
  // Pass context to strategies
  const strategy = this.getStrategy(statement);
  return strategy.compile(statement, runtime, context);
}

// In EffortStrategy
compile(
  statement: CodeStatement,
  runtime: IScriptRuntime,
  context?: CompilationContext
): IRuntimeBlock {
  // Get reps from context if not in fragment
  const reps = this.findRepFragment(statement)?.count 
    || context?.reps  // ← Inherit from parent
    || 1;  // Default
  
  return new EffortBlock({
    statement,
    reps,
    round: context?.round,
  });
}
```

### Initial Push on Mount

**Problem:** Currently requires extra "Next" click to start workout.

**Current Code:**
```typescript
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  this.currentRound = 1;
  // ... initialize state
  return [];  // ❌ No actions
}
```

**Proposed Solution:**
```typescript
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  // Initialize index to -1 (pre-first-advance)
  this.index = -1;
  
  // Immediately advance to first child
  return this.onNext(runtime, block);  // Returns PushBlockAction for first child
}
```

**Result:** First child compiles and pushes automatically without user intervention.

## Event Emission

### Round Change Events

**Emit when position wraps back to 0:**
```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const oldRounds = Math.floor(this.index / this.childGroups.length);
  const position = this.index % this.childGroups.length;
  
  this.index++;
  
  const newRounds = Math.floor(this.index / this.childGroups.length);
  
  // Round boundary detected
  if (newRounds > oldRounds) {
    runtime.emit({
      name: 'rounds:changed',
      round: newRounds + 1,  // 1-indexed
      totalRounds: this.totalRounds,
    });
  }
  
  // ... continue with child compilation
}
```

### Completion Events

**Emit when loop completes:**
```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  if (this.isComplete(runtime)) {
    runtime.emit({
      name: 'rounds:complete',
      totalRounds: this.getRounds(),
      completedAt: Date.now(),
    });
    return [];  // No more actions
  }
  // ... continue looping
}
```

## Behavior Composition Model

### Before: Fragmented
```typescript
class RoundsBlock {
  behaviors = [
    new RoundsBehavior(totalRounds),
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior(children),
    new CompletionBehavior(() => this.isComplete()),
  ];
}
```

**Problems:**
- Behaviors execute in sequence but don't share state
- Each returns actions independently
- No coordination mechanism
- Unclear which behavior "owns" what state

### After: Unified
```typescript
class RoundsBlock {
  behaviors = [
    new LoopCoordinatorBehavior({
      childGroups: children,
      loopType: 'repScheme',
      totalRounds: 3,
      repScheme: [21, 15, 9],
    }),
    new CompletionBehavior(() => this.coordinator.isComplete()),
  ];
  
  get coordinator(): LoopCoordinatorBehavior {
    return this.behaviors[0] as LoopCoordinatorBehavior;
  }
}
```

**Benefits:**
- Single behavior owns all loop state
- Clear ownership and responsibility
- Easy to test in isolation
- Completion delegates to coordinator

## Performance Considerations

### State Calculations

**All derived state is calculated, not stored:**
```typescript
// Fast calculations - no storage overhead
const position = this.index % this.childGroups.length;  // ~0.001ms
const rounds = Math.floor(this.index / this.childGroups.length);  // ~0.001ms
```

**Benefits:**
- No sync issues (always correct)
- Minimal memory footprint
- Cache-friendly (single integer)

### Compilation Caching

**Problem:** Re-compiling same children every round is wasteful.

**Solution:** Cache compiled blocks per child group.

```typescript
private compiledBlocks = new Map<number, IRuntimeBlock>();

onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const position = this.index % this.childGroups.length;
  
  // Check cache
  if (!this.compiledBlocks.has(position)) {
    // Compile and cache
    const compiled = runtime.jit.compile(this.childGroups[position], ...);
    this.compiledBlocks.set(position, compiled);
  }
  
  // Clone cached block with updated context
  const block = this.compiledBlocks.get(position)!.clone();
  block.updateContext(this.getCompilationContext(...));
  
  return [new PushBlockAction(block)];
}
```

**Trade-off:** Memory for CPU (store N blocks vs re-compile each time).

**Decision:** Start without caching, add if profiling shows need.

## Migration Path

### Phase 1: Parallel Implementation
- Create `LoopCoordinatorBehavior` alongside existing behaviors
- Add feature flag to RoundsBlock: `useNewLoopBehavior`
- Test with flag enabled in Storybook stories

### Phase 2: Gradual Rollout
- Enable for Fran workout first (simplest rep scheme)
- Verify all 7 next() calls work
- Enable for all fixed-round workouts (Helen, Barbara)
- Enable for AMRAP/EMOM workouts

### Phase 3: Deprecation
- Mark old behaviors as deprecated
- Add console warnings when used
- Update all block types to use new behavior

### Phase 4: Removal
- Remove `ChildAdvancementBehavior.ts`
- Remove `LazyCompilationBehavior.ts`
- Keep `RoundsBehavior.ts` if needed for backward compat
- Update all imports and tests

## Testing Strategy

### Unit Tests

**LoopCoordinatorBehavior in Isolation:**
```typescript
describe('LoopCoordinatorBehavior', () => {
  describe('Fixed Rounds', () => {
    it('calculates position using modulo', () => {
      const behavior = new LoopCoordinatorBehavior({
        childGroups: [[1], [2], [3]],
        loopType: 'fixed',
        totalRounds: 2,
      });
      
      expect(behavior.getState().position).toBe(0);  // Initial
      behavior.onNext(runtime, block);
      expect(behavior.getState().position).toBe(1);  // After 1st next
      behavior.onNext(runtime, block);
      expect(behavior.getState().position).toBe(2);  // After 2nd next
      behavior.onNext(runtime, block);
      expect(behavior.getState().position).toBe(0);  // Wraps to 0 (round 2)
    });
    
    it('increments rounds when position wraps', () => {
      // ... test round counting
    });
    
    it('completes after totalRounds', () => {
      // ... test completion
    });
  });
  
  describe('Rep Scheme', () => {
    it('returns correct reps for each round', () => {
      const behavior = new LoopCoordinatorBehavior({
        childGroups: [[1], [2]],
        loopType: 'repScheme',
        repScheme: [21, 15, 9],
      });
      
      expect(behavior.getRepsForCurrentRound()).toBe(21);  // Round 0
      behavior.onNext(runtime, block);
      behavior.onNext(runtime, block);
      expect(behavior.getRepsForCurrentRound()).toBe(15);  // Round 1
      behavior.onNext(runtime, block);
      behavior.onNext(runtime, block);
      expect(behavior.getRepsForCurrentRound()).toBe(9);   // Round 2
    });
  });
});
```

### Integration Tests

**Full Workout Execution:**
```typescript
describe('Fran Workout', () => {
  it('executes all rounds with correct reps', () => {
    const script = parseScript('(21-15-9) Thrusters 95lb, Pullups');
    const runtime = new ScriptRuntime(script);
    
    // Mount - first child should auto-push
    const block = runtime.stack.current;
    expect(block.statement.text).toBe('Thrusters 95lb');
    expect(block.reps).toBe(21);  // ← Metric inheritance
    
    // Advance through rounds
    runtime.next();  // Pullups 21
    expect(runtime.stack.current.statement.text).toBe('Pullups');
    expect(runtime.stack.current.reps).toBe(21);
    
    runtime.next();  // Thrusters 15 (round 2)
    expect(runtime.stack.current.reps).toBe(15);
    
    runtime.next();  // Pullups 15
    runtime.next();  // Thrusters 9 (round 3)
    runtime.next();  // Pullups 9
    runtime.next();  // Complete
    
    expect(runtime.isComplete()).toBe(true);
  });
});
```

### Edge Cases

```typescript
describe('Edge Cases', () => {
  it('handles single child group', () => {
    // (3) Pushups - only 1 child
  });
  
  it('handles no children gracefully', () => {
    // (3) - empty rounds block
  });
  
  it('handles 100 rounds without performance degradation', () => {
    // Stress test with many rounds
  });
  
  it('handles compose groups correctly', () => {
    // (3) + Pullups, + Pushups - group executes together
  });
});
```

## Open Design Questions

### Q1: Should we cache compiled blocks?
**Options:**
- A) Compile fresh each time (simple, lower memory)
- B) Cache per position (faster, higher memory)
- C) Hybrid (cache first N, compile rest)

**Decision:** Start with A, profile, optimize if needed.

### Q2: Context passing - push or pull?
**Options:**
- A) Push: Parent provides context during compilation
- B) Pull: Child requests context from parent at runtime
- C) Hybrid: Context at compile, update at runtime

**Decision:** A (push) for type safety and compile-time validation.

### Q3: What if context changes during execution?
**Example:** AMRAP workout where rounds increment during child execution.

**Options:**
- A) Immutable context (snapshot at compilation)
- B) Mutable context (updates propagate to children)
- C) Refresh context (child queries parent on each access)

**Decision:** A for safety, document limitation.

### Q4: Should index start at 0 or -1?
**Options:**
- A) Start at 0, first next() increments to 1
- B) Start at -1, first next() increments to 0
- C) Start at 0, increment at end of onNext()

**Decision:** B for cleaner initial push logic.

## Alternatives Considered

### Alternative 1: Keep Separate Behaviors with Messaging
**Approach:** Add event bus for behaviors to communicate.

**Pros:**
- Preserves existing architecture
- Less refactoring needed

**Cons:**
- Complex message passing
- Still unclear ownership
- Harder to test
- More moving parts

**Verdict:** ❌ Rejected - adds complexity without solving root issues.

### Alternative 2: State Machine for Loop Progression
**Approach:** Explicit state machine with states: INIT, ADVANCE_CHILD, ADVANCE_ROUND, COMPLETE.

**Pros:**
- Very explicit state transitions
- Easy to visualize
- Formal correctness proofs possible

**Cons:**
- Overkill for this use case
- More code for same functionality
- Harder to extend to new loop types

**Verdict:** ❌ Rejected - too heavyweight.

### Alternative 3: Make ChildAdvancementBehavior Loop-Aware
**Approach:** Fix ChildAdvancementBehavior to use modulo and coordinate with RoundsBehavior.

**Pros:**
- Smaller change
- Preserves behavior composition

**Cons:**
- Still requires coordination mechanism
- Doesn't solve metric inheritance
- Band-aid on architectural issue

**Verdict:** ❌ Rejected - doesn't address fundamental problems.

### Alternative 4: Unified Behavior (CHOSEN)
**Approach:** Single LoopCoordinatorBehavior owns all loop state.

**Pros:**
- Single source of truth
- Clear ownership
- Easy to test
- Solves all identified problems
- Extensible to new loop types

**Cons:**
- More upfront refactoring
- Breaks existing behavior composition pattern

**Verdict:** ✅ **Selected** - best long-term solution.

## Risks

### Risk: Performance Regression
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:** Benchmark before/after, profile, optimize hot paths

### Risk: Breaking Other Block Types
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:** Feature flag, gradual rollout, comprehensive tests

### Risk: Incomplete Context Passing
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:** Type system, runtime validation, integration tests

### Risk: Event Consumers Break
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:** Maintain event shape, add new fields only, test Clock components

## Success Metrics

**Functional:**
- ✅ Fran workout executes correctly (7 next() calls)
- ✅ Rep inheritance works (21, 15, 9 visible in children)
- ✅ No premature completion
- ✅ Initial push works (no extra click)

**Performance:**
- ✅ State calculation < 0.1ms
- ✅ No memory leaks in 1000-round stress test
- ✅ Event emission < 0.01ms overhead

**Quality:**
- ✅ 95%+ test coverage
- ✅ All Storybook examples work
- ✅ No TypeScript errors introduced
- ✅ Documentation updated
