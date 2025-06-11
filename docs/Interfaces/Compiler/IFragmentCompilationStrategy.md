# IFragmentCompilationStrategy Interface Documentation

## Description
Generic interface for fragment compilation strategies that transform CodeFragment instances into RuntimeMetric arrays. Implements the Strategy pattern for different fragment types, enabling modular compilation of workout script elements into structured metric data.

## Original Location
`src/core/runtime/strategies/IFragmentCompilationStrategy.ts`

## Generic Interface

### IFragmentCompilationStrategy<TFragment extends CodeFragment>

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

## Implementing Classes

- **[[RepMetricStrategy]]** - Compiles repetition fragments
- **[[EffortMetricStrategy]]** - Compiles effort/exercise fragments  
- **[[DistanceMetricStrategy]]** - Compiles distance fragments
- **[[RoundsMetricStrategy]]** - Compiles rounds fragments
- **[[ResistanceMetricStrategy]]** - Compiles resistance/weight fragments

## Usage Context

Used by [[FragmentCompilationManager]] to:
1. **Strategy Registration**: Register fragment compilation strategies by type
2. **Fragment Processing**: Compile individual fragments into metrics
3. **Context Passing**: Provide rich compilation context for strategy decisions

## Relationships

- Managed by: [[FragmentCompilationManager]]
- Processes: [[CodeFragment]] subclasses
- Produces: [[RuntimeMetric]] arrays
- Utilizes: [[BlockKey]], [[RuntimeState]], [[BlockContext]]

## Strategy Benefits

1. **Type Safety**: Generic interface ensures type-safe fragment handling
2. **Modularity**: Each fragment type has dedicated compilation logic
3. **Context Awareness**: Rich context enables sophisticated compilation decisions
4. **Extensibility**: New fragment types easily supported via new strategies
5. **Testability**: Each strategy can be tested in isolation with mock contexts
