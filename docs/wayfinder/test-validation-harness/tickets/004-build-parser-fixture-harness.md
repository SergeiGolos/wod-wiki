---
state: closed 2026-08-26
labels: [wayfinder:task]
assignee: serge # claimed 2026-08-26
blocked-by: ["001-parser-fixture-file-format"]
---

## Resolution

Landed on branch `testing-spike`, TDD (comparator → anatomy parser →
driver, each red before green):

- Harness at `packages/lang/tests/harness/parserFixture/`:
  `metricLine.ts` (DSL parse + diagnostics), `compare.ts` (closed/subset
  multiset match, DSL-form diffs), `fixtureFile.ts` (anatomy + flat
  frontmatter, diagnostics naming file/section/line). 27 harness unit
  tests.
- Driver `packages/lang/tests/parserFixtures.test.ts` — glob-discovers
  `fixtures/parser/*.md`; one file = one test named by its `title`.
- Catalog grew 3 → 10 fixtures: v1.1 syntax-reference set
  (reps/rest/rounds/distance-load/EMOM laps/comments+custom objects/
  collectible `?` timer/hierarchy), every Expected block grounded in a
  real parseScript dump.
- Two spec amendments (asset 001 v1.1), both forced by grounded output:
  quoted tail values (`Text text:"last set heavy"`) and the `?`
  undefined-value literal (`- Rep ? @hinted`).

Verification: full root suite green (`bun run test`: 117 files / 1271
package tests + storybook 15, exit 0); `tsc --noEmit` clean; adding a
fixture file adds a test with zero TS changes (3 → 10 via new files only);
a deliberately wrong expectation fails readable — file, title, `[Line N]`,
failed expectation, and what the statement carries.

## Question

Land the goal-1 harness in-repo, implementing 001's spec:

1. Glob-discovery of the fixture catalog in the owning package's vitest
   project — creating a new fixture file adds a test with zero TS changes.
2. Semantic comparator implementing 001's comparison rules (subset/exact,
   ordering, ignored meta fields, error cases).
3. Wiring into `bun run test:packages` (root workspace stays green).
4. Harness unit tests (comparator rules, discovery, malformed-fixture
   diagnostics that name file + section).
5. Initial fixture set: the approved examples from 001 plus coverage of the
   syntax-reference basics (`docs/02-syntax-reference.md`).

Verification: root suite green; adding a fixture file without touching any
TS adds a visible passing/failing test; a deliberately wrong expectation
fails with a readable diff naming the fixture.
