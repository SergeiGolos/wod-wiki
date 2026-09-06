# Missing values, units, and numerical correctness

Status: resolved decision contract; planning only.

Owned by [Missing values, units, and numerical correctness](../issues/04-missing-values-units-and-arithmetic.md). This consolidates the live decisions and their implementation consequences; it is not evidence that the current engine implements them.

Prerequisites: [Field discovery and catalog contract](field-discovery-contract.md), [Automatic grain selection and contribution ownership](automatic-grain-contract.md), and [Time buckets, group keys, and alignment](time-alignment-contract.md).

## 1. Population, presence, and validity

Keep three different things distinct:

- **Metric observation:** a genuinely recorded measurement or newly calculated metric at its producing scope. Recorded zero is an observation. Duplicate storage representations are not extra observations.
- **Query position:** a position established by the query, such as a calendar bucket or an aligned formula input. It can exist without a metric observation.
- **Out-of-scope position:** outside the requested/aligned domain. It does not participate and is not zero-filled.

Do not infer a recording frequency. Readings at 10:00 and 10:10 do not imply missing readings between them. Raw reducers operate on their actual observation population. A time-bucket query establishes missing buckets, not an invented collection of missing samples inside every nonempty bucket. Reducing a bucket's observations and reducing a series of bucket results are distinct operations; the query-document contract must make that scope explicit.

An ungrouped bounded query can have an absent result; a grouped query does not invent groups that were never observed. An empty formula range intersection produces no aligned positions, not a zero-valued formula. Follow the time contract for finite bucket domains, group union, and partial boundary periods.

### Required result distinctions

The result representation must preserve these meanings through aggregation, formulas, rendering, and caching. These are semantic requirements, not proposed TypeScript field names:

| Meaning | Required distinction |
|---|---|
| Observed value, including zero | Finite value, resolved metric/unit identity, genuine observation count, temporal scope. |
| Missing/absent value | No observation; may be displayed or consumed as zero where the operation permits. |
| Zero-filled position | Numeric zero used by an operation or renderer, with absence provenance retained. Not a recorded observation. |
| Valid formula result with missing inputs | Unrounded numeric result plus provenance sufficient for the average rules below. Do not blanket-discard all such results. |
| Invalid calculation | Diagnostic, not a missing value or valid zero. Propagates to dependent calculations. |
| Insufficient retained evidence | Explicit limitation under the contribution contract, not ordinary missingness. |
| Partial rolling/boundary window | Actual eligible coverage and denominator, distinct from a complete window. |

Do not use a single nullable number as the complete contract. Display zero-filling cannot turn an all-missing average into an observed zero or turn an error into a valid input.

## 2. Operation matrix

Apply the matrix only after domain selection, variant resolution, contribution selection, and compatible-unit normalization. A diagnostic in a required input prevents a successful dependent result; it is not silently omitted.

| Operation | Missing positions inside the domain | No recorded observations | Weighting/result |
|---|---|---|---|
| `sum` | Zero | Numeric zero for the evaluated result scope, retaining zero observed count | Sum selected contributions; do not add duplicate representations. |
| Ordinary `avg` | Exclude | Absent: no observations | Sum divided by eligible observation count. Recorded zeros participate. Preserve source weighting through substitute summaries. |
| `min` / `max` | Zero | Zero for an established missing result position | Include zero for defined missing positions. Do not infer additional raw samples. |
| `count` | Exclude | Zero | Count recorded observations of the selected metric, including recorded zeros; not buckets, catalog references, or storage copies. |
| `last` | Zero at the final chronological query position | Zero at an established missing final position | Do not carry a previous measurement into a later missing position. Without a positional grid, use the actual recorded chronological population. |
| `delta` | Ignore missing positions | Absent with fewer than two recorded observations | Last recorded value minus first recorded value in chronological metric-date order. |
| Arithmetic formulas | Substitute zero for missing operands | Apply the operator; e.g. missing + missing is zero, missing / missing is invalid | Preserve missing-input provenance; normalize and check dimensions before arithmetic. |
| Rolling average | Include missing in-range positions as zero | Zero for a nonempty all-missing positional window | Sum window-position values divided by the number of in-range positions, not the observed sample count. |

