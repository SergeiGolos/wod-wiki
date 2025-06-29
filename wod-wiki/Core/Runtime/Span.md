
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
- **Contains:** [[../Metrics/Metric]], [[../ISpan]]
- **References:** [[../ICodeBlock]] via blockId
- **Used by:** [[Span Composer]], [[ResultSpanAggregator]]
- **Part of:** Runtime execution pipeline

---

## Implementations

### ResultSpan Class Documentation

#### Description
Extended version of RuntimeSpan that represents the final result of executing a workout segment. Provides editing capabilities for metric values and serves as the primary data structure for workout results and analytics.

#### Original Location
`src/core/ResultSpan.ts`

#### Inheritance
Extends: [[Span]]

#### Constructor
```typescript
constructor(span: RuntimeSpan)
```
Creates a new ResultSpan from a RuntimeSpan, copying all properties including blockKey, index, timeSpans, metrics, and leaf status.

#### Methods

##### edit(edits: RuntimeMetricEdit[]): ResultSpan
Applies metric edits to the result span, allowing for post-execution modifications of metric values.

**Parameters:**
- `edits: RuntimeMetricEdit[]` — Array of edits to apply

**Returns:** The modified ResultSpan instance (for method chaining)

**Behavior:**
- Filters edits by matching blockKey and index
- Updates existing metric values or adds new ones based on metricType
- Preserves all other span properties

#### Properties
Inherits all properties from RuntimeSpan:
- `blockId?: string` — Unique identifier for the associated block
- `blockKey?: string` — Hierarchical key identifying the block's position
- `index?: number` — Index within the parent block
- `duration?: number` — Duration in milliseconds (optional)
- `timeSpans: ITimeSpan[]` — Array of timing information
- `metrics: RuntimeMetric[]` — Array of collected metrics
- `leaf?: boolean` — Whether this is a leaf node in the execution tree

#### Usage
- **Created from:** RuntimeSpan objects after block execution
- **Used by:** Metrics aggregation, result analysis, UI display
- **Modified by:** RuntimeMetricEdit operations for user corrections

#### Relationships
- **Extends:** [[Span]]
- **Contains:** [[../Metrics/Metric]], [[../ISpan]]
- **Modified by:** [[RuntimeMetricEdit]]
- **Processed by:** [[ResultSpanAggregator]], [[IMetricsAggregate]]
