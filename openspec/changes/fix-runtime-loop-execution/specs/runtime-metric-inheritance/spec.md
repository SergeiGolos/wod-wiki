# Runtime Metric Inheritance Capability

**Capability ID**: `runtime-metric-inheritance`  
**Type**: New Capability  
**Status**: Draft

## Overview

Parent-to-child context passing system that enables workout metrics (reps, rounds, timing) to flow from parent blocks down to child blocks during compilation. Solves the problem where rep schemes like "(21-15-9)" exist in parent RoundsBlocks but never reach child EffortBlocks.

## ADDED Requirements

### Requirement: Compilation Context Interface

The runtime MUST define a strongly-typed compilation context structure for passing metrics between blocks.

#### Scenario: Context includes round information

```
GIVEN a CompilationContext being created for round 2 of 3
THEN context includes:
  - round: 2 (1-indexed for display)
  - totalRounds: 3
```

#### Scenario: Context includes repetition information

```
GIVEN a RoundsBlock with repScheme [21, 15, 9] on round 0 (first round)
WHEN creating CompilationContext for a child
THEN context includes:
  - reps: 21 (from repScheme[0])
```

#### Scenario: Context includes position information

```
GIVEN a loop advancing to the second child group (position 1)
WHEN creating CompilationContext
THEN context includes:
  - position: 1
```

#### Scenario: Context includes timing information for intervals

```
GIVEN an EMOM block with 60-second intervals
WHEN creating CompilationContext for interval 5
THEN context includes:
  - intervalDurationMs: 60000
  - interval: 5
```

#### Scenario: Context supports chaining for nested blocks

```
GIVEN a nested structure: RoundsBlock → TimerBlock → EffortBlock
WHEN EffortBlock receives context
THEN context.parent points to TimerBlock's context
  AND context.parent.parent points to RoundsBlock's context
  AND child can traverse entire context chain
```

### Requirement: JIT Compiler Context Passing

The JIT compiler MUST accept and propagate compilation context through all compilation operations.

#### Scenario: Compiler accepts optional context parameter

```
GIVEN a JitCompiler instance
WHEN calling compile(statements, runtime, context)
THEN the context parameter is optional
  AND defaults to undefined for top-level blocks
  AND is passed to strategy.compile() calls
```

#### Scenario: Compiler passes context to strategies

```
GIVEN a JitCompiler compiling an EffortBlock
  AND context includes { reps: 21, round: 1 }
WHEN calling EffortStrategy.compile(statement, runtime, context)
THEN EffortStrategy receives the full context object
```

#### Scenario: Compiler handles missing context gracefully

```
GIVEN a JitCompiler compiling a block without context
WHEN context is undefined
THEN strategies receive undefined context
  AND use default values for missing metrics
```

### Requirement: Strategy Context Consumption

All runtime strategies MUST accept compilation context and use it to configure block properties.

#### Scenario: EffortStrategy inherits reps from context

```
GIVEN an EffortStrategy compiling "Thrusters"
  AND statement has no RepFragment
  AND context includes { reps: 21 }
WHEN creating the EffortBlock
THEN block.reps = 21 (inherited from context)
```

#### Scenario: EffortStrategy prefers local reps over context

```
GIVEN an EffortStrategy compiling "5 Thrusters"
  AND statement has RepFragment with count = 5
  AND context includes { reps: 21 }
WHEN creating the EffortBlock
THEN block.reps = 5 (local fragment takes precedence over inherited context)
```

#### Scenario: RoundsStrategy creates child context

```
GIVEN a RoundsStrategy compiling a RoundsBlock with repScheme [21, 15, 9]
WHEN compiling children during round 1
THEN child context includes:
  - reps: 15 (from repScheme[1])
  - round: 2 (1-indexed)
  - parent: parent context
```

#### Scenario: TimerStrategy passes through parent context

```
GIVEN a TimerStrategy compiling a TimerBlock
  AND parent context includes { round: 2, totalRounds: 3 }
WHEN compiling timer's children
THEN child context includes parent context values
  AND adds timer-specific metrics (duration, elapsed, etc.)
```

### Requirement: Runtime Block Context Access

Runtime blocks MUST expose methods to access their compilation context at runtime.

#### Scenario: Block provides getContext() method

```
GIVEN an EffortBlock compiled with context { reps: 21, round: 1 }
WHEN calling block.getContext()
THEN it returns the original compilation context
```

#### Scenario: Block provides convenience accessors

```
GIVEN an EffortBlock with context { reps: 21, round: 1, totalRounds: 3 }
WHEN accessing block properties
THEN block.reps returns 21
  AND block.round returns 1
  AND block.totalRounds returns 3
```

#### Scenario: Block context is immutable

```
GIVEN an EffortBlock with context { reps: 21 }
WHEN attempting to modify context.reps = 15
THEN the modification has no effect (context is frozen)
  OR an error is thrown (strict mode)
```

### Requirement: Rep Scheme Inheritance

Rep schemes defined in RoundsBlocks MUST propagate to child EffortBlocks without explicit repetition fragments.

