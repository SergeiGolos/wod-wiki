# ITimeSpan Interface Documentation

## Description
Interface representing a time span with start and stop events, used to track the timing of workout segments. Provides detailed timing information with optional metric association for performance analysis and execution tracking.

## Original Location
`src/core/ITimeSpan.ts`

## Properties

### start?: IRuntimeEvent
Optional runtime event marking the beginning of the time span.

**Purpose:** Captures the precise moment when a workout segment begins, including timestamp and event metadata.

**Usage:** Used for calculating durations, analyzing timing patterns, and providing detailed execution logs.

### stop?: IRuntimeEvent
Optional runtime event marking the end of the time span.

**Purpose:** Captures the precise moment when a workout segment ends, enabling duration calculation and timing analysis.

**Usage:** Combined with start event to determine total execution time and segment completion status.

### blockKey?: string
Optional hierarchical identifier linking this time span to a specific block in the workout structure.

**Purpose:** Associates timing data with specific workout segments for targeted analysis and reporting.

**Usage:** Enables filtering and grouping of timing data by workout structure elements.

### metrics?: RuntimeMetric[]
Optional array of metrics collected during this specific time span.

**Purpose:** Links performance metrics directly to their timing context for granular analysis.

**Usage:** Enables correlation between timing and performance data at the span level.

## Usage Patterns

**Basic Timing:**
```typescript
const timeSpan: ITimeSpan = {
  start: { name: "segment_start", timestamp: startTime },
  stop: { name: "segment_end", timestamp: endTime }
};
```

**Block-Associated Timing:**
```typescript
const blockTimeSpan: ITimeSpan = {
  start: { name: "block_start", timestamp: startTime },
  stop: { name: "block_end", timestamp: endTime },
  blockKey: "workout.round1.exercise1"
};
```

**Metric-Enhanced Timing:**
```typescript
const metricTimeSpan: ITimeSpan = {
  start: { name: "exercise_start", timestamp: startTime },
  stop: { name: "exercise_end", timestamp: endTime },
  blockKey: "workout.round1.exercise1",
  metrics: [repMetric, resistanceMetric]
};
```

## Duration Calculation
While the interface doesn't include duration directly, it can be calculated from start and stop events:

```typescript
function calculateDuration(timeSpan: ITimeSpan): number | undefined {
  if (timeSpan.start?.timestamp && timeSpan.stop?.timestamp) {
    return timeSpan.stop.timestamp.getTime() - timeSpan.start.timestamp.getTime();
  }
  return undefined;
}
```

## State Scenarios

**Active Span:** Has start event but no stop event (currently executing)
**Completed Span:** Has both start and stop events (execution finished)
**Pending Span:** Has neither start nor stop event (not yet started)

## Key Features

**Optional Events:** Flexibility to track spans that may not have clear start/stop boundaries.

**Hierarchical Association:** Links timing data to specific blocks in the workout structure.

**Metric Context:** Associates performance metrics with their temporal context.

**Event-Driven:** Uses IRuntimeEvent objects for detailed event information beyond simple timestamps.

## Relationships
- **References:** [[IRuntimeEvent]] for start and stop events
- **Contains:** [[Metrics/Metric]] arrays for span-specific metrics
- **Used by:** [[Runtime/Span]], [[ResultSpan]]
- **Part of:** Timing and execution tracking system
