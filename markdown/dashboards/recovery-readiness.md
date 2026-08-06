---
dashboard: true
title: Recovery & Readiness
tags:
  - dashboard
  - recovery
---

# Recovery & Readiness

Recovery prebuilt — readiness, HRV, sleep, and subjective wellness against
the objective load metrics that are already live (monotony, ACWR). The
wellness metrics (calc.readiness, calc.hrv, calc.sleep, calc.soreness) are
proposed — they render as labeled placeholders until wellness capture
lands.

## Readiness today
Green-light for intensity?

```query:value
last:calc.readiness{}
```

## HRV trend
Autonomic balance holding?

```query:timeseries-2
avg:calc.hrv{} by {day}
```

## Sleep duration
Hitting the nightly floor?

```query:bar
avg:calc.sleep{} by {day}
```

## Soreness
Subjective load matching objective?

```query:bar
avg:calc.soreness{} by {day}
```

## Monotony
Enough day-to-day variation?

```query:timeseries
avg:calc.monotony{} by {day}
```

## Load balance (ACWR)
Inside the 0.8–1.3 sweet spot all block?

```query:timeseries
avg:calc.acwr{} by {day}
```
