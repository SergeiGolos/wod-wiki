# Runtime Compilation Context Capability

**Capability ID**: `runtime-compilation-context`  
**Type**: New Capability  
**Status**: Draft

## Overview

Context-aware JIT compilation system that enables parent blocks to provide execution context (round, reps, timing) to child blocks during compilation. This capability defines the interfaces, patterns, and guarantees for passing contextual information through the compilation pipeline.

## ADDED Requirements

### Requirement: CompilationContext Interface Definition

The runtime MUST define a core CompilationContext interface that all blocks can use.

#### Scenario: Basic context interface structure

```
GIVEN the CompilationContext interface
THEN it includes the following properties:
  - round?: number (1-indexed current round for display)
  - totalRounds?: number (total rounds in parent loop)
  - position?: number (child group position, 0-indexed)
  - reps?: number (repetitions for current round)
  - intervalDurationMs?: number (interval length for EMOM)
  - parent?: CompilationContext (parent block's context for chaining)
```

#### Scenario: Context is immutable after creation

```
GIVEN a CompilationContext object created with { reps: 21 }
WHEN attempting to modify context.reps = 15
THEN the context remains unchanged (Object.freeze() or readonly types)
  AND TypeScript compiler prevents modification at compile time
```

#### Scenario: Context supports extension for specialized blocks

```
GIVEN a need for specialized context (e.g., AMRAPContext)
WHEN defining AMRAPContext interface
THEN it extends CompilationContext
  AND adds AMRAP-specific fields (timerExpired, currentRoundCount, etc.)
  AND remains compatible with base CompilationContext consumers
```

### Requirement: JIT Compiler Context Parameter

The JitCompiler.compile() method MUST accept an optional context parameter.

#### Scenario: Compiler method signature includes context

```
GIVEN the JitCompiler.compile() method signature
THEN it accepts:
  - statements: CodeStatement[] (required)
  - runtime: IScriptRuntime (required)
  - context?: CompilationContext (optional)
WHEN context is omitted
THEN it defaults to undefined
```

#### Scenario: Compiler passes context to strategy selection

```
GIVEN a JitCompiler compiling a statement with context
WHEN selecting the appropriate strategy
THEN context is available to strategy selection logic
  AND strategies can inspect context to determine compilation approach
```

#### Scenario: Compiler propagates context to all strategies

```
GIVEN a JitCompiler compiling multiple statements
  AND context is provided
WHEN each strategy.compile() is called
THEN all strategies receive the same context object
  AND context is not modified between strategy calls
```

### Requirement: Strategy Context Parameter

All runtime strategies MUST accept an optional CompilationContext parameter.

#### Scenario: Strategy compile signature includes context

```
GIVEN any runtime strategy (EffortStrategy, RoundsStrategy, etc.)
THEN its compile() method signature is:
  - compile(statement: CodeStatement, runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock
```

#### Scenario: Strategy accesses context fields safely

```
GIVEN a strategy compiling with context
WHEN accessing context.reps
THEN the strategy checks if reps exists before using
  AND uses optional chaining (context?.reps) or explicit undefined checks
```

#### Scenario: Strategy creates child context

```
GIVEN a RoundsStrategy compiling children
  AND receives parent context { round: 1 }
WHEN creating context for child compilation
THEN child context includes:
  - All parent context fields
  - Additional fields from current block (reps, etc.)
  - parent: reference to parent context
```

### Requirement: Context Creation in Loop Behaviors

Loop behaviors MUST create compilation context from current loop state.

#### Scenario: LoopCoordinatorBehavior creates context on next()

```
GIVEN a LoopCoordinatorBehavior with state { index: 2, position: 0, rounds: 1 }
  AND repScheme [21, 15, 9]
WHEN onNext() prepares to compile a child
THEN it creates CompilationContext:
  - round: 2 (rounds + 1, 1-indexed)
  - position: 0
  - totalRounds: 3
  - reps: 15 (repScheme[1])
```

#### Scenario: AMRAP behavior creates timer-aware context

```
GIVEN a TimeBoundLoopBehavior for "20:00 AMRAP"
  AND timer shows 5:30 elapsed
WHEN compiling a child
THEN context includes:
  - round: current round (may be high number)
  - totalRounds: undefined (infinite)
  - timerElapsed: 330000 (5:30 in ms)
  - timerRemaining: 870000 (14:30 in ms)
```

#### Scenario: EMOM behavior creates interval context

```
GIVEN an IntervalLoopBehavior with 60-second intervals
  AND currently on interval 5
WHEN compiling a child
THEN context includes:
  - interval: 5
  - intervalDurationMs: 60000
  - round: 5 (rounds align with intervals)
```

### Requirement: Context Passing Through Block Hierarchy

Context MUST flow from parent to child to grandchild maintaining a reference chain.

#### Scenario: Three-level context chain

```
GIVEN structure: RoundsBlock → TimerBlock → EffortBlock
  AND RoundsBlock context: { round: 2, reps: 15 }
  AND TimerBlock creates context: { duration: 1200, parent: RoundsBlock context }
  AND EffortBlock creates context: { effort: 'moderate', parent: TimerBlock context }
WHEN EffortBlock needs to know current round
THEN it accesses context.parent.parent.round = 2
```

#### Scenario: Context chain terminates at top level

```
GIVEN a top-level TimerBlock with no parent
WHEN creating its context
THEN context.parent = undefined
  AND any child trying to access context.parent safely handles undefined
```

### Requirement: Context Availability at Runtime

Compiled blocks MUST retain their compilation context for runtime access.

#### Scenario: Block stores context during construction

