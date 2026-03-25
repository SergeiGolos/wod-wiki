---
template: canvas
route: /syntax/rest
---

# Rest Periods {sticky dark full-bleed}

Rest is just another line. Put a duration on a line that says `Rest` and the timer counts it down the same as any other work period.

```view
name:    ex
state:   note
source:  wods/syntax/rest.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Explicit Rest Between Sets {sticky}

Add a `Rest` line with a duration inside a rounds group. The timer counts it down before advancing to the next round.

```command
target: ex
pipeline:
  - set-source: wods/syntax/rest.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Rest Inside an AMRAP {sticky}

A rest line inside an AMRAP counts as part of the round. The clock keeps running — you just stop moving.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← Tabata and Intervals
target: ex
pipeline:
  - navigate: /syntax/tabata
```

```button
label:  Measurements →
target: ex
pipeline:
  - navigate: /syntax/measurements
```
