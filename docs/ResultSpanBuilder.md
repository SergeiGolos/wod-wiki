# ResultSpanBuilder Pattern

## Overview

The `ResultSpanBuilder` provides a consistent, fluent interface for creating and managing `RuntimeSpan` objects across the application. It follows the builder pattern to simplify the creation of complex span objects and standardize how metrics are recorded.

## Builder Interface

The `ResultSpanBuilder` exposes these key methods:

- `Create(metrics: RuntimeMetric[])` - Creates a new RuntimeSpan with the passed in metrics creating an empty array for the timespans.
- `Inherit(value: MetricValue)` - Allows a value metric to populate a MetricValue if the current type metric value is not already on the RuntimeMetric item in the collection.
- `Override(value: MetricValue)` - Allows a metric value to override all the child RuntimeMetric values if they are there or not.
- `Start()` - Creates a start timespan.
- `Stop()` - Stops a timespan.
- `Current()` - Returns the last ResultSpan in the list.
- `All()` - Returns the list of all spans.
- `ForBlock(block: IRuntimeBlock)` - Associates spans with a specific runtime block.

## Usage Example

```typescript
// Create a new span with metrics
const builder = new ResultSpanBuilder()
  .Create(block.metrics(runtime))
  .Start();

// Record some metrics
builder.Inherit({ 
  type: "repetitions", 
  value: 10, 
  unit: "reps" 
});

// Finish the span
builder.Stop();

// Get the finalized span
const span = builder.Current();
```

## Integration with ResultSpanRegistry

The `ResultSpanRegistry` class maintains an internal `ResultSpanBuilder` instance and delegates to it for span creation and management. This provides a consistent API for working with spans across the application.

```typescript
// Using the registry's builder methods
registry.Create(metrics)
  .Start()
  .Inherit(someValue)
  .Stop();

// Access the current span
const currentSpan = registry.Current();

// Get all spans
const allSpans = registry.All();
```

## Benefits

1. **Standardized span creation** - Ensures spans are created consistently throughout the application
2. **Fluent interface** - Provides a readable, chainable API
3. **Encapsulation** - Hides the details of span creation and modification
4. **Centralized span management** - Handles spans through the registry
5. **Cleaner code** - Reduces duplication in the RuntimeBlock implementations