Generic interface for fragment compilation strategies that transform CodeFragment instances into RuntimeMetric arrays. Implements the Strategy pattern for different fragment types, enabling modular compilation of workout script elements into structured metric data.

## Original Location
`src/core/runtime/strategies/IFragmentCompilationStrategy.ts`

## Generic Interface

### IFragmentCompilationStrategy{TFragment extends CodeFragment}

#### Properties

##### fragmentType: FragmentType
```typescript
readonly fragmentType: FragmentType
```
Identifies which fragment type this strategy handles (Effort, Rep, Distance, etc.)

#### Methods

##### compile(fragment: TFragment, context: FragmentCompilationContext): RuntimeMetric[]
Compiles a fragment into an array of runtime metrics using the provided compilation context.

**Parameters:**
- `fragment` - The fragment to compile (typed to specific fragment subclass)
- `context` - Compilation context containing runtime and block state

**Returns:** Array of RuntimeMetric objects representing the compiled fragment data

## Supporting Interfaces

### FragmentCompilationContext
Provides compilation context and state information for fragment processing.

#### Properties
- `runtimeState: RuntimeState` - Current runtime execution state
- `blockContext: BlockContext` - Block hierarchy and positioning context  
- `parentMetrics: RuntimeMetric[]` - Metrics from parent blocks
- `executionDepth: number` - Nesting depth in execution tree
- `currentTime: number` - Current execution time
- `currentRound?: number` - Current round number (optional)

### RuntimeState
Represents the current state of runtime execution.

#### Properties
- `isActive: boolean` - Whether runtime is currently active
- `isPaused: boolean` - Whether runtime is paused
- `elapsedTime: number` - Total elapsed execution time
- `currentRep: number` - Current repetition number
- `currentRound: number` - Current round number

### BlockContext
Provides context about the block hierarchy and execution structure.

#### Properties
- `blockKey: BlockKey` - Unique identifier for the block
- `parentBlock?: IRuntimeBlock` - Parent block reference (optional)
- `childBlocks: IRuntimeBlock[]` - Array of child blocks
- `isRepeating: boolean` - Whether this block repeats
- `iterationCount: number` - Number of iterations completed

## Implementation Pattern

```typescript
export class MyFragmentStrategy implements IFragmentCompilationStrategy<MyFragment> {
  readonly fragmentType = FragmentType.MyType;

  compile(
    fragment: MyFragment, 
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Validate fragment data
    if (!fragment.isValid()) {
      return [];
    }

    // Create metric from fragment
    const metric: RuntimeMetric = {
      sourceId: context.blockContext.blockKey.toString(),
      effort: fragment.effort || "",
      values: [{
        type: "my-type",
        value: fragment.value,
        unit: fragment.unit || "default"
      }]
    };

    return [metric];
  }
}
```

## Implementations

### FragmentCompilationManager

**Description**: Central manager for fragment compilation strategies that coordinates the transformation of CodeFragment instances into RuntimeMetric data. Serves as a registry and orchestrator for all fragment compilation strategies, providing a unified interface for fragment-to-metric conversion.

**Original Location**: `src/core/runtime/strategies/FragmentCompilationManager.ts`

#### Properties

##### strategies
```typescript
private strategies = new Map<FragmentType, IFragmentCompilationStrategy<any>>()
```
Registry mapping fragment types to their corresponding compilation strategies.

#### Methods

##### constructor()
Initializes the manager and registers default fragment compilation strategies for all supported fragment types.

##### registerDefaultStrategies(): void
```typescript
private registerDefaultStrategies(): void
```
Registers built-in strategies for standard fragment types:
- **RepMetricStrategy** - Repetition fragments
- **EffortMetricStrategy** - Exercise/effort fragments
- **DistanceMetricStrategy** - Distance measurement fragments
- **RoundsMetricStrategy** - Round count fragments  
- **ResistanceMetricStrategy** - Weight/resistance fragments

**Note:** ActionFragment, IncrementFragment, LapFragment, TextFragment, and TimerFragment are not registered as they have no metric impact.

##### register<T extends CodeFragment>(strategy: IFragmentCompilationStrategy<T>): void
Registers a custom fragment compilation strategy for a specific fragment type.

**Parameters:**
- `strategy` - The fragment compilation strategy to register

**Usage:**
```typescript
manager.register(new CustomFragmentStrategy());
```

##### compile(fragment: CodeFragment, context: FragmentCompilationContext): RuntimeMetric[]
Compiles a single fragment into runtime metrics using the appropriate registered strategy.

**Parameters:**
- `fragment` - The code fragment to compile
- `context` - Compilation context with runtime and block state

**Returns:** Array of RuntimeMetric objects (empty array if no strategy is registered)

##### compileStatementFragments(statement: JitStatement, context: FragmentCompilationContext): RuntimeMetric
Compiles all fragments in a JitStatement into a single merged RuntimeMetric.

**Parameters:**
- `statement` - The JitStatement containing fragments to compile
- `context` - Compilation context for the compilation process

**Returns:** Single RuntimeMetric with merged data from all fragments

**Process:**
1. Creates base metric with empty values
2. Compiles each fragment individually  
3. Merges all compiled metrics into the base metric
4. Returns the merged result

##### mergeMetrics(target: RuntimeMetric, source: RuntimeMetric): void
```typescript
private mergeMetrics(target: RuntimeMetric, source: RuntimeMetric): void
```
Merges source metric data into target metric, combining efforts and values.

**Merge Logic:**
- **Effort**: Source effort overwrites target if source has non-empty effort
- **Values**: Source values are appended to target values array

#### Usage Examples

```typescript
// Basic usage
const manager = new FragmentCompilationManager();
const metrics = manager.compile(fragment, context);

// Custom strategy registration
manager.register(new MyCustomStrategy());

// Statement compilation
const statement = getJitStatement();
const mergedMetric = manager.compileStatementFragments(statement, context);
```

#### Strategy Registry

The manager maintains strategies for these fragment types:

| Fragment Type | Strategy Class | Metric Output |
|---------------|----------------|---------------|
| Rep | RepMetricStrategy | Repetition counts |
| Effort | EffortMetricStrategy | Exercise names |
| Distance | DistanceMetricStrategy | Distance measurements |
| Rounds | RoundsMetricStrategy | Round counts |
| Resistance | ResistanceMetricStrategy | Weight/resistance values |

#### Relationships

- Manages: [[IFragmentCompiler]] implementations
- Used by: [[JitCompiler]] for fragment compilation during JIT compilation
- Processes: [[../ICodeFragment]] instances from [[JitStatement]] objects
- Produces: [[../Metrics/Metric]] arrays and merged metrics

#### Migration Context

**Phase 4**: This manager replaces the previous fragment.applyToMetric() pattern, centralizing fragment compilation logic and enabling better testing and modularity in the metrics compilation process.

#### Error Handling

- Returns empty arrays for unknown fragment types rather than throwing exceptions
- Gracefully handles fragments with no metric impact
- Provides safe merging that doesn't overwrite valid data with empty values
