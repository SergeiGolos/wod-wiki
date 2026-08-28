# WQL Scenario Format — Spec (v1)

Decided in [WQL scenario format](../tickets/006-wql-scenario-format.md).
The contract ticket 007 (harness) and 008 (gallery) implement.

## Location & discovery

- Catalog: `packages/wql/tests/fixtures/scenarios/*.md`.
- One file = one scenario test, discovered by glob (`packages/wql/tests/scenarioFixtures.test.ts`).
- Dropping a new `.md` scenario file adds a test with zero TS changes.

## File anatomy

```markdown
---
title: <human name>              # required; test name
corpus: crossfit-multi-week      # optional; default: crossfit-multi-week
preferredUnit: lb                # optional; passed to QueryOptions
rangeEnd: 1783357200000          # optional; anchor timestamp for windowed queries
match: subset                    # optional; default is closed
---

## Query

```wql
<query text>
```

## Expected

<format per query family>

## Errors

- "<message substring or exact text>"
```

Sections: `## Query` (containing a ` ```wql ` code fence) is required.
`## Expected` and `## Errors` are mutually exclusive.

## Output DSL per query family

### 1. Scalar aggregate queries (no `by`, single overall number)

```markdown
## Expected

- scalar: 53775
- unit: lb
```

### 2. Grouped aggregate queries (`by {dimension}`)

```markdown
## Expected

### Series gymnastics
- value: 17640
- unit: lb

### Series kettlebell
- value: 33750
- unit: lb

### Series bodyweight
- value: 2385
- unit: rep
```

Each `### Series <key>` block matches by `series.key` or `series.label`.

### 3. Timeseries queries (`by {week}` / `by {day}` / `.rollup(...)`)

```markdown
## Expected

### Series totalVolume
- point 2026-06-01: 2790
- point 2026-06-08: 2850
- point 2026-06-15: 2910
- point 2026-06-22: 2970
- point 2026-06-29: 3030
- point 2026-07-06: 3090
```

Points are listed as `- point <date-or-timestamp>: <value>` or `- <value>`.
Date formats (`YYYY-MM-DD`) match the civil date of the bucket timestamp.

### 4. Rows queries (`rows:all{...}`, `rows:segment{...}`)

```markdown
## Expected

### Run res-fran-w0
- note: note-journal-2026-06-01
- event res-fran-w0:summary:totalVolume [summary/analytics] totalVolume:2790 lb
- event res-fran-w0:summary:tis [summary/analytics] tis:46 pts
- event res-fran-w0:summary:sessionLoad [summary/analytics] sessionLoad:210 au
```

Each `### Run <resultId>` block lists the expected runs and events.

### 5. Error scenarios

```markdown
## Errors

- "Bare \"rows:\" is retired — name a target"
```

## Comparison semantics

- **Closed set by default**: all series/points/runs/events must match; extra or missing items fail.
- **`match: subset`** (frontmatter): listed series/points/events are checked; unlisted extras pass.
- **Always ignored**: internal execution telemetry (`stages.selected`, `stages.buckets`), raw matched fact arrays.

## Approved initial example scenarios

1. `scalar-volume.md`: `sum:totalVolume{}` over `crossfit-multi-week` -> scalar 53775 lb.
2. `grouped-volume.md`: `sum:totalVolume{} by {discipline}` -> gymnastics (17640 lb), kettlebell (33750 lb), bodyweight (2385 rep).
3. `tag-filter-load.md`: `sum:sessionLoad{discipline:kettlebell}` -> scalar 1710 au.
4. `timeseries-weekly.md`: `sum:totalVolume{discipline:gymnastics} by {week}` -> 6 weekly points from 2790 to 3090.
5. `rows-result.md`: `rows:all{result:res-fran-w0}` -> 1 run with 3 summary events.
6. `error-bare-rows.md`: `rows:` -> parse error message.
