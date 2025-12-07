# Runtime Block Looping Behavior Deep Dive

## Overview

This document provides a comprehensive analysis of how runtime blocks handle looping in the Wod.Wiki execution engine. It covers:

1. **LoopCoordinatorBehavior**: The central behavior managing loop execution
2. **Compilation Flow**: How statements become runtime blocks with proper round/index awareness
3. **JIT Compilation**: How child blocks are compiled on-demand with inherited metrics
4. **Memory Inheritance**: How parent blocks pass metrics to children via visibility patterns

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPILATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌───────────────────────┐   │
│  │ CodeStatement│ ──▶ │  JitCompiler │ ──▶ │    Strategy Match     │   │
│  │ (from parser)│     │              │     │ (Rounds/Interval/etc) │   │
│  └──────────────┘     └──────────────┘     └───────────────────────┘   │
│         │                                            │                  │
│         │ children: number[][]                       ▼                  │
│         │ (e.g., [[1,2], [3]])          ┌───────────────────────────┐  │
│         │                               │      RuntimeBlock         │  │
│         └─────────────────────────────▶ │  + LoopCoordinatorBehavior│  │
│                                         │  + childGroups config     │  │
│                                         └───────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      RUNTIME EXECUTION FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  index = -1 ─────┐                                                      │
│                  ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   onPush / onNext                                │   │
│  │  ┌───────────────┐                                               │   │
│  │  │ advance()     │                                               │   │
│  │  │ index++       │ index=0 → position=0, rounds=0               │   │
│  │  │ getState()    │ index=1 → position=1, rounds=0               │   │
│  │  └───────────────┘ index=2 → position=0, rounds=1 (new round!)  │   │
│  │         │                                                        │   │
│  │         ▼                                                        │   │
│  │  ┌───────────────┐                                               │   │
│  │  │ isComplete()?│ ◀── Check if rounds >= totalRounds            │   │
│  │  └───────────────┘                                               │   │
│  │         │ No                                                     │   │
│  │         ▼                                                        │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │ JIT Compile Child Group                                    │  │   │
│  │  │                                                            │  │   │
│  │  │  childGroupIds = childGroups[position]                     │  │   │
│  │  │  statements = script.getIds(childGroupIds)                 │  │   │
│  │  │  compiledBlock = runtime.jit.compile(statements, runtime)  │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │         │                                                        │   │
│  │         ▼                                                        │   │
│  │  ┌───────────────────┐                                          │   │
│  │  │ PushBlockAction   │ → Child block executes on stack          │   │
│  │  └───────────────────┘                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. CodeStatement.children Structure

The parser produces statements with a `children: number[][]` property that defines groups of child statement IDs:

```typescript
// From src/core/models/CodeStatement.ts
export interface ICodeStatement {  
  id: number;
  parent?: number;
  children: number[][];  // 2D array: [[group1_ids], [group2_ids], ...]
  fragments: ICodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
  hints?: Set<string>;
}
```

**Why 2D Array?**  
Each inner array represents a group of statements that should be compiled and executed together. For example:

```
3 Rounds:            // Statement ID: 1
  10 Pushups         // Statement ID: 2
  10 Squats          // Statement ID: 3
```

Would produce:
```typescript
{
  id: 1,
  children: [[2, 3]],  // One group containing both exercises
  fragments: [RoundsFragment(3)]
}
```

For more complex patterns like rep schemes:
```
21-15-9:             // Statement ID: 1
  Thrusters          // Statement ID: 2
  Pullups            // Statement ID: 3
```

Would produce:
```typescript
{
  id: 1,
  children: [[2, 3]],  // Same structure, but rounds info in fragments
  fragments: [RoundsFragment([21, 15, 9])]
}
```

---

### 2. LoopCoordinatorBehavior

The `LoopCoordinatorBehavior` (defined in `src/runtime/behaviors/LoopCoordinatorBehavior.ts`) is the central component managing loop execution.

#### Configuration (LoopConfig)

