# WQL Interface Changes — Spec v2

**Status**: implemented. Shipped in `@bitcobblers/*` 0.10.41–0.10.42 (C1/C2/C4/C6 landed with the language train; C3/C5/C7 earlier). The authoritative description of the shipped surface is [`09-wql-deep-dive.md`](../09-wql-deep-dive.md); this document stands as the spec of record for what the seven changes mean and the blast radius each carried.

The seven changes:

| # | Change | One-liner | State |
|---|--------|-----------|-------|
| C1 | Window module | one time-selection clause, legal on every family | **landed** 0.10.41 |
| C2 | De-overload `in` | `in` means units, always; scope folds into `source:` filters | **landed** 0.10.41 |
| C3 | Suffix validation | duplicates/conflicts become parse errors, not rightmost-wins | **landed** `713c593` |
| C4 | Rows in the grammar | kill the synthetic `find:_` trick; one validation layer | **landed** 0.10.41 |
| C5 | Discriminated union | `family` field on every AST variant | **landed** `da6c42a`+`172cc75` |
| C6 | One structured interface | AST + serializer replace the clause model for code callers | **landed** 0.10.41 |
| C7 | Target validation | `find:`/`rows:` targets validated at parse | **landed** `9ef6dcc` |

Deliberate divergences between spec and ship: the spec's `find:` head was
to survive *only* as an alias of `rows:`; shipped, `find:` remains its own
parsing family executing content discovery (`runFind`), with legacy `in
<scope>` and bare `rows:{` rewritten by the compat normalizer under
deprecation advisories. The spec's singular source vocabulary (`journal |
playground | collection | feed | all`) shipped plural and narrower —
`WQL_SOURCE_VALUES` is `journal | collections | feeds | all` plus
`collection:<id>` / `feed:<id>` compound values, no `playground`. Join
halves accept `find:` only, not `rows:`. And `in <unit>` shipped as an
aggregate-family directive (on find/rows a trailing `in <word>` is legacy
scope). The AST-level unification (C6 serializer, C5 union) landed as
specced.

**v2 decisions** (this revision):

1. The bare `rows:{…}` alias **retires**; `rows:all` is the explicit
   all-planes pseudo-target (C4). C2's compatibility normalizer rewrites
   bare→`all` during the deprecation window.
2. Time-dimension group keys are **local civil ISO dates** — `day` →
   `YYYY-MM-DD` from local components; `week` → civil Monday `YYYY-MM-DD`
   by component math, never instant arithmetic (lands with C1).
3. The engine day/week dim fix (rider to C1) **folds into C1's ticket** —
   same lines, one compat advisory.

---

## 1. WQL today vs. after all changes

The home page analytics section (`playground/src/tour/HomeAnalyticsSection.tsx`)
is the public face of WQL. Its queries live in
`playground/src/tour/homeAnalyticsData.ts`; the look-back window does **not**
live in the queries — it is computed in JS (`HomeAnalyticsSection.tsx`,
`rangeStart = now - HOME_ANALYTICS_WEEKS * WEEK_MS`).

That is the core defect this spec fixes: the most-viewed WQL in the product
cannot say how far back it looks.

### 1.0 Direction: the rows model

Every WQL query selects **rows** from a **target**; aggregators are folds over
those rows, and `rows` is the degenerate fold — the one that hands back the
table without processing it. Concretely:

- `rows:<target>{<filters>}` is THE list-returning form for every plane:
  result planes (the store's known `outputType` values — `segment`,
  `analytics`, `wellness`, `load`, `event`, `system`, `compiler`,
  `completion`) and content planes (`note`, `block`, `effort`). `all` is the
  explicit no-narrowing pseudo-target (v2 decision 1). `find:` survives only
  as a deprecated alias for `rows:` on content planes.
- `sum`/`avg`/`count`/… imply the same row selection, then fold it. The
  executor already works this way — its plan is SELECT rows, then optionally
  partition and fold, and `count` counts rows rather than values.
- **v2 store story**: folds and `rows:` both read the **UnifiedEventStore**
  — one authoritative projection of the stream. Folds read summary/event
  rows through the projected view (shape derivation at read time); `rows`
  reads event rows directly (`runRows` over `getEventsByResult|Note|Content`,
  outputType narrowing on the promoted column). There are no longer "two
  materializations" to keep honest — the store is the stream's projection,
  and rollups are computed at read, never stored.
- Grain vocabulary: `summary | event`. `rollup` is **retired** — a
  `grain:rollup` filter is a parse-time error (retired-grain guard, landed
  on the event-store line); rollup values come from the `.rollup` suffix at
  read time.
- Provenance stays a Tag filter (`source:` inside the braces), never a
  positional clause — see the rejected `from journal` form in §1.3.

### 1.1 The six showcase widgets

| Widget            | Today                                             | After all changes                                          |
| ----------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Reps by effort    | `sum:totalReps{} by {effort}`                     | `sum:totalReps{} by {effort} last 6w`                      |
| Weekly tonnage    | `sum:totalVolume{} by {week}.rollup(1w)`          | `sum:totalVolume{} by {week}.rollup(1w) last 6w`           |
| Load by intensity | `sum:sessionLoad{} by {intensity}.rollup(1w)`     | `sum:sessionLoad{} by {intensity}.rollup(1w) last 6w`      |
| Volume by effort  | `sum:totalVolume{discipline:strength} by {effort}`| `sum:totalVolume{discipline:strength} by {effort} last 6w` |
| Avg TIS           | `avg:tis{}`                                       | `avg:tis{} last 6w`                                        |
| Total volume      | `sum:totalVolume{}`                               | `sum:totalVolume{} last 6w`                                |

And the calling code collapses to `await queryService.runQuery(q.query)`.
`HOME_ANALYTICS_WEEKS`, `WEEK_MS`, and the range math are deleted. The window
becomes **data in the query string**, not hidden state in the component.

### 1.2 Canonical tail order (after)

```text
<head>{<filters>} [by {<dims>}] [.rollup(<n><u>)] [in <unit>] [<window>]

