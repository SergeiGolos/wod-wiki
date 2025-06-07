# BlockTimerStrategy Interface Documentation

## Description
Runtime block strategy for creating TimerBlock instances. Handles statements that contain only duration information without effort, repetitions, children, or rounds. This strategy creates pure timer blocks for countdown/countup scenarios.

## Original Location
`src/core/runtime/blocks/strategies/BlockTimerStrategy.ts`

## Implementation
Implements [[IRuntimeBlockStrategy]] interface.

## Strategy Criteria

### canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean
Returns `true` if all nodes meet the timer block criteria:

**Required Properties:**
- `hasDuration = true` - Must have duration fragments
- `hasEffort = false` - No effort/exercise fragments
- `hasRepetitions = false` - No repetition fragments  
- `hasChildren = false` - No child statements
- `hasRounds = false` - No round fragments

**Validation:**
- Must have at least one node
- All nodes must meet the criteria (using `Array.every()`)

### compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined
Creates a TimerBlock instance using pre-compiled metrics and legacy sources.

**Parameters:**
- `compiledMetrics` - Pre-compiled metrics from fragment compilation  
- `legacySources` - Original JitStatement nodes for backward compatibility
- `runtime` - Timer runtime instance (unused in current implementation)

**Returns:** New [[TimerBlock]] instance or `undefined` if compilation fails

## Examples

### Handled Statements
```
"30s"           // 30 second timer
"2m"            // 2 minute timer  
"1m30s"         // 1 minute 30 second timer
":45"           // 45 second timer (shorthand)
"5:00"          // 5 minute timer
```

### Not Handled Statements
```
"30s pushups"   // Has effort → BlockEffortStrategy
"10 pushups"    // Has repetitions → BlockEffortStrategy  
"(3) { ... }"   // Has rounds and children → GroupRepeatingStrategy
"5m AMRAP { ... }" // Has duration and children → GroupCountdownStrategy
```

## Block Creation

The strategy creates [[TimerBlock]] instances which:
- Execute pure timing functionality (countdown/countup)
- Handle timer events (start, stop, pause, resume)
- Report timer progress to UI
- Generate timer completion actions

## Usage in Strategy Manager

Priority order in [[RuntimeJitStrategies]]:
1. BlockRootStrategy
2. GroupCountdownStrategy  
3. GroupRepeatingStrategy
4. **BlockTimerStrategy** ← This strategy
5. BlockEffortStrategy

## Relationships

- Implements: [[IRuntimeBlockStrategy]]
- Creates: [[TimerBlock]] instances
- Managed by: [[RuntimeJitStrategies]]
- Processes: [[JitStatement]] nodes with duration fragments
- Uses: Pre-compiled [[RuntimeMetric]] arrays

## Migration Notes

**Phase 4**: Updated to receive pre-compiled metrics alongside legacy JitStatement sources, supporting the gradual migration from fragment-based to metrics-based compilation while maintaining backward compatibility.

## Testing

Strategy includes comprehensive unit tests covering:
- Criteria validation for various statement combinations
- Block creation with proper metrics and sources
- Edge cases and invalid input handling
- Integration with strategy manager priority system
