# ADR-0009: Tracker and Review Grid Support for Custom and Calculated Metrics

**Date**: 2026-05-26  
**Status**: Accepted  
**Ticket**: [WOD-744](/WOD/issues/WOD-744)  
**Related**: [WOD-741](/WOD/issues/WOD-741), [WOD-744](/WOD/issues/WOD-744)

## Context

The runtime analytics pipeline already emits non-canonical metrics, including:

- `MetricType.Custom` for parser-owned custom metric buckets
- `MetricType.Calculated` for runtime-derived values produced from declarative formulas
- session-total keys that may not match any canonical icon or label map entry

Before this slice, the tracker bubbles and review grid had a fragile presentation path:

- tracker summary cards assumed a closed set of keys
- review grid columns only covered the canonical metric catalog
- unknown metric names could surface as unreadable labels or fall back to generic grey styling
- calculated metrics did not have a first-class column path through the review experience

The product needs a safe default that keeps custom data visible without forcing every new metric name to be hardcoded in multiple UI surfaces.

## Decision

### 1. Custom and calculated metrics are first-class review-grid columns

The review grid will expose explicit columns for:

- `MetricType.Custom`
- `MetricType.Calculated`

These columns participate in the standard CDL pipeline, which means they can be:

- rendered
- sorted
- filtered
- graphed when the value is numeric
- overridden through the existing user-entry ownership flow

### 2. Unknown tracker summary keys use humanized labels and safe fallback presentation

The tracker bubble view will not depend on a closed icon or label map.

Instead it will:

- infer the closest known metric family when possible
- humanize unknown keys into readable labels
- fall back to neutral icon/color treatment when no canonical mapping exists

### 3. Canonical presentation still wins when available

Known metric families such as:

- `intensity`
- `rir`
- `session-rpe`
- `session-load`
- `met-score`

continue to use their specialized labels, tones, icons, and colors.

The new generic behavior only applies when a metric is not already covered by the canonical presentation layer.

## Consequences

- custom/calculated metrics no longer disappear into generic unlabeled buckets in tracker/review UX
- new metrics can be added with less presentation churn
- the review grid and tracker share a more resilient fallback path
- canonical metrics retain their existing specialized UX

## Implementation Notes

- `MetricTrackerCard` now humanizes session-total keys before rendering
- metric presentation label formatting now supports safer fallback title casing for unknown keys
- the review-grid column definition set now includes custom/calculated metric columns
- component coverage was updated for tracker presentation and review-grid smoke behavior