For `min`/`max`, `120, missing, 140` has minimum `0`; `−120, missing, −140` has maximum `0`. For raw observations `120` and `140` ten minutes apart without a defined intervening position, the minimum is `120`.

`count` is an observation count, not a convenient substitute for the denominator of a rolling average. Summary rows carry the represented observation count; a new workout-level metric counts at that scope rather than inheriting the count of its inputs. A query formula does not retroactively change the observation counts of its input queries.

### Chronological endpoints

For Monday `120`, Tuesday `140`, Wednesday missing:

- `last` over those daily positions is synthetic zero at Wednesday.
- `delta` over the recorded observations is `140 − 120 = 20`.

`delta` with zero or one recorded observation is absent, not zero. Two actual equal-valued observations can establish genuine zero change.

Chronology is based on Metric Date, independent of fetch/array order. Use a genuine recorded ordering when it resolves a tie; do not invent one from record IDs or storage iteration order. Tied endpoint observations with different values and no evidence of order produce an ambiguous-order error. Equal endpoint values do not make the numerical result ambiguous merely because there are multiple observations. A tie at an irrelevant interior position does not invalidate an otherwise unambiguous endpoint calculation.

Date-only observations have no fabricated clock time. Different civil dates can be ordered; conflicting observations on the same date, or date-only and instant observations whose relative order cannot be established, follow the ambiguity rule when they affect an endpoint. Same-day absence of an exact clock time does not invalidate order-insensitive operations such as sum.

## 3. Formula results and ordinary averages

Two choices were explicitly distinguished during grilling:

1. **Missing-derived formula zero is excluded from an ordinary average.** Results of `10 / 5`, `missing / 5`, and `20 / 5` are numerically `2, 0, 4`, but their ordinary average is `(2 + 4) / 2 = 3`.
2. **A nonzero partial formula result participates.** `10 + missing` evaluates to `10`; averaging that result with `20` gives `15`, not `20`.

A genuine zero calculated from present inputs participates normally: `0 / 5` is not equivalent to `missing / 5`. An all-missing average remains absent even when the chart displays zero.

Therefore ordinary-average eligibility cannot be inferred from the number alone, and it cannot be implemented as “exclude every formula with a missing operand.” Retain sufficient provenance to distinguish a zero supplied through missingness from a genuinely supported zero. For a pointwise arithmetic formula, nonzero results participate; zero results supported by present inputs participate; zero results dependent on missing-input substitution do not. Display rounding must not change this classification. Chained formulas must preserve the distinction rather than promoting a synthetic zero to observed at the next expression node.

These rules do not change the selected calculation scope. Averaging observations of a metric preserves their true observation weights; averaging explicitly produced formula points operates at those output scopes and must not inherit upstream sample counts merely because an input was an aggregate. The query-document ticket owns how users express observation-level versus aggregate-level operations, not a second missing-value policy.

### Ratios and errors

| Inputs to `a / b` | Result |
|---|---|
| Recorded `0`, recorded `5` | Genuine zero; ordinary-average eligible. |
| Missing `a`, recorded `5` | Synthetic zero; excluded from ordinary averages. |
| Recorded `10`, missing `b` | Division-by-zero error after substitution. |
| Recorded `10`, recorded `0` | Division-by-zero error. |
| Both missing | Division-by-zero error, not a fabricated ratio of zero. |

Invalid operations, non-finite selected numeric inputs/results, incompatible output units, and unresolved ordering ambiguity remain invalid. An average of `2, error, 4` is an error, not `3`. Propagate the diagnostic through required dependencies while unrelated queries remain usable. Preserve the original cause rather than reporting every downstream failure as ordinary no-data. No skip-invalid-record option is introduced.

A ratio of totals is not an average of per-observation ratios. The query-document grammar must expose the intended scope; summaries sufficient for one form need not support the other.

## 4. Rolling windows

A rolling average is explicitly an exception to the ordinary-average missing-value rule. It averages the values at the requested query positions, including missing positions as zero:

- Three-day window `10, missing, 20`: `(10 + 0 + 20) / 3 = 10`.
- Three-day window with all three positions missing: `0` with zero recorded observations.
- First two days of the selected range, values `10, 20`: partial-window result `15`, denominator `2`.
- First two days `10, missing`: partial-window result `5`, denominator `2`.

The trailing window includes the current position and the preceding requested positions. Clip to the selected/aligned range; do not fetch or invent pre-range zeros to force a full denominator. Mark startup windows as partial. Calendar day/week membership follows the shared time contract across DST; do not substitute elapsed milliseconds for calendar-position counts.

Rolling arithmetic errors still propagate; only ordinary missingness becomes zero. For rolling forms of other reducers, apply that reducer's matrix to the selected window. In particular, rolling `count` remains a count of actual observations, not the positional denominator of a rolling average.

A window over aggregated daily values is not a pooled average of every raw measurement in those days. First establish the bucket value under the explicitly selected reducer, then apply the rolling operation. Preserve the distinction in query syntax, summary capabilities, and result metadata. Do not average arbitrary saved averages to normalize bucket sizes.

## 5. Units and precision

### Output defaults

An explicit query output unit wins if compatible with the result. Otherwise use the system default for that result dimension; do not choose the first record's unit or add an independent widget-preference tier ahead of the system default.

| Result dimension | Agreed fallback output unit |
|---|---|
| Mass | `kg` |
| Distance | `m` |
| Duration | `s` |
| Count | `count` |
| Energy | `cal` |
| Speed | `m/s` |
| Pace | `min/km` |
| Dimensionless ratio | Unitless |

These output defaults do not reinterpret saved measurements. Omitted physical units are resolved and persisted at collection under the field contract; changing a default later must not change what a saved number means. Default-unit resolution must be shared across consumers, not a kg-only hook masquerading as a policy for every dimension.

For other supported product/quotient dimensions, compose a dimension-preserving output from the relevant base defaults (`m`, `kg`, `s`, `count`, `cal`); the named speed/pace defaults above take precedence for their dimensions. Named semantic scales such as ratings are not automatically ratios. Their registered scale definition must determine valid conversion; the unitless ratio default does not authorize erasing arbitrary scale semantics.

### Conversion coverage and validation

Use one authoritative unit definition/conversion policy across metric interpretation and WQL arithmetic, rather than leaving separate hardcoded conversion subsets. Existing recognized units need actual conversion evidence, not just a dimension label. The current source catalogs establish at least these cases to cover:

| Family | Required coverage/constraints |
|---|---|
| Distance | `m`, `km`, `cm`, `mm`, `ft`, `in`, `yd`, `mi` and their registered aliases. |
| Mass | `kg`, `g`, `lb` and aliases. Relative `bw` requires sufficient measurement-time context; it is not a constant kg conversion. |
| Duration | `ms`, `s`/`sec`, `min`, `h`/`hr`. |
| Count | Registered `rep`/`reps`/`count` representations, without dropping count dimensions from calculations. |
| Energy | `cal`, `kcal`, using their declared scale factors. |
| Rates and compounds | Registered speed, pace, count-rate and load-rate units; preserve product/quotient dimensions and scale factors. |
| Ratios and semantic scales | Dimensionless ratios, percentages, and named scales require correct scale definitions. A shared zero dimension vector is not proof that arbitrary named scales are interchangeable. |

Normalize aliases through the unit registry, not field-name camelCase rules. Fixed conversions include `1 lb = 0.45359237 kg`, `1 mi = 1609.344 m`, and `1 min = 60 s`. Percent representation must respect `100% = 1` as a ratio; do not treat a percent label as a factor-one ratio conversion merely because current metadata classifies it as dimensionless.

A context-dependent unit requires genuine retained conversion context or an already-persisted resolved physical value. Do not use today's body mass to reinterpret an old `bw` measurement. If the necessary evidence is unavailable, report a limitation for the affected calculation. This does not introduce a new external data source or a context-guessing fallback.

An explicit unknown unit is an error, not an omitted unit to replace with a default. Unit/dimension definitions must be valid before values are combined. Where a source unit is genuinely absent for a physical measurement, do not reinterpret history using the current output default; use recoverable collection evidence or report the limitation.

