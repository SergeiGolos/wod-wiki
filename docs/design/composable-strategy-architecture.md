# Composable Strategy Architecture for JIT Compiler

## Overview

This document outlines the architectural redesign of the JIT compiler's strategy system to support **composable behavior providers** instead of monolithic strategies. The current architecture uses a first-match-wins approach where one strategy fully constructs a block. The new architecture allows multiple strategies to contribute behaviors to a single block, with proper composition, prioritization, and validation.

## Current Architecture Analysis

### Existing Strategies

| Strategy | Matches When | Block Type | Primary Purpose |
|----------|--------------|------------|-----------------|
| `TimeBoundRoundsStrategy` | Timer + Rounds | AMRAP | Timed repeating workouts |
| `IntervalStrategy` | Timer + EMOM Action | Interval | EMOM/interval workouts |
| `TimerStrategy` | Timer fragment | Timer | Simple timed blocks |
| `RoundsStrategy` | Rounds fragment (no Timer) | Rounds | Multi-round workouts |
| `GroupStrategy` | Has children | Group | Grouping exercises |
| `EffortStrategy` | Fallback (no Timer/Rounds) | Effort | Simple exercises |

### Current Behavior Assignments by Strategy

```
TimerStrategy:
  - ActionLayerBehavior (infrastructure)
  - BoundTimerBehavior OR UnboundTimerBehavior (timing)
  - HistoryBehavior (tracking)
  - SoundBehavior (audio)
  - ChildIndexBehavior (child management) [if has children]
  - ChildRunnerBehavior (child execution) [if has children]
  - RoundPerLoopBehavior (round counting) [if has children]
  - SinglePassBehavior (completion) [if has children]
  - CompletionBehavior (timer-based completion) [if has duration]

RoundsStrategy:
  - ActionLayerBehavior (infrastructure)
  - ChildIndexBehavior (child management)
  - RoundPerLoopBehavior (round counting)
  - RepSchemeBehavior (rep scheme) [optional]
  - BoundLoopBehavior (loop termination)
  - ChildRunnerBehavior (child execution)
  - HistoryBehavior (tracking)
  - RoundDisplayBehavior (UI display)
  - RoundSpanBehavior (span tracking)
  - LapTimerBehavior (lap timing)

IntervalStrategy:
  - ActionLayerBehavior (infrastructure)
  - BoundTimerBehavior (timing)
  - IntervalWaitingBehavior (wait state)
  - RoundPerNextBehavior (round counting)
  - BoundLoopBehavior (loop termination)
  - ChildIndexBehavior (child management)
  - ChildRunnerBehavior (child execution)
  - HistoryBehavior (tracking)
  - SoundBehavior (audio)
  - RoundDisplayBehavior (UI display)
  - RoundSpanBehavior (span tracking)
  - LapTimerBehavior (lap timing)
  - IntervalTimerRestartBehavior (interval restart)

TimeBoundRoundsStrategy (AMRAP):
  - ActionLayerBehavior (infrastructure)
  - BoundTimerBehavior (timing)
  - ChildIndexBehavior (child management)
  - ChildRunnerBehavior (child execution)
  - RoundPerLoopBehavior (round counting)
  - UnboundLoopBehavior (infinite loop)
  - HistoryBehavior (tracking)
  - SoundBehavior (audio)
  - CompletionBehavior (timer-based completion)
  - RoundSpanBehavior (span tracking)
  - LapTimerBehavior (lap timing)

EffortStrategy:
  - ActionLayerBehavior (infrastructure)
  - RoundPerNextBehavior (round counting)
  - SinglePassBehavior (completion)
  - UnboundTimerBehavior (timing)
  - HistoryBehavior (tracking)

GroupStrategy:
  - ActionLayerBehavior (infrastructure)
  - ChildIndexBehavior (child management) [if has children]
  - ChildRunnerBehavior (child execution) [if has children]
  - RoundPerLoopBehavior (round counting) [if has children]
  - SinglePassBehavior (completion)
```

## Behavior Groupings

Analyzing the patterns above, behaviors naturally fall into these **logical groups**:

### 1. Infrastructure Layer (Priority: 1000)
Always required, provides base block functionality.

| Behavior | Purpose | Required |
|----------|---------|----------|
| `ActionLayerBehavior` | Fragment visualization, source ID tracking | Yes |

