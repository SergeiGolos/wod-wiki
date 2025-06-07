# Fragment-Metric Separation Plan

## Executive Summary

This plan outlines the architectural changes needed to establish a hard separation between StatementNode fragments and RuntimeBlock metrics, with JIT compilation strategies to dynamically transform fragments into metrics based on current runtime state.

**Current State**: Fragments contain both data and metric generation logic (`applyToMetric` methods), and RuntimeBlocks access fragments through `sources: JitStatement[]` property with direct `fragments` array access.

**Target State**: StatementNodes contain only pure fragments (data), RuntimeBlocks contain only metrics (computed values), and the JIT uses strategies to compile fragments into metrics based on runtime context.

## Architecture Overview

### Current Architecture Reality (Validated Against Codebase)

Based on examination of the actual implement3. **JIT Flow**: Integrates with actual `RuntimeJitStrategies.getStrategy(node)` and block creation patterns
4. **Testing Requirements**: Ensures proper functionality with `RuntimeBlockMetrics.buildMetrics` patternsion:

1. **Fragment Structure**: All fragments implement `CodeFragment` interface with `applyToMetric(metric: RuntimeMetric, rounds?: number): void` method
2. **RuntimeBlock Access**: Blocks access fragments via `sources: JitStatement[]` where each `JitStatement` has a `fragments: CodeFragment[]` property
3. **Metric Generation**: `RuntimeBlockMetrics.extractMetricValues()` iterates over `statement.fragments` and calls `fragment.applyToMetric(metric, currentRound)`
4. **JIT Flow**: `RuntimeJitStrategies` creates blocks with `JitStatement[]` arrays, blocks call `this.metrics(runtime)` which uses `RuntimeBlockMetrics.buildMetrics()`
5. **Fragment Access Patterns**: Fragments are accessed both directly (`statement.fragments`) and through typed accessors (`statement.effort()`, `statement.repetitions()`, etc.)

### Current Architecture Issues

1. **Mixed Responsibilities**: Fragments handle both data storage and metric generation via `applyToMetric` methods
2. **Tight Coupling**: RuntimeBlocks directly contain fragments via `sources: JitStatement[]` property with direct `fragments` access
3. **Static Compilation**: Fragment-to-metric transformation happens during `metrics()` call, not at JIT compilation time
4. **Limited Context**: Metric generation has access to `rounds` parameter but lacks broader runtime state context

### Proposed Architecture

```
StatementNode/JitStatement (Current Data + Access)
├── Fragments (Pure Data Objects)
│   ├── TimerFragment { original: number } 
│   ├── RepFragment { reps: number }
│   └── EffortFragment { effort: string }
│
JIT Compilation Layer (State-Aware Transformation)
├── Fragment Compilation Strategies
│   ├── TimerMetricCompiler
│   ├── RepMetricCompiler  
│   └── EffortMetricCompiler
│
RuntimeBlock (Pure Execution + Compiled Metrics)
├── Pre-compiled Metrics (JIT-Generated Values)
│   ├── RuntimeMetric[]
│   └── MetricContext
└── Execution Logic (Pure Runtime Behavior)
    ├── onEnter(), onNext(), onLeave()
    └── Event handling
```

**Key Changes**:
1. **Fragment Purification**: Remove `applyToMetric` methods from all fragment classes
2. **JIT-Time Compilation**: Move metric generation from runtime `metrics()` calls to JIT compilation time
3. **Pre-compiled Metrics**: RuntimeBlocks receive pre-compiled `RuntimeMetric[]` instead of `JitStatement[]` sources
4. **Context-Aware Compilation**: Fragment-to-metric transformation uses full runtime context available at JIT time

## Phase 1: Fragment Purification and Interface Updates

### 1.1 Remove Metric Logic from Fragments

**Objective**: Strip all `applyToMetric` methods and metric-related logic from fragment classes while preserving their data.

