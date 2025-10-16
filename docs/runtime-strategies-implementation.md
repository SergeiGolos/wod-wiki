# Runtime Strategies Implementation

## Overview

This document describes the implementation of three new runtime strategies for the WOD.Wiki platform to support EMOM (Every Minute On the Minute), AMRAP (As Many Rounds As Possible), and grouped/nested exercise workouts.

## Problem Statement

The original WOD.Wiki runtime engine had only three strategies:
- `EffortStrategy` - Simple repetition-based efforts
- `TimerStrategy` - Simple time-based workouts  
- `RoundsStrategy` - Fixed number of rounds

This left several common workout types unsupported, despite the infrastructure (like `LoopType.INTERVAL` and `LoopType.TIME_BOUND`) already existing in the codebase.

## Solution

Three new strategies were implemented to fill these gaps:

### 1. IntervalStrategy (EMOM Workouts)

**Purpose:** Support interval-based workouts where exercises are performed at the start of each time interval.

**Matching Logic:**
- Matches statements with BOTH a `Timer` fragment AND an `Action` fragment containing "EMOM"
- Example syntax: `EMOM 10` or `every 1 minute for 10 minutes`

**Compilation (Planned):**
```typescript
// Will extract:
// - Interval duration from Timer fragment (e.g., 60000ms)
// - Total intervals from Rounds or inferred from context
// - Child exercises to execute each interval

// Will create:
// RuntimeBlock with LoopCoordinatorBehavior
// - loopType: LoopType.INTERVAL
// - intervalDurationMs: extracted duration
// - totalRounds: number of intervals
// - childGroups: exercise statements
```

**Current Status:** Match logic complete, placeholder compile() implementation

### 2. TimeBoundRoundsStrategy (AMRAP Workouts)

**Purpose:** Support time-bound workouts where the athlete performs as many rounds as possible within a time limit.

**Matching Logic:**
- Matches statements with a `Timer` fragment AND either:
  - A `Rounds` fragment, OR
  - An `Action` fragment containing "AMRAP"
- Example syntax: `20:00 AMRAP` or `AMRAP 20`

**Compilation (Planned):**
```typescript
// Will extract:
// - Timer duration from Timer fragment (e.g., 1200000ms for 20:00)
// - Child exercises to loop through

// Will create:
// TimerBlock (countdown) wrapping a RoundsBlock
// - TimerBlock: direction='down', durationMs=extracted
// - RoundsBlock: loopType=LoopType.TIME_BOUND, infinite rounds
// - Completion: when timer expires
```

**Current Status:** Match logic complete, placeholder compile() implementation

### 3. GroupStrategy (Nested/Grouped Exercises)

**Purpose:** Support hierarchical workout structures where exercises or blocks are nested within parent groups.

**Matching Logic:**
- Matches statements that have child statements (nested structure)
- Example syntax: `(3 rounds)\n  (2 rounds)\n    5 Pullups`

**Compilation (Planned):**
```typescript
// Will extract:
// - Child statements from code[0].children

// Will create:
// Container RuntimeBlock with LoopCoordinatorBehavior
// - blockType: "Group"
// - loopType: LoopType.FIXED, totalRounds=1 (execute once)
// - childGroups: extracted child statements
// - Manages hierarchical execution
```

**Current Status:** Match logic complete, placeholder compile() implementation

## Strategy Precedence

The strategies are registered in order of specificity (most specific first):

```
1. TimeBoundRoundsStrategy  (Timer + Rounds/AMRAP)
2. IntervalStrategy         (Timer + EMOM)
3. TimerStrategy            (Timer only)
4. RoundsStrategy           (Rounds only)
5. GroupStrategy            (Has children)
6. EffortStrategy           (Fallback - everything else)
```

This ensures that compound workout types (like AMRAP) are recognized before their component parts (Timer or Rounds alone).

## Test Coverage

**Unit Tests (16 new tests):**
- TSC-010: IntervalStrategy matching with Timer + EMOM
- TSC-011: TimeBoundRoundsStrategy matching with Timer + Rounds/AMRAP  
- TSC-012: GroupStrategy matching with child statements
- Edge cases: empty statements, missing fragments, etc.

**Integration Tests (4 new tests):**
- TSP-010: TimeBoundRoundsStrategy precedence over TimerStrategy
- TSP-011: IntervalStrategy precedence over TimerStrategy
- TSP-012: GroupStrategy precedence and behavior with nested structures
- Multiple compilation consistency checks

**Result:** All 47 tests passing, no regressions in existing tests