### 2. Timing Layer (Priority: 900)
Controls time tracking and display.

| Behavior | Purpose | Mutually Exclusive |
|----------|---------|-------------------|
| `BoundTimerBehavior` | Countdown/count-up with duration | Group A |
| `UnboundTimerBehavior` | Count-up without limit | Group A |
| `TimerBehavior` | General timer | Group A |
| `LapTimerBehavior` | Lap/split timing | No |
| `IntervalTimerRestartBehavior` | Restart timer each interval | No |

### 3. Loop Control Layer (Priority: 800)
Controls iteration behavior.

| Behavior | Purpose | Requires | Mutually Exclusive |
|----------|---------|----------|-------------------|
| `ChildIndexBehavior` | Track current child index | - | - |
| `RoundPerLoopBehavior` | Increment round on index wrap | `ChildIndexBehavior` | Group B |
| `RoundPerNextBehavior` | Increment round on each next | - | Group B |
| `SinglePassBehavior` | Pop after one iteration | Round behavior | Group C |
| `BoundLoopBehavior` | Pop after N rounds | Round behavior | Group C |
| `UnboundLoopBehavior` | Never pop (external termination) | Round behavior | Group C |

### 4. Child Execution Layer (Priority: 700)
Manages child block execution.

| Behavior | Purpose | Requires |
|----------|---------|----------|
| `ChildRunnerBehavior` | Push child blocks | `ChildIndexBehavior` |

### 5. Completion Layer (Priority: 600)
Determines when block completes.

| Behavior | Purpose | Mutually Exclusive |
|----------|---------|-------------------|
| `CompletionBehavior` | Condition-based completion | Group D (weak) |
| `PopOnNextBehavior` | Pop on next call | Group D |
| `PopOnEventBehavior` | Pop on specific events | No |

### 6. Rep Scheme Layer (Priority: 500)
Manages rep counting and inheritance.

| Behavior | Purpose | Requires |
|----------|---------|----------|
| `RepSchemeBehavior` | Variable reps per round | `RoundPerLoopBehavior` or `RoundPerNextBehavior` |

### 7. Interval Layer (Priority: 400)
EMOM/interval-specific behaviors.

| Behavior | Purpose | Requires |
|----------|---------|----------|
| `IntervalWaitingBehavior` | Wait state between intervals | Timer behavior |
| `IntervalTimerRestartBehavior` | Restart timer per round | Timer behavior |

### 8. Tracking Layer (Priority: 300)
History and analytics.

| Behavior | Purpose | Required |
|----------|---------|----------|
| `HistoryBehavior` | Span tracking for history | Recommended |
| `RoundSpanBehavior` | Round span tracking | Optional |
| `RoundDisplayBehavior` | UI round display | Optional |

### 9. Audio Layer (Priority: 200)
Sound cues and alerts.

| Behavior | Purpose | Requires |
|----------|---------|----------|
| `SoundBehavior` | Countdown/completion sounds | Timer behavior |

### 10. UI Layer (Priority: 100)
Display and controls.

| Behavior | Purpose |
|----------|---------|
| `DisplayModeBehavior` | Timer vs clock mode |
| `RuntimeControlsBehavior` | Button management |
| `WorkoutControlButtonsBehavior` | Control buttons |
| `SingleButtonBehavior` | Single button display |

## Proposed Architecture

### New Interface: `IBehaviorProvider`