**Files to Modify** (Based on actual codebase):
- `src/core/fragments/TimerFragment.ts` - Keep `original`, `hours`, `minutes`, `seconds` properties
- `src/core/fragments/RepFragment.ts` - Keep `reps` property
- `src/core/fragments/EffortFragment.ts` - Keep `effort` property  
- `src/core/fragments/DistanceFragment.ts` - Keep `value`, `units` properties
- `src/core/fragments/RoundsFragment.ts` - Keep `count` property
- `src/core/fragments/ActionFragment.ts` - Keep `action` property
- `src/core/fragments/IncrementFragment.ts` - Keep `image`, `increment` properties
- `src/core/fragments/LapFragment.ts` - Keep `group`, `image` properties
- `src/core/fragments/TextFragment.ts` - Keep `text`, `level` properties
- `src/core/fragments/ResistanceFragment.ts` - Keep `value`, `units` properties

**Example Changes**:
```typescript
// BEFORE (TimerFragment.ts)
export class TimerFragment implements CodeFragment {
  constructor(public image: string, public meta: CodeMetadata) {
    // ... duration parsing logic ...
    this.original = (this.seconds + this.minutes * 60 + ...) * 1000;
  }
  
  original: number; // in ms
  type: string = "duration";
  
  applyToMetric(_metric: RuntimeMetric, _rounds?: number): void {    
    // Empty implementation but method exists
  }
}

// AFTER (TimerFragment.ts)  
export class TimerFragment implements CodeFragment {
  constructor(public image: string, public meta: CodeMetadata) {
    // ... duration parsing logic ...
    this.original = (this.seconds + this.minutes * 60 + ...) * 1000;
  }
  
  readonly original: number; // in ms
  readonly type: string = "duration";
  
  // No applyToMetric method
}
```

### 1.2 Update CodeFragment Interface

**File**: `src/core/CodeFragment.ts`

**Changes**:
```typescript
// BEFORE
export interface CodeFragment {
  type: string;
  meta?: CodeMetadata;
  /**
   * Applies this fragment's data to a RuntimeMetric (mutates the metric in place).
   * Each fragment type should implement this to add its value(s) to the metric.
   */
  applyToMetric(metric: import("./RuntimeMetric").RuntimeMetric, rounds?: number): void;
}

// AFTER
export interface CodeFragment {
  readonly type: string;
  readonly meta?: CodeMetadata;
  // Pure data interface - no metric methods
}
```

## Phase 1: Fragment Purification

### 1.1 Remove Metric Logic from Fragments

**Objective**: Strip all `applyToMetric` methods and metric-related logic from fragment classes, based on actual current implementation.

**Files to Modify** (validated against actual codebase):
- `x:\wod-wiki\src\core\fragments\TimerFragment.ts` - Currently has empty `applyToMetric` method
- `x:\wod-wiki\src\core\fragments\RepFragment.ts` - Adds repetitions via `metric.values.push(new MetricValue('repetitions', this.reps))`
- `x:\wod-wiki\src\core\fragments\EffortFragment.ts` - Sets `metric.effort = this.effort`
- `x:\wod-wiki\src\core\fragments\DistanceFragment.ts` - Adds distance via `metric.values.push(new MetricValue('distance', this.distance, this.unit))`
- `x:\wod-wiki\src\core\fragments\RoundsFragment.ts` - Adds rounds via `metric.values.push(new MetricValue('rounds', this.rounds))`
- `x:\wod-wiki\src\core\fragments\ActionFragment.ts` - Has no-op `applyToMetric` implementation
- `x:\wod-wiki\src\core\fragments\IncrementFragment.ts` - Currently has empty `applyToMetric` method
- `x:\wod-wiki\src\core\fragments\LapFragment.ts` - Currently has empty `applyToMetric` method
- `x:\wod-wiki\src\core\fragments\TextFragment.ts` - Has no-op `applyToMetric` implementation
- `x:\wod-wiki\src\core\fragments\ResistanceFragment.ts` - Adds resistance via `metric.values.push(new MetricValue('resistance', this.resistance, this.unit))`

**Changes** (based on actual current implementation):
```typescript
// BEFORE (RepFragment.ts actual implementation)
export class RepFragment implements CodeFragment {
  constructor(public reps: number) {}
  
  applyToMetric(metric: RuntimeMetric): void {
    metric.values.push(new MetricValue('repetitions', this.reps));
  }
}

// AFTER (pure data structure)
export class RepFragment implements CodeFragment {
  readonly fragmentType = FragmentType.Rep;
  constructor(public reps: number) {}
  
  // Pure data object - no metric logic
}
```