## Architecture Decisions

### Why Placeholder Implementations?

The strategies use placeholder compile() implementations that return valid RuntimeBlocks but don't fully implement the execution logic. This was done to:

1. **Establish the Pattern:** Demonstrate the strategy pattern and matching logic works correctly
2. **Enable Testing:** Allow comprehensive testing of the matching and precedence behavior
3. **Document Requirements:** Each placeholder includes detailed TODOs for full implementation
4. **Maintain Stability:** Avoid breaking changes while infrastructure is validated

### Leveraging Existing Infrastructure

The new strategies build on existing runtime components:

- **LoopCoordinatorBehavior:** Already supports `LoopType.INTERVAL` and `LoopType.TIME_BOUND`
- **TimerBlock:** Can wrap child blocks (though TODO comment exists)
- **RoundsBlock:** Can use `LoopType.TIME_BOUND` for infinite rounds
- **CompilationContext:** Supports `intervalDurationMs` for passing interval data to children

### Future Implementation Path

Each strategy includes detailed TODO comments documenting:
1. Fragment value extraction patterns
2. Child statement resolution approach
3. Block construction and configuration
4. Behavior and event patterns
5. Completion logic

Example from IntervalStrategy:
```typescript
// TODO: Full compile() implementation requires:
// 1. Extract interval duration from Timer fragment (e.g., 60000ms from "1:00")
// 2. Extract total intervals from Rounds fragment or Action value
// 3. Extract child statements from code[0].children
// 4. Create LoopCoordinatorBehavior with:
//    - loopType: LoopType.INTERVAL
//    - childGroups: [childStatements]
//    - totalRounds: totalIntervals
//    - intervalDurationMs: intervalDuration
// 5. Create RuntimeBlock with the loop coordinator behavior
// 6. Block should emit interval:start and interval:complete events
```

## Integration

The new strategies are registered in the JitCompilerDemo:

```typescript
const jitCompiler = new JitCompiler([]);

// Register strategies in precedence order
jitCompiler.registerStrategy(new TimeBoundRoundsStrategy());
jitCompiler.registerStrategy(new IntervalStrategy());
jitCompiler.registerStrategy(new TimerStrategy());
jitCompiler.registerStrategy(new RoundsStrategy());
jitCompiler.registerStrategy(new GroupStrategy());
jitCompiler.registerStrategy(new EffortStrategy());
```

This makes the strategies available throughout the runtime system wherever a JitCompiler is used.

## Benefits

1. **Extensibility:** New workout types can be added by creating new strategies
2. **Maintainability:** Each strategy encapsulates its own matching and compilation logic
3. **Testability:** Strategies can be tested independently
4. **Type Safety:** TypeScript ensures all strategies implement IRuntimeBlockStrategy
5. **Documentation:** Each strategy serves as documentation for its workout type

## Next Steps

To complete the implementation:

1. **Implement Fragment Extraction:** Create utilities to extract values from Timer, Rounds, and Action fragments
2. **Child Statement Resolution:** Implement logic to convert child IDs to actual CodeStatement objects
3. **Full Compilation:** Implement the compile() methods according to the documented TODOs
4. **Block Composition:** Create proper block hierarchies (e.g., TimerBlock wrapping RoundsBlock)
5. **Event Emission:** Add proper event emission for interval:start, interval:complete, etc.
6. **Testing:** Add execution tests that verify blocks run correctly with real workouts
7. **Storybook Examples:** Create stories demonstrating EMOM, AMRAP, and grouped workouts

## References

- [LoopCoordinatorBehavior](/src/runtime/behaviors/LoopCoordinatorBehavior.ts) - Loop execution behavior
- [TimerBlock](/src/runtime/blocks/TimerBlock.ts) - Timer block implementation
- [RoundsBlock](/src/runtime/blocks/RoundsBlock.ts) - Rounds block implementation
- [CompilationContext](/src/runtime/CompilationContext.ts) - Context passed to child blocks
- [Strategy Tests](/src/runtime/strategies.test.ts) - Unit tests for strategy matching
- [Precedence Tests](/src/runtime/jit-compiler-precedence.test.ts) - Integration tests

## Contributing

When extending the strategies:

1. Follow the existing pattern: match() for recognition, compile() for block creation
2. Add comprehensive tests for both matching and compilation
3. Document the workout syntax and expected behavior
4. Consider precedence - more specific strategies should be registered first
5. Use existing blocks (TimerBlock, RoundsBlock) where possible
6. Leverage LoopCoordinatorBehavior for child management