```typescript
/**
 * Priority levels for behavior providers.
 * Higher numbers execute first during matching.
 */
export enum BehaviorProviderPriority {
  INFRASTRUCTURE = 1000,
  TIMING = 900,
  LOOP_CONTROL = 800,
  CHILD_EXECUTION = 700,
  COMPLETION = 600,
  REP_SCHEME = 500,
  INTERVAL = 400,
  TRACKING = 300,
  AUDIO = 200,
  UI = 100,
}

/**
 * Result from a behavior provider's contribution.
 */
export interface IBehaviorContribution {
  /** Behaviors to add to the block */
  behaviors: IRuntimeBehavior[];
  
  /** Behaviors that this provider excludes (other providers should not add these) */
  excludes?: string[];
  
  /** Behavior types that this provider requires to be present */
  requires?: string[];
  
  /** Behavior types that this provider conflicts with */
  conflictsWith?: string[];
}

/**
 * A provider that contributes behaviors to a block based on statement analysis.
 */
export interface IBehaviorProvider {
  /** Unique identifier for this provider */
  readonly id: string;
  
  /** Display name for debugging */
  readonly name: string;
  
  /** Priority (higher = processed first) */
  readonly priority: BehaviorProviderPriority;
  
  /** Behavior group this provider belongs to */
  readonly group?: string;
  
  /**
   * Determines if this provider can contribute behaviors for the given statement.
   */
  canProvide(statement: ICodeStatement, runtime: IScriptRuntime): boolean;
  
  /**
   * Provides behaviors for the statement.
   * Called only if canProvide returns true.
   */
  provide(
    statement: ICodeStatement,
    runtime: IScriptRuntime,
    context: ICompilationContext
  ): IBehaviorContribution;
}

/**
 * Context passed during compilation for coordination between providers.
 */
export interface ICompilationContext {
  /** Block key being created */
  blockKey: BlockKey;
  
  /** Block ID string */
  blockId: string;
  
  /** Exercise ID if available */
  exerciseId: string;
  
  /** BlockContext for memory allocation */
  blockContext: BlockContext;
  
  /** Fragment groups for the block */
  fragmentGroups: ICodeFragment[][];
  
  /** Accumulated behaviors from previous providers */
  currentBehaviors: IRuntimeBehavior[];
  
  /** Excluded behavior types (from previous providers) */
  excludedTypes: Set<string>;
  
  /** Check if a behavior type is already provided */
  hasBehavior(type: string): boolean;
  
  /** Check if a behavior type is excluded */
  isExcluded(type: string): boolean;
}
```

### Behavior Dependency Validation

```typescript
/**
 * Validates that all behavior dependencies are satisfied.
 */
export class BehaviorDependencyValidator {
  private readonly dependencyMap: Map<string, string[]> = new Map([
    ['ChildRunnerBehavior', ['ChildIndexBehavior']],
    ['RoundPerLoopBehavior', ['ChildIndexBehavior']],
    ['RepSchemeBehavior', ['RoundPerLoopBehavior', 'RoundPerNextBehavior']], // OR dependency
    ['SinglePassBehavior', ['RoundPerLoopBehavior', 'RoundPerNextBehavior']], // OR dependency
    ['BoundLoopBehavior', ['RoundPerLoopBehavior', 'RoundPerNextBehavior']], // OR dependency
    ['UnboundLoopBehavior', ['RoundPerLoopBehavior', 'RoundPerNextBehavior']], // OR dependency
    ['IntervalWaitingBehavior', ['BoundTimerBehavior', 'TimerBehavior']], // OR dependency
    ['IntervalTimerRestartBehavior', ['BoundTimerBehavior', 'TimerBehavior']], // OR dependency
    ['SoundBehavior', ['BoundTimerBehavior', 'TimerBehavior', 'UnboundTimerBehavior']], // OR dependency
  ]);

  validate(behaviors: IRuntimeBehavior[]): ValidationResult {
    const behaviorTypes = new Set(behaviors.map(b => b.constructor.name));
    const errors: string[] = [];
    
    for (const behavior of behaviors) {
      const typeName = behavior.constructor.name;
      const deps = this.dependencyMap.get(typeName);
      
      if (deps && deps.length > 0) {
        // Check if at least one dependency is satisfied
        const hasAnyDep = deps.some(dep => behaviorTypes.has(dep));
        if (!hasAnyDep) {
          errors.push(`${typeName} requires one of: ${deps.join(', ')}`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}

/**
 * Validates mutual exclusivity constraints.
 */
export class MutualExclusivityValidator {
  private readonly exclusivityGroups: Map<string, string[]> = new Map([
    ['TimerGroup', ['BoundTimerBehavior', 'UnboundTimerBehavior']], // Only one primary timer
    ['RoundCountingGroup', ['RoundPerLoopBehavior', 'RoundPerNextBehavior']], // Only one round counter
    ['LoopTerminationGroup', ['SinglePassBehavior', 'BoundLoopBehavior', 'UnboundLoopBehavior']], // Only one termination
  ]);

  validate(behaviors: IRuntimeBehavior[]): ValidationResult {
    const behaviorTypes = new Set(behaviors.map(b => b.constructor.name));
    const errors: string[] = [];
    
    for (const [groupName, members] of this.exclusivityGroups) {
      const present = members.filter(m => behaviorTypes.has(m));
      if (present.length > 1) {
        errors.push(`Mutual exclusivity violation in ${groupName}: ${present.join(', ')}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