window := last <n>d|w
        | from <YYYY-MM-DD> [to <YYYY-MM-DD>]
```

Peel order for the JS suffix layer stays right-to-left anchored regexes, now:
`window` → `displayUnit` → `.rollup` → `by {}`; `where` still splits first
(brace-aware). Two clauses of the same kind are a parse error (C3, landed),
never rightmost-wins.

### 1.3 Every family, same rules

One head shape after unification: `<fold>:<metric>` for folded queries,
`rows:<target>` for tables — the target is required (v2 decision 1).
`find:` remains as a deprecated alias.

| Before v2 | After (rows model) | Change |
| --------- | -------------------- | -------- |
| `find:note{tags:pr} in journal last 8w` | `rows:note{tags:pr,source:journal} last 8w` | rows model + C2 |
| `find:block{text:"air squats",!source:feed} in all` | `rows:block{text:"air squats",!source:feed}` | rows model + C2 (`all` was the default; omit) |
| `rows:{note:note-uuid} last 4w` | `rows:all{note:note-uuid} last 4w` | bare alias retired (decision 1); content-plane targets also legal (`rows:note{note:note-uuid}`) |
| `sum:totalVolume{} by {week} where find:note{tags:competition} in journal` | `sum:totalVolume{} by {week} where find:note{tags:competition,source:journal}` | C2 (join halves still take `find:` — see divergence) |
| `sum:tis{} by {week}` (no textual window possible) | `sum:tis{} by {week} from 2026-01-01 to 2026-03-31` | C1 (window is tail-rightmost, per §1.2) |

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
cross-store join semantics, the store seams, the ` ```query[:type] ` dashboard
fence format, error-as-values.

---

## 2. The changes and their blast radius

### C1 — Window module

**Interface today**: `last <n>d|w` exists only on Find/Rows; Aggregate has **no**
textual time selection — ranges arrive as `rangeStart/rangeEnd` options,
computed by callers. Four mechanisms total: `last` suffix, range options,
`anchor` mode ('wall-clock' | 'latest-activity'), dashboard window tokens.

