# Result Block Data Structure

The Result Block is a core data structure in wod.wiki that represents the outcome and metrics of effort. This document outlines the structure, usage patterns, and integration points of result blocks within the application.

## Core Data Structures

### WodResultBlock

The `WodResultBlock` is the primary data structure for storing workout results. It is defined in `src/types/results.ts` and used throughout the application to track workout execution metrics.

```typescript
export type WodResultBlock = {
  blockId: number;      // Unique identifier for the runtime block
  index: number;        // Position within a sequence of blocks
  metrics: WodMetric[]; // Collection of performance metrics
  startDateTime: Date;  // When the block execution started
  stopDateTime: Date;   // When the block execution completed
}
```

### WodMetric

The `WodMetric` represents individual measurements within a workout block, such as repetitions, weights, or times.

```typescript
export type WodMetric = {
  blockId: number;  // Reference to parent block
  index: number;    // Position within the block
  type: string;     // Metric type (e.g., "reps", "weight", "time")
  value: number;    // Numeric value of the metric
}
```

### TimerEvent

Timer events are used to mark significant points during workout execution and are stored within result blocks.

```typescript
export type TimerEventType = 'complete' | 'stop' | 'start' | 'lap';

export type TimerEvent = {
  index: number;    // Sequential position
  blockId: number;  // Reference to parent block
  timestamp: Date;  // When the event occurred
  type: TimerEventType; // Event category
}
```

### ResultSpan

The `ResultSpan` calculates durations between timer events, providing timing metrics for workout segments.

```typescript
export class ResultSpan {
  start?: TimerEvent;
  stop?: TimerEvent;
  label?: string;
  
  duration(timestamp?: Date): number {
    let now = timestamp ?? new Date();
    return ((this.stop?.timestamp ?? now).getTime() || 0) - 
           (this.start?.timestamp.getTime() || 0);
  }
}
```

## Usage Patterns

### Creation and Update

Result blocks are primarily created and updated through the `SetResultAction` class, which is part of the action-based architecture of the runtime system. This action is dispatched when workout blocks are completed or when metrics need to be updated.

```typescript
export class SetResultAction extends EventAction {    
    constructor(
        event: RuntimeEvent,
        private results: WodResultBlock[]
    ) {
        super(event);        
    }

    apply(
        setDisplay: (display: TimerDisplay) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void {
        setResults(this.results)        
    }
}
```

### Display and Visualization

Result blocks are displayed through the `ResultsDisplay` component, which uses the `WodResults` component to render workout metrics in a tabular format.

```typescript
export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({   
  results 
}) => {
  return (
    <div className="results-display">
      {results && results.length > -1 && (
        <div className="mb-4">
          <WodResults results={results} />
        </div>
      )}        
    </div>
  );
};
```

### State Management

The result blocks are managed as part of the application state through React hooks, particularly in the `useTimerRuntime` hook:

```typescript
const [results, setResults] = useState<WodResultBlock[]>([]);
```

## Integration Points

### Runtime System

Result blocks are integrated with the runtime system through the `IRuntimeAction` interface, which includes a method to update results:

```typescript
export interface IRuntimeAction {
    apply(
        setDisplay: (display: TimerDisplay) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void;
}
```

### Compiler Strategies

Compiler strategies generate actions that can update result blocks based on workout execution. Each strategy can produce `SetResultAction` instances to update the result state.

### Data Persistence

Result blocks are designed to be persisted through the Data Store component, which can save workout results to local storage or cloud services like Supabase.

## Implementation Considerations

### Multiple Instances

The `WodResultBlock` type is defined in `src/types/results.ts` but is imported and used throughout the codebase:

1. **UI Components**: `ResultsDisplay.tsx` and `WodResults.tsx`
2. **Actions**: `SetResultAction.ts`, `SetDisplayAction.ts`, `SetButtonAction.ts`
3. **Runtime Types**: `timer.types.ts`
4. **Hooks**: `useTimerRuntime.ts`

This widespread usage indicates the central role of result blocks in the application architecture.

### Future Enhancements

The result block structure is designed to be extensible for future enhancements:

1. **Advanced Metrics**: Additional metric types can be added to capture more detailed workout data
2. **Historical Tracking**: Result blocks can be stored and compared over time
3. **Visualization**: More sophisticated visualizations can be built on top of the result data
4. **Export/Import**: Result data can be exported to or imported from external fitness tracking systems

## Best Practices

When working with result blocks in the codebase:

1. **Type Safety**: Always use the defined TypeScript interfaces for result blocks and metrics
2. **Immutability**: Treat result blocks as immutable data structures, creating new instances rather than modifying existing ones
3. **Consistency**: Maintain consistent blockId and index values across related metrics
4. **Validation**: Validate metric values before storing them in result blocks
5. **Documentation**: Document any new metric types or result block extensions

The Result Block data structure is a crucial part of wod.wiki's architecture, providing a standardized way to represent, store, and visualize workout performance metrics across the application.