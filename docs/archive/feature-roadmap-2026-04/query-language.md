# Query Language for Report Generation

## Vision

A lightweight, domain-specific query language that lets users ask questions about their workout history. Think Datadog's query syntax crossed with JQL, but purpose-built for the WOD domain — filtering workouts by date, tags, exercises, metrics, and aggregating across time.

```
workouts | where tag = "strength" AND last 30d | group by exercise | avg(power), max(reps)
```

## What We Have Today

| Asset | Location | Relevance |
|-------|----------|-----------|
| `EntryQuery` interface | `src/types/history.ts` | Existing filter shape: dateRange, daysBack, tags, limit, offset |
| `IContentProvider` | `src/repositories/` | Unified data access layer (IndexedDB, localStorage, mock) |
| `IOutputStatement` | `src/core/models/OutputStatement.ts` | Rich execution logs with metrics, spans, timing |
| `AnalyticsTransformer` | `src/services/AnalyticsTransformer.ts` | Converts output logs → `Segment[]` with normalized metrics |
| `AnalyticsDataPoint` | `src/repositories/IndexedDBService.ts` | Denormalized trend-query table (by-type, by-segment indexes) |
| Lezer parser infra | `src/parser/`, `src/grammar/` | Existing parser pipeline we can model after |

## Design Options

### Option A: Pipe-Based Query Syntax (Recommended)

Inspired by Datadog/Kusto — reads left-to-right, each pipe stage narrows or transforms the result set.

```
# Simple: all workouts tagged "wod" in last 7 days
workouts | where tag = "wod" AND last 7d

# Aggregation: average power per exercise
workouts | where last 30d | group by exercise | avg(power)

# Time series: weekly volume
workouts | where last 90d | bucket by week | sum(reps), sum(duration)

# Specific metric filter
workouts | where power > 200 AND tag = "cycling" | sort by date desc | limit 10

# Cross-workout comparison
workouts | where title contains "Fran" | compare(elapsed, reps)
```

**Pros:** Familiar to anyone who's used Datadog, Splunk, or KQL. Composable. Easy to extend.
**Cons:** Custom parser needed.

### Option B: Structured Filter Builder (JSON-ish)

More programmatic, like Jira JQL or MongoDB queries.

```
{ from: "workouts", where: { tag: "strength", dateRange: "last 30d" }, groupBy: "exercise", select: ["avg:power", "max:reps"] }
```

**Pros:** Trivially parseable. Maps 1:1 to `EntryQuery` extensions.
**Cons:** Verbose. Not fun to type. Feels like a developer tool, not a user tool.

### Option C: Natural Language Shorthand

```
strength workouts last 30 days grouped by exercise
show me power trends this month
compare all "Fran" attempts
```

**Pros:** Most accessible.
**Cons:** Ambiguous. Hard to parse deterministically. Could layer on top of Option A as sugar.

### Recommendation

**Option A as the core**, with Option C as a future sugar layer. The pipe syntax is expressive, deterministic, and maps cleanly to the execution pipeline.

## Query Language Grammar

### Pipeline Structure

```
query     := source ('|' stage)*
source    := 'workouts' | 'results' | 'segments'
stage     := where | group | aggregate | sort | limit | bucket | compare

where     := 'where' condition ('AND' condition)*
condition := field op value
           | 'last' number unit        -- sugar for dateRange
           | 'tag' '=' string
           | 'title' 'contains' string
           | field '>' | '<' | '=' number

group     := 'group by' field (',' field)*
bucket    := 'bucket by' interval      -- day | week | month
aggregate := agg_fn '(' field ')' (',' agg_fn '(' field ')')*
agg_fn    := 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p95'
sort      := 'sort by' field ('asc' | 'desc')?
limit     := 'limit' number
compare   := 'compare' '(' field (',' field)* ')'
```

### Data Sources

| Source | Queries | Returns |
|--------|---------|---------|
| `workouts` | `Note` + `NoteSegment` table | Workout-level data (title, tags, date, total metrics) |
| `results` | `WorkoutResult` table | Execution-level data (logs, elapsed, completion) |
| `segments` | `AnalyticsDataPoint` or derived `Segment[]` | Granular metric-level data (per-block metrics) |

### Queryable Fields

From existing `IMetric` types and `Segment` properties:

| Field | Type | Source |
|-------|------|--------|
| `date` | timestamp | Note.targetDate |
| `tag` | string[] | Note.tags |
| `title` | string | Note.title |
| `exercise` | string | Segment.name or IMetric exercise label |
| `duration` | number (s) | Segment.duration |
| `elapsed` | number (s) | Segment.elapsed |
| `power` | number | metric map |
| `heart_rate` | number | metric map |
| `reps` | number | metric map |
| `distance` | number | metric map |
| `cadence` | number | metric map |
| `resistance` | number | metric map |
| `speed` | number | metric map |