**Spec**: one `window` concept on every family's AST —
`{kind:'relative', size, unit}` or `{kind:'range', start, end?}`. `last` and
`from/to` are mutually exclusive (validated). `effectiveTimeWindow` already
implements range-over-last precedence; it becomes the *only* window predicate.
Anchor stays an execution option — it is a replay/test concern, not surface
syntax.

**Time-dimension encoding rider** (v2 decisions 2–3, folds into this change):
group keys for the virtual `day`/`week` dims become **local civil ISO dates**
— `day` → `YYYY-MM-DD` from local date components; `week` → civil Monday's
`YYYY-MM-DD` computed by component math. Today `day` keys on a locale display
string (`toLocaleDateString` — environment-dependent: "Jun 10, 2026" vs
"10.06.2026" for the same day) and `week` does instant arithmetic
(`ts − N×DAY`) then slices UTC ISO — DST-shifted weeks mislabel their Monday
and split a bucket. The civil-ISO encoding matches the app-side local-day
truth (workloadRollup, 2026-08-25) and makes keys stable across
environments/locales and lexically sortable. Compat advisory: consumers keyed
on display strings re-bucket once at the release train.

The dashboard `$window` token no longer exists anywhere (dissolved with the
event-store merge — verified absent in `dashboard/model.ts`); token
substitution concerns only widget bodies.

**Blast radius**:

| Area | Touches |
|------|---------|
| Engine | `wqlSuffix.ts` (`LAST_RE` leaves the find/rows branch; new `FROM_TO_RE`; strip order), `wql.ts` (window fields on all three variants; `ParsedFindQuery.last` folds in; mutual-exclusion validation), `QueryService.ts` (`run` feeds SELECT intersection from the parsed window when options are absent; `runFindBlock`/`runRows` switch to the shared predicate; `dimValue` civil-ISO day/week keys) |
| App/UI | `HomeAnalyticsSection.tsx` (range math deleted), `AnalyticsExplorerPage.tsx` (`rangeStart` math deleted — the composer emits `last Nw` text instead) |
| Tests | extend `findRange.test.ts`, `findAnchor.test.ts`, `rowsQuery.test.ts`, `wql.test.ts`; new TZ-alignment test pinning civil-ISO keys; new `from/to` parse tests |
| Stored artifacts | none break — purely additive (day/week key format rides the release advisory) |

**Risk: Medium.** Widest engine touch, but additive; callers mostly lose code.

### C2 — De-overload `in`

**Interface today**: trailing `in <word>` means display unit on aggregates and
scope on finds — decided by family prefix inside `parseWqlSuffixes`. Unknown
scopes parse clean and silently return empty at runtime. Separately, `source:`
already exists as a content filter key — two spellings for provenance.

**Spec**: `in` = units, always, aggregates only. Scope folds into the filter
brace: `source:journal|collections|feeds` values, defaulting to all when
absent. `ParsedFindQuery.scope` and `FindPredicate.scope` are removed;
`WQL_SCOPES` retires into the source vocabulary; unknown `source:` values are
parse errors.

**Transition**: the parser accepts legacy trailing `in <scope>` on find/rows,
normalizes it into a `source:` filter, and flags an advisory (diagnostics
strip); hard-drop in the next minor. The **bare `rows:{…}` → `rows:all`
rewrite rides the same normalizer** (v2 decision 1): one compat pass, one
deprecation window. Required because dashboards are **user-owned markdown
documents** and URLs carry `?q=`.

**Blast radius**:

