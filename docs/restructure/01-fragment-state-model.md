# Fragment State Model: Plan, Record, & Analysis

In the new architecture, a `RuntimeBlock` is a container for a collection of Fragments. These fragments evolve through three distinct stages of the lifecycle.

## 1. The Plan (Defined Fragments)
These are created by the **Parser** and the **Compiler**. They represent the "Target" or "Intent" of the workout.

*   **Behavior**: `MetricBehavior.Defined` or `MetricBehavior.Hint`.
*   **Examples**:
    *   `DurationFragment`: "5:00"
    *   `RoundsFragment`: "3 Rounds"
    *   `EffortFragment`: "Burpees"
    *   `TargetRepsFragment`: "21-15-9"

## 2. The Record (Recorded Fragments)
These are created and updated by **Processors** during execution. They represent the "Ground Truth" of what happened.

*   **Behavior**: `MetricBehavior.Recorded`.
*   **Examples**:
    *   `SpansFragment`: The actual start/stop timestamps.
    *   `CurrentRoundFragment`: Which round is currently active.
    *   `ActualRepsFragment`: Collected via user input or sensor.
    *   `HeartRateFragment`: Recorded from a wearable.

## 3. The Analysis (Calculated Fragments)
These are derived from the Plan and the Record. They represent the "Results" or "Insights."

*   **Behavior**: `MetricBehavior.Calculated`.
*   **Examples**:
    *   `ElapsedFragment`: Sum of active time in `SpansFragment`.
    *   `TotalFragment`: Wall-clock time from start to finish.
    *   `WorkCapacityFragment`: Joules or reps per minute.

---

## Fragment Schema Evolution

Every fragment should support these standard fields to enable generic processing:

```typescript
interface ICodeFragment {
  fragmentType: string;      // 'duration', 'reps', 'pose'
  behavior: MetricBehavior;  // Defined, Recorded, Calculated
  origin: FragmentOrigin;    // 'parser', 'runtime', 'user'
  value: any;                // The typed payload (ms, count, etc)
  
  // Metadata for traceablity
  timestamp?: Date;
  sourceBlockKey?: string;
}
```

## Storage: The "Fragment Bucket"

A Block no longer uses `MemoryLocations` indexed by string tags. Instead, it holds a flat or grouped list of Fragments.

```typescript
class RuntimeBlock {
    // A flat list of fragments is often enough. 
    // Grouping is only needed for multi-movement blocks (e.g. Supersets).
    fragments: ICodeFragment[];
    
    // Helper to get fragments by intent
    getPlan() { return this.fragments.filter(f => f.behavior === 'defined'); }
    getRecord() { return this.fragments.filter(f => f.behavior === 'recorded'); }
}
```
