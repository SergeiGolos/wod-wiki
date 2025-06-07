# ResultSpan Class Documentation

## Description
Extended version of RuntimeSpan that represents the final result of executing a workout segment. Provides editing capabilities for metric values and serves as the primary data structure for workout results and analytics.

## Original Location
`src/core/ResultSpan.ts`

## Inheritance
Extends: [[RuntimeSpan]]

## Constructor
```typescript
constructor(span: RuntimeSpan)
```
Creates a new ResultSpan from a RuntimeSpan, copying all properties including blockKey, index, timeSpans, metrics, and leaf status.

## Methods

### edit(edits: RuntimeMetricEdit[]): ResultSpan
Applies metric edits to the result span, allowing for post-execution modifications of metric values.

**Parameters:**
- `edits: RuntimeMetricEdit[]` — Array of edits to apply

**Returns:** The modified ResultSpan instance (for method chaining)

**Behavior:**
- Filters edits by matching blockKey and index
- Updates existing metric values or adds new ones based on metricType
- Preserves all other span properties

## Properties
Inherits all properties from RuntimeSpan:
- `blockId?: string` — Unique identifier for the associated block
- `blockKey?: string` — Hierarchical key identifying the block's position
- `index?: number` — Index within the parent block
- `duration?: number` — Duration in milliseconds (optional)
- `timeSpans: ITimeSpan[]` — Array of timing information
- `metrics: RuntimeMetric[]` — Array of collected metrics
- `leaf?: boolean` — Whether this is a leaf node in the execution tree

## Usage
- **Created from:** RuntimeSpan objects after block execution
- **Used by:** Metrics aggregation, result analysis, UI display
- **Modified by:** RuntimeMetricEdit operations for user corrections

## Relationships
- **Extends:** [[RuntimeSpan]]
- **Contains:** [[RuntimeMetric]], [[ITimeSpan]]
- **Modified by:** [[RuntimeMetricEdit]]
- **Processed by:** [[ResultSpanAggregator]], [[IResultSpanAggregate]]