## Implementation Plan

### Phase 1: Query Parser

Build a Lezer grammar for the query language, paralleling the existing Whiteboard script parser pattern.

```
src/
  query/
    query.grammar          # Lezer grammar definition
    QueryParser.ts         # Parser wrapper (input string → AST)
    QueryAST.ts            # AST node types
    QueryValidator.ts      # Semantic validation (field exists, type compat)
```

**AST Shape:**
```typescript
interface QueryAST {
  source: 'workouts' | 'results' | 'segments';
  stages: QueryStage[];
}

type QueryStage =
  | { type: 'where'; conditions: Condition[] }
  | { type: 'group'; fields: string[] }
  | { type: 'bucket'; interval: 'day' | 'week' | 'month' }
  | { type: 'aggregate'; aggregations: Aggregation[] }
  | { type: 'sort'; field: string; direction: 'asc' | 'desc' }
  | { type: 'limit'; count: number }
  | { type: 'compare'; fields: string[] };

interface Condition {
  field: string;
  op: '=' | '>' | '<' | '>=' | '<=' | 'contains';
  value: string | number;
}

interface Aggregation {
  fn: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p95';
  field: string;
}
```

### Phase 2: Query Engine

A stateless engine that takes a `QueryAST` and produces a result set. Operates on existing data layer.

```
src/
  query/
    QueryEngine.ts         # Pipeline executor
    stages/
      WhereStage.ts        # Filtering (extends EntryQuery pattern)
      GroupStage.ts         # Grouping + key extraction
      BucketStage.ts       # Time-series bucketing
      AggregateStage.ts    # Metric aggregation (avg, sum, etc.)
      SortStage.ts         # Ordering
      LimitStage.ts        # Pagination
      CompareStage.ts      # Side-by-side comparison
```

**Execution pipeline:**
```
QueryAST
  → resolve source (IContentProvider query)
  → for each stage:
      transform dataset
  → return QueryResult
```

**Result type:**
```typescript
interface QueryResult {
  columns: ColumnDef[];       // { name, type, aggregation? }
  rows: QueryRow[];           // Flat or grouped
  metadata: {
    source: string;
    executionMs: number;
    totalMatched: number;
  };
}

type QueryRow = Record<string, string | number | null>;
```

### Phase 3: Integration Points

1. **Command palette strategy** — Type queries directly in the palette:
   ```typescript
   const queryStrategy: CommandStrategy = {
     id: 'query',
     handleInput: (text) => { parseAndExecute(text); return true; },
     placeholder: 'workouts | where last 7d | ...',
   };
   ```

2. **Dedicated query panel** — A panel in the panel system with:
   - Query input (with syntax highlighting via Lezer)
   - Result display (table/chart — see report renderer doc)
   - Query history (recent queries persisted)

3. **Saved queries** — Store named queries in `Note` segments with `dataType: 'query'`.

### Phase 4: CodeMirror Integration

Since the editor already uses CodeMirror 6 with Lezer, we can reuse the same patterns:

- Lezer grammar → syntax highlighting for query input
- Autocomplete extension → field names, functions, tag values
- Lint extension → semantic validation (unknown fields, type mismatches)

## Data Flow

```
User types query string
       │
       ▼
  QueryParser.parse(input)
       │
       ▼
  QueryAST (validated)
       │
       ▼
  QueryEngine.execute(ast, contentProvider)
       │
       ├── Source resolution: IContentProvider.getHistory(entryQuery)
       │       returns HistoryEntry[]
       │
       ├── For 'segments' source:
       │       AnalyticsTransformer.fromOutputStatements(logs)
       │       returns Segment[]
       │
       ├── Pipeline stages transform dataset
       │
       ▼
  QueryResult { columns, rows, metadata }
       │
       ▼
  ReportRenderer (see report-renderer.md)
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| IndexedDB query performance on large datasets | Slow queries | Leverage `AnalyticsDataPoint` indexes; add cursor-based iteration |
| Grammar complexity creep | Maintenance burden | Start minimal (where + group + aggregate), extend via stages |
| Field discovery (dynamic metrics) | User confusion | Autocomplete from actual data; `show fields` meta-query |
| Cross-workout joins | Complex engine | Defer joins; use `compare` as a simpler alternative |

## Open Questions

- Should the query language support sub-queries (e.g., `workouts | where elapsed > avg(elapsed)`)?
- Do we want a visual query builder as an alternative to text input?
- How do we handle custom/user-defined metric types that don't exist in the standard set?
- Should query results be cacheable, and if so, what's the invalidation strategy?
