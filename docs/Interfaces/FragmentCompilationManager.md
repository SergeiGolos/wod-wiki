# FragmentCompilationManager Interface Documentation

## Description
Central manager for fragment compilation strategies that coordinates the transformation of CodeFragment instances into RuntimeMetric data. Serves as a registry and orchestrator for all fragment compilation strategies, providing a unified interface for fragment-to-metric conversion.

## Original Location
`src/core/runtime/strategies/FragmentCompilationManager.ts`

## Properties

### strategies
```typescript
private strategies = new Map<FragmentType, IFragmentCompilationStrategy<any>>()
```
Registry mapping fragment types to their corresponding compilation strategies.

## Methods

### constructor()
Initializes the manager and registers default fragment compilation strategies for all supported fragment types.

### registerDefaultStrategies(): void
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

### register<T extends CodeFragment>(strategy: IFragmentCompilationStrategy<T>): void
Registers a custom fragment compilation strategy for a specific fragment type.

**Parameters:**
- `strategy` - The fragment compilation strategy to register

**Usage:**
```typescript
manager.register(new CustomFragmentStrategy());
```

### compile(fragment: CodeFragment, context: FragmentCompilationContext): RuntimeMetric[]
Compiles a single fragment into runtime metrics using the appropriate registered strategy.

**Parameters:**
- `fragment` - The code fragment to compile
- `context` - Compilation context with runtime and block state

**Returns:** Array of RuntimeMetric objects (empty array if no strategy is registered)

### compileStatementFragments(statement: JitStatement, context: FragmentCompilationContext): RuntimeMetric
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

### mergeMetrics(target: RuntimeMetric, source: RuntimeMetric): void
```typescript
private mergeMetrics(target: RuntimeMetric, source: RuntimeMetric): void
```
Merges source metric data into target metric, combining efforts and values.

**Merge Logic:**
- **Effort**: Source effort overwrites target if source has non-empty effort
- **Values**: Source values are appended to target values array

## Usage Examples

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

## Strategy Registry

The manager maintains strategies for these fragment types:

| Fragment Type | Strategy Class | Metric Output |
|---------------|----------------|---------------|
| Rep | RepMetricStrategy | Repetition counts |
| Effort | EffortMetricStrategy | Exercise names |
| Distance | DistanceMetricStrategy | Distance measurements |
| Rounds | RoundsMetricStrategy | Round counts |
| Resistance | ResistanceMetricStrategy | Weight/resistance values |

## Relationships

- Manages: [[IFragmentCompilationStrategy]] implementations
- Used by: [[RuntimeJit]] for fragment compilation during JIT compilation
- Processes: [[CodeFragment]] instances from [[JitStatement]] objects
- Produces: [[RuntimeMetric]] arrays and merged metrics

## Migration Context

**Phase 4**: This manager replaces the previous fragment.applyToMetric() pattern, centralizing fragment compilation logic and enabling better testing and modularity in the metrics compilation process.

## Error Handling

- Returns empty arrays for unknown fragment types rather than throwing exceptions
- Gracefully handles fragments with no metric impact
- Provides safe merging that doesn't overwrite valid data with empty values
