---
state: closed 2026-08-26
assignee: serge # claimed 2026-08-26
labels: [wayfinder:grilling]
title: "WQL scenario format"
blocked-by: ["001-parser-fixture-file-format", "002-fake-data-corpus-shape"]
---

## Resolution

Spec: [006-wql-scenario-format.md](../assets/006-wql-scenario-format.md)

One-line answer: catalog at `packages/wql/tests/fixtures/scenarios/*.md`;
flat-meta-line frontmatter (`corpus`, `preferredUnit`, `rangeEnd`, `match`),
`## Query` ```wql fence, `## Expected` per query family (scalar summary,
grouped series, timeseries points, rows runs/events) or `## Errors`;
closed-set match by default with `match: subset` opt-in; 6 approved initial
examples grounded directly in real `QueryService` execution over seeded corpus.

## Question

Concretize the goal-2 scenario file format (fake data → WQL → expected
filter/data outputs):

1. Scenario anatomy: query text + corpus slice reference + expected output,
   in one human-readable file consistent with 001's conventions.
2. Expected-output readable form per query family: aggregate series (with
   `by` groups and `.rollup` buckets), rows results, value tables.
3. Mandatory family coverage: aggregates with/without `by`, tag filters
   (OR-lists, negation), `.rollup()`, `rows:` targets (`all`, `result:`,
   `block:`, `note:`), and whether dashboard-fence parsing scenarios belong
   here or stay in inline tests.
4. Error scenarios: validation messages as first-class expectations.

Deliverable: format spec + approved example scenarios per family — the
contract 007 implements and 008's gallery reuses.