```typescript
export interface LoopConfig {
  // Array of child statement ID groups to execute per position
  // Each number[] = statement IDs to JIT-compile together
  childGroups: number[][];
  
  // Type of loop: FIXED, REP_SCHEME, TIME_BOUND, INTERVAL
  loopType: LoopType;
  
  // Total rounds (for FIXED and REP_SCHEME)
  totalRounds?: number;
  
  // Variable reps per round (for REP_SCHEME, e.g., [21, 15, 9])
  repScheme?: number[];
  
  // Interval duration in ms (for INTERVAL/EMOM)
  intervalDurationMs?: number;
  
  // Callback for custom round-start logic
  onRoundStart?: (runtime: IScriptRuntime, roundIndex: number) => void;
}
```

#### Loop State Tracking

```typescript
export interface LoopState {
  // Total next() calls (increments every advancement)
  index: number;
  
  // Current position within childGroups: index % childGroups.length
  position: number;
  
  // Completed rounds: Math.floor(index / childGroups.length)
  rounds: number;
}
```

#### State Calculation Logic

The relationship between `index`, `position`, and `rounds` is elegantly computed:

```typescript
getState(): LoopState {
  const position = this.index % this.config.childGroups.length;
  const rounds = Math.floor(this.index / this.config.childGroups.length);

  return {
    index: this.index,
    position,
    rounds,
  };
}
```

**Example walkthrough** for a 3-round workout with 2 exercises per round:
- `childGroups: [[2, 3]]` (one group per round)
- `totalRounds: 3`

| index | position | rounds | Action                          |
|-------|----------|--------|---------------------------------|
| -1    | -        | -      | Initial state (before onPush)   |
| 0     | 0        | 0      | Round 1 starts, compile [2,3]   |
| 1     | 0        | 1      | Round 2 starts, compile [2,3]   |
| 2     | 0        | 2      | Round 3 starts, compile [2,3]   |
| 3     | 0        | 3      | isComplete() → true, stop       |

---

### 3. JIT Compilation Flow

When `LoopCoordinatorBehavior.advance()` is called, it triggers just-in-time compilation:

```typescript
private advance(runtime: IScriptRuntime, block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
  this.index++;
  const state = this.getState();

  // Check completion
  if (this.isComplete(runtime, block)) {
    return [];
  }

  // Get child IDs for current position
  const childGroupIds = this.config.childGroups[state.position];
  
  // Resolve IDs to statements from the parsed script
  const childStatements = runtime.script.getIds(childGroupIds);
  
  // JIT compile into a RuntimeBlock
  const compiledBlock = runtime.jit.compile(childStatements, runtime);
  
  // Push the compiled block onto the stack
  return [new PushBlockAction(compiledBlock, { startTime })];
}
```

The `JitCompiler` (in `src/runtime/JitCompiler.ts`) iterates through registered strategies to find a match:

```typescript
compile(nodes: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
  // Process through dialect registry for semantic hints
  this.dialectRegistry.processAll(nodes);

  // Find matching strategy
  for (const strategy of this.strategies) {
    if (strategy.match(nodes, runtime)) {
      return strategy.compile(nodes, runtime);
    }
  }
  return undefined;
}
```

---

### 4. Strategy Compilation

Each strategy (e.g., `RoundsStrategy`, `IntervalStrategy`, `EffortStrategy`) handles specific statement patterns.

#### RoundsStrategy Example

From `src/runtime/strategies/RoundsStrategy.ts`:

```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
  // Extract rounds configuration
  const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);
  
  // Handle rep schemes like [21, 15, 9]
  let totalRounds = 1;
  let repScheme: number[] | undefined;

  if (Array.isArray(roundsFragment.value)) {
    repScheme = roundsFragment.value as number[];
    totalRounds = repScheme.length;
  } else {
    totalRounds = roundsFragment.value;
  }

  // Get children IDs from the statement
  let children = code[0]?.children || [];

  // Create LoopCoordinatorBehavior with the configuration
  const loopCoordinator = new LoopCoordinatorBehavior({
    childGroups: children,
    loopType: repScheme ? LoopType.REP_SCHEME : LoopType.FIXED,
    totalRounds,
    repScheme,
    onRoundStart: (rt, roundIndex) => {
      // Update inherited metrics for children
      if (repScheme) {
        const schemeIndex = roundIndex % repScheme.length;
        const currentReps = repScheme[schemeIndex];
        // Update memory so children inherit the current reps
        rt.memory.set(repsRef, currentReps);
      }
    }
  });

  return new RuntimeBlock(runtime, sourceIds, behaviors, context, ...);
}
```