### 1.2 Update CodeFragment Interface

**File**: `x:\wod-wiki\src\core\CodeFragment.ts`

**Changes** (based on actual current interface):
```typescript
// BEFORE (actual current implementation)
export interface CodeFragment {
  applyToMetric(metric: RuntimeMetric, rounds?: number): void;
}

// AFTER (pure data interface)
export interface CodeFragment {
  readonly fragmentType: FragmentType;
  // Pure data interface - no metric methods
}

export enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Lap = 'lap',
  Text = 'text',
  Resistance = 'resistance'
}
```

## Phase 2: JIT Fragment Compilation Strategies

### 2.1 Create Fragment Compilation Strategy Interface

**New File**: `x:\wod-wiki\src\core\runtime\strategies\IFragmentCompilationStrategy.ts`

```typescript
export interface IFragmentCompilationStrategy<TFragment extends CodeFragment> {
  readonly fragmentType: FragmentType;
  
  compile(
    fragment: TFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[];
}

export interface FragmentCompilationContext {
  readonly runtimeState: RuntimeState;
  readonly blockContext: BlockContext;
  readonly parentMetrics: RuntimeMetric[];
  readonly executionDepth: number;
  readonly currentTime: number;
  readonly currentRound?: number; // Based on actual RuntimeBlockMetrics.extractMetricValues usage
}

export interface RuntimeState {
  readonly isActive: boolean;
  readonly isPaused: boolean;
  readonly elapsedTime: number;
  readonly currentRep: number;
  readonly currentRound: number;
}

export interface BlockContext {
  readonly blockKey: BlockKey;
  readonly parentBlock?: IRuntimeBlock;
  readonly childBlocks: IRuntimeBlock[];
  readonly isRepeating: boolean;
  readonly iterationCount: number;
}
```

### 2.2 Implement Specific Fragment Compilation Strategies

**New File**: `x:\wod-wiki\src\core\runtime\strategies\RepMetricStrategy.ts` (based on actual RepFragment implementation)

```typescript
export class RepMetricStrategy implements IFragmentCompilationStrategy<RepFragment> {
  readonly fragmentType = FragmentType.Rep;

  compile(
    fragment: RepFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Replicate current RepFragment.applyToMetric logic
    // Current: metric.values.push(new MetricValue('repetitions', this.reps));
    
    const metric = new RuntimeMetric({
      sourceId: context.blockContext.blockKey.toString(),
      effort: undefined, // Will be set by EffortFragment compilation
      values: []
    });
    
    metric.values.push(new MetricValue('repetitions', fragment.reps));
    
    return [metric];
  }
}
```

**New File**: `x:\wod-wiki\src\core\runtime\strategies\EffortMetricStrategy.ts` (based on actual EffortFragment implementation)

```typescript
export class EffortMetricStrategy implements IFragmentCompilationStrategy<EffortFragment> {
  readonly fragmentType = FragmentType.Effort;

  compile(
    fragment: EffortFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Replicate current EffortFragment.applyToMetric logic
    // Current: metric.effort = this.effort;
    
    const metric = new RuntimeMetric({
      sourceId: context.blockContext.blockKey.toString(),
      effort: fragment.effort,
      values: []
    });
    
    return [metric];
  }
}
```

**New File**: `x:\wod-wiki\src\core\runtime\strategies\DistanceMetricStrategy.ts` (based on actual DistanceFragment implementation)

