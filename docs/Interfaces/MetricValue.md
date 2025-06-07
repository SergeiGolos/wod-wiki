# MetricValue Type Documentation

## Description
Core data structure representing a single measured value in the workout system. Provides a standardized format for all metric data with type classification, numeric value, and unit information.

## Original Location
`src/core/MetricValue.ts`

## Type Definition
```typescript
export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp" | "rounds";
  value: number;
  unit: string;
};
```

## Properties

### type: "repetitions" | "resistance" | "distance" | "timestamp" | "rounds"
Discriminated union specifying the category of measurement this value represents.

**Supported Types:**
- `"repetitions"` — Count of exercise repetitions performed
- `"resistance"` — Weight, load, or resistance level used
- `"distance"` — Linear distance covered (running, rowing, etc.)
- `"timestamp"` — Time-based measurements
- `"rounds"` — Number of rounds or cycles completed

### value: number
Numeric measurement value. Always stored as a number regardless of the metric type.

**Purpose:** Provides the quantitative data for calculations, comparisons, and aggregations.

**Format:** Decimal number supporting both integers and floating-point values.

### unit: string
String identifier for the unit of measurement.

**Purpose:** Provides context for the numeric value and enables proper display and unit conversions.

**Examples:**
- `"reps"`, `"repetitions"` for repetition counts
- `"lbs"`, `"kg"`, `"pounds"` for resistance/weight
- `"m"`, `"km"`, `"miles"`, `"meters"` for distance
- `"ms"`, `"seconds"`, `"minutes"` for timestamps
- `"rounds"`, `"cycles"` for round counts

## Usage Examples

**Repetition Metric:**
```typescript
const repValue: MetricValue = {
  type: "repetitions",
  value: 15,
  unit: "reps"
};
```

**Resistance Metric:**
```typescript
const weightValue: MetricValue = {
  type: "resistance",
  value: 135,
  unit: "lbs"
};
```

**Distance Metric:**
```typescript
const distanceValue: MetricValue = {
  type: "distance",
  value: 500,
  unit: "meters"
};
```

**Timestamp Metric:**
```typescript
const timeValue: MetricValue = {
  type: "timestamp",
  value: 120000,
  unit: "ms"
};
```

## Validation Considerations

**Type-Unit Consistency:** Ensure unit strings are appropriate for their metric types:
- Repetitions: counting units (`"reps"`, `"repetitions"`)
- Resistance: weight/force units (`"lbs"`, `"kg"`, `"N"`)
- Distance: length units (`"m"`, `"ft"`, `"km"`, `"miles"`)
- Timestamp: time units (`"ms"`, `"s"`, `"min"`)
- Rounds: counting units (`"rounds"`, `"cycles"`)

**Value Bounds:** Consider reasonable ranges for each metric type:
- Repetitions: typically positive integers
- Resistance: positive numbers
- Distance: positive numbers
- Timestamp: non-negative numbers
- Rounds: positive integers

## Key Features

**Type Safety:** Discriminated union enables type-specific handling and validation.

**Unit Flexibility:** String-based units support various measurement systems and preferences.

**Numeric Precision:** Number type supports both whole and fractional values as needed.

**Standardized Format:** Consistent structure across all metric types simplifies processing.

## Relationships
- **Used by:** [[RuntimeMetric]], [[RuntimeMetricEdit]]
- **Part of:** [[ResultSpan]], [[RuntimeSpan]]
- **Processed by:** [[IResultSpanAggregate]] implementations
- **Core component:** Metrics collection and analysis system
