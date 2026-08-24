# WQL Interface Changes — Prototype Proposal

**Status**: proposal, not implemented. Derived from the architecture review of
`@bitcobblers/wod-wiki-wql` (`../wod-wiki-engine/packages/wql`) and its consumers.
Each change below states the interface delta and the **blast radius** — everything
that must move for the change to land cleanly.

The seven changes:

| # | Change | One-liner |
|---|--------|-----------|
| C1 | Window module | one time-selection clause, legal on every family |
| C2 | De-overload `in` | `in` means units, always; scope folds into `source:` filters |
| C3 | Suffix validation | duplicates/conflicts become parse errors, not rightmost-wins |
| C4 | Rows in the grammar | kill the synthetic `find:_` trick; one validation layer |
| C5 | Discriminated union | `family` field on every AST variant |
| C6 | One structured interface | AST + serializer replace the clause model for code callers |
| C7 | Target validation | `find:<target>` validated at parse |

---

## 1. WQL today vs. after all changes

The home page analytics section (`playground/src/tour/HomeAnalyticsSection.tsx`)
is the public face of WQL. Its queries live in
`playground/src/tour/homeAnalyticsData.ts:24-31`; the look-back window does **not**
live in the queries — it is computed in JS
(`HomeAnalyticsSection.tsx:61-67`):

```ts
const rangeStart = now - HOME_ANALYTICS_WEEKS * WEEK_MS;
const r = await queryService.runQuery(q.query, { rangeStart, rangeEnd: now });
```

That is the core defect this prototype fixes: the most-viewed WQL in the product
cannot say how far back it looks.

### 1.0 Direction: the rows model

Every WQL query selects **rows** from a **target**; aggregators are folds over
those rows, and `rows` is the degenerate fold — the one that hands back the
table without processing it. Concretely:

- `rows:<target>{<filters>}` is THE list-returning form for every plane:
  result planes (`results`, `segment`, … — raw output statements) and content
  planes (`note`, `block`, `effort`). `find:` survives only as a deprecated
  alias for `rows:` on content planes.
- `sum`/`avg`/`count`/… imply the same row selection, then fold it. The
  executor already works this way — its plan is SELECT rows, then optionally
  partition and fold, and `count` counts rows rather than values.
- Mechanically, folds read **Analytics Store** fact rows (index-first SELECT);
  `rows` reads raw logs through the ResultLogStore. One logical stream (logs
  win), two materializations — the store stays a disposable cache, never a
  second truth.
- Provenance stays a Tag filter (`source:` inside the braces), never a
  positional clause — see the rejected `from journal` form in §1.3.

### 1.1 The six showcase widgets

| Widget            | Today (`homeAnalyticsData.ts:25-30`)               | After all changes                                          |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| Reps by effort    | `sum:totalReps{} by {effort}`                      | `sum:totalReps{} by {effort} last 6w`                      |
| Weekly tonnage    | `sum:totalVolume{} by {week}.rollup(1w)`           | `sum:totalVolume{} by {week}.rollup(1w) last 6w`           |
| Load by intensity | `sum:sessionLoad{} by {intensity}.rollup(1w)`      | `sum:sessionLoad{} by {intensity}.rollup(1w) last 6w`      |
| Volume by effort  | `sum:totalVolume{discipline:strength} by {effort}` | `sum:totalVolume{discipline:strength} by {effort} last 6w` |
| Avg TIS           | `avg:tis{}`                                        | `avg:tis{} last 6w`                                        |
| Total volume      | `sum:totalVolume{}`                                | `sum:totalVolume{} last 6w`                                |

And the calling code collapses to:

```ts
const r = await queryService.runQuery(q.query);
```

`HOME_ANALYTICS_WEEKS`, `WEEK_MS`, and the range math are deleted. The window
becomes **data in the query string**, not hidden state in the component. Numbers
are unchanged — the same 6-week option reaches the Query Service, now through the
parsed window instead of an out-of-band option.

### 1.2 Canonical tail order (after)

```text
<head>{<filters>} [by {<dims>}] [.rollup(<n><u>)] [in <unit>] [<window>]

window := last <n>d|w
        | from <YYYY-MM-DD> [to <YYYY-MM-DD>]
```

Peel order for the JS suffix layer stays right-to-left anchored regexes, now:
`window` → `displayUnit` → `.rollup` → `by {}`; `where` still splits first
(brace-aware). Two clauses of the same kind are a parse error (C3), never
rightmost-wins.