### New Behavior Providers

The following providers will replace the monolithic strategies:

| Provider | Priority | Group | Matches | Provides |
|----------|----------|-------|---------|----------|
| `InfrastructureProvider` | 1000 | infrastructure | Always | `ActionLayerBehavior` |
| `BoundTimerProvider` | 900 | timing | Timer fragment with duration | `BoundTimerBehavior` |
| `UnboundTimerProvider` | 900 | timing | No timer OR count-up timer | `UnboundTimerBehavior` |
| `LapTimerProvider` | 890 | timing | Has rounds/loop | `LapTimerBehavior` |
| `ChildManagementProvider` | 800 | loop | Has children | `ChildIndexBehavior` |
| `RoundPerLoopProvider` | 790 | loop | Has children + rounds | `RoundPerLoopBehavior` |
| `RoundPerNextProvider` | 790 | loop | Effort/leaf nodes | `RoundPerNextBehavior` |
| `SinglePassProvider` | 780 | loop | Single iteration blocks | `SinglePassBehavior` |
| `BoundLoopProvider` | 780 | loop | Fixed round count | `BoundLoopBehavior` |
| `UnboundLoopProvider` | 780 | loop | AMRAP/infinite | `UnboundLoopBehavior` |
| `ChildRunnerProvider` | 700 | child | Has children | `ChildRunnerBehavior` |
| `TimerCompletionProvider` | 600 | completion | Bound timer | `CompletionBehavior` |
| `RepSchemeProvider` | 500 | reps | Has rep scheme | `RepSchemeBehavior` |
| `IntervalProvider` | 400 | interval | EMOM pattern | `IntervalWaitingBehavior`, `IntervalTimerRestartBehavior` |
| `HistoryProvider` | 300 | tracking | Always | `HistoryBehavior` |
| `RoundDisplayProvider` | 300 | tracking | Has fixed rounds | `RoundDisplayBehavior` |
| `RoundSpanProvider` | 300 | tracking | Has rounds | `RoundSpanBehavior` |
| `SoundProvider` | 200 | audio | Has timer | `SoundBehavior` |

### Strategy Composition Map

Here's how the new providers map to old strategies:

```
TimerStrategy (Timer fragment) ->
  InfrastructureProvider +
  BoundTimerProvider (if duration) OR UnboundTimerProvider (if no duration) +
  HistoryProvider +
  SoundProvider (if countdown) +
  [ChildManagementProvider + ChildRunnerProvider + RoundPerLoopProvider + SinglePassProvider] (if children) +
  TimerCompletionProvider (if duration)

RoundsStrategy (Rounds fragment, no Timer) ->
  InfrastructureProvider +
  ChildManagementProvider +
  RoundPerLoopProvider +
  RepSchemeProvider (optional) +
  BoundLoopProvider +
  ChildRunnerProvider +
  HistoryProvider +
  RoundDisplayProvider +
  RoundSpanProvider +
  LapTimerProvider

IntervalStrategy (Timer + EMOM) ->
  InfrastructureProvider +
  BoundTimerProvider +
  IntervalProvider +
  RoundPerNextProvider +
  BoundLoopProvider +
  ChildManagementProvider +
  ChildRunnerProvider +
  HistoryProvider +
  SoundProvider +
  RoundDisplayProvider +
  RoundSpanProvider +
  LapTimerProvider

TimeBoundRoundsStrategy (Timer + Rounds = AMRAP) ->
  InfrastructureProvider +
  BoundTimerProvider +
  ChildManagementProvider +
  ChildRunnerProvider +
  RoundPerLoopProvider +
  UnboundLoopProvider +
  HistoryProvider +
  SoundProvider +
  TimerCompletionProvider +
  RoundSpanProvider +
  LapTimerProvider

EffortStrategy (fallback) ->
  InfrastructureProvider +
  RoundPerNextProvider +
  SinglePassProvider +
  UnboundTimerProvider +
  HistoryProvider

GroupStrategy (has children) ->
  InfrastructureProvider +
  ChildManagementProvider +
  ChildRunnerProvider +
  RoundPerLoopProvider +
  SinglePassProvider
```

