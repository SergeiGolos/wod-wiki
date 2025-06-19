# ResultSpanAggregates Collection Documentation

## Description
Collection of concrete aggregator implementations that extend ResultSpanAggregateBase to provide specific statistical calculations for workout data. Each aggregator focuses on a particular type of metric aggregation across ResultSpan collections.

## Original Location
`src/core/metrics/ResultSpanAggregates.ts`

## Aggregator Implementations

### TotalRepetitionsAggregate
Calculates the total number of repetitions performed across all spans in a workout.

**ID:** `"totalRepetitions"`  
**Display Name:** `"Total Repetitions"`

**Logic:**
- Iterates through all spans and their metrics
- Filters for metric values with type "repetitions"
- Sums all repetition values found
- Returns: `{ total: number }`

### TotalWeightAggregate
Calculates the total weight moved across all spans, typically by multiplying repetitions by resistance values.

**ID:** `"totalWeight"`  
**Display Name:** `"Total Weight"`

**Logic:**
- Processes spans to find repetition and resistance metric values
- Calculates weight moved per span (reps × resistance)
- Sums across all spans
- Returns: `{ total: number, unit: string }`

### TotalDistanceAggregate
Calculates the total distance covered across all spans in a workout.

**ID:** `"totalDistance"`  
**Display Name:** `"Total Distance"`

**Logic:**
- Searches spans for distance-type metric values
- Accumulates distance values across all spans
- Handles unit conversion if necessary
- Returns: `{ total: number, unit: string }`

### DurationAggregate
Calculates timing statistics including total duration and average span duration.

**ID:** `"duration"`  
**Display Name:** `"Duration Statistics"`

**Logic:**
- Processes span durations and timeSpan data
- Calculates total workout duration
- Computes average span duration
- Returns: `{ total: number, average: number, count: number }`

### CalorieAggregate *(if implemented)*
Estimates calories burned based on activity type, duration, and intensity.

**ID:** `"calories"`  
**Display Name:** `"Calories Burned"`

### VolumeAggregate *(if implemented)*
Calculates training volume metrics combining repetitions, sets, and resistance.

**ID:** `"volume"`  
**Display Name:** `"Training Volume"`

## Usage Examples

```typescript
// Register multiple aggregators
const aggregator = new ResultSpanAggregator([
  new TotalRepetitionsAggregate(),
  new TotalWeightAggregate(),
  new TotalDistanceAggregate(),
  new DurationAggregate()
]);

// Process workout results
const results = aggregator.aggregate(resultSpans);
// Results structure:
// {
//   "totalRepetitions": { total: 150 },
//   "totalWeight": { total: 5000, unit: "lbs" },
//   "totalDistance": { total: 2.5, unit: "miles" },
//   "duration": { total: 1800000, average: 300000, count: 6 }
// }
```

## Extension Pattern

To create custom aggregators:

```typescript
export class CustomMetricAggregate extends ResultSpanAggregateBase {
  constructor() {
    super("customMetric", "Custom Metric");
  }

  public aggregate(spans: ResultSpan[]): Record<string, any> {
    // Custom aggregation logic
    let customValue = 0;
    
    spans.forEach(span => {
      // Process span metrics for custom calculation
      customValue += calculateCustomValue(span);
    });

    return { 
      value: customValue,
      unit: "custom-units",
      metadata: { /* additional info */ }
    };
  }
}
```

## Key Features

**Specialized Calculations:** Each aggregator focuses on one type of metric for clarity and maintainability.

**Consistent Interface:** All aggregators follow the same pattern through ResultSpanAggregateBase.

**Extensible Design:** Easy to add new aggregators for custom metrics without modifying existing code.

**Unit Handling:** Aggregators manage appropriate units and conversions for their metric types.

## Relationships
- **Extends:** [[ResultSpanAggregateBase]]
- **Implements:** [[IMetricsAggregate]]
- **Used by:** [[ResultSpanAggregator]]
- **Processes:** [[ResultSpan]] and [[Metric]] data
- **Part of:** Metrics analysis and reporting system