### 1.3 Every family, same rules (examples from `docs/09-wql-deep-dive.md`)

One head shape after unification: `<fold>:<metric>` for folded queries,
`rows:<target>` for tables. `find:` remains as a deprecated alias.

| Today | After (rows model) | Change |
| ------- | -------------------- | -------- |
| `find:note{tags:pr} in journal last 8w` | `rows:note{tags:pr,source:journal} last 8w` | rows model + C2 |
| `find:block{text:"air squats",!source:feed} in all` | `rows:block{text:"air squats",!source:feed}` | rows model + C2 (`all` was the default; omit) |
| `rows:{note:note-uuid} last 4w` | `rows:results{note:note-uuid} last 4w` (bare `rows:{…}` stays as an alias) | rows model |
| `sum:totalVolume{} by {week} where find:note{tags:competition} in journal` | `sum:totalVolume{} by {week} where rows:note{tags:competition,source:journal}` | C2 + join halves accept `rows:` |
| `sum:tis{} by {week}` (no textual window possible) | `sum:tis{} from 2026-01-01 to 2026-03-31 by {week}` | C1 |

Deliberately rejected: `rows:note{…} from journal` and `not from feed`.
`from` already means *time* (`from 2026-01-01`); reusing it for provenance would
recreate the exact word-overload C2 removes. Provenance is a Tag value, and
`!source:feed` already expresses that negation. The source vocabulary
normalizes to singular: `journal | playground | collection | feed | all`
(playground added — it exists as a NoteRef kind but no scope named it).

Window binding rule: unchanged — a bare window clause belongs to the **outer**
query; join halves keep their own optional `last` exactly as today.

### 1.4 What does NOT change