```
GIVEN an EffortBlock compiled with context { reps: 21, round: 1 }
WHEN the block constructor runs
THEN it stores context as a private field
  AND provides getContext() method to access it
```

#### Scenario: Block exposes context fields as properties

```
GIVEN an EffortBlock with context { reps: 21, round: 1 }
WHEN accessing block.reps
THEN it returns 21 (from context)
WHEN accessing block.round
THEN it returns 1 (from context)
```

#### Scenario: Block context remains immutable at runtime

```
GIVEN a block with stored context
WHEN runtime tries to modify context
THEN modifications are prevented (readonly or frozen object)
  AND block behavior remains consistent
```

### Requirement: Default Context Handling

The system MUST handle compilation without context gracefully.

#### Scenario: Top-level block compiles without context

```
GIVEN a JitCompiler compiling the root workout statement
WHEN context is not provided (undefined)
THEN compilation succeeds
  AND blocks use default values for missing context fields
```

#### Scenario: Strategy provides sensible defaults

```
GIVEN an EffortStrategy compiling without context
  AND statement has no RepFragment
WHEN determining reps
THEN strategy uses default: reps = 1
  OR reps = undefined if the block doesn't require reps
```

#### Scenario: Context-dependent blocks validate requirements

```
GIVEN a block type that requires context.reps
  AND context is undefined or reps is missing
WHEN strategy compiles
THEN it throws CompilationError: "RoundsBlock children require reps context"
  AND provides clear guidance on fixing the issue
```

### Requirement: Context Type Guards

The system MUST provide type guards for safely accessing context variants.

#### Scenario: Type guard for LoopContext

```
GIVEN a generic CompilationContext
WHEN checking if it's a LoopContext
THEN a type guard function isLoopContext(context) returns boolean
  AND TypeScript narrows the type if true
```

#### Scenario: Type guard for TimerContext

```
GIVEN a CompilationContext that might be TimerContext
WHEN using isTimerContext(context) type guard
THEN it checks for timer-specific fields (duration, elapsed, etc.)
  AND narrows type for safe access to timer fields
```

### Requirement: Context Serialization

Context objects MUST be serializable for debugging and persistence.

#### Scenario: Context converts to JSON

```
GIVEN a CompilationContext with all fields populated
WHEN calling JSON.stringify(context)
THEN it produces valid JSON string
  AND excludes parent references (to avoid circular refs)
```

#### Scenario: Context includes toJSON method

```
GIVEN a CompilationContext with parent chain
WHEN serializing to JSON
THEN context.toJSON() is called
  AND returns flattened representation without circular references
  AND includes parentDepth or parentIds for reconstruction
```

### Requirement: Performance Constraints

Context creation and passing MUST not degrade compilation performance.

#### Scenario: Context creation under 0.1ms

```
GIVEN a LoopCoordinatorBehavior creating context
WHEN measuring context object creation time
THEN it takes < 0.1ms
  AND meets the overall compilation performance budget
```

#### Scenario: Context passing adds minimal overhead

```
GIVEN a JitCompiler compiling with context
WHEN comparing to compilation without context
THEN context passing adds < 5% overhead
  AND overall compilation still meets < 1ms target
```

#### Scenario: Context objects are lightweight

```
GIVEN a CompilationContext object
WHEN measuring memory footprint
THEN it uses < 1KB per context
  AND context objects are efficiently garbage collected
```

### Requirement: Development Mode Debugging

Context MUST be inspectable in development mode for debugging compilation issues.

#### Scenario: Context includes debug metadata

```
GIVEN a CompilationContext created in development mode
WHEN inspecting the context
THEN it includes:
  - createdBy: name of block that created it
  - createdAt: timestamp
  - statementId: ID of statement being compiled
```

#### Scenario: Context validation in development

```
GIVEN a strategy receiving context in development mode
WHEN context has unexpected shape or missing required fields
THEN a detailed warning is logged to console
  AND includes context path, expected fields, and received fields
```

#### Scenario: Context chain visualization

```
GIVEN a nested context with 3-level parent chain
WHEN calling context.debugChain() in development mode
THEN it returns string representation:
  "EffortBlock → TimerBlock → RoundsBlock"
  AND shows key fields at each level
```

### Requirement: Backward Compatibility

The context system MUST not break existing compilation paths.

#### Scenario: Existing strategies compile without context

```
GIVEN an existing EffortStrategy implementation
WHEN called with compile(statement, runtime) (no context)
THEN it compiles successfully using default behavior
  AND maintains backward compatibility with existing code
```

#### Scenario: Gradual adoption of context

```
GIVEN a mixed codebase with some strategies context-aware
  AND some strategies context-unaware
WHEN compiling a complex workout
THEN context-aware strategies use context
  AND context-unaware strategies use defaults
  AND compilation succeeds end-to-end
```

### Requirement: Error Messages

Context-related compilation errors MUST provide clear, actionable messages.

#### Scenario: Missing required context field error

```
GIVEN a strategy that requires context.reps
  AND context is provided without reps
WHEN compilation fails
THEN error message includes:
  - "Missing required context field: reps"
  - "Context provided: { round: 1, position: 0 }"
  - "Required by: EffortStrategy for statement 'Thrusters'"
  - "Parent block: RoundsBlock should provide reps via repScheme"
```

#### Scenario: Invalid context type error

```
GIVEN a strategy expecting LoopContext
  AND receives basic CompilationContext
WHEN type checking fails
THEN error message includes:
  - "Invalid context type: expected LoopContext"
  - "Received: CompilationContext"
  - "Missing required fields: [list of missing fields]"
```
