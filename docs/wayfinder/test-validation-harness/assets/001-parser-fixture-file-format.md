# Parser Fixture File Format — Spec (v1)

Decided in [Parser fixture file format](../tickets/001-parser-fixture-file-format.md).
The contract ticket 004's harness implements.

## Location & discovery

- Catalog: `packages/lang/tests/fixtures/parser/*.md`.
- One file = one test. Discovery is glob-based (harness driver in 004); adding
  a file adds a test with zero TS changes. Vitest's `tests/**/*.test.ts`
  include never picks these up directly.
- Precedent: `packages/engine/fixtures/golden/` (in-package fixture
  catalogs are the house pattern).

## File anatomy

```markdown
---
title: <human name>              # required; used in test names & failure headers
match: subset                    # optional; default is closed (see below)
sport: climb                     # optional; forwarded verbatim to parseScript
withoutDialects: true            # optional
---

## Script

```wod
<whiteboard source, verbatim>
```

## Expected

### Line 1
- <metric line>
- <metric line>

## Errors

- line <n>: "<message>"
```

Frontmatter is **flat meta lines** — the repo's existing frontmatter idiom
(`parseFrontmatter` in `packages/wql/src/dashboard/frontmatter.ts`), not
nested YAML, so the harness needs no YAML dependency. Harness-known keys
(`title`, `match`, `sport`, `withoutDialects`) map to test name, match mode,
and `parseScript` options respectively; unknown keys are a fixture error.

Sections: `## Script` required. `## Expected` and `## Errors` are mutually
exclusive — a fixture asserts either a parse result or failures, never both.
An empty `## Expected` (zero statement blocks) asserts zero statements.

## Metric-line DSL

One line per expected **Metric**, order-insensitive within a statement:

```
- <Type> <value> [@<origin>]
```

- **Type**: written in PascalCase (`Duration`, `ClimbGrade`) or the canonical
  kebab-case token (`duration`, `climb-grade` — what `String(metric.type)`
  yields); the harness canonicalizes PascalCase → kebab (lowercase, `-` at
  camel boundaries) before comparing. Custom string types use kebab verbatim.
- **Value literals**:
  - Time: `5:00`, `1:30:00` (`h?mm:ss`) — parsed to ms (`5:00` → `300000`).
  - Number: `20`, `5.12`.
  - Quoted string: `"Back Squat"` — required when the value contains spaces.
  - Bare token: `domain.cardio`, `flash` — single-token string values (hint
    names, send types) may be written unquoted.
  - Amount + unit sugar: `Resistance 225 lb` / `Distance 5 km` — asserts
    `value.amount`, `value.unit`, and the metric's top-level `unit` all equal
    the given values.
  - Object tails: `ClimbGrade raw:V5 system:v-scale` — bare `<key>:<value>`
    pairs assert individual fields of an object-valued metric; unlisted
    fields are ignored.
- **`@origin`**: optional; pins `metric.origin` (`parser`, `dialect`, …).
  Omitted → any origin matches. Pin it when producer identity is the point
  (dialect-emitted metrics).

Statement blocks (`### Line N`) are matched **positionally in source-line
order**; `N` is documentation, the harness matches by position and reports
line numbers from the actual parse.

## Comparison semantics (fixed at charting + this ticket)

- **Closed set by default**: each statement must carry exactly the listed
  metrics — an unlisted extra metric fails. Catches spurious metrics from
  dialect changes.
- **`match: subset`** (frontmatter): only listed metrics are checked; extras
  pass. For fixtures intentionally pinning one facet of a churning statement.
- Statement count is exact in both modes unless `### Line N` blocks are
  omitted under `match: subset` (then count is unchecked).
- **Always ignored**: `timestamp`, `sourceBlockKey`, `image`, `name`,
  `metadata`, `action`, statement ids beyond order, line/column meta.

## Errors section

`## Errors` asserts `script.errors` equals exactly the listed entries
(`- line <n>: "<message>"`). **Grounded caveat**: the current `parseScript`
path is error-tolerant and never populates `script.errors` (verified — only
`analytics/calculateBlock` and runtime actions push errors, neither on this
path). The section is spec'd for when a hard-failure surface arrives; no v1
example exercises it.

## Approved examples (hand-verified against real parse output)

1. [`timers.md`](../../../../packages/lang/tests/fixtures/parser/timers.md) —
   time literals, quoted efforts, hint pinning with `@dialect`.
2. [`amrap-with-units.md`](../../../../packages/lang/tests/fixtures/parser/amrap-with-units.md) —
   hints, `Rep`, fused `Resistance`/`Distance` amount+unit sugar.
3. [`climb-grades.md`](../../../../packages/lang/tests/fixtures/parser/climb-grades.md) —
   `sport:` frontmatter, dialect metrics, object tails.

## Observations for later tickets (not format decisions)

- `Title: Morning Workout` (capital-key property with multi-word value)
  spills the tail as a second statement that **reuses id 1** — parser quirk,
  not a format concern; candidate for the coverage-inventory fog.
- `185/125 lb Back Squat` parses as division (`Resistance 1.48 lb`), emitting
  no **Choice Group** — the slash-choice path needs dialect context not
  present in that line; coverage gap for the inventory.
