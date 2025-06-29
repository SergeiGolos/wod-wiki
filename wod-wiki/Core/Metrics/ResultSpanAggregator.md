# ResultSpanAggregator Class Documentation

## Description
Service class for aggregating statistics from ResultSpan collections using pluggable IResultSpanAggregate implementations. Provides a flexible framework for calculating workout summary statistics and performance metrics.

## Original Location
`src/core/metrics/ResultSpanAggregator.ts`

## Properties

### aggregators: IResultSpanAggregate[]
Read-only collection of registered aggregator implementations. Each aggregator calculates specific types of statistics from ResultSpan data.

## Constructor
```typescript
constructor(aggregators: IResultSpanAggregate[] = [])
```
Creates a new ResultSpanAggregator with an optional initial collection of aggregators.

## Methods

### add(aggregator: IResultSpanAggregate): ResultSpanAggregator
Adds an aggregator to the collection for use in statistics calculations.

**Parameters:**
- `aggregator: IResultSpanAggregate` — The aggregator implementation to add

**Returns:** This instance for method chaining

### remove(id: string): ResultSpanAggregator
Removes an aggregator from the collection by its unique identifier.

**Parameters:**
- `id: string` — The unique identifier of the aggregator to remove

**Returns:** This instance for method chaining

### aggregate(spans: ResultSpan[]): Record<string, Record<string, any>>
Processes ResultSpan collection through all registered aggregators and returns compiled statistics.

**Parameters:**
- `spans: ResultSpan[]` — Collection of result spans to aggregate

**Returns:** Object keyed by aggregator ID, containing each aggregator's calculated statistics

## Usage Patterns

**Plugin Architecture:** Supports adding custom aggregators for specialized statistics:
```typescript
aggregator
  .add(new TotalRepetitionsAggregate())
  .add(new TotalWeightAggregate())
  .aggregate(resultSpans)
```

**Bulk Processing:** Efficiently processes large collections of ResultSpan objects.

**Extensible Statistics:** Easy to add new types of calculations without modifying core logic.

## Key Features

**Modular Design:** Aggregators are independent and can be mixed and matched as needed.

**Fluent Interface:** Supports method chaining for readable configuration.

**Type Safety:** Strongly typed interfaces ensure reliable aggregator implementations.

## Built-in Aggregators
- [[TotalRepetitionsAggregate]] — Calculates total repetitions across spans
- [[TotalWeightAggregate]] — Calculates total weight moved
- [[TotalDistanceAggregate]] — Calculates total distance covered
- *Additional aggregators in [[ResultSpanAggregates]]*

## Relationships
- **Uses:** [[IMetricsAggregate]] implementations
- **Processes:** [[ResultSpan]] collections
- **Extends:** [[ResultSpanAggregateBase]] for built-in aggregators
- **Part of:** Metrics analysis and reporting pipeline
