# Missing values, units, and numerical correctness

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 01, 02, 03
Prerequisites: [Field discovery, identity, and metadata provenance](01-field-discovery-and-identity.md); [Automatic grain selection and contribution ownership](02-automatic-grain-and-contributions.md); [Time buckets, group keys, and alignment boundaries](03-time-buckets-and-group-keys.md)

## Question

What arithmetic contract implements zero-filled graphs and most calculations without confusing absence, recorded zero, invalid data, or an undefined result?

Resolve:
- An explicit behavior matrix for sum, average, minimum, maximum, count, last, delta, ratios, and rolling calculations. Graphs zero-fill missing observations; averages exclude missing observations and include recorded zero. Determine remaining operation-specific exceptions with the user.
- Specify the reducer capability/sufficient-statistics matrix consumed by [Automatic grain selection and contribution ownership](../assets/automatic-grain-contract.md). Preserve true observation weighting through summaries; distinguish newly calculated observations from summaries of the same metric, and insufficient aggregation evidence from ordinary missing values.
- Preserve presence through projection, aggregation, alignment, formulas, and display. Define how averages treat derived synthetic zeros, all-missing inputs, and whether count counts observations or synthesized buckets.
- Apply the domain distinctions in [Time buckets, group keys, and alignment](../assets/time-alignment-contract.md): out-of-range dates are excluded rather than zero-filled, retained groups may have missing counterparts, and partial aligned buckets require sufficient statistics over the common interval. Define chronological operations over metric dates without fabricating instants for date-only observations.
- Normalize compatible units before arithmetic even without an explicit display directive (source section 3.3); specify full dimension coverage, per-dimension system defaults, and display precedence. Follow the persisted-unit and identity contract in [Field discovery and catalog contract](../assets/field-discovery-contract.md); do not reinterpret stored measurements using current settings.
- Define operation compatibility over typed/dimensioned variants from the field discovery resolution, excluding unsupported variants rather than rejecting every same-name type difference. Specify ambiguity, invalid selected values, and diagnostic propagation while independent queries remain usable. Division by zero may yield an explained undefined result, distinct from ordinary missingness.
- Chronological last/delta semantics independent of input order, including equal-timestamp ties (source section 3.4).

Resolution must provide numerical examples and a complete validity/presence contract, not source-text assertions. Do not add skip-invalid-record syntax without a new user decision.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### Missing values in minimum and maximum — agreed during grilling

Treat missing values as zero for both minimum and maximum, rather than excluding them as averages do. For inputs `120, missing, 140`, minimum is `0` and maximum is `140`; a missing input can likewise make the maximum `0` when all recorded values are negative. Preserve absence internally: substituting zero for these operations does not create a recorded observation. This applies within the selected/aligned domain; dates outside that domain and incompatible metric variants remain excluded under the settled contracts.

### Count recorded observations — agreed during grilling

Count recorded metric observations, not missing positions or zero-filled buckets. For inputs `120, missing, recorded 0`, count is `2`. Explicitly recorded zero counts; a synthetic zero does not. Apply the settled contribution contract: duplicate representations do not add observations, substitute summaries preserve the represented observation count, and newly calculated observations count at their own producing scope.

### All-missing average remains absent — agreed during grilling

An average with no recorded observations returns an absent result meaning “no observations,” not a numeric average of zero. Graphs may display that absence as zero under the standing display rule, but downstream calculations retain its absence. This is ordinary missingness, distinct from an invalid arithmetic operation such as division by a recorded zero denominator.

### Last uses the final position with zero-filling — agreed during grilling

`last` uses the final chronological position in the selected/aligned domain, treating a missing value there as zero rather than carrying forward the latest recorded observation. For Monday `120`, Tuesday `140`, Wednesday missing, `last` is `0` at Wednesday's position. Preserve that the zero is synthetic; it does not become a recorded observation or increase count. Positions outside the requested/aligned domain remain excluded.

### Delta uses recorded endpoints — agreed during grilling

The user rejected zero-filled endpoints for `delta`. Compute last recorded value minus first recorded value in chronological metric-date order within the selected/aligned domain, ignoring missing positions. For Monday `120`, Tuesday `140`, Wednesday missing, delta is `20`, not `−120`. This is deliberately different from `last`, which uses the final position with zero-filling. Behavior with fewer than two recorded observations and ambiguous chronological ties remains to be agreed.

### Delta requires two recorded observations — agreed during grilling

With fewer than two recorded observations, `delta` returns an absent result meaning “not enough observations,” not numeric zero. For `missing, 120, missing`, delta is absent. Two recorded observations with equal values can still establish a genuine zero change; synthetic zero-filled positions do not satisfy the observation requirement.

### Ambiguous chronological endpoints report an error — agreed during grilling

When an operation needs a chronological endpoint and tied observations have different values with no genuine recorded order distinguishing them, report an ambiguous-order error for the affected calculation. Do not choose by storage iteration order or record ID. This includes same-timestamp observations and date-only observations on the same date. For earliest value `100` and tied latest values `120` and `140`, delta must not arbitrarily choose `20` or `40`. An ordering tie that cannot change the result does not by itself require an error.

### Averages exclude missing-derived formula zeros — agreed during grilling

Preserve missingness through query formulas. For `a / b` producing `2`, a synthetic `0` from a missing numerator divided by recorded `5`, and `4`, the average is `3`, not `2`. Exclude the missing-derived zero from the average's numerator and observation count. A genuine zero result from recorded inputs, such as recorded `0 / 5`, participates normally. Do not infer presence solely from the formula's numeric output.

