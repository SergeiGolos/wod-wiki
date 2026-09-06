# Query documents and shared-key formulas

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 04
Prerequisites: [Missing values, units, and numerical correctness](04-missing-values-units-and-arithmetic.md)

## Question

How should one query document express named queries and derived relationships while retaining existing single-query WQL behavior?

Resolve:
- Syntax and parsed representation for named query inputs and formulas; the proposal's a/b/show syntax is a candidate, not an accepted grammar.
- Own the shared explicit typed/dimensioned field-selector syntax and explicit array operations required by [Field discovery and catalog contract](../assets/field-discovery-contract.md). Preserve normalized dotted paths and unknown-field tolerance. Define syntax that rows/table clauses can reuse rather than a second selector language.
- Per-query versus document-level scope, dependency order and cycles, references, localized errors, serialization, and existing fence parameters/frontmatter tokens.
- Aggregate-first versus observation-level calculations; unit/dimension checks; shared bucket/group alignment using the settled contracts. Distinguish ratio-of-totals from average-of-ratios explicitly.
- Consume [Missing values, units, and numerical correctness](../assets/arithmetic-contract.md) without redefining its reducer rules. Make raw-observation, bucket-result, and formula-point scopes explicit; retain presence through chained formulas, ordinary-versus-rolling average eligibility, partial-window denominators, and local error propagation. Rounding belongs only in presentation.
- Own the persisted user-selected time-normalization syntax and its scope under [Time buckets, group keys, and alignment](../assets/time-alignment-contract.md). Recompute over the shared range, preserve source query ranges, report grouping mismatches, and retain observed-group unions. Normalizing one formula must not silently change unrelated consumers of a shared named query.
- Required ratio, moving-average, and correlation capabilities from source sections 4 and 5 Phase 5, including temporal lag if needed for the agreed questions. Exclude arbitrary joins.
- Specify any additional statistical-function semantics required by correlation/lag: paired-input population, treatment of missing positions, insufficient pairs, and zero variance. These are function-specific decisions, not permission to reopen the settled ordinary/rolling reducer contract or assume all statistics share one denominator.
- Reuse of the existing calc parser/evaluator without silently introducing an invalid package dependency. Confirm current package boundaries and extension seams before choosing reuse.
- Reconcile the recognition catalog and dimensional conversion machinery through one source-grounded package contract. Cover registered unit aliases/scales, the agreed system output defaults, and context-dependent conversion evidence. WQL must not inherit authoritative dimension casts, unknown-unit pass-through, or count-dropping unit labels from existing calc shortcuts.
- A query-result contract that does not change its underlying meaning when a compatible widget type changes; data required for scatter and multi-axis views.

Resolution must define the document/formula contract and user-facing examples, identify grammar/evaluator/package changes, and distinguish rejected designs from the chosen one. No production parser or evaluator changes in this ticket.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### Query blocks are self-contained — agreed during grilling

Named query and formula definitions are local to their containing query block. A block cannot implicitly reference definitions in another block or widget; moving or deleting a different block does not change its definition scope. Shared execution may reuse identical work without introducing cross-block name dependencies. Existing explicit frontmatter/host parameter references remain a separate input mechanism; their integration must not become implicit cross-block query references.

### Named assignments and explicit show — agreed during grilling

Use `name = expression` for both named WQL query inputs and derived formulas, with `show` selecting displayed results. Descriptive names are allowed. Intermediate definitions remain hidden unless explicitly selected. Existing single-query blocks continue working without assignments or `show`.

Agreed example:

```text
distance = sum:distance{} by {week} last 4w
duration = sum:elapsed{} by {week} last 4w
speed = distance / duration
show speed
```

### Show multiple named results — agreed during grilling

Allow a comma-separated list of names, such as `show distance, duration, speed`. Return the selected outputs in the listed order, preserving each output's name, units, and groups. Widget presentation must not change their calculations; a compatible widget can present the outputs as columns or separate series without implicitly merging their units or grouping identities.

### Forward references and dependency order — agreed during grilling

Allow formulas to reference definitions written later in the same query block. Resolve names across the block and evaluate in dependency order, not source-line order. Reordering definitions does not change their results; the explicit `show` list still determines presentation order. Circular references produce an error rather than an arbitrary evaluation order or fabricated value.

### Block-level default time range — agreed during grilling

Allow one shared default time range within a query block. Resolve precedence as explicit per-query range, then block default, then host/dashboard default. An explicitly longer or shorter query range remains unchanged; formulas still evaluate over the agreed intersection of their input ranges. The block default does not silently rewrite the definitions of explicitly ranged inputs.

### Block-level default grouping — agreed during grilling

Allow shared default grouping, such as `by {week}`, within a query block. An explicit per-query `by {...}` completely replaces the block grouping rather than merging with it. Resolve each input's effective grouping before checking formula compatibility; differing resulting groupings still produce the agreed mismatch diagnostic, not implicit broadcasting or regrouping.

### Shared defaults directive — agreed during grilling

Use a `defaults` line with familiar WQL grouping/range clauses, separate from named definitions. Existing single-query blocks remain unchanged.

Agreed example:

```text
defaults by {week} last 4w

distance = sum:distance{}
duration = sum:elapsed{}
speed = distance / duration

show distance, speed
```

### Per-segment formulas before aggregation — agreed during grilling

Support explicit per-segment calculation before aggregation as well as formulas over aggregated named query results. Pair operands within the same segment, not by arbitrarily joining records. For segments `100 m / 10 s` and `100 m / 100 s`, average segment speed is `5.5 m/s`, while total distance divided by total time is `200/110 m/s`. The syntax must distinguish these calculation scopes and preserve equal observation weighting for the per-segment result population.

### Explicit each expression and reusable authoring — agreed during grilling

Use `avg:each(distance / elapsed){}` to calculate within each segment before aggregation. Inside `each(...)`, field references resolve against that segment rather than named aggregate queries.

The user additionally requires the same capability when building custom calculations on efforts or dialects. Investigate existing calculation-authoring and evaluation contexts before specifying the shared contract; do not introduce an unrelated expression language for those surfaces. The exact attachment, evaluation scope, and persistence behavior of reusable effort/dialect calculations remain to be clarified.

### Attached calculations produce metrics; query formulas are read-time — agreed during grilling

A custom calculation attached to an effort or dialect runs automatically for matching workout data at its declared scope and emits a named metric that is recorded and can later be queried through WQL. A formula defined only inside a query block computes query results without creating saved measurements. Reuse the expression capability across these contexts rather than introducing a separate effort/dialect calculation language. Persisted outputs follow the established producing-scope observation and contribution ownership rules.

### Effort-specific calculation overrides the dialect default — agreed during grilling

When an effort and its Block Dialect define the same calculation, the effort-specific definition wins for that effort. Other efforts continue to use the dialect definition. Do not execute both definitions for the same applicable scope or emit duplicate metric observations; effort-specific replacement must not globally suppress the dialect default for unrelated efforts.

### Workout-level effort calculations use matching effort data — agreed during grilling

A workout-level calculation attached to an effort aggregates only that effort's segments and emits one result for that effort within the workout. For a mixed running/cycling workout, a running-attached calculation does not include cycling segments. Segment-level attached calculations continue to emit one result per matching segment. Preserve the effort partition in output identity/provenance so scoped observations are not mistaken for whole-workout measurements or duplicate representations.

### Explicit typed field selector — agreed during grilling

Use `field(path, type, dimension)` for explicit field-variant selection, for example `sum:field("score", "number", "mass"){}`. Preserve short references such as `sum:score{}` when operation-aware selection is unambiguous. The selector chooses a variant; it does not cast incompatible data. Reuse the same selector inside `each(...)` and in table columns rather than introducing separate field-reference languages.

### Explicit array expansion and element weighting — agreed during grilling

Arrays are expanded only by an explicit query operation. An explicitly expanded array contributes its elements as the calculation population, with equal element-level weighting. For segment arrays `[100, 100, 100]` and `[200]`, expanding and averaging gives `125`. Reducing each array to one mean before averaging the two segment results instead gives `150`. Preserve the distinction between these explicitly selected populations; do not implicitly flatten arrays or change observation weighting.

### Array operation syntax — agreed during grilling

Use `expand(...)` to contribute individual array elements, `mean(...)` to reduce an array to one value, and `at(array, index)` for explicit zero-based element selection. Reuse the existing expression-language `mean` convention instead of introducing a competing average-function spelling.

Agreed examples:

```text
allReadings = avg:expand(heartRates){}
segmentMeans = avg:each(mean(heartRates)){}
firstReadings = avg:each(at(heartRates, 0)){}
```

### Correlation uses paired values — agreed during grilling

Exclude positions where either correlation input is missing; do not manufacture paired measurements by zero-filling a missing counterpart. Genuine recorded zeros remain eligible. Report the number of pairs used. This selects the correlation's statistical population without shortening or hiding the source series, which retain their requested ranges. Apply the existing shared-range and grouping compatibility rules before pairing.

## Answer

Resolved through live grilling with Serge. The authoritative [Query documents and formulas contract](../assets/query-documents-contract.md) defines:

- Backward-compatible multi-line query documents: optional `defaults by {...} last ...`, named assignments `<name> = <query | expr>`, and explicit `show <name1>, <name2>`.
- Strict block-local scoping with dependency-ordered evaluation, forward references, and cycle detection.
- Calculation scope distinction: post-aggregation cross-series formulas vs pre-aggregation per-segment formulas via `avg:each(...)`.
- Explicit typed field variant selection via `field("path", "type", "dimension")` and explicit array operations (`expand`, `mean`, `at`).
- Reusable calculation authoring: effort and Block Dialect attached calculations produce recorded metric observations, with effort definitions overriding dialect defaults.
- Statistical correlation `corr(a, b)` evaluated over paired in-range observations without synthetic zero-filling.
- Decoupled evaluator architecture with `@bitcobblers/wod-wiki-wql` defining `IFormulaEvaluator` and umbrella package wiring to prevent circular dependencies.

No production code was modified. Downstream cross-workout table, shared execution, and implementation tickets inherit this contract.