Filter semantics (OR within key / AND across keys / `!` / `*` / quoted phrases /
colon values), aggregators, Canonical Metric Keys, virtual dims, `.rollup`,
cross-store join semantics, the five store interfaces, the ` ```query[:type] `
dashboard fence format, error-as-values.

---

## 2. The changes and their blast radius

### C1 — Window module

**Interface today**: `last <n>d|w` exists only on Find/Rows; Aggregate has **no**
textual time selection — ranges arrive as `rangeStart/rangeEnd` options
(`QueryService.ts:666-670`), computed by callers. Four mechanisms total: `last`
suffix, range options, `anchor` mode ('wall-clock' | 'latest-activity'),
`dashboard.window` tokens.

**Proposed**: one `window` concept on every family's AST —
`{kind:'relative', size, unit}` or `{kind:'range', start, end?}`. `last` and
`from/to` are mutually exclusive (validated). `effectiveTimeWindow`
(`QueryService.ts:101-115`) already implements range-over-last precedence; it
becomes the *only* window predicate. Anchor stays an execution option — it is a
replay/test concern, not surface syntax.

**Blast radius**:

| Area | Touches |
|------|---------|
| Engine | `wqlSuffix.ts` (LAST_RE leaves the find/rows branch; new FROM_TO_RE; strip order), `wql.ts` (window fields on all three variants; `ParsedFindQuery.last` folds in; mutual-exclusion validation), `QueryService.ts` (`run` :666-670 feeds SELECT intersection from the parsed window when options are absent; `runFindBlock`/`runRows` switch to the shared predicate) |
| App/UI | `HomeAnalyticsSection.tsx:61-67` (range math deleted), `AnalyticsExplorerPage.tsx:255` (`rangeStart` math deleted — the composer emits `last Nw` text instead), dashboard `$window` token substitution emits the window clause (verify exact mechanism in `dashboard/model.ts` during implementation) |
| Correctness rider | `workloadRollup.ts` buckets days by **local** date (:15-18); Query Service buckets by UTC ms. Align both on UTC and pin with a cross-timezone test — otherwise C1 ships with two window truths |
| Tests | extend `findRange.test.ts`, `findAnchor.test.ts`, `rowsQuery.test.ts`, `wql.test.ts`; new TZ-alignment test; new `from/to` parse tests |
| Stored artifacts | none break — purely additive |

**Risk: Medium.** Widest engine touch, but additive; callers mostly lose code.

### C2 — De-overload `in`

**Interface today**: trailing `in <word>` means display unit on aggregates and
scope on finds — decided by family prefix inside `parseWqlSuffixes`
(`wqlSuffix.ts:87-109`). Unknown scopes parse clean and silently return empty at
runtime. Separately, `source:` already exists as a content filter key — two
spellings for provenance.

**Proposed**: `in` = units, always, aggregates only. Scope folds into the filter
brace: `source:journals|collections|feeds` values, defaulting to all when absent.
`ParsedFindQuery.scope` and `FindPredicate.scope` are removed; `WQL_SCOPES`
retires into the source vocabulary; unknown `source:` values are parse errors.

**Transition**: the parser accepts legacy trailing `in <scope>` on find/rows,
normalizes it into a `source:` filter, and flags an advisory (diagnostics strip);
hard-drop in the next minor. Required because dashboards are **user-owned markdown
documents** and URLs carry `?q=`.

**Blast radius**:

| Area | Touches |
|------|---------|
| Engine | `wqlSuffix.ts` (IN_SCOPE_RE deleted), `wql.ts` (scope fields removed; normalization path), `vocabulary.ts` (WQL_SCOPES retirement), `QueryService.ts` (inline scope-selection blocks in `runFind` :456-465 and `runFindBlock` :537-546 merge into one source-driven path alongside `applySourceFilter` :86) |
| UI package | `WqlComposer` scope control → source clause (`CLAUSE_META`); `paletteTextFromWql` (`wqlSearchSource.ts`); `useLibraryQueryState` / `useEffortsComposerState` URL migrations |
| App pages | `LibraryPage.tsx` (the scope radio "owns the `source` head clause" per :124 comment — rewires), `EffortsCatalogPage.tsx` |
| Tests | `entrySearch.test.ts:220` expects `'find:note in all'` — updates; `wqlSuffix.test.ts` scope cases; `findSource.test.ts`; composer round-trip suites |
| Stored artifacts | dashboard notes and URLs containing ` in <scope>` — covered by the transition parser + rewrite-on-edit |

**Risk: High (user-visible), simple mechanics.** Only change that rewrites
persisted documents; ship behind the compatibility normalizer.

### C3 — Suffix validation

**Interface today**: anchored right-to-left regexes silently drop duplicates —
`sum:x{} by {a} by {b}` keeps `{b}` (`wqlSuffix.ts:117-121`); conflicting
`last`+range would do the same.

**Proposed**: a second clause of the same kind is an error-as-value naming both
spans. Valid queries are unaffected — nothing that parses today correctly changes.

**Blast radius**: `wqlSuffix.ts`, `wql.ts` error assembly, `wqlSuffix.test.ts`,
`wql.test.ts`. Engine-only.

**Risk: Low.** Land first; every later change inherits trustworthy parsing.

### C4 — Rows in the grammar

*Direction note (rows model): C4 grows from "make rows grammatical" to "make the
unified head grammatical" — `Word colon Word` already fits `rows:results`, and
the synthetic `find:_` trick dies here. Detail deferred to the language-design
pass.*

**Interface today**: `parseQuery` dispatches rows textually; filters are parsed by
synthesizing a fake `find:_…` head (`wql.ts:248`); rows-only rules (exact
`result:`/`block:`/`note:` keys, no negation/wildcards) are enforced post-parse in
`runRows` — a second validation layer.

**Proposed**: the head rule admits rows — `Head { Aggregator (colon Metric)? }`
or a dedicated Rows node (first task: prove Lezer conflict-freedom under the
single-Word-token discipline documented in `wql.grammar:14-29`; if the optional
metric conflicts with Filters, take the dedicated-node fallback). Filter-key
validation moves into the AST mapper; `runRows` executes only.

**Blast radius**: `wql.grammar` + regenerated parser files, `wql.ts`
(`parseRowsQuery` simplifies), `QueryService.runRows` (validation removed),
`rowsQuery.test.ts`, `tests/parser/wql-grammar.test.ts` (rows cases added).
Engine-only; surface unchanged except errors arrive at parse time.

**Risk: Low-Medium.** Contained; the grammar edit is the only uncertain step.

### C5 — Discriminated union

*Direction note (rows model): the three-variant union may collapse into one
AST with `fold?: Aggregator` plus `target` — this section as written is the
conservative fallback if that collapse slips past this round.*

**Interface today**: families discriminate inconsistently — `agg` presence
(aggregate), `'target' in parsed` (find), `family === 'rows'` (rows). Guards are
order-dependent; exhaustiveness is uncheckable.

**Proposed**: `family: 'aggregate' \| 'find' \| 'rows'` on all three variants;
guards read the field. Rename `ParsedQuery` → `ParsedAggregateQuery` while
touching every switch site anyway (clean cutover, no alias).

**Blast radius**: types/guards in `wql.ts:103-130`; mechanical updates at every
dispatch site — `entrySearch.ts`, `LibraryPage.tsx:146-149`,
`EffortsCatalogPage.tsx:134-137`, `DashboardViewPage.tsx:61-63`,
`wqlSearchSource.ts:107-108`, `AnalyticsExplorerPage.tsx:222-259`, plus fixtures
that cast hand-built objects (`entrySearch.test.ts:42`,
`AnalyticsExplorerPage.test.tsx:32`) and the home-page sample ASTs
(`homeAnalyticsData.ts:47-123`). LSP-assisted rename.

**Risk: Trivial.** Do it early; C1/C4/C6 all benefit.

### C6 — One structured interface for code

**Interface today**: three representations of one query — `QueryClause[]`
(`@bitcobblers/wod-wiki-ui`: `clausesToWql`/`wqlToClauses`/`pivotClauses`),
the WQL string, and the AST. Composers round-trip clauses→string→parse on every
change; callers bypass both models with casts (`LibraryPage.tsx:95-99`), string
surgery (`entrySearch.ts:44`), and hand-rolled serialization
(`AnalyticsExplorerPage.tsx:181-184`). Deletion test verdict on the clause model:
its complexity would *concentrate* into engine-side helpers — it is a shallow
module.

**Proposed**: strings live only at document edges (URL `?q=`, ` ```query ` fences,
dashboard bodies). Code holds the AST; the engine grows a total serializer with
the property `serialize(parse(x)) === x` for canonical inputs and
`parse(serialize(a)) === a` for all ASTs. Composers mutate ASTs; the clause model
retires.