## Block Type Determination

With composable providers, block type is determined by the combination of primary behaviors:

```typescript
function determineBlockType(behaviors: IRuntimeBehavior[]): string {
  const has = (type: any) => behaviors.some(b => b instanceof type);
  
  if (has(IntervalWaitingBehavior)) return 'Interval';
  if (has(BoundTimerBehavior) && has(UnboundLoopBehavior)) return 'AMRAP';
  if (has(BoundTimerBehavior) && !has(BoundLoopBehavior)) return 'Timer';
  if (has(BoundLoopBehavior)) return 'Rounds';
  if (has(ChildRunnerBehavior) && !has(BoundLoopBehavior)) return 'Group';
  return 'Effort';
}
```

## Testing Strategy

### Unit Tests

1. **Provider Matching Tests**
   - Each provider correctly identifies when to contribute
   - Edge cases: empty fragments, undefined values, hint-based matching

2. **Provider Contribution Tests**
   - Each provider returns correct behaviors
   - Exclusion lists are correct
   - Requirement lists are correct

3. **Dependency Validation Tests**
   - Missing dependencies are detected
   - OR dependencies (any-of) work correctly
   - Valid configurations pass

4. **Mutual Exclusivity Tests**
   - Conflicts are detected
   - Valid single-member groups pass

### Integration Tests

1. **Composition Tests**
   - Timer statement → correct behavior set
   - Rounds statement → correct behavior set
   - AMRAP statement → correct behavior set
   - EMOM statement → correct behavior set

2. **Backward Compatibility Tests**
   - All existing test cases continue to pass
   - Block types are correctly determined
   - Runtime execution works correctly

3. **Invalid Configuration Tests**
   - Invalid combinations produce clear errors
   - Missing required behaviors detected at compile time

### Contract Tests

```typescript
describe('Provider Contract', () => {
  it('InfrastructureProvider always contributes ActionLayerBehavior', ...);
  it('BoundTimerProvider requires Timer fragment with value', ...);
  it('ChildRunnerProvider requires children in statement', ...);
  it('BoundLoopProvider and UnboundLoopProvider are mutually exclusive', ...);
});

describe('Behavior Dependencies', () => {
  it('ChildRunnerBehavior fails validation without ChildIndexBehavior', ...);
  it('RoundPerLoopBehavior fails validation without ChildIndexBehavior', ...);
  it('SoundBehavior requires some timer behavior', ...);
});

describe('End-to-End Compilation', () => {
  it('Timer fragment compiles to Timer block with correct behaviors', ...);
  it('Rounds fragment compiles to Rounds block with correct behaviors', ...);
  it('Timer + Rounds compiles to AMRAP block with correct behaviors', ...);
  it('Timer + EMOM compiles to Interval block with correct behaviors', ...);
});
```

## Migration Path

### Phase 1: Add New Infrastructure
1. Create `IBehaviorProvider` interface
2. Create `ICompilationContext` interface
3. Create `BehaviorDependencyValidator`
4. Create `MutualExclusivityValidator`
5. Create `ComposableBlockCompiler`

### Phase 2: Create Providers
1. Implement core providers (Infrastructure, Timing, Loop, Child)
2. Implement completion providers
3. Implement tracking/audio providers
4. Add comprehensive tests for each provider

### Phase 3: Migrate JitCompiler
1. Update `JitCompiler` to use `ComposableBlockCompiler`
2. Deprecate `IRuntimeBlockStrategy` (but keep for backward compatibility)
3. Update tests to verify both old and new paths

### Phase 4: Cleanup
1. Remove deprecated strategy implementations
2. Update documentation
3. Performance optimization if needed

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing behavior | Extensive test coverage, backward compatibility mode |
| Performance regression | Lazy provider initialization, caching |
| Complex debugging | Detailed logging, provider execution trace |
| Migration complexity | Phased rollout, feature flags |

## Success Criteria

1. All existing tests pass
2. Block behavior is identical to current implementation
3. New architecture enables easy addition of new block types
4. Dependency validation catches invalid configurations at compile time
5. Clear error messages for invalid provider combinations
