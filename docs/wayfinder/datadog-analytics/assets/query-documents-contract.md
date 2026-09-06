# Query documents and shared-key formulas

Status: resolved decision contract; planning only.

Owned by [Query documents and shared-key formulas](../issues/05-query-documents-and-formulas.md). Composes with [Field discovery and catalog contract](field-discovery-contract.md), [Automatic grain selection and contribution ownership](automatic-grain-contract.md), [Time buckets, group keys, and alignment](time-alignment-contract.md), and [Missing values, units, and numerical correctness](arithmetic-contract.md). This asset specifies required behavior; it is not production code.

## 1. Document syntax and scoping

A **Query Document** represents the self-contained analytics definitions within a single ```query block. It is backward-compatible with existing single-query blocks.

### 1.1 Single-query backward compatibility

Existing single-query blocks continue to execute unchanged:

```text
sum:totalVolume{discipline:strength} by {week} last 12w in kg
```

Single queries require no assignments, no `defaults` directive, and no `show` statement.

### 1.2 Multi-line document grammar

Multi-line query blocks use explicit named assignments and a `show` selection:

```text
defaults by {week} last 12w

dist = sum:distance{discipline:running} in km
time = sum:elapsed{discipline:running} in hr
pace = time / dist

show dist, pace
```

The document structure comprises:

1. **Optional `defaults` directive:**
   `defaults [by {dim, ...}] [last <n>d|<n>w | from <date> [to <date>]]`
   Sets default grouping and/or time window for named queries in the block that do not specify their own.
2. **Named assignments:**
   - Named query: `<ident> = <aggregator>:<metric>{<filters>} [by {<dims>}] [window] [in <unit>]`
   - Named formula: `<ident> = <expression> [ (normalize <bucket>) ] [ -> <unit> ]`
3. **Explicit `show` directive:**
   `show <ident> [, <ident> ...]`
   Selects which named results are surfaced to the widget. Definitions not listed in `show` are intermediate and hidden from presentation. Multiple outputs are returned in listed order.

### 1.3 Block-local scoping and dependency order

- **Self-contained blocks:** named queries and formulas are strictly scoped to their containing query block. Moving, editing, or deleting another block in the same note cannot break references.
- **External parameters:** host/dashboard tokens (such as `$discipline`) enter as explicit parameter bindings, never as implicit cross-block query references.
- **Dependency ordering:** definitions resolve by reference graph, not source line order. Forward references are valid.
- **Cycle detection:** dependency cycles (e.g. `a = b + 1; b = a + 1`) produce a localized document-level diagnostic without crashing or evaluating in arbitrary order.

## 2. Calculation scopes: aggregate vs segment

The engine supports two distinct calculation scopes:

### 2.1 Post-aggregation formulas (cross-series)

Defined over named query outputs:

```text
speed = distance / duration
```

- Evaluates over the **WQL Alignment Domain**: intersection of requested time ranges and union of observed compatible group tuples (from the time contract).
- Pointwise arithmetic follows the [arithmetic contract](arithmetic-contract.md): missing positions in formulas are substituted as zero; missing-derived formula zeros are excluded from subsequent ordinary averages, while nonzero partial formula results participate.
- Mismatched grouping sets produce an explicit error; no implicit broadcasting across different grouping dimensions.
- Normalization intent is declared explicitly on the formula: `speed = distance / duration (normalize 1w)`. Recomputes inputs over the shared domain; does not alter raw source query definitions.

### 2.2 Pre-aggregation segment formulas (`each`)

Calculated across fields of the **same segment** before aggregation:

```text
meanSegmentSpeed = avg:each(distance / elapsed){} by {week} last 4w
```

- `each(...)` defines a row-level expression evaluated for each eligible segment.
- Operands inside `each(...)` resolve to metric values within that specific segment, not named aggregate series.
- The outer aggregator (`avg`, `sum`, `min`, `max`) aggregates the per-segment results with **equal observation weighting**.
- Distinguishes "average segment speed" from "total distance divided by total time."

## 3. Explicit typed field selectors and collections

### 3.1 Typed field selector

Unambiguous metrics use short names (`sum:distance{}`). When a path has multiple variants (e.g. numeric mass vs numeric count vs text), explicit selection uses:

```text
field("path", "kind", "dimension")
```

Example:

```text
sum:field("score", "number", "mass"){}
```

- Selects an existing compatible variant from the Field Catalog. It does not perform an unsafe runtime type cast.
- Reused uniformly across query heads, inside `each(...)`, and in table column definitions.

### 3.2 Collection and array operations

Arrays are not implicitly flattened. Explicit operations include:

- `expand(arrayField)`: contributes individual array elements to the calculation population with equal element weighting.
  Example: `avg:expand(heartRates){}`
- `mean(arrayField)`: reduces each segment's array to a single mean value before outer aggregation.
  Example: `avg:each(mean(heartRates)){}`
- `at(arrayField, index)`: extracts an element by zero-based index.
  Example: `avg:each(at(heartRates, 0)){}`

## 4. Reusable attached calculations (efforts & dialects)

The expression capability inside `each(...)` is shared with reusable custom calculations on efforts and Block Dialects:

| Capability | Query formula (`=`) | Attached calculation |
|---|---|---|
| Scope | Read-time query block | Workout data matching effort or Block Dialect |
| Persistence | Computed on demand; zero stored metrics | Emits named, recorded Metric Observations into logs / analytics store |
| Execution | Query Service | Analytics engine during log/segment processing |
| Reusability | Local to block | Across all workouts matching the effort/dialect |

### Precedence and partitioning

1. **Effort overrides dialect:** an effort-specific calculation overrides a calculation of the same name defined on the Block Dialect for that effort only.
2. **Effort partition:** a workout-level calculation attached to an effort aggregates only that effort's segments, emitting one observation per effort per workout.
3. **No duplicate emission:** matching data executes the winning definition once; effort overrides do not trigger dual execution.

## 5. Statistical functions and correlation

- `corr(a, b)`: computes Pearson correlation over aligned pairs.
- **Paired values only:** positions missing either operand are excluded from the correlation population; no zero-filling is used to fabricate pairs.
- **Reporting:** result metadata includes the number of valid pairs evaluated.
- **Source preservation:** underlying series `a` and `b` retain their full requested ranges when displayed alongside correlation.

## 6. Package boundaries and evaluator architecture

To maintain clean package architecture without circular dependencies:

- `@bitcobblers/wod-wiki-wql` owns document parsing, AST, and query scheduling. It defines an `IFormulaEvaluator` interface.
- The expression parser and Pratt evaluator live in `@bitcobblers/wod-wiki-lang/calc`.
- `@bitcobblers/wod-wiki-engine` (umbrella) or the consuming application wires the evaluator into `QueryService` / document runner.
- **Unit/dimension safety:** WQL formula evaluation enforces strict physical dimension matching and rejects the calc engine's historical authoritative casts (`pts`, `AU`) in WQL queries.