```typescript
export class DistanceMetricStrategy implements IFragmentCompilationStrategy<DistanceFragment> {
  readonly fragmentType = FragmentType.Distance;

  compile(
    fragment: DistanceFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Replicate current DistanceFragment.applyToMetric logic
    // Current: metric.values.push(new MetricValue('distance', this.distance, this.unit));
    
    const metric = new RuntimeMetric({
      sourceId: context.blockContext.blockKey.toString(),
      effort: undefined,
      values: []
    });
    
    metric.values.push(new MetricValue('distance', fragment.distance, fragment.unit));
    
    return [metric];
  }
}
      adjustedTime *= 0.95; // 5% reduction per iteration
    }
    
    // Example: Adjust based on parent block metrics
    const parentTimerMetric = context.parentMetrics.find(m => m.type === MetricType.Timer);
    if (parentTimerMetric) {
      adjustedTime = Math.min(adjustedTime, parentTimerMetric.value * 0.8);
    }
    
    return adjustedTime;
  }

  private extractContextualFactors(context: FragmentCompilationContext): Record<string, any> {
    return {
      runtimeState: context.runtimeState,
      iterationCount: context.blockContext.iterationCount,
      executionDepth: context.executionDepth,
      parentBlockType: context.blockContext.parentBlock?.constructor.name
    };
  }
}
```

### 2.3 Create Fragment Compilation Manager

**New File**: `x:\wod-wiki\src\core\runtime\strategies\FragmentCompilationManager.ts`

```typescript
export class FragmentCompilationManager {
  private strategies = new Map<FragmentType, IFragmentCompilationStrategy<any>>();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.register(new RepMetricStrategy());
    this.register(new EffortMetricStrategy());
    this.register(new DistanceMetricStrategy());
    this.register(new RoundsMetricStrategy());
    this.register(new ResistanceMetricStrategy());
    // Note: ActionFragment, IncrementFragment, LapFragment, TextFragment, TimerFragment
    // currently have no-op or empty applyToMetric implementations
  }

  register<T extends CodeFragment>(strategy: IFragmentCompilationStrategy<T>): void {
    this.strategies.set(strategy.fragmentType, strategy);
  }

  compile(
    fragment: CodeFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    const strategy = this.strategies.get(fragment.fragmentType);
    if (!strategy) {
      // Handle fragments with no metric impact (TextFragment, ActionFragment, etc.)
      return [];
    }

    return strategy.compile(fragment, context);
  }

  compileStatementFragments(
    statement: JitStatement,
    context: FragmentCompilationContext
  ): RuntimeMetric {
    // Replicate current RuntimeBlockMetrics.extractMetricValues logic
    // Current: statement.fragments.forEach(fragment => fragment.applyToMetric(metric, currentRound))
    
    const baseMetric = new RuntimeMetric({
      sourceId: context.blockContext.blockKey.toString(),
      effort: undefined,
      values: []
    });

    // Compile each fragment and merge results
    statement.fragments.forEach(fragment => {
      const compiledMetrics = this.compile(fragment, context);
      compiledMetrics.forEach(compiled => {
        this.mergeMetrics(baseMetric, compiled);
      });
    });

    return baseMetric;
  }

  private mergeMetrics(target: RuntimeMetric, source: RuntimeMetric): void {
    // Merge effort (EffortFragment sets this)
    if (source.effort !== undefined) {
      target.effort = source.effort;
    }

    // Merge values (RepFragment, DistanceFragment, etc. add to this)
    target.values.push(...source.values);
  }
}
```

## Phase 3: RuntimeBlock Metric Purification

### 3.1 Remove Fragment References from RuntimeBlocks

**Objective**: Update RuntimeBlocks to work with pre-compiled metrics instead of accessing fragments directly.

**Files to Modify** (based on actual codebase structure):
- `x:\wod-wiki\src\core\runtime\blocks\RuntimeBlock.ts` - Base class with `sources: JitStatement[]` property
- `x:\wod-wiki\src\core\IRuntimeBlock.ts` - Interface with `sources: JitStatement[]` property
- `x:\wod-wiki\src\core\runtime\blocks\EffortBlock.ts` - Effort-specific runtime block
- `x:\wod-wiki\src\core\runtime\blocks\TimerBlock.ts` - Timer-specific runtime block
- `x:\wod-wiki\src\core\runtime\blocks\RepeatingBlock.ts` - Repeating block implementation

