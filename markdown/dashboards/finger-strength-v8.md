---
dashboard: true
title: Finger Strength → V8
dashboard.hangGoal: 35
tags:
  - dashboard
  - climbing
---

# Finger Strength → V8

Climbing prebuilt — max-hang strength against a %BW goal, send pyramid,
and tendon load. Max-hang MVC/BW (calc.mvcBw) and send counts
(calc.sends) are proposed metrics — they render as labeled placeholders
until the engine and capture paths land; the ring target is the
$hangGoal token.

## Max-hang goal
Finger strength vs the benchmark cohort?

```query:goal-rings-2
max:calc.mvcBw{tags:hangboard} / $hangGoal
```

## Max-hang trend
Is the strength block working? Retest every 4–8 weeks.

```query:timeseries-2
last:calc.mvcBw{tags:hangboard} by {week}.rollup(1w)
```

## Grade pyramid
Base wide enough to support the goal grade?

```query:bar
count:calc.sends{} by {grade}
```

## Finger load (ACWR)
Keeping tendons in the safe ramp zone?

```query:timeseries
avg:calc.acwr{} by {day}
```

## Hangboard sessions
Hitting the programmed frequency?

```query:value
count:sessionLoad{tags:hangboard}
```
