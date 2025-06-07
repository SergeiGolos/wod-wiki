# ResultSpanAggregateBase Abstract Class Documentation

## Description
Abstract base class for ResultSpan aggregators that provides common functionality for all aggregator implementations. Implements the basic infrastructure needed by IResultSpanAggregate while leaving the specific aggregation logic to derived classes.

## Original Location
`src/core/metrics/ResultSpanAggregateBase.ts`

## Inheritance
**Implements:** [[IResultSpanAggregate]]

## Constructor
```typescript
constructor(id: string, displayName: string)
```
Creates a new instance of ResultSpanAggregateBase with the specified identifier and display name.

**Parameters:**
- `id: string` — Unique identifier for this aggregator
- `displayName: string` — Human-readable display name for this aggregator

## Properties

### id: string (getter)
Returns the unique identifier for this aggregator, as provided in the constructor.

### displayName: string (getter)
Returns the human-readable display name for this aggregator, as provided in the constructor.

## Abstract Methods

### aggregate(spans: ResultSpan[]): Record<string, any>
Abstract method that must be implemented by derived classes to perform the actual aggregation logic.

**Parameters:**
- `spans: ResultSpan[]` — Collection of ResultSpan objects to aggregate

**Returns:** Object containing the aggregated statistics

## Usage Patterns

**Template Method Pattern:** Provides the common structure while requiring derived classes to implement specific aggregation logic:

```typescript
export class CustomAggregate extends ResultSpanAggregateBase {
  constructor() {
    super("customId", "Custom Aggregate");
  }
  
  public aggregate(spans: ResultSpan[]): Record<string, any> {
    // Implementation-specific aggregation logic
    return { result: calculatedValue };
  }
}
```

**Consistent Interface:** Ensures all aggregators have proper id and displayName management without code duplication.

## Key Benefits

**Reduced Boilerplate:** Eliminates the need for each aggregator to manage id and displayName properties.

**Consistent Implementation:** Ensures all derived aggregators follow the same pattern for basic functionality.

**Type Safety:** Provides compile-time enforcement of the IResultSpanAggregate contract.

## Built-in Derived Classes
- [[TotalRepetitionsAggregate]]
- [[TotalWeightAggregate]]
- [[TotalDistanceAggregate]]
- [[DurationAggregate]]
- *Additional implementations in [[ResultSpanAggregates]]*

## Relationships
- **Implements:** [[IResultSpanAggregate]]
- **Extended by:** Concrete aggregator implementations
- **Used by:** [[ResultSpanAggregator]]
- **Part of:** Template Method pattern for aggregator infrastructure
