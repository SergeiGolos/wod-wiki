# Metrics Collection

The Metrics Collection system tracks performance data during workout execution. This data is essential for logging, analysis, and progress tracking.

## Overview

As the runtime engine executes blocks, it generates `RuntimeMetric` objects. These are collected by the `MetricCollector`.

## Data Structures

### RuntimeMetric
A `RuntimeMetric` represents a consolidated record of performance for a specific segment (usually an exercise).

```typescript
interface RuntimeMetric {
  exerciseId: string;
  values: MetricValue[];
  timeSpans: TimeSpan[];
}
```

### MetricValue
Represents a specific dimension of data.

- **Type**: `repetitions`, `resistance`, `distance`, `time`, etc.
- **Value**: The numeric value (e.g., `10`, `95`).
- **Unit**: The unit of measurement (e.g., `lb`, `kg`, `m`).

### TimeSpan
Tracks exactly when the activity occurred.

```typescript
interface TimeSpan {
  start: Date;
  stop: Date;
}
```

## Collection Process

1.  **Execution**: When a `RuntimeBlock` completes (or updates), it reports metrics.
2.  **Aggregation**: The metric data (reps performed, time taken) is packaged into a `RuntimeMetric`.
3.  **Storage**: The `MetricCollector` stores these metrics in memory.
4.  **Retrieval**: The UI or analysis tools can query the collector via `getMetrics()`.

## Usage

Metrics are used to:
- Display a summary of the workout (e.g., total reps, total volume).
- Generate charts or graphs.
- Populate a user's workout history.