### Missing operands remain zero for math — clarification in progress

When asked about a partially missing nonzero formula result, the user reiterated: “treat it as zero for math.” Thus `10 + missing` evaluates numerically to `10`, not an absent arithmetic result. Whether that nonzero partial result participates in a subsequent average is being clarified separately from the already-agreed exclusion of missing-derived formula zeros.

### Nonzero partial formula results participate in averages — agreed during grilling

The user confirmed that `10 + missing` evaluates to `10` and that averaging this result with `20` gives `15`. Do not discard a nonzero formula result merely because one operand was missing. This refines the preceding clarification: missing operands are zero for arithmetic, while the earlier agreed exclusion of missing-derived formula zeros remains distinct. Preserve input presence/provenance so genuine recorded-input zeros remain distinguishable from synthetic zeros.

### Arithmetic errors propagate to dependent calculations — agreed during grilling

An invalid calculation is not ordinary missingness and must not be silently skipped or zero-filled by a dependent calculation. Averaging formula results `2`, division-by-zero error, and `4` reports an error, not `3`. Propagate the error through dependent calculations while unrelated queries remain usable. This does not change the agreed absence behavior for missing observations, all-missing averages, or deltas with fewer than two observations.

### Missing positions remain visible in rolling windows — clarification in progress

The user requires missing observations to remain visible in a rolling three-day window. Do not remove those calendar positions from the displayed window. Whether their zero-filled values also participate in the rolling average's denominator is being clarified; partial-window startup behavior has not yet been agreed.

### Rolling averages include missing positions as zero — agreed during grilling

The user confirmed that a rolling three-day average over `10, missing, 20` is `(10 + 0 + 20) / 3 = 10`, not `15`. Retain all three calendar positions and count the missing position as zero in both arithmetic and the window-position denominator. This is an explicit exception to ordinary averages, which exclude missing observations. It does not turn zero-filled positions into recorded observations for `count`, and arithmetic errors still propagate rather than becoming zero. Startup behavior before the selected range supplies a full window remains to be agreed.

### Rolling averages use partial startup windows — agreed during grilling

Use available in-range positions before the full rolling window exists, and mark the result as partial. A three-day rolling average on the second day of the selected range with values `10, 20` is `15`, using a two-position denominator. Missing positions inside the range count as zero; positions before the selected range are out of scope and do not become synthetic zeros or enlarge the denominator. Once three in-range positions exist, use all three under the agreed zero-filling rule.

### Output units default to the system dimension default — agreed during grilling

When a query does not specify an explicit output unit, use the system default for the result's measurement dimension. Do not choose the first record's unit or introduce a separate user-preference tier ahead of that default. This decision concerns output units: normalize compatible measurements before arithmetic and preserve the persisted units/meaning of source measurements. Explicit query output units remain distinct from this default case.

### WQL output units must match the result dimension — agreed during grilling

An explicit WQL output unit must be dimensionally compatible with the calculated result. Meters may convert to kilometers; an output label alone must not turn distance into points or arbitrary units. Reusing the existing calculation engine must not implicitly import its dimension-overriding authoritative casts into WQL output conversion. An incompatible output unit produces an error for the affected calculation and its dependents.

### Preserve calculation precision; round only for display — agreed during grilling

Retain full available numeric precision through unit conversion, aggregation, and formulas. Round only the displayed result; downstream calculations consume the unrounded numeric value. Three values of `0.004 km` total `0.012 km`, rather than becoming zero through per-input display rounding. This does not promise arbitrary-precision arithmetic or exact binary representation of every decimal.

### Do not invent missing samples — agreed during grilling

Do not infer an expected recording frequency or manufacture missing observations between recorded measurements. Readings at `10:00` and `10:10` do not imply absent intervening samples. Zero-filling applies to missing positions established by the query's defined structure, such as bounded time buckets and aligned formula inputs, not arbitrary gaps in raw observations. Preserve the distinctions between source observations, query-defined positions, and out-of-scope dates.

### Fallback system output units — agreed during grilling

Use these fallback output defaults: mass `kg`, distance `m`, duration `s`, count `count`, energy `cal`, speed `m/s`, pace `min/km`, and dimensionless ratio unitless. Compatible explicit query output units override these defaults. They do not reinterpret stored measurements. The existing kg-only analytics preference and first-record fallback are not the complete system-default contract.

## Answer

Resolved through live grilling with Serge. The authoritative [Missing values, units, and numerical correctness contract](../assets/arithmetic-contract.md) consolidates the operation matrix, formula presence rules, partial rolling windows, chronological ambiguity, dimensional conversion/defaults, precision, and reducer sufficient-statistics requirements.

The chronological comments above preserve the conversation, including proposals and clarifications that were subsequently refined. The linked contract is the consolidated answer: ordinary and rolling averages intentionally differ, nonzero partial formula results participate in ordinary averages, and missing-derived formula zeros do not.

Independent arithmetic calculations checked 27 examples, including the agreed edge cases and compatible-unit conversions. These were contract checks, not production-engine tests. No production code was changed.

Updated existing query-document, table, shared-surface, lifecycle, and performance tickets rather than creating duplicate work. Lifecycle now explicitly depends on this resolution. The remaining statistical-function and evaluator/package questions belong to the already-open query-document ticket; basic arithmetic decisions here are settled.
