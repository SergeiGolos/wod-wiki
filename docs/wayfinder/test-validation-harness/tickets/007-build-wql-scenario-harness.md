---
state: closed 2026-08-26
assignee: serge # claimed 2026-08-26
labels: [wayfinder:task]
blocked-by: ["005-seed-fake-data-corpus", "006-wql-scenario-format"]
---

## Resolution

Landed on branch `testing-spike`, TDD (scenarioFile parser -> semantic comparator -> driver):
- Harness at `packages/wql/tests/harness/scenarioFixture/`: `scenarioFile.ts` (flat frontmatter, query fence, expected/errors parser), `compare.ts` (scalar, grouped series, timeseries points, rows runs/events, errors matcher). 15 unit tests.
- Driver `packages/wql/tests/scenarioFixtures.test.ts` — glob-discovers `packages/wql/tests/fixtures/scenarios/*.md`; one file = one test.
- Initial scenario set: 9 scenarios covering scalar aggregates, grouped series, tag filters, weekly timeseries, rows queries, error cases, and all four seeded journals (`crossfit-multi-week`, `endurance-block`, `mixed-wellness`, `climb-yoga`).

Verification: 24 new tests in `packages/wql` (15 unit + 9 scenarios); full root package suite green (121 files / 1327 tests); tsc clean; wrong expectations fail with a readable diff.

## Question

Land the goal-2 harness in-repo:

1. Scenario runner over `QueryService` + the corpus loader (005): execute
   each scenario's query against its slice, compare against the expected
   readable form per 006's rules.
2. Glob-discovery — new scenario file adds a test, mirroring 004's harness.
3. Wiring into `bun run test:packages`.
4. Initial scenario set: 006's approved examples expanded to its mandatory
   family list.

Verification: root suite green; new scenario file adds a test; wrong
expected output fails with a readable table diff.