**Blast radius** (largest effort, zero language-surface risk):

| Area | Touches |
|------|---------|
| Engine | new `serialize.ts`; export alongside `parseQuery` |
| UI package | `WqlComposer` internals; retire/rebase `clausesToWql`, `wqlToClauses`, `pivotClauses`, `CLAUSE_META`, `defaultMetricsClauses` |
| Pages/hooks | `LibraryPage`, `EffortsCatalogPage`, `AnalyticsExplorerPage`, `DashboardViewPage`; `useComposerQueryState`, `useExplorerQueryState`, library/efforts URL-migration hooks |
| Deletes | the three hand-built sites above |
| Tests | property test for round-trip identity; per-page composer suites; `wqlSearchSource.test.ts` |

Staged per page; the string interface never breaks.

**Risk: Low risk, high effort.** Last — it wants the stable post-C1/C2 AST.

### C7 — Find-target validation

*Direction note (rows model): validation widens from find targets to all
`rows:` targets — `WQL_FIND_TARGETS` plus the result planes.*

**Interface today**: any `Word` parses as a target; unknown targets reach
`runFind`, match no branch, and silently return empty.

**Proposed**: targets validate at parse against `WQL_FIND_TARGETS`
(`vocabulary.ts:85`); unknown target → error-as-value listing valid targets.
Closed enum now; reopening toward a registry (Disciplines-style) is a later,
separate decision.

**Blast radius**: `wql.ts` validation, `wqlSuffix.test.ts`/`wql.test.ts` cases,
composer target picker reads the vocabulary (verify), docs cookbook row.
Engine-only.

**Risk: Low.** Invalid queries newly error — that is the point.

---

## 3. Sequencing

```text
C3 (validation) ─▶ C5 (union) ─▶ C7 (targets) ─▶ C4 (rows grammar) ─▶ C1 (window) ─▶ C2 (de-overload in) ─▶ C6 (structured interface)
   engine, trivial    mechanical     engine, tiny      engine, isolated      additive          breaking; compat        staged per page
                                                                               first             parser included
```

Rationale: cheap engine hardening first (C3/C5/C7 make every diff after them
smaller and mechanically safe). C4 before C1 so the window lands on a grammar
where all three families already exist. C1 before C2 so persisted dashboards
migrate once — C2's compatibility pass rewrites `in <scope>` while the additive
window needs no migration. C6 last, against the settled AST.

## 4. Non-goals

- No change to filter algebra, aggregators, joins, grains, or store seams.
- No new units beyond kg/lb/m/km passthrough behavior.
- No open target/metric registries in this round (C7 stays a closed enum).
- No scheduler for Rollup Facts; recompute-on-open stands.
