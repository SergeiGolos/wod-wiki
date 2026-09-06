# Unit normalization, output defaults, and reducer correctness

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 11, 12, 21
Prerequisites: [Missing values, units, and numerical correctness contract](../assets/arithmetic-contract.md); [Shared unit catalog home, conversion evidence, and extension propagation](21-unit-catalog-home.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

Mixed-unit inputs convert before arithmetic (finding 3.3), chronological reducers are metric-date-ordered and order-independent (finding 3.4), the reducer matrix distinguishes observed/synthetic/absent/invalid/partial results, and output units follow the system dimension defaults — no first-record fallback, no intermediate rounding.

## Scope

Contract changes per the [arithmetic contract](../assets/arithmetic-contract.md) §§ 2, 4, 5:

1. **Conversion engine.** Rewrite [`packages/wql/src/units.ts`](../../../../packages/wql/src/units.ts) onto the [Unit Registry](../../../../packages/lang/src/metrics/units/UnitRegistry.ts) so recognition and conversion share one source:
   - required families: distance (`m km cm mm ft in yd mi` + aliases), mass (`kg g lb`, `bw` only with genuine measurement-time context), duration (`ms s min h`), count (`rep reps count` — never drop count factors), energy (`cal kcal`), registered speed/pace/count-rate/load-rate compounds with product/quotient dimension algebra, ratios/percent (`100% = 1`) and named scales per their registered definitions.
   - fixed factors `1 lb = 0.45359237 kg`, `1 mi = 1609.344 m`, `1 min = 60 s`; normalize aliases through the registry, not name munging.
   - an explicit unknown unit is an error, never passed through; an omitted unit on a physical measurement uses ticket 11's carried effective unit (collection-time default resolution is defined here as the shared system-default table, consumed at write time by ticket 14).
   - dependency direction per [decision ticket 21](21-unit-catalog-home.md): recognition and conversion live in the shared home that decision resolves; this rewrite consumes it, creates no `wql → lang` dependency, and never imports calc's authoritative casts.
2. **Output defaults.** Shared system default output unit table: mass `kg`, distance `m`, duration `s`, count `count`, energy `cal`, speed `m/s`, pace `min/km`, ratio unitless; product/quotient dimensions compose from base defaults with named speed/pace taking precedence. Explicit `in <unit>` wins when dimensionally compatible; incompatible output unit → error for the affected calculation and its dependents. The calc engine's authoritative casts (`pts`/`AU`/`ratio`) must not leak into WQL evaluation — reconcile through the registry, without importing cast behavior from [`calc/units.ts`](../../../../packages/lang/src/analytics/calc/units.ts)/[`calc/dimensions.ts`](../../../../packages/lang/src/analytics/calc/dimensions.ts).
3. **Reducer matrix** ([`aggregate`](../../../../packages/wql/src/QueryService.ts) + `buildResult`), applied after variant selection (11), domain selection (12), and conversion:
   - `sum` zero-fills missing positions, keeps zero observed count; ordinary `avg` excludes missing and is absent when nothing recorded; `min`/`max` treat missing positions as zero; `count` counts recorded observations (recorded zeros included, buckets/copies excluded); `last` takes the final chronological position with synthetic zero when missing, never carrying forward; `delta` = last recorded − first recorded in metric-date order, absent under two recorded observations, ambiguous-tie error when equal-timestamp endpoints differ without recorded order.
   - rolling averages: in-range missing positions count as zero in numerator and positional denominator; partial startup windows use available positions and are marked partial; rolling `count` stays an observation count.
   - formula-result presence rules: missing-derived zeros excluded from ordinary averages, nonzero partial results participate, invalid operations propagate as errors (structural result states, not nullable numbers).
4. **Precision.** Remove the two-decimal rounding in `buildResult`; results are unrounded, formatting belongs to renderers (ticket 19 migrates widget formatting).

## Clean cutover

- Delete `resolveDisplayUnit`'s `convert: false` first-record-unit path and the unknown-unit pass-through; no parallel old/new unit paths remain.
- Migrate the playground's duplicate unit tables (the `RawPointsTable` and re-export consumers identified in the [unit policy deepening](../deepening/02-unit-policy.md) deletion test) onto this engine, then delete the duplicate on the schedule the 21 Answer sets.
- The kg/lb-only [`useAnalyticsUnitPreference`](../../../../packages/ui/src/widgets/useAnalyticsUnitPreference.tsx) API stays functional until ticket 19 migrates its callers to the system-default table; no new callers allowed.

## Acceptance scenarios

From the [arithmetic contract](../assets/arithmetic-contract.md) examples and roadmap Phase 1:

1. `sum:distance{}` over `1000 m` + `1 km` returns `2000 m` with no explicit directive (Phase 1 acceptance).
2. Delta over early `10`, later `20` returns `+10` regardless of fetch order; tied different-valued endpoints produce the ambiguous-order error, tied equal values produce `0`.
3. `avg` of `120, missing, recorded 0` = `60`; all-missing average is absent (renders zero only at display); `count` of the same population = `2`.
4. `min` of `120, missing, 140` = `0`; `max` of `−120, missing, −140` = `0`.
5. Rolling 3-day over `10, missing, 20` = `10`; over first two in-range days `10, 20` = `15` marked partial; rolling positions before the range never enter the denominator.
6. Formula `a / b` with missing numerator over recorded `5` yields synthetic zero, excluded when that series is averaged (`2, 0-derived, 4` → `3`); recorded-zero results participate; `10 + missing` = `10` and averages with `20` to `15`; division by zero propagates an error through dependents while unrelated queries stay usable.
7. `0.004 + 0.004 + 0.004 km` aggregates to `0.012 km` pre-formatting; cached/stored results are unrounded.
8. `sum:elapsed{}` output defaults to `s`; `in hr` converts; `in kg` errors. Stored source values are unchanged after any output-default query.