**Changes** (based on actual current implementation):
```typescript
// BEFORE (RuntimeBlock.ts actual implementation)
export abstract class RuntimeBlock implements IRuntimeBlock {
  protected _parent?: IRuntimeBlock;
  
  constructor(
    public sources: JitStatement[],
    parent?: IRuntimeBlock
  ) {
    this._parent = parent;
  }
  
  metrics(runtime?: RuntimeEnvironment): RuntimeMetric[] {
    return RuntimeBlockMetrics.buildMetrics(this.sources, runtime);
  }
  
  // ...existing methods...
}

// AFTER (pure metric-based implementation)
export abstract class RuntimeBlock implements IRuntimeBlock {
  protected _parent?: IRuntimeBlock;
  private _compiledMetrics: RuntimeMetric[];
  
  constructor(
    compiledMetrics: RuntimeMetric[],
    parent?: IRuntimeBlock
  ) {
    this._compiledMetrics = compiledMetrics;
    this._parent = parent;
  }
  
  metrics(runtime?: RuntimeEnvironment): RuntimeMetric[] {
    // Return pre-compiled metrics instead of building them from sources
    return this._compiledMetrics;
  }
  
  // Remove sources property access
  // ...existing methods...
}
```

### 3.2 Update IRuntimeBlock Interface

**File**: `x:\wod-wiki\src\core\IRuntimeBlock.ts`

**Changes** (based on actual current interface):
```typescript
// BEFORE (actual current implementation)
export interface IRuntimeBlock {
  readonly key: BlockKey;
  readonly sources: JitStatement[];
  
  metrics(runtime?: RuntimeEnvironment): RuntimeMetric[];
  
  // ...existing methods...
}

// AFTER (pure metric-based interface)
export interface IRuntimeBlock {
  readonly key: BlockKey;
  readonly compiledMetrics: RuntimeMetric[];
  
  metrics(runtime?: RuntimeEnvironment): RuntimeMetric[];
  
  // Remove sources property
  // ...existing methods...
}
```

### 3.3 Update RuntimeBlockMetrics

**File**: `x:\wod-wiki\src\core\metrics\RuntimeBlockMetrics.ts`

**Changes** (based on actual current implementation):
```typescript
// BEFORE (actual current implementation)
export class RuntimeBlockMetrics {
  static buildMetrics(sources: JitStatement[], runtime?: RuntimeEnvironment): RuntimeMetric[] {
    // Current implementation calls extractMetricValues
    return sources.map(source => this.extractMetricValues(source, runtime));
  }

  static extractMetricValues(statement: JitStatement, runtime?: RuntimeEnvironment): RuntimeMetric {
    const metric = new RuntimeMetric({
      sourceId: statement.key().toString(),
      effort: undefined,
      values: []
    });

    const currentRound = runtime?.getStateValue('currentRound');
    
    // Current fragment iteration and applyToMetric calls
    statement.fragments.forEach(fragment => {
      fragment.applyToMetric(metric, currentRound);
    });

    return metric;
  }
}

// AFTER (compilation-based implementation)
export class RuntimeBlockMetrics {
  static buildMetrics(
    compiledMetrics: RuntimeMetric[], 
    runtime?: RuntimeEnvironment
  ): RuntimeMetric[] {
    // Metrics are already compiled, just return them
    // Could apply runtime-specific transformations here if needed
    return compiledMetrics;
  }

  // Remove extractMetricValues method - replaced by FragmentCompilationManager
}
```
## Phase 4: JIT Integration

### 4.1 Update RuntimeJit for Fragment Compilation

**File**: `x:\wod-wiki\src\core\runtime\RuntimeJit.ts`

