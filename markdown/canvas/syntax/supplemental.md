---
search: hidden
template: canvas
route: /syntax/supplemental
---

# Supplemental Data {sticky dark full-bleed}

Beyond movements and metrics, you can capture intent, effort, and auxiliary context.
Supplemental lines don't affect the timer — they enrich the log.

```view
name:    ex
state:   note
source:  wods/syntax/supplemental.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Effort and RPE {sticky}

Use `@easy`, `@hard`, or a numeric RPE like `@7` after a movement to log your perceived effort.
The Review grid surfaces these alongside your loads and times.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/supplemental-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Setup Actions {sticky}

Wrap non-movement instructions in square brackets: `[Setup Barbell]`, `[Change Plates]`.
These appear in the timer as cue cards — the clock pauses until you tap continue.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/supplemental-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Progressive Load {sticky}

Use `^` to flag a set as a warm-up ramp. Combine with `?lb` to let the runtime prompt for each weight as you build to your working load.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/supplemental-3.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← Measurements
target: ex
pipeline:
  - navigate: /syntax/measurements
```

```button
label:  Complex Examples →
target: ex
pipeline:
  - navigate: /syntax/complex
```
