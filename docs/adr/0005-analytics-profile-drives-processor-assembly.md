# Analytics Profile Replaces Hardcoded Stage Assembly

Analytics processor selection is driven by an `IAnalyticsProfile` that accepts an
`AnalyticsContext` (dialect, script metric types, optional user profile) and returns
the configured set of `IRealtimeProcessor` and `ISummaryProcessor` instances for the
session. This replaces the imperative `addStage()` list in `useWorkbenchRuntime`.

**Status**: proposed

## Why This Matters

The previous pattern — instantiate all processors unconditionally at the call site —
meant every processor ran for every workout regardless of relevance. Adding a new
processor required editing the call site. Neither dialect nor user preferences had any
influence over which calculations ran. The `DialectRegistry` (which already routes
parse-time hints based on workout type) had no connection to the analytics pipeline.

## Shape

```
IAnalyticsProfile.build(context: AnalyticsContext) → {
  realtime: IRealtimeProcessor[]
  summary:  ISummaryProcessor[]
}

AnalyticsContext {
  dialect:            string           // 'wod' | 'log' | 'plan'
  scriptMetricTypes:  MetricType[]     // metric types present in the parsed script
  userProfile?:       {
    vo2max?: number                    // mL/kg/min — for personalized MET-Score in TIS
  }
}
```

The default implementation `StandardAnalyticsProfile` holds a registry of all available
processors. Each processor declares `dialects?: string[]` and
`requiredMetrics?: MetricType[]`. The profile filters the pool: a processor activates
when the context dialect matches (or `dialects` is empty) AND all `requiredMetrics` are
present in `scriptMetricTypes` (AND logic).

## Consequences

`useWorkbenchRuntime` no longer imports any processor class directly. It constructs an
`AnalyticsContext` from the parsed script and delegates assembly entirely to the profile.
Adding a new processor requires: implement the interface, declare `dialects` and
`requiredMetrics`, register in `StandardAnalyticsProfile`. No other file changes.
