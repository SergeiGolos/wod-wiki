# IRuntimeBlockStrategy Interface Documentation

## Description
Core interface for runtime block compilation strategies implementing the Strategy pattern. Defines the contract for transforming JitStatement nodes into executable IRuntimeBlock instances. This interface enables polymorphic block creation based on statement characteristics.

## Original Location
`src/core/runtime/blocks/strategies/IRuntimeBlockStrategy.ts`

## Methods

### canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean
Determines if this strategy can handle the given statement nodes based on their properties and characteristics.

**Parameters:**
- `nodes` - Array of JitStatement nodes to evaluate
- `runtime` - Timer runtime instance for context

**Returns:** `true` if this strategy can compile the nodes, `false` otherwise

**Strategy Decision Criteria:**
- **BlockRootStrategy**: Nodes with no parent (root statements)
- **GroupCountdownStrategy**: Nodes with duration AND children (time-limited groups)
- **GroupRepeatingStrategy**: Nodes with rounds > 1 AND children (repeating groups)
- **BlockTimerStrategy**: Nodes with duration only (no effort/reps/children/rounds)
- **BlockEffortStrategy**: Nodes with effort/repetitions (no children/rounds)

### compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined
Compiles statement nodes into an executable runtime block using pre-compiled metrics and legacy sources.

**Parameters:**
- `compiledMetrics` - Pre-compiled metrics from fragment compilation
- `legacySources` - Original statement nodes for backward compatibility
- `runtime` - Timer runtime instance

**Returns:** Compiled runtime block or `undefined` if compilation fails

## Implementation Pattern

```typescript
export class MyStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean {
    return nodes.every(node => {
      // Check node properties to determine if this strategy applies
      const hasDuration = node.durations().length > 0;
      const hasEffort = node.efforts().length > 0;
      // ... additional criteria
      return /* strategy-specific logic */;
    });
  }

  compile(
    compiledMetrics: RuntimeMetric[],
    legacySources: JitStatement[],
    runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    // Create and return appropriate block type
    return new MyBlock(compiledMetrics, legacySources);
  }
}
```

## Implementing Classes

- **[[BlockRootStrategy]]** - Root statement compilation
- **[[BlockTimerStrategy]]** - Pure timer block compilation  
- **[[BlockEffortStrategy]]** - Effort-based block compilation
- **[[GroupRepeatingStrategy]]** - Repeating group compilation
- **[[GroupCountdownStrategy]]** - Timed group compilation
- **[[BlockCompoundStrategy]]** - Simple compound statement compilation

## Usage Context

Used by [[RuntimeJitStrategies]] to:
1. **Strategy Selection**: Find the first strategy that can handle given nodes
2. **Block Compilation**: Transform statements into executable blocks
3. **Priority Ordering**: Higher-priority strategies are evaluated first

## Relationships

- Implemented by: Strategy classes in `blocks/strategies/` folder
- Managed by: [[RuntimeJitStrategies]] strategy manager
- Produces: [[IRuntimeBlock]] implementations
- Consumes: [[JitStatement]] arrays and [[RuntimeMetric]] arrays

## Migration Notes

**Phase 4**: Interface updated to support pre-compiled metrics alongside legacy JitStatement sources, enabling gradual migration from fragment-based to metrics-based compilation while maintaining backward compatibility.

## Strategy Pattern Benefits

1. **Extensibility**: Easy to add new block types via new strategies
2. **Testability**: Each strategy can be tested in isolation
3. **Separation of Concerns**: Each strategy handles one specific block type
4. **Runtime Flexibility**: Strategies can be added/removed at runtime
