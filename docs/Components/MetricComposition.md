# Metric Composition System Documentation

## Overview

The Metric Composition System provides a flexible way to generate, extract, and aggregate metrics from runtime blocks and spans. The system is built around the `IMetricCompositionStrategy` interface and provides specialized implementations for different types of blocks and aggregation strategies.

## Architecture

1. **IMetricCompositionStrategy** - Interface defining the contract for metric composition:
   ```typescript
   export interface IMetricCompositionStrategy {
     composeMetrics(block: IRuntimeBlock, runtime: ITimerRuntime): RuntimeMetric[];
   }
   ```

2. **MetricCompositionStrategy** - Base implementation that:
   - Extracts metrics from spans if available
   - Falls back to extracting metrics from sources if needed
   - Provides utility methods for combining and manipulating metrics

3. **Specialized Strategies** - Customized metric composition for specific block types:
   - **EffortMetricCompositionStrategy** - For blocks representing specific exercises/efforts
   - **RepetitionMetricCompositionStrategy** - For blocks involving repetitions, rounds, or other multipliers

## Usage

### Basic Usage

The `RuntimeBlock` class now initializes with a default `MetricCompositionStrategy`:

```typescript
constructor(public sources: JitStatement[]) {
  // ...other initialization
  this.metricCompositionStrategy = new MetricCompositionStrategy();
}
```

This ensures that every block has a strategy for composing metrics, which is used in the `composeMetrics` method:

```typescript
public composeMetrics(runtime: ITimerRuntime): RuntimeMetric[] {
  return this.metricCompositionStrategy!.metrics(this, runtime);
}
```

### Custom Strategy Implementation

Blocks with specialized metric needs can override the default strategy:

```typescript
// In a specialized block constructor
constructor(public sources: JitStatement[]) {
  super(sources);
  this.metricCompositionStrategy = new EffortMetricCompositionStrategy();
}
```

### Combining Child Metrics

The base `MetricCompositionStrategy` provides methods for combining metrics from child blocks based on different relationship types:

- **ADD** - Metrics from child blocks are summed
- **MULTIPLY** - Metrics are multiplied by a factor (e.g., number of rounds)
- **INHERIT** - Metrics are passed through without modification

## Example: RepetitionMetricCompositionStrategy

For blocks that involve repetitions (like RepeatingBlock), the strategy can be configured with round count and group type:

```typescript
const strategy = new RepetitionMetricCompositionStrategy(3, 'compose');
```

The strategy then applies appropriate metric relationships based on the group type:
- 'compose' - Sum composed child metrics, then multiply by rounds
- 'round' - Sum metrics from each child execution across rounds
- 'repeat' - Sum total metrics from each child's full execution

## Integration with ResultSpan

The metric composition system is designed to work with the RuntimeSpan system, extracting metrics from spans where available and falling back to source-based extraction only when necessary.

This enables a more unified and consistent approach to metrics management throughout the runtime system.