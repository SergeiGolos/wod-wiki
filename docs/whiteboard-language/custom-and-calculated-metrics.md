# Custom and Calculated Metrics

[← Whiteboard language index](./README.md)

This page summarizes the line-local custom-metric syntax and the document-level `calculate` block used by the syntax guide.

## Custom metrics

Property statements use the form `key: value`.
They are top-level statements, not nested fields.

Supported value shapes:

- numbers
- bare identifiers
- quoted strings

Known keys map to canonical metric types:

- `rpe` → session RPE
- `rir` → reps in reserve
- `intensity` → intensity
- `load` → load
- `volume` → volume
- `work` → work

Any other key remains a custom metric and stays visible in the review/tracker surface.

Constraints for v1:

- top-level scalars only
- no nested objects or arrays
- property lines stay attached to the statement they appear on

## Calculated metrics

A `calculate` block lives at the document level.
Each line uses `target = expression`.

Supported functions:

- `sum`
- `mean`
- `max`
- `min`
- `count`

Supported operators:

- `+`, `-`, `*`, `/`, `^`
- parentheses

Runtime evaluation skips rows with missing inputs.
If a definition cannot resolve to a finite number, it is omitted.

## Canonical examples

- [Custom metrics workout](../../markdown/canvas/syntax/custom-metrics.md)
- [Calculated metrics workout](../../markdown/canvas/syntax/calculated-metrics.md)
- [Syntax guide](../../markdown/canvas/syntax/custom-and-calculated-metrics.md)

## Related

- [Core syntax](./core-syntax.md)