| Area | Touches |
|------|---------|
| Engine | `wqlSuffix.ts` (`IN_SCOPE_RE` becomes a normalizer), `wql.ts` (scope fields removed; bare-rows normalization), `vocabulary.ts` (`WQL_SCOPES` retirement; `WQL_ROWS_TARGETS` gains `all`), `QueryService.ts` (inline scope-selection blocks in `runFind`/`runFindBlock` merge into one source-driven path alongside `applySourceFilter`) |
| UI package | `WqlComposer` scope control → source clause (`CLAUSE_META`); `paletteTextFromWql`; `useLibraryQueryState` / `useEffortsComposerState` URL migrations |
| App pages | `LibraryPage.tsx` (scope radio rewires), `EffortsCatalogPage.tsx` |
| Tests | `entrySearch.test.ts` scope expectations; `wqlSuffix.test.ts` scope + bare-rows cases; `findSource.test.ts`; composer round-trip suites |
| Stored artifacts | dashboard notes and URLs containing ` in <scope>` or bare `rows:{` — covered by the transition normalizer + rewrite-on-edit |

**Risk: High (user-visible), simple mechanics.** Only change that rewrites
persisted documents; ship behind the compatibility normalizer.

### C3 — Suffix validation — **landed** (`713c593`)

Duplicate suffix clauses (window/scope/`.rollup`/`by`/unit/`where`) are
error-as-values naming first and last spans, at every parse entry point
(string parse, composer salvage, suffix layer). Single-occurrence parsing is
unchanged; valid queries are unaffected.

### C4 — Rows in the grammar

**Interface today**: `parseQuery` dispatches rows textually; the rows filter
half is parsed by synthesizing a fake `find:_…` head before the shared Lezer
filter grammar; rows-only rules (exact `result:`/`block:`/`note:` keys, no
negation/wildcards) are enforced post-parse in `runRows` — a second
validation layer.

**Spec** (head rule proven by the ticket-001 spike, recorded here): targeted
`rows:<target>` **already parses natively** under the unchanged grammar — the
`Word colon Word` head fits, and C7's closed plane enum
(`WQL_ROWS_TARGETS` = content planes ∪ `KNOWN_OUTPUT_TYPES`, plus `all` from
C2) is the target vocabulary. The bare `rows:{…}` alias has **no
conflict-free grammar shape** (`Word ∩ By` after colon — structural under the
single-Word-token discipline): the alias retires (decision 1) instead of
forcing the grammar.

Concretely C4 lands:

- the synthetic `find:_` head trick dies — rows filters parse under their own
  (or the shared, un-synthesized) grammar path;
- rows-only filter-key rules (exact `result:`/`block:`/`note:` keys, no
  negation/wildcards) move from `runRows` post-parse into the **AST mapper**
  — errors arrive at parse time;
- `runRows` executes only; content-plane targets (`rows:note{note:x}`) gain
  their execution narrowing;
- `all` normalizes to no outputType narrowing.

**Blast radius**: `wql.grammar` (only if the de-synthesized filter path needs
a node) + regenerated parser, `wql.ts` (`parseRowsQuery` simplifies),
`QueryService.runRows` (validation removed, content planes execute),
`rowsQuery.test.ts`, `tests/parser/wql-grammar.test.ts` (rows cases).
Engine-only; surface unchanged except errors arrive at parse time and bare
queries error with a migrate-to-`all` message (until C2's normalizer lands,
same release).

**Risk: Low-Medium.** Contained; the grammar edit is the only uncertain step,
and the spike already de-risked it.

### C5 — Discriminated union — **landed** (`da6c42a`+`172cc75`)

`family: 'aggregate' | 'find' | 'rows'` on every AST variant, including error
results; guards (`isFindQuery`/`isRowsQuery`/`isAggregateQuery`) read the
field; `ParsedQuery` renamed `ParsedAggregateQuery`, clean cutover, no alias.
QueryService stubs and internal find calls build family-honest ASTs; the
composer strip discriminates via the positive guard (no `as any`); the union
re-exports from one place. The asset-003 "one record + grain" simplification
was **not** taken — three discriminated variants survive to C6, where the
serializer covers them.

App-repo dispatch sites and fixture ASTs migrate in the consumption ticket
(the app builds against published versions until then).

### C6 — One structured interface for code