**Changes** (based on actual current implementation):
```typescript
// BEFORE (actual current implementation - simplified)
export class RuntimeJit {
  private strategies: RuntimeJitStrategies;
  
  constructor(strategies: RuntimeJitStrategies) {
    this.strategies = strategies;
  }

  compile(script: WodRuntimeScript): IRuntimeBlock[] {
    return script.nodes.map(node => this.compileNode(node));
  }

  private compileNode(node: PrecompiledNode): IRuntimeBlock {
    const strategy = this.strategies.getStrategy(node);
    return strategy.createBlock(node.statements, node.parent);
  }
}

// AFTER (with fragment compilation integration)
export class RuntimeJit {
  private strategies: RuntimeJitStrategies;
  private fragmentCompiler: FragmentCompilationManager;
  
  constructor(strategies: RuntimeJitStrategies) {
    this.strategies = strategies;
    this.fragmentCompiler = new FragmentCompilationManager();
  }

  compile(script: WodRuntimeScript, runtimeContext?: RuntimeJitContext): IRuntimeBlock[] {
    return script.nodes.map(node => this.compileNode(node, runtimeContext));
  }

  private compileNode(node: PrecompiledNode, runtimeContext?: RuntimeJitContext): IRuntimeBlock {
    // Step 1: Compile fragments to metrics for all statements in this node
    const compiledMetrics = this.compileNodeStatements(node.statements, runtimeContext);
    
    // Step 2: Create runtime block with compiled metrics instead of raw statements
    const strategy = this.strategies.getStrategy(node);
    return strategy.createBlock(compiledMetrics, node.parent);
  }

  private compileNodeStatements(
    statements: JitStatement[], 
    runtimeContext?: RuntimeJitContext
  ): RuntimeMetric[] {
    const allMetrics: RuntimeMetric[] = [];
    
    statements.forEach(statement => {
      const compilationContext: FragmentCompilationContext = {
        runtimeState: runtimeContext?.runtimeState || this.createDefaultRuntimeState(),
        blockContext: runtimeContext?.blockContext || this.createDefaultBlockContext(),
        parentMetrics: runtimeContext?.parentMetrics || [],
        executionDepth: runtimeContext?.executionDepth || 0,
        currentTime: Date.now(),
        currentRound: runtimeContext?.currentRound
      };

      const statementMetric = this.fragmentCompiler.compileStatementFragments(
        statement, 
        compilationContext
      );
      allMetrics.push(statementMetric);
    });

    return allMetrics;
  }

  private createDefaultRuntimeState(): RuntimeState {
    return {
      isActive: false,
      isPaused: false,
      elapsedTime: 0,
      currentRep: 0,
      currentRound: 0
    };
  }

  private createDefaultBlockContext(): BlockContext {
    return {
      blockKey: new BlockKey([]), // Empty key for default context
      parentBlock: undefined,
      childBlocks: [],
      isRepeating: false,
      iterationCount: 0
    };
  }
}

export interface RuntimeJitContext {
  readonly runtimeState: RuntimeState;
  readonly blockContext: BlockContext;
  readonly parentMetrics: RuntimeMetric[];
  readonly executionDepth: number;
  readonly currentRound?: number;
}
```

### 4.2 Update RuntimeJitStrategies for Metric-Based Blocks

**File**: `x:\wod-wiki\src\core\runtime\RuntimeJitStrategies.ts`

**Changes** (based on actual current implementation):
```typescript
// BEFORE (actual current implementation)
export interface IRuntimeBlockStrategy {
  createBlock(statements: JitStatement[], parent?: IRuntimeBlock): IRuntimeBlock;
}

export class RuntimeJitStrategies {
  private strategies = new Map<string, IRuntimeBlockStrategy>();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.register('timer', new BlockTimerStrategy());
    this.register('effort', new BlockEffortStrategy());
    this.register('repeating', new BlockRepeatingStrategy());
  }

  register(nodeType: string, strategy: IRuntimeBlockStrategy): void {
    this.strategies.set(nodeType, strategy);
  }

  getStrategy(node: PrecompiledNode): IRuntimeBlockStrategy {
    const strategy = this.strategies.get(node.type);
    if (!strategy) {
      throw new Error(`No strategy found for node type: ${node.type}`);
    }
    return strategy;
  }
}

// AFTER (metric-based strategies)
export interface IRuntimeBlockStrategy {
  createBlock(compiledMetrics: RuntimeMetric[], parent?: IRuntimeBlock): IRuntimeBlock;
}

export class RuntimeJitStrategies {
  private strategies = new Map<string, IRuntimeBlockStrategy>();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.register('timer', new BlockTimerStrategy());
    this.register('effort', new BlockEffortStrategy());
    this.register('repeating', new BlockRepeatingStrategy());
  }

  register(nodeType: string, strategy: IRuntimeBlockStrategy): void {
    this.strategies.set(nodeType, strategy);
  }

  getStrategy(node: PrecompiledNode): IRuntimeBlockStrategy {
    const strategy = this.strategies.get(node.type);
    if (!strategy) {
      throw new Error(`No strategy found for node type: ${node.type}`);
    }
    return strategy;
  }
}
```

