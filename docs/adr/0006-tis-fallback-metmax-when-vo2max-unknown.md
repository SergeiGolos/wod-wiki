# TIS Falls Back to Population-Average METmax When VO2max Is Unknown

The TIS `MET-Score` component is `(Activity METs ÷ METmax) × 100`, where
`METmax = VO2max ÷ 3.5`. When the user has not provided a VO2max value in their
profile, `TISProcessor` must fall back to a default METmax rather than omitting
the metric or emitting an error.

**Status**: accepted / implemented

## Decision

The population-average fallback METmax is **11.4** (equivalent to VO2max = 40 mL/kg/min,
the approximate average for a moderately active adult).

| Population | Approximate METmax |
|------------|-------------------|
| Sedentary adult (general population) | 8–10 |
| Recreationally active adult | 10–12 |
| Trained athlete | 14–20+ |

Using a middle value (10–12) is the least wrong for a general fitness audience.
METmax = 11.4 sits in the middle of the recreationally-active range.

## Implementation

- **`TISProcessor`** (`src/timeline/analytics/analytics/engines/TISProcessor.ts`):
  - Computes `METmax = vo2max ÷ 3.5` when `vo2max` is provided via `AnalyticsProfileContext.userProfile`.
  - Falls back to `TISProcessor.FALLBACK_METMAX = 11.4` when `vo2max` is absent.
  - Sets `origin: 'analyzed-estimated'` on the `ProjectionResult` when the fallback is used.

- **`ProjectionResult`** (`src/timeline/analytics/analytics/ProjectionResult.ts`):
  - Added optional `origin?: MetricOrigin` field so processors can declare estimated output.

- **`AnalyticsEngine.finalize()`** (`src/core/analytics/AnalyticsEngine.ts`):
  - Passes through `projection.origin` when present, defaulting to `'analyzed'`.

- **`MetricOrigin`** (`src/core/models/Metric.ts`):
  - Added `'analyzed-estimated'` to the union type.

- **`MetricType`** (`src/core/models/Metric.ts`):
  - Added `TIS`, `METScore`, `SessionRPE`, `SessionLoad`, and `RIR`.

- **`IAnalyticsProfile`** (`src/core/analytics/IAnalyticsProfile.ts`):
  - Added optional `userProfile?: { vo2max?: number }` to `AnalyticsProfileContext`.

- **`StandardAnalyticsProfile`** (`src/core/analytics/StandardAnalyticsProfile.ts`):
  - Registers `TISProcessor` and passes `context.userProfile?.vo2max` at build time.

## Consequences

TIS outputs produced without a user VO2max are marked as estimated (`origin:
'analyzed-estimated'` rather than `origin: 'analyzed'`) so downstream displays can
optionally indicate reduced precision.
