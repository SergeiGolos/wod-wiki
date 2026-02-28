# Analytics Projection: Reactive Outputs

In the new architecture, **Analytics** (represented by `OutputStatements`) are no longer "emitted" manually by behaviors. Instead, they are **projected snapshots** of a block's fragment bucket.

## 1. The Analytics Engine

The `AnalyticsEngine` (or `OutputCollector`) observes the state of the active block and projects it into formatted statements for the UI.

## 2. Projection Moments (Lifecycle)

The engine automatically generates outputs at key moments:

| Moment | Type | Content |
| :--- | :--- | :--- |
| **Push** (Start) | `load` | All `Defined` fragments from the script. |
| **Update** (Change) | `milestone` | All `Recorded` fragments (e.g., Round 1 Complete). |
| **Pop** (Finish) | `segment` | Final snapshot: Plan + Record + Calculated Results. |

## 3. Composing the "Record"

The "Record" for a block is literally just a collection of its fragments at the moment it completes.

```typescript
// PROJECTOR LOGIC (Simplified)
const projectRecord = (block: IRuntimeBlock): OutputStatement => {
    return new OutputStatement({
        outputType: 'segment',
        // Merge Plan, Record, and Calculated fragments into a single row
        fragments: [
            ...block.getPlan(),
            ...block.getRecord(),
            ...calculateResults(block) // e.g., Elapsed time
        ]
    });
}
```

## 4. Key Advantages

- **Consistency**: The analytics always match the execution state because they *are* the execution state.
- **Declarative Formatting**: The UI can format fragments based on their `fragmentType`. A `DurationFragment` always looks like a timer; a `RepFragment` always looks like a counter.
- **Persistence**: Saving a workout "Record" just means serializing the final fragment bucket. No custom DTOs or complex mapping required.
