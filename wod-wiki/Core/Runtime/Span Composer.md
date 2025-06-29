Builder class for creating and managing RuntimeSpan objects during workout execution. Provides a fluent interface for constructing spans with metrics, timespans, and hierarchical relationships. Handles the lifecycle of span creation and timing management.

## Original Location
`src/core/metrics/ResultSpanBuilder.ts`

## Properties

### spans: RuntimeSpan[]
Private collection of all RuntimeSpan objects created by this builder.

### currentSpan: RuntimeSpan | null
Private reference to the currently active span being built or modified.

## Methods

### Create(block: IRuntimeBlock, metrics: RuntimeMetric[]): ResultSpanBuilder
Creates a new RuntimeSpan with the provided metrics and associates it with the specified block.

**Parameters:**
- `block: IRuntimeBlock` — The runtime block to associate with the span
- `metrics: RuntimeMetric[]` — Initial metrics to add to the span

**Returns:** The builder instance for method chaining

**Behavior:**
- Auto-stops the previous span's last timeSpan if not already stopped
- Creates new RuntimeSpan with block metadata
- Sets up blockId and blockKey from the provided block
- Initializes with provided metrics

### Additional Builder Methods
*Note: Full method documentation would require examining the complete file, as only the first 30 lines were shown*

## Usage Patterns

**Fluent Interface:** Designed for method chaining to build complex span structures:
```typescript
builder
  .Create(block, metrics)
  .AddTimeSpan(timeSpan)
  .SetDuration(duration)
```

**Lifecycle Management:** Automatically handles span transitions and cleanup during the building process.

**Metric Integration:** Seamlessly incorporates RuntimeMetric objects into the span structure.

## Key Features

**Auto-stopping:** Automatically stops previous timespans when creating new spans to prevent timing overlaps.

**Block Association:** Links spans directly to their originating runtime blocks for traceability.

**Chainable Operations:** Supports fluent interface pattern for readable span construction.

## Relationships
- **Creates:** [[Span]] objects
- **Uses:** [[../ICodeBlock]], [[../Metrics/Metric]]
- **Manages:** [[../ISpan]] lifecycle
- **Part of:** Metrics collection pipeline