### Dimensional arithmetic

- Sum, ordinary average, min, max, last, and delta retain the selected value dimension; count produces count regardless of the measured input dimension.
- Addition/subtraction require compatible dimensions and scale normalization. Missing-zero substitution cannot make meters plus seconds valid: a missing operand retains its resolved type/dimension.
- Multiplication/division compose dimensions and scale factors. Compatible dimensions cancel in a ratio only after numeric normalization.
- An output unit must match the result dimension. WQL does not inherit dimension-overriding `pts`/`AU`/`ratio` casts from the existing calc evaluator.
- Do not drop a count factor from a product merely to produce a familiar label. Existing training-specific unit-display shortcuts need an explicit compatible interpretation, not silent acceptance by the general WQL evaluator.
- A syntactically valid unknown field remains allowed under the discovery contract. Absence alone does not create an unknown-field error; use available type constraints for checking, without guessing units from the spelling of the field.

Operation-compatible variant selection happens before arithmetic. Text and numeric variants of the same path are not coerced into one metric; incompatible variants are excluded, not synthesized as numeric zeros. If more than one acceptable variant remains ambiguous, require explicit selection. Invalid data within the selected variant is not permission to silently select another variant.

### Numerical precision

Retain full available precision through conversion, aggregation, and formulas. Do not round reducer outputs or intermediate query results to chart precision. Renderers format values; dependent calculations consume the unrounded result.

Use finite numeric results and preserve counts correctly; do not publish overflow, `NaN`, or infinity as valid measurements or silently clamp them to zero. This contract does not require arbitrary-precision decimal arithmetic. Normal binary floating-point representation error is distinct from deliberate intermediate rounding; verification should use appropriate numerical tolerances for non-integer conversions.

Selection and chronological results must not depend on fetch order. Normal floating-point accumulation differences are not a license to change semantic populations or round away small contributions. In particular, `0.004 + 0.004 + 0.004 km = 0.012 km` before formatting, even if the displayed total is `0.01 km`.

## 6. Reducer capabilities and sufficient evidence

All capabilities also require the ownership, revision, time, grouping, filter, and coverage proof from the prerequisite contracts. Statistics are useful only for the exact selected population; a full-workout summary cannot answer a clipped period by assumption.

| Operation | Sufficient substitute-summary evidence |
|---|---|
| Sum | Normalized sum for the represented population; true observed count/presence retained separately. |
| Ordinary average | Eligible sum plus eligible count for the same population. A saved mean alone is insufficient. Formula-result summaries must preserve the agreed eligibility classification. |
| Count | True represented observation count, not number of stored summaries or raw input counts of a different calculated metric. |
| Min/max | Recorded extrema and presence/coverage information needed to apply zero to any query-defined missing positions. Extrema alone do not prove the absence of such positions. |
| Last | Latest actual endpoint value/date and tie/order evidence; positional coverage sufficient to determine whether the final query position is missing. A saved last value cannot prove that later positions were observed. |
| Delta | Earliest/latest recorded values and dates/order evidence, plus count proving at least two observations; retain endpoint ambiguity where relevant. A saved delta alone cannot safely merge across populations. |
| Rolling average | Sufficient per-position bucket values/statistics and temporal coverage to reconstruct each requested window, including absent positions and clipped startup denominator. A whole-range sum/count or average alone is insufficient for arbitrary rolling windows. |
| Pointwise formulas and ratios | Aligned operand evidence with validity and presence provenance. Independent whole-range summaries do not prove observation-level pairing. |

The planner may use compact statistics where these conditions hold; it need not recompute all raw observations merely to verify a valid summary. If sufficient detail exists, use it when summaries are inadequate. If neither source is sufficient, report the already-agreed limitation instead of treating the missing evidence as zero.

For a new calculated observation, do not inherit the sample count of its source metrics. For a substitute summary of existing observations, do preserve that sample count. Ten observations of `1` plus two observations of `2` have mean `14/12`, not the unweighted mean `1.5` of the two source means.

## 7. Current source seams and downstream ownership

