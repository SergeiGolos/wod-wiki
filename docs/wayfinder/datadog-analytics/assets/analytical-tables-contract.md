# Cross-workout analytical tables and drill-down

Status: resolved decision contract; planning only.

Owned by [Cross-workout tables and aggregate drill-down](../issues/06-analytical-tables-and-drilldown.md). Composes with [Field discovery and catalog contract](field-discovery-contract.md), [Automatic grain selection and contribution ownership](automatic-grain-contract.md), [Time buckets, group keys, and alignment](time-alignment-contract.md), [Missing values, units, and numerical correctness](arithmetic-contract.md), and [Query documents and shared-key formulas](query-documents-contract.md). This asset specifies required behavior; it is not production code.

## 1. Cross-workout rows queries and row identity

### 1.1 Scope relaxation and backward compatibility

`rows:` queries support two distinct modes:

1. **Single-session log viewer (existing behavior preserved):**
   Scoped by exact `result:`, `block:`, or `note:` filter (e.g. `rows:all{result:xyz}` or `rows:segment{result:xyz}`). Backs the existing Session Results Table for a single workout run.
2. **Cross-workout tabular exploration (new capability):**
   `rows:segment` with general tag/dimension filters and an optional time window:
   ```text
   rows:segment{discipline:running} last 4w
   ```
   Removes the mandatory single-session scope constraint specifically for `rows:segment`.

### 1.2 Row identity and grain

- In `rows:segment`, each row represents exactly **one segment observation**.
- Primary identity is `resultId:segmentIndex`.
- Date column reflects the segment's own **Metric Date** (occurrence instant or local civil date), not the workout's start timestamp. Workouts crossing midnight display segments on their respective civil dates.

## 2. Pipe clauses for tabular projection

Cross-workout rows queries accept pipe clauses that govern presentation without altering the underlying dataset:

```text
rows:segment{discipline:running} last 4w
| select date, effort, distance in km, elapsed in min, pace
| order by date desc
| limit 50
```

### 2.1 Column projection (`| select`)

- Comma-separated list of column identifiers.
- Compatible unit conversions can be declared inline: `distance in km`, `elapsed in min`. Values are converted with full numeric precision and formatted for display.
- Ambiguous or non-default field variants reuse the explicit typed selector from the query documents contract:
  `field("score", "number", "mass")`.
- **Missing values:** if a segment has no recorded value for a requested column, it renders as absent/empty (`—`), strictly distinguished from a recorded `0`.

### 2.2 Sorting (`| order by`)

- `<column> [asc | desc]`.
- Multi-column sort supported: `| order by date desc, elapsed asc`.
- **Deterministic ordering:** to prevent arbitrary layout shifts across re-fetches, ties are broken deterministically by `resultId` and `segmentIndex`.

### 2.3 Pagination (`| limit` and `offset`)

- `| limit <n> [offset <m>]`.
- Enables bounded tabular pagination at personal-journal scale without silently dropping records from the total matched count.
- The returned result includes `totalCount` (matched rows) alongside the paginated `rows` slice.

## 3. Scope deduplication

When queries span overlapping note, block, or collection scopes (source finding 3.6):

- Deduplicate rows strictly by stable record identity (`resultId:segmentIndex`).
- A segment reachable through multiple paths (e.g. via note tags and collection feeds) appears exactly once in the table.
- Legitimate repeated measurements within the same workout (e.g. multiple 400m intervals with identical metrics) have distinct segment indices and are preserved. Deduplication never collapses rows based on identical metric values.

## 4. Aggregate drill-down and lineage explanation

When a user clicks an aggregate data point (e.g., Week 34 running volume) to inspect contributing evidence:

### 4.1 Automatic drill-down query generation

The engine constructs a targeted `rows:segment` query:

1. **Tag filters:** inherits all tag and metadata filters from the source aggregate query.
2. **Time boundary:** clips the window to the exact half-open civil boundaries of the clicked bucket (e.g. `2026-08-17T00:00:00` to `2026-08-24T00:00:00` for a Monday week bucket).
3. **Grouping filters:** adds exact filters matching the clicked group tuple (e.g. `{discipline:running, shoe:pegasus}`).

### 4.2 On-demand lineage explanation

Rather than embedding full raw record arrays into every aggregate query payload:

- Base aggregate results carry compact metadata: total contributing observation count, summary coverage descriptor if a substitute summary was selected, and flags for any scopes with insufficient evidence.
- Full contributing rows and detailed audit records are fetched on demand when the user expands the drill-down panel.
- Shows transparently which contributions came from raw segment logs and which were represented by substitute summaries.

## 5. Result contract and widget decoupling

- A cross-workout rows query emits a `TabularResult`:
  ```typescript
  interface TabularResult {
    columns: Array<{ name: string; type: string; unit?: string }>;
    rows: Array<Record<string, unknown>>;
    totalCount: number;
    limit: number;
    offset: number;
  }
  ```
- Compatible widgets (e.g. `table-full`, `table-paged`) consume `TabularResult` directly.
- Switching between compatible visualization types does not trigger silent re-aggregation or alter column definitions.
