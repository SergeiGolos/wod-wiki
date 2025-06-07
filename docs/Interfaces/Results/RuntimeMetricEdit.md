# RuntimeMetricEdit Type Documentation

## Description
Type representing an instruction to update a specific metric value for a result span. Used to modify workout results after execution, enabling user corrections and data adjustments while maintaining an audit trail of changes.

## Original Location
`src/core/RuntimeMetricEdit.ts`

## Type Definition
```typescript
export type RuntimeMetricEdit = {
  blockKey: string;
  index: number;
  metricType: "repetitions" | "resistance" | "distance";
  newValue: MetricValue;
  createdAt: Date;
};
```

## Properties

### blockKey: string
Hierarchical identifier for the target block whose metric should be updated. Used to locate the specific span within the workout structure.

**Purpose:** Enables precise targeting of metrics within complex, nested workout structures.

### index: number
Index position within the target block for multi-instance scenarios (e.g., multiple rounds, sets).

**Purpose:** Distinguishes between different instances of the same block type when edits need to target specific occurrences.

### metricType: "repetitions" | "resistance" | "distance"
Discriminated union specifying which type of metric value should be updated.

**Supported Types:**
- `"repetitions"` — Number of repetitions performed
- `"resistance"` — Weight or resistance used
- `"distance"` — Distance covered

### newValue: MetricValue
The new metric value to replace the existing value. Must be a properly formatted MetricValue object.

**Purpose:** Contains the actual replacement data including value, unit, and metadata.

### createdAt: Date
Timestamp indicating when the edit instruction was created.

**Purpose:** Provides audit trail and enables temporal tracking of result modifications.

## Usage Patterns

**Post-workout Corrections:**
```typescript
const edit: RuntimeMetricEdit = {
  blockKey: "workout.round1.exercise1",
  index: 0,
  metricType: "repetitions",
  newValue: { type: "repetitions", value: 12, unit: "reps" },
  createdAt: new Date()
};

resultSpan.edit([edit]);
```

**Batch Edits:**
```typescript
const edits: RuntimeMetricEdit[] = [
  {
    blockKey: "workout.round1.exercise1",
    index: 0,
    metricType: "repetitions",
    newValue: { type: "repetitions", value: 12, unit: "reps" },
    createdAt: new Date()
  },
  {
    blockKey: "workout.round1.exercise1",
    index: 0,
    metricType: "resistance",
    newValue: { type: "resistance", value: 135, unit: "lbs" },
    createdAt: new Date()
  }
];

resultSpan.edit(edits);
```

## Key Features

**Targeted Updates:** Precise addressing system using blockKey and index to target specific metrics.

**Type Safety:** Strongly typed metricType ensures only valid metric types can be edited.

**Audit Trail:** createdAt timestamp enables tracking of when modifications were made.

**Batch Support:** Multiple edits can be applied together for atomic updates.

## Validation Considerations

**BlockKey Validation:** Ensure blockKey matches existing spans in the result set.

**Index Bounds:** Verify index is within valid range for the target block.

**Value Compatibility:** Ensure newValue is compatible with the specified metricType.

**Unit Consistency:** Verify units in newValue are appropriate for the metric type.

## Relationships
- **References:** [[MetricValue]] for replacement values
- **Used by:** [[ResultSpan]].edit() method
- **Targets:** [[RuntimeMetric]] values within [[ResultSpan]]
- **Part of:** Post-execution result modification system