**Interface today**: three representations of one query — `QueryClause[]`
(`@bitcobblers/wod-wiki-ui`: `clausesToWql`/`wqlToClauses`/`pivotClauses`),
the WQL string, and the AST. Composers round-trip clauses→string→parse on
every change; callers bypass both models with casts, string surgery, and
hand-rolled serialization. Deletion test verdict on the clause model: its
complexity would *concentrate* into engine-side helpers — it is a shallow
module.

**Spec**: strings live only at document edges (URL `?q=`, ` ```query `
fences, dashboard bodies). Code holds the AST; the engine grows a total
serializer with the property `serialize(parse(x)) === x` for canonical inputs
and `parse(serialize(a)) === a` for all ASTs — the three-variant union from
C5 serializes directly (asset 003: "trivially satisfied" by the one-record
per family shape). Composers mutate ASTs; the clause model retires.

**Blast radius** (largest effort, zero language-surface risk):

| Area | Touches |
|------|---------|
| Engine | new `serialize.ts`; export alongside `parseQuery` |
| UI package | `WqlComposer` internals; retire/rebase `clausesToWql`, `wqlToClauses`, `pivotClauses`, `CLAUSE_META`, `defaultMetricsClauses` |
| Pages/hooks | `LibraryPage`, `EffortsCatalogPage`, `AnalyticsExplorerPage`, `DashboardViewPage`; `useComposerQueryState`, `useExplorerQueryState`, library/efforts URL-migration hooks |
| Deletes | the hand-built sites above |
| Tests | property test for round-trip identity; per-page composer suites; `wqlSearchSource.test.ts` |

Staged per page; the string interface never breaks.

**Risk: Low risk, high effort.** Last — it wants the stable post-C1/C2 AST.

### C7 — Target validation — **landed** (`9ef6dcc`)

`find:` targets validate against `WQL_FIND_TARGETS` (note|block|effort);
`rows:` targets against `WQL_ROWS_TARGETS` (content planes ∪ result planes =
core `KNOWN_OUTPUT_TYPES`, the promoted `outputType` column). Unknown targets
error-as-value listing valid targets, including inside join halves. Closed
enum on the **text surface only** — the store vocabulary stays open (unknown
outputTypes are stored and returned; custom types stay queryable via
hand-built ASTs). Composer salvage rejects unknown `find:` targets instead of
rewriting them into `find:note`. Reopening toward a registry remains a later,
separate decision.

---

## 3. Sequencing (v2 state)

```text
C3 (validation) ─▶ C5 (union) ─▶ C7 (targets) ─▶ C4 (rows grammar) ─▶ C1 (window) ─▶ C2 (de-overload in) ─▶ C6 (structured interface)
   LANDED            LANDED         LANDED          next                  +day/week       +bare→all            last
                                                                        civil ISO       normalizer
```

Rationale unchanged: cheap engine hardening first (C3/C5/C7 make every diff
after them smaller and mechanically safe — now proven). C4 before C1 so the
window lands on a grammar where all three families are native. C1 before C2
so persisted dashboards migrate once — C2's compatibility pass rewrites
`in <scope>` **and** bare `rows:{` while the additive window needs no
migration. C6 last, against the settled AST.

CLI parity (`packages/engine/src/cli/query.ts`): no new surface needed — the
CLI throws `WqlSyntaxError` on any `parsed.error`, so C3/C7 errors and the
C1 window (already parsed by the suffix layer, passed through `runQuery`)
flow through unchanged.

## 4. Non-goals

- No change to filter algebra, aggregators, joins, or store seams.
- No new units beyond kg/lb/m/km passthrough behavior.
- No open target/metric registries in this round (C7 stays a closed enum on
  the text surface).
- No scheduler for Rollup Facts; recompute-on-open stands (rollup grains are
  never stored).

## 5. Residual gaps (grain vocabulary, recorded v2)

- `grain:rollup` is rejected at parse (landed); `grain:summary|event` filters
  match the stored vocabulary. Remaining: docs cookbook rows for grain and
  targets (docs-cutover ticket), and the app-side error UX for these parse
  errors is only as good as the composer's single error line — acceptable,
  re-examined in the consumption ticket.