| Seam | Observed implementation / required contract change |
|---|---|
| [QueryService](../../../../packages/wql/src/QueryService.ts), `aggregate` | Currently returns zero for every empty numeric reducer, uses row count for count, sorts timestamps for last, and computes delta from input-array endpoints. Replace these shortcuts with the operation/presence/coverage contract. |
| [QueryService](../../../../packages/wql/src/QueryService.ts), `buildResult` | Currently generates observed buckets and rounds every aggregate to two decimals. Preserve unrounded values and result state; apply the agreed positional domain and rollup semantics rather than erasing absence. |
| [WQL units](../../../../packages/wql/src/units.ts) | Currently only mass/distance conversion, with unknown/incompatible pass-through and first-source-unit fallback. Requires strict conversion and the system default table. |
| [Calc units](../../../../packages/lang/src/analytics/calc/units.ts) and [dimensions](../../../../packages/lang/src/analytics/calc/dimensions.ts) | Broader dimensional machinery exists, but authoritative casts, dimensionless labels, missing-unit assumptions, and count-dropping display conventions cannot be blindly reused. |
| [Recognition catalog](../../../../packages/lang/src/metrics/units/UnitRegistry.ts) | Recognizes units absent from the WQL converter and permits dialect extension. Recognition without a conversion definition is insufficient for arithmetic. |
| [Analytics unit preference](../../../../packages/ui/src/widgets/useAnalyticsUnitPreference.tsx) | Existing kg/lb-specific API is not the full output-default policy. Migrate consumers cleanly under the shared-surface ticket. |

[Query documents and shared-key formulas](../issues/05-query-documents-and-formulas.md) owns typed expression syntax, raw-versus-aggregate scope, rolling syntax, and the source-grounded parser/evaluator/package reuse design. It must consume this arithmetic policy without adding a dependency from a lower-level package to an inappropriate higher-level package. It also owns any precise additional statistical-function decisions required by its correlation/lag scope; basic reducer decisions here are not reopened.

[Projection lifecycle and existing-data migration](../issues/08-projection-lifecycle-and-migration.md) owns recoverable units, validity/presence evidence, sufficient statistics, temporal endpoints, and projection versions. [Cross-workout tables and aggregate drill-down](../issues/06-analytical-tables-and-drilldown.md) must expose recorded versus synthetic values and the actual contributing population. [Shared query execution across dashboards and notes](../issues/07-shared-query-execution-and-surfaces.md) owns consistent defaults, diagnostics, partial-window presentation, and display-only rounding. [Invalidation, query reuse, and performance budgets](../issues/09-invalidation-and-query-performance.md) must preserve these states and capabilities through reuse, with system-default/conversion-policy changes invalidating affected results.

Do not migrate stored source numbers to whatever unit a widget happens to display, introduce a silent skip-invalid mode, or retain parallel old/new arithmetic paths with different semantics.

## 8. Verification and implementation acceptance

An independent in-memory arithmetic model checked 27 examples during this planning session. It exercised extrema, recorded-zero count/average behavior, all-missing averages, last/delta differences, chronological ties, formula zero provenance, dependent errors, full/partial rolling windows, no invented raw samples, weighted means, compatible conversions, and unrounded totals. These are contract calculations, not production engine tests.

The eventual implementation must exercise the real QueryService/document/consumer paths. Acceptance includes:

- The numeric examples in this contract, with distinct state assertions for absent, synthetic, observed, partial, and invalid results—not only formatted text.
- Identical results for reordered source fetches, direct versus content-joined selection, and detail versus provably sufficient summaries, allowing normal floating-point tolerance.
- Rejection or detail fallback for insufficient average counts, endpoint order, clipped coverage, or rolling partitions.
- Mixed-unit calculations without an explicit display directive; compatible explicit output conversion; incompatible or unknown output-unit errors; no authoritative-cast bypass.
- Stored measurements unchanged after output-default changes; no first-record-dependent unit choice.
- No intermediate rounding, no hidden invalid inputs, and independent queries remaining usable when another dependency chain fails.

No production source changes or permanent tests were added by this decision ticket.
