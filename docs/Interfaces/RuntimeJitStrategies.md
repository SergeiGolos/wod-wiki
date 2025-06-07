# RuntimeJitStrategies Interface Documentation

## Description
Strategy manager for RuntimeBlock creation in the JIT compilation system. Implements the Strategy pattern to select the appropriate block creation strategy based on JitStatement properties and characteristics. This class serves as the central coordinator for all runtime block compilation strategies.

## Original Location
`src/core/runtime/RuntimeJitStrategies.ts`

## Properties

### strategies
```typescript
private strategies: IRuntimeBlockStrategy[]
```
Array of registered runtime block strategies, ordered by priority. Strategies added later take precedence.

## Methods

### constructor()
Initializes the strategy manager with default strategies in priority order:

1. **BlockRootStrategy** - Handles root-level statements
2. **GroupCountdownStrategy** - Timed groups (AMRAPs, EMOMs) 
3. **GroupRepeatingStrategy** - Groups with rounds
4. **BlockTimerStrategy** - Pure timer blocks
5. **BlockEffortStrategy** - Effort-based blocks

### addStrategy(strategy: IRuntimeBlockStrategy): void
Adds a custom strategy to the beginning of the strategy list, giving it highest priority.

**Parameters:**
- `strategy` - The runtime block strategy to register

### compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined
Compiles statement nodes into a runtime block using the first matching strategy.

**Parameters:**
- `compiledMetrics` - Pre-compiled metrics from fragment compilation
- `legacySources` - Original statement nodes for backward compatibility
- `runtime` - The timer runtime instance

**Returns:** Compiled runtime block or undefined if no strategy matches

## Strategy Priority Order

The strategy selection follows a first-match-wins approach with this priority:

1. **Custom strategies** (added via `addStrategy()`)
2. **BlockRootStrategy** - Root statements
3. **GroupCountdownStrategy** - Time-limited groups
4. **GroupRepeatingStrategy** - Repeating groups  
5. **BlockTimerStrategy** - Duration-only statements
6. **BlockEffortStrategy** - Effort/repetition statements

## Usage Examples

```typescript
// Basic usage
const strategies = new RuntimeJitStrategies();
const block = strategies.compile(metrics, statements, runtime);

// Adding custom strategy
const customStrategy = new MyCustomStrategy();
strategies.addStrategy(customStrategy);
```

## Relationships

- Manages: [[IRuntimeBlockStrategy]] implementations
- Used by: [[RuntimeJit]] for block compilation
- Coordinates: [[BlockEffortStrategy]], [[BlockTimerStrategy]], [[GroupRepeatingStrategy]], [[GroupCountdownStrategy]], [[BlockRootStrategy]]
- Processes: [[JitStatement]] arrays into [[IRuntimeBlock]] instances

## Migration Notes

**Phase 4**: Updated to support pre-compiled metrics alongside legacy JitStatement sources, enabling gradual migration from fragment-based to metrics-based compilation.

## Error Handling

Logs warnings when no strategy matches the given statements, providing node IDs for debugging. Returns `undefined` for unmatched scenarios rather than throwing exceptions.