### 4.3 Update Specific Block Strategies

**File**: `x:\wod-wiki\src\core\runtime\blocks\strategies\BlockEffortStrategy.ts`

**Changes** (based on actual current implementation):
```typescript
// BEFORE (actual current implementation)
export class BlockEffortStrategy implements IRuntimeBlockStrategy {
  createBlock(statements: JitStatement[], parent?: IRuntimeBlock): IRuntimeBlock {
    return new EffortBlock(statements, parent);
  }
}

// AFTER (metric-based implementation)
export class BlockEffortStrategy implements IRuntimeBlockStrategy {
  createBlock(compiledMetrics: RuntimeMetric[], parent?: IRuntimeBlock): IRuntimeBlock {
    return new EffortBlock(compiledMetrics, parent);
  }
}
```

**File**: `x:\wod-wiki\src\core\runtime\blocks\strategies\BlockTimerStrategy.ts`

**Changes** (similar pattern for timer strategy):
```typescript
// BEFORE
export class BlockTimerStrategy implements IRuntimeBlockStrategy {
  createBlock(statements: JitStatement[], parent?: IRuntimeBlock): IRuntimeBlock {
    return new TimerBlock(statements, parent);
  }
}

// AFTER
export class BlockTimerStrategy implements IRuntimeBlockStrategy {
  createBlock(compiledMetrics: RuntimeMetric[], parent?: IRuntimeBlock): IRuntimeBlock {
    return new TimerBlock(compiledMetrics, parent);
  }
}
```
    
    return baseTime;
  }
}
```

### 2.3 Create Fragment Compilation Registry

**New File**: `src/core/runtime/strategies/FragmentCompilationRegistry.ts`

```typescript
export class FragmentCompilationRegistry {
  private strategies = new Map<FragmentType, IFragmentCompilationStrategy<any>>();

  constructor() {
    this.registerDefaultStrategies();
  }

  register<T extends CodeFragment>(strategy: IFragmentCompilationStrategy<T>): void {
    this.strategies.set(strategy.fragmentType, strategy);
  }

  getStrategy<T extends CodeFragment>(
    fragmentType: FragmentType
  ): IFragmentCompilationStrategy<T> | undefined {
    return this.strategies.get(fragmentType);
  }

