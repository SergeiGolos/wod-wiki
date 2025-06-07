# RuntimeSpan Class Documentation

## Description
Base class representing a span of runtime execution for a workout block. Contains timing information, metrics, and hierarchical positioning data. Serves as the foundation for result tracking and metrics collection during workout execution.

## Original Location
`src/core/RuntimeSpan.ts`

## Properties

### blockId?: string
Unique identifier for the associated runtime block. Links the span to its originating block for traceability.

### blockKey?: string
Hierarchical key identifying the block's position within the workout structure. Used for nested block relationships and aggregation.

### index?: number
Index position within the parent block or group. Enables ordering and identification of repeated elements.

### duration?: number
Total duration of the span execution in milliseconds. Optional as some spans may not have explicit durations.

### timeSpans: ITimeSpan[]
Array of timing information capturing start/stop events during execution. Enables detailed timing analysis and performance tracking.

### metrics: RuntimeMetric[]
Array of metrics collected during the span execution. Contains all measurable data (reps, weight, distance, etc.) for the span.

### leaf?: boolean
Indicates whether this span represents a leaf node in the execution tree. Leaf spans typically contain actual workout data rather than organizational structure.

## Usage Patterns

**Creation:** Instantiated during runtime block execution to track performance and timing data.

**Population:** Metrics and timeSpans are added as the block executes and collects data.

**Conversion:** Often converted to [[ResultSpan]] for post-execution analysis and editing.

## Key Concepts

**Hierarchical Structure:** RuntimeSpans form a tree structure mirroring the workout's logical organization through blockKey relationships.

**Real-time Collection:** Spans accumulate data during execution, providing a live view of workout progress.

**Metric Container:** Serves as the primary container for all measurable workout data at the block level.

## Relationships
- **Extended by:** [[ResultSpan]]
- **Contains:** [[RuntimeMetric]], [[ITimeSpan]]
- **References:** [[IRuntimeBlock]] via blockId
- **Used by:** [[ResultSpanBuilder]], [[ResultSpanAggregator]]
- **Part of:** Runtime execution pipeline