#### Scenario: Fran workout rep inheritance

```
GIVEN a workout "(21-15-9) Thrusters, Pullups"
WHEN compiling "Thrusters" during round 1
THEN Thrusters EffortBlock has reps = 21
WHEN compiling "Pullups" during round 1
THEN Pullups EffortBlock has reps = 21
WHEN compiling "Thrusters" during round 2
THEN Thrusters EffortBlock has reps = 15
WHEN compiling "Pullups" during round 2
THEN Pullups EffortBlock has reps = 15
WHEN compiling "Thrusters" during round 3
THEN Thrusters EffortBlock has reps = 9
```

#### Scenario: Rep scheme with explicit overrides

```
GIVEN a workout "(21-15-9) Thrusters, 10 Pullups"
WHEN compiling during round 1
THEN Thrusters has reps = 21 (inherited)
  AND Pullups has reps = 10 (explicit fragment overrides inheritance)
```

#### Scenario: Missing rep scheme defaults

```
GIVEN a workout "(3) Thrusters" with no rep scheme
  AND "Thrusters" has no RepFragment
WHEN compiling children
THEN Thrusters has reps = 1 (default fallback)
  OR reps = undefined if the block type doesn't require reps
```

### Requirement: Context Chain Traversal

Blocks MUST be able to traverse the context chain to access ancestor context values.

#### Scenario: Child accesses grandparent context

```
GIVEN a nested structure: RoundsBlock → TimerBlock → EffortBlock
  AND RoundsBlock context has { round: 2, reps: 15 }
  AND TimerBlock context has { duration: 1200, parent: RoundsBlock context }
WHEN EffortBlock needs to know current round
THEN it traverses context.parent.parent to find round = 2
```

#### Scenario: Context chain ends at top-level

```
GIVEN a top-level block with no parent
WHEN accessing context.parent
THEN context.parent is undefined
  AND traversal stops
```

### Requirement: Memory Efficiency

Context passing MUST NOT create memory leaks or excessive allocations during long workouts.

#### Scenario: Context objects are reused across rounds

```
GIVEN a 100-round workout
WHEN compiling children for each round
THEN context objects are created once per child type
  AND updated with current values (not duplicated 100 times)
  OR context objects are small and GC-friendly
```

#### Scenario: Parent references don't prevent garbage collection

```
GIVEN a child block with context.parent reference
WHEN the parent block is disposed
THEN parent context can be garbage collected
  AND child context.parent becomes undefined or safe reference
```

### Requirement: Type Safety

Compilation context MUST be strongly typed to prevent runtime errors.

#### Scenario: TypeScript enforces context shape

```
GIVEN a CompilationContext interface with defined properties
WHEN creating context objects
THEN TypeScript validates all property types at compile time
  AND IDEs provide autocomplete for context properties
```

#### Scenario: Optional context properties are nullable

```
GIVEN a CompilationContext with optional reps property
WHEN reps is undefined
THEN TypeScript allows reps?: number
  AND consumer code must handle undefined case
```

#### Scenario: Context type narrows based on block type

```
GIVEN a LoopContext extends CompilationContext with loop-specific properties
WHEN a LoopCoordinatorBehavior creates context
THEN context is typed as LoopContext
  AND has access to loop-specific properties with type safety
```

### Requirement: Error Handling for Missing Context

Strategies MUST handle missing or incomplete context gracefully without crashing.

#### Scenario: Strategy uses default when context missing

```
GIVEN an EffortStrategy compiling without context
  AND statement has no RepFragment
WHEN creating EffortBlock
THEN reps defaults to 1 (or appropriate default)
  AND no error is thrown
```

#### Scenario: Strategy validates required context fields

```
GIVEN a strategy that requires context.reps
  AND context is provided but reps is undefined
WHEN strategy checks for required fields
THEN it throws a clear error: "Missing required context field: reps"
  OR uses a safe default with a warning
```

#### Scenario: Runtime warns about unexpected context usage

```
GIVEN a block type that doesn't typically use context
  AND context is provided during compilation
WHEN block is created
THEN a development-mode warning is logged
  AND context is safely ignored
```

### Requirement: Testing and Validation

The context passing system MUST be testable in isolation and integration.

#### Scenario: Unit test context creation

```
GIVEN a test creating CompilationContext manually
WHEN passing it to a strategy
THEN the strategy correctly uses context values
  AND tests can verify inheritance without full runtime
```

#### Scenario: Integration test validates full flow

```
GIVEN a full workout script "(21-15-9) Thrusters, Pullups"
WHEN parsing, compiling, and executing
THEN integration tests verify:
  - Context is created by RoundsBlock
  - Context is passed to JitCompiler
  - Context reaches EffortBlock
  - Reps are correctly inherited (21, 15, 9)
```

#### Scenario: Mock context for strategy testing

```
GIVEN a unit test for EffortStrategy
WHEN providing mock context { reps: 99 }
THEN test can verify strategy behavior without creating full runtime
```