---

### 5. Memory-Based Metric Inheritance

The compiler uses a memory visibility system for metric inheritance rather than a compilation context. This is crucial for fragments to receive the correct rep count per round.

#### Visibility Levels

From `src/runtime/IMemoryReference.ts`:

```typescript
visibility: 'public' | 'private' | 'inherited'
```

- **`public`**: Visible to all blocks (e.g., display state)
- **`private`**: Only visible to the owning block
- **`inherited`**: Visible to child blocks for metric inheritance

#### Parent Block: Allocating Inherited Metrics

When `RoundsStrategy` compiles a rep-scheme block, it allocates inherited metrics:

```typescript
// Allocate public reps metric if rep scheme
if (repScheme && repScheme.length > 0) {
  context.allocate(
    MemoryTypeEnum.METRIC_REPS,
    repScheme[0],  // Initial value: first round's reps
    'inherited'    // Children can search and find this
  );
}
```

#### Child Block: Consuming Inherited Metrics

`EffortStrategy` demonstrates how child blocks consume inherited values:

```typescript
// If no explicit reps, check for inherited reps from parent blocks
if (reps === undefined) {
  const inheritedRepsRefs = runtime.memory.search({
    type: MemoryTypeEnum.METRIC_REPS,
    visibility: 'inherited',
    id: null,       // Match any ID
    ownerId: null   // Match any owner
  });

  if (inheritedRepsRefs.length > 0) {
    // Use the most recent inherited reps metric
    const latestRepsRef = inheritedRepsRefs[inheritedRepsRefs.length - 1];
    const inheritedReps = runtime.memory.get(latestRepsRef);
    reps = inheritedReps as number;
  }
}
```

#### Round Start: Updating Inherited Values

When a new round starts, `onRoundStart` callback updates the inherited metric:

```typescript
onRoundStart: (rt, roundIndex) => {
  if (repScheme && repScheme.length > 0) {
    // Use modulo to cycle through rep scheme
    const schemeIndex = roundIndex % repScheme.length;
    const currentReps = repScheme[schemeIndex];
    
    // Update the memory reference
    const refs = rt.memory.search({
      type: MemoryTypeEnum.METRIC_REPS,
      ownerId: blockId,
      visibility: 'inherited'
    });
    
    if (refs.length > 0) {
      rt.memory.set(refs[0], currentReps);
    }
  }
}
```

---

## Loop Types

### LoopType.FIXED
Fixed number of rounds, each with the same structure.

```typescript
{
  childGroups: [[childIds]],
  loopType: LoopType.FIXED,
  totalRounds: 3
}
```

**Completion**: `state.rounds >= totalRounds`

### LoopType.REP_SCHEME
Variable reps per round (e.g., 21-15-9).

```typescript
{
  childGroups: [[childIds]],
  loopType: LoopType.REP_SCHEME,
  totalRounds: 3,
  repScheme: [21, 15, 9]
}
```

**Rep Cycling**: `repScheme[roundIndex % repScheme.length]`

### LoopType.TIME_BOUND
Loop until timer expires (AMRAP).

```typescript
{
  childGroups: [[childIds]],
  loopType: LoopType.TIME_BOUND
}
```

**Completion**: When `TimerBehavior.isComplete()` returns true.

### LoopType.INTERVAL
Fixed intervals with timer resets (EMOM).

```typescript
{
  childGroups: [[childIds]],
  loopType: LoopType.INTERVAL,
  totalRounds: 10,
  intervalDurationMs: 60000
}
```

**Special Logic**:
- Waits for interval timer to complete before advancing
- Restarts timer on each round

---

## Execution Span Tracking

The `LoopCoordinatorBehavior` creates execution spans to track round progress:

```typescript
private emitRoundChanged(runtime: IScriptRuntime, rounds: number, block: IRuntimeBlock): void {
  // Close previous round span
  if (prevRound > 0) {
    const span = runtime.memory.get(prevRoundRef);
    if (span?.status === 'active') {
      runtime.memory.set(prevRoundRef, { ...span, endTime: Date.now(), status: 'completed' });
    }
  }

  // Create new round span
  const span: ExecutionSpan = {
    id: `${startTime}-${newRoundOwnerId}`,
    blockId: newRoundOwnerId,
    parentSpanId: blockId,
    type: loopType === LoopType.INTERVAL ? 'interval' : 'round',
    label: `Round ${nextRound}`,
    startTime: startTime,
    status: 'active',
    metrics: {
      currentRound: nextRound,
      totalRounds: this.config.totalRounds,
      repScheme: this.config.repScheme,
      targetReps: repScheme?.[rounds % repScheme.length]
    }
  };
  
  runtime.memory.allocate(EXECUTION_SPAN_TYPE, newRoundOwnerId, span, 'public');
}
```

---

## Fragment Assignment Flow

The complete flow from parser to fragment display:

```
1. PARSE
   "3 Rounds:\n  10 Pushups" 
   → CodeStatement { id: 1, children: [[2]], fragments: [RoundsFragment(3)] }
   → CodeStatement { id: 2, fragments: [RepFragment(10), EffortFragment("Pushups")] }

2. STRATEGY MATCH
   RoundsStrategy.match() → true (has RoundsFragment)
   
3. COMPILE PARENT
   RoundsStrategy.compile():
   - Creates LoopCoordinatorBehavior({ childGroups: [[2]], totalRounds: 3 })
   - Returns RuntimeBlock with looping capability

4. PUSH PARENT
   RuntimeStack.push(parentBlock)
   → mount() → onPush() → LoopCoordinatorBehavior.onPush()

5. JIT COMPILE CHILD (per round)
   LoopCoordinatorBehavior.advance():
   - index++ (0, 1, 2)
   - state = getState() → { index, position: 0, rounds: 0/1/2 }
   - emitRoundChanged() → Updates inherited metrics if repScheme
   - childStatements = script.getIds([2])
   - compiledChild = jit.compile(childStatements)
   - return PushBlockAction(compiledChild)

6. FRAGMENT COMPILATION
   FragmentCompilationManager.compileStatementFragments():
   - Iterates through statement.fragments
   - Each compiler converts fragment to MetricValue
   - Returns RuntimeMetric with all compiled values

7. DISPLAY
   RuntimeBlock.compiledMetrics → UI components render fragments
```

---

## Key Insights

### Why JIT Compilation?

1. **Memory Efficiency**: Child blocks are created on-demand, not all at once
2. **Dynamic Metrics**: Each compilation reads current inherited values
3. **Flexibility**: The same child statements can be compiled differently per round

### Why `children: number[][]`?

1. **Grouping**: Multiple statements can be compiled together as one block
2. **Sequencing**: Different groups execute in order within each round
3. **Flexibility**: Parser can express complex workout structures

### Why Memory-Based Inheritance?

1. **Decoupling**: Children don't need direct parent references
2. **Dynamic Updates**: Parent can update values between rounds
3. **Search-Based**: Strategies query memory rather than passing parameters

---

## Testing Loop Behavior

The `SetLoopIndexAction` (in `src/runtime/testing/actions/SetLoopIndexAction.ts`) allows test scenarios to set specific loop states:

```typescript
// Jump to round 2 of 3
new SetLoopIndexAction({
  blockKey: 'rounds-block-key',
  currentIndex: 2,
  totalIterations: 3
});
```

This enables testing mid-execution scenarios without running through all preceding rounds.

---

## Summary

The looping system in Wod.Wiki uses:

1. **`LoopCoordinatorBehavior`** to manage iteration state (`index`, `position`, `rounds`)
2. **`childGroups: number[][]`** to define which statements to compile per position
3. **JIT compilation** to create child blocks on-demand with current context
4. **Memory inheritance** (`visibility: 'inherited'`) for parent→child metric passing
5. **Execution spans** to track round progress for analytics and display

The compiler knows about rounds and index through:
- The current `LoopState` (computed from index)
- Memory searches for inherited metrics
- Fragment compilation that extracts values from statements

This architecture enables flexible workout patterns (fixed rounds, rep schemes, EMOM, AMRAP) while maintaining clean separation between parsing, compilation, and execution concerns.
