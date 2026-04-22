---
search: hidden
template: canvas
route: /syntax/tabata
---

# Tabata and Intervals {sticky dark full-bleed}

Intervals combine a work period and a rest period, repeated for a set number of rounds.
A standard Tabata is 8 rounds of 20 seconds work and 10 seconds rest — about 4 minutes total.

```view
name:    ex
state:   note
source:  wods/syntax/tabata.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Standard Tabata {sticky}

`(8 Rounds)` with `:20 Work` and `:10 Rest` inside. Label the effort line with any movement.

```command
target: ex
pipeline:
  - set-source: wods/syntax/tabata.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Custom Intervals {sticky}

Change the round count, work duration, or rest duration to any values. `:40` work / `:20` rest over `(5 Rounds)` is a popular alternative.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-4.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Intervals with Distance {sticky}

Pair a timed rest with a distance-based work interval. `3:00 Run 800m` followed by `2:00 Rest` for five rounds is a classic track workout.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-5.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← EMOM
target: ex
pipeline:
  - navigate: /syntax/emom
```

```button
label:  Rest Periods →
target: ex
pipeline:
  - navigate: /syntax/rest
```
