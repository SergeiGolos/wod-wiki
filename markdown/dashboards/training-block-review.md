---
dashboard: true
title: Training Block Review
tags:
  - dashboard
  - coaching
---

# Training Block Review

The general coaching check-in, re-authored from the retired hardcoded
dashboard page (#899 decision 8). Weekly questions about volume, intensity,
and where the work went.

## Avg TIS
How hard are sessions?

```query:value
avg:tis{}
```

## Total volume
How much total work?

```query:value
sum:totalVolume{}
```

## Total reps
How many reps?

```query:value
sum:totalReps{}
```

## Adherence
Are planned sessions getting done?

```query:value
avg:calc.adherence{}
```

## Weekly tonnage
Is volume rising?

```query:timeseries-2
sum:totalVolume{} by {week}.rollup(1w)
```

## TIS trend
Is intensity consistent?

```query:timeseries
avg:tis{} by {week}.rollup(1w)
```

## Volume by effort
Where does the volume go?

```query:toplist
sum:totalVolume{} by {effort}
```

## Load by intensity
Is training polarized?

```query:stacked-bar
sum:sessionLoad{} by {intensity}.rollup(1w)
```

## Distance by discipline
Where is the mileage?

```query:bar
sum:totalDistance{} by {discipline}
```

## Session load trend
Is load building?

```query:timeseries
sum:sessionLoad{} by {week}.rollup(1w)
```