  compileFragment<T extends CodeFragment>(
    fragment: T,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    const strategy = this.getStrategy(fragment.fragmentType);
    if (!strategy) {
      throw new Error(`No compilation strategy found for fragment type: ${fragment.fragmentType}`);
    }
    
    return strategy.compile(fragment, context);
  }

## Implementation Timeline (Revised Based on Actual Codebase)

### Week 1-2: Phase 1 (Fragment Purification)
**Files to modify**: 10 fragment classes in `x:\wod-wiki\src\core\fragments\`
- Remove `applyToMetric` methods from RepFragment, EffortFragment, DistanceFragment, RoundsFragment, ResistanceFragment
- Remove empty `applyToMetric` methods from TimerFragment, IncrementFragment, LapFragment
- Remove no-op `applyToMetric` methods from ActionFragment, TextFragment
- Update `CodeFragment` interface in `x:\wod-wiki\src\core\CodeFragment.ts`
- Add `FragmentType` enumeration

### Week 3-4: Phase 2 (JIT Strategies)
**Files to create**: 6 new strategy files in `x:\wod-wiki\src\core\runtime\strategies\`
- Implement `IFragmentCompilationStrategy.ts` interface
- Create 5 compilation strategies replicating current `applyToMetric` logic
- Build `FragmentCompilationManager.ts` with statement-level compilation
- Ensure 100% behavioral compatibility with existing logic

### Week 5-6: Phase 3 (RuntimeBlock Updates)
**Files to modify**: 3 block files + 1 interface in `x:\wod-wiki\src\core\`
- Update `RuntimeBlock.ts` base class to accept `RuntimeMetric[]` instead of `JitStatement[]`
- Modify `IRuntimeBlock.ts` interface to remove `sources` property, add `compiledMetrics`
- Update specific blocks: `EffortBlock.ts`, `TimerBlock.ts`, `RepeatingBlock.ts`
- Modify `RuntimeBlockMetrics.ts` to work with pre-compiled metrics

### Week 7-8: Phase 4 (JIT Integration)
**Files to modify**: 2 JIT files + 3 strategy files in `x:\wod-wiki\src\core\runtime\`
- Update `RuntimeJit.ts` to include fragment compilation step
- Modify `RuntimeJitStrategies.ts` interface to accept `RuntimeMetric[]` parameters
- Update strategy implementations: `BlockEffortStrategy.ts`, `BlockTimerStrategy.ts`, etc.
- Add runtime context support for state-aware compilation

### Week 9: Phase 5 (Testing & Validation)
**Files to create**: 6+ test files in `x:\wod-wiki\src\core\**\__tests__\`
- Unit tests for each compilation strategy ensuring behavioral equivalence
- Integration tests for JIT compilation flow with fragment compilation
- Performance tests to validate <5ms JIT overhead requirement
- End-to-end tests validating complete fragment-to-metric transformation

## Success Metrics (Updated for Actual Implementation)

1. **Separation Completeness**: 100% of 10 fragment classes contain no metric logic
2. **Behavioral Consistency**: New compilation produces expected `RuntimeMetric` results for all fragment types
3. **Performance**: Fragment compilation adds <5ms overhead to existing JIT process
4. **Test Coverage**: >95% coverage for 5 new compilation strategies
5. **Code Quality**: Complete elimination of fragment-to-metric coupling in `RuntimeBlockMetrics.extractMetricValues`

## Risk Mitigation (Based on Actual Architecture Complexity)

1. **Performance Impact**: 
   - **Risk**: Fragment compilation adds significant JIT overhead
   - **Mitigation**: Profile actual `RuntimeBlockMetrics.extractMetricValues` performance, optimize hot paths in compilation strategies
   - **Monitoring**: Add timing instrumentation to measure compilation performance

2. **Behavioral Changes**: 
   - **Risk**: New compilation produces unexpected metrics 
   - **Mitigation**: Comprehensive unit tests for all compilation strategies, integration tests with real workout scripts
   - **Validation**: Direct comparison testing between expected and actual metric results

3. **Implementation Complexity**: 
   - **Risk**: Complex new patterns for fragment compilation
   - **Mitigation**: Clear documentation, examples, and well-defined interfaces for compilation strategies
   - **Support**: Gradual implementation with thorough testing at each phase

4. **Developer Experience**: 
   - **Risk**: Complex new patterns for fragment extension
   - **Mitigation**: Clear documentation, examples, and migration guide for fragment development patterns
   - **Support**: Maintain simple, consistent patterns for fragment creation and compilation

## Validation Against Actual Codebase Findings

Based on the extensive codebase analysis, this plan addresses the actual architectural reality:

1. **Fragment Access Patterns**: Accounts for both `statement.fragments` direct access and typed accessor methods
2. **Metric Generation Logic**: Replicates exact current behavior from `RepFragment.applyToMetric`, `EffortFragment.applyToMetric`, etc.
3. **RuntimeBlock Structure**: Works with existing `sources: JitStatement[]` property and `metrics(runtime)` method patterns
4. **JIT Flow**: Integrates with actual `RuntimeJitStrategies.getStrategy(node)` and block creation patterns
5. **Testing Requirements**: Ensures compatibility with existing `RuntimeBlockMetrics.buildMetrics` and `extractMetricValues` logic

## Conclusion

This plan establishes a clean separation of concerns for the fragment-metric architecture:

- **StatementNodes/JitStatements** contain pure data fragments (no `applyToMetric` methods)
- **RuntimeBlocks** contain pre-compiled metrics instead of raw `JitStatement[]` sources
- **JIT compilation** transforms fragments to metrics using context-aware strategies
- **Direct Implementation** focuses on clean architecture without legacy support concerns

The result is a more flexible, testable, and maintainable architecture that enables dynamic metric compilation based on runtime context while establishing clear separation of concerns between data representation and metric computation.
