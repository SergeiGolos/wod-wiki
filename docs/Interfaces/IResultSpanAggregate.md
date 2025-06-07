# IResultSpanAggregate Interface Documentation

## Description
Interface for classes that aggregate statistics from ResultSpan objects. Defines the contract for pluggable aggregators that calculate specific metrics such as total repetitions, total weight moved, total distance covered, and other workout statistics.

## Original Location
`src/core/metrics/IResultSpanAggregate.ts`

## Methods

### aggregate(spans: ResultSpan[]): Record<string, any>
Process a collection of ResultSpan objects to calculate aggregated statistics.

**Parameters:**
- `spans: ResultSpan[]` — Collection of ResultSpan objects to aggregate

**Returns:** Object containing the aggregated statistics with string keys and values of any type

**Purpose:** Core method that performs the actual statistical calculation across all provided spans.

## Properties

### id: string (getter)
Gets the unique identifier for this aggregator. Used to identify the aggregator in results and for management operations.

**Usage:** Enables aggregator lookup, removal, and result organization in collections.

### displayName: string (getter)
Gets the display name for this aggregator. Used for display purposes in UI components and reports.

**Usage:** Provides human-readable names for aggregators in user interfaces and documentation.

## Implementation Guidelines

**Statistics Focus:** Each implementation should calculate one specific type of statistic or related group of statistics.

**Consistent Results:** The returned object structure should be consistent across calls for the same aggregator.

**Error Handling:** Implementations should handle edge cases like empty span collections gracefully.

**Performance:** Consider performance implications when processing large collections of spans.

## Example Implementation
```typescript
export class TotalRepetitionsAggregate implements IResultSpanAggregate {
  get id(): string { return "totalRepetitions"; }
  get displayName(): string { return "Total Repetitions"; }
  
  aggregate(spans: ResultSpan[]): Record<string, any> {
    // Calculate total repetitions across all spans
    return { total: calculatedValue };
  }
}
```

## Built-in Implementations
- [[TotalRepetitionsAggregate]] — Total repetitions across all spans
- [[TotalWeightAggregate]] — Total weight moved calculation
- [[TotalDistanceAggregate]] — Total distance covered
- [[DurationAggregate]] — Total and average duration calculations
- *Additional implementations in [[ResultSpanAggregates]]*

## Relationships
- **Implemented by:** [[ResultSpanAggregateBase]] and concrete aggregator classes
- **Used by:** [[ResultSpanAggregator]]
- **Processes:** [[ResultSpan]] collections
- **Part of:** Strategy pattern for extensible metrics calculation
