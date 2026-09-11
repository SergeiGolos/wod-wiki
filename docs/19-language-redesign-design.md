# Language Redesign Design

**Status: proposed design; not implemented.** This document specifies breaking authoring and data-scope decisions requiring an explicit release contract. New spellings in `text` examples are **illustrative and unsupported by the current parsers**. Examples marked **current** describe existing spellings, not newly verified execution results.

This supersedes the redesign recommendations in [doc 16](16-language-complexity-review-and-simplification.md), not its historical evidence. [Doc 17 — correctness fixes](17-language-correctness-fixes-design.md) owns identity, protocol precedence, malformed-value diagnostics, and shipped examples without new syntax. [Doc 18 — behavior-preserving cleanup](18-language-behavior-preserving-cleanup-design.md) owns only removals demonstrated to be consumer-inert. Neither category may remove valid syntax or change stored data shapes under an equivalence claim.

## 1. Goals, boundaries, and evidence

The goal is fewer ambiguous authoring decisions, not the smallest printed grammar. Preserve the distinction between a workout prescription, a recorded observation, content discovery, and analytical reduction. Make ownership of labels, metadata, windows, and parameters explicit enough that an editor and executor cannot assign different meanings to the same document.

Non-goals: a SQL replacement; new join kinds; arbitrary parameter-generated code; new sport protocols or unit families; calendar-month/year syntax; calendar multiweek bucketing; generalized metadata inheritance; or a two-level nesting limit. Existing formulas, rows presentation pipes, sport extensions, and deeply nested workouts are not removed for being absent from a sample corpus.

The baseline is [doc 15](15-whiteboard-language-and-wql-reference.md), read alongside these implementation boundaries:

| Boundary | Current source and consequence |
| --- | --- |
| Workout surface and ownership | [Grammar](../packages/lang/src/grammar/whiteboardscript.grammar), [syntax mapper](../packages/lang/src/parser/syntax-parser.ts), [classifier](../packages/lang/src/parser/semantic-classifier.ts): property lines and inline JSON become statement metrics, not automatically note frontmatter. |
| Units, choices, sports | [Unit fusion](../packages/lang/src/dialects/units/fuseUnits.ts), [unit registry](../packages/lang/src/metrics/units/UnitRegistry.ts), [dialect stack](../packages/lang/src/dialects/DialectStack.ts): vocabulary is extensible and sport-sensitive. |
| WQL authored structure | [Parser/AST](../packages/wql/src/wql.ts), [suffix parser](../packages/wql/src/wqlSuffix.ts), [documents](../packages/wql/src/document.ts): three query families, shared suffixes, and a separate document layer. |
| Query populations and time | [QueryService](../packages/wql/src/QueryService.ts), [calendar](../packages/wql/src/calendar.ts), [fact projection](../packages/wql/src/derivation.ts), [coverage selection](../packages/wql/src/selection.ts): content stores, events, temporal kinds, and coverage are distinct contracts. |
| Authoring and execution | [Language support](../packages/wql/src/language.ts), [Field Catalog](../packages/wql/src/catalog.ts), [formula runner](../packages/wql/src/documentRunner.ts), [shared-runner module](../packages/wql/src/queryDocumentRunner.ts), [embedded queries](../packages/ui/src/blocks/QueryBlockView.tsx), [dashboards](../packages/ui/src/widgets/DashboardView.tsx). |

Two corrections to the review's framing matter. `language.ts` already accepts an injected `IFieldCatalog`, merging typed discovered fields and categorical values with static suggestions. Vocabulary is not exclusively static. Also, the shared-runner module explicitly describes itself as unwired; its desired surface parity is not evidence that every production surface already uses it.

Doc 16's corpus counts are historical coverage evidence, not proof of equivalence, absence of external use, or rarity-based permission to delete. No new measurements or execution verification are claimed here.

## 2. Decision summary

| Decision | Recommendation | Tradeoff |
| --- | --- | --- |
| Query heads | Retain `find:`, `rows:`, and `agg:metric`; unify presentation only when useful. | Three names expose three populations more honestly than one overloaded head. |
| Buckets | Retain calendar `by {day}` / `by {week}` and epoch-fixed `.rollup(Nd\|Nw)`; reject simultaneous use in the redesigned contract. | Two spellings preserve a real distinction; a conflict replaces an ignored clause. |
| Join ownership | Explicitly delimit the `where (...)` operand and publish one serialization order. | A migration cost buys local ownership rather than more suffix-peeling guesses. |
| Parameters | Parse typed `$name` nodes before binding; bind values, never source fragments. | Existing interpolation tricks require manual migration or refusal. |
| Group names | Keep counts/ladders; use quoted named labels including spaces, digits, and Unicode. | Names become unambiguous without restricting them to ASCII letters. |
| Metadata | Retain statement properties and JSON; keep note, block, and statement owners distinct. | Forego a superficial deletion that would change data attribution. |
| Other Whiteboard sugar | Retain `@` loads, fractions, `-`, and valid sport syntax absent a separately approved breaking removal. | Documentation and diagnostics are cheaper than an unproven rewrite. |
| Compatibility | One active authored language after release cutover; historical data readers are separate. | Unmigrated authored material gets an actionable refusal, not a hidden old parser. |

## 3. Query heads: population before presentation

### Current behavior

`parseQuery` returns a discriminated family. `runFind` reads notes, the block index, or effort registry. `runRows` reads stored event rows grouped by result; unscoped `rows:segment` produces a cross-workout table. `run` selects eligible metric observations, resolves duplicate/substitute representations, and reduces them into series.

| Current spelling | Population and identity | Observable result |
| --- | --- | --- |
| `find:note{...}` / `find:block{...}` | Authored/indexed content, including never-run content; note/block identity. | Content records for discovery and navigation. |
| `find:effort{...}` | Effort registry entries, not performed efforts; registry identity. | Effort definitions, aliases, and attributes. |
| `rows:all{note:x}` | Stored events belonging to runs associated with note `x`; result/event identities. | Runs containing events, not a note record. |
| `rows:note{note:x}` | Same ownership scope without output-type narrowing. | Still stored events, not `find:note`. |
| `rows:segment{...}` | Recorded segment observations; cross-workout mode when unscoped. | Tabular rows with match count and presentation-only paging. |
| `sum:totalVolume{...}` | Eligible observations/representations of one metric. | Series, units, absence/error states, and coverage. |

### Proposed retained contract

Keep all three heads. Do not implement doc 16's `find:` → `rows:` rewrite: an unrun note must appear in discovery and contribute **no invented result row**. A common table/card renderer may consume a tagged result envelope, but it must preserve family, population, entity identity, temporal basis, available operations, and count meaning. Content matches are not event counts or aggregate observation counts.

A later common head requires an explicit population selector and result-shape mapping for every current target: unrun notes, prose blocks, registry efforts, scoped runs, cross-workout segments, and aggregate coverage. Renaming `find:note` to `rows:note` without this is refused; fewer keywords alone is not a demonstrated benefit.

Retain rows' content-plane spellings in this release. The particular `rows:note{note:x}` duplicate can map to `rows:all{note:x}`, but removing the whole `note|block|effort` target family needs target-by-target proof. Preserve output planes (`segment`, `system`, `load`, `event`, `compiler`, `completion`, `analytics`, `wellness`) and exact `result:`, `block:`, `note:` scopes. Pipes retain projection/order/paging semantics without changing the underlying match or `totalCount`.

For content-to-metric joins, retain block-content identity as the correlation boundary: a note qualifies when at least one owned workout block passes; it is not a sum over every block in the note. Two separate 3,000-volume blocks do not satisfy a per-block `> 5000` predicate. Aggregate-to-content joins select matching content's eligible observations and deduplicate overlapping references; they do not manufacture facts from unrun content. Preserve coverage selection and absent/error distinctions.

**Acceptance:** an unrun note is discoverable but yields no runs; two runs of one block remain two results; an effort definition exists without execution; a rows limit changes the page but not total count; overlapping content matches cannot double an aggregate; absence cannot satisfy a metric predicate as recorded zero.

## 4. Time: keep calendar and fixed duration separate

### Current behavior

`calendar.ts` captures `{instant, timeZone}`. `last Nd` means N local dates including today, ending at the captured instant. `last Nw` means the current Monday-start week plus N−1 preceding weeks, not a rolling 7N-day duration. Explicit `from`/`to` includes both named dates through the next local midnight. Membership is half-open, with an inclusive millisecond capture encoded as `instant + 1`.

`QueryService.buildResult` groups `day`/`week` by civil date/Monday. Without either time dimension, `.rollup(Nw)` uses `N × 7 × 86,400,000` milliseconds aligned to Unix epoch zero. With a time dimension, it ignores `.rollup`. Thus current `by {week}.rollup(4w)` means weekly calendar grouping, **not** four-week grouping. Calendar domain generation and fixed-duration observed-only buckets differ; the existing calendar generator has empty-domain and size guards, so universal complete empty-series generation must not be claimed.

### Proposed semantic contract

1. **Capture once.** One document run fixes an instant, IANA timezone, and parameter bindings. Defaults, both join sides, formulas, previews, exports, and cache identity consume that snapshot. Host context wins; otherwise capture the system timezone and clock once. Never read a new clock inside a join.
2. **Calendar identity.** A day is `(calendar, day, civilDate, timeZone)`; a week is `(calendar, week, mondayDate, timeZone)`. Midnight boundaries may span 23 or 25 hours. Display timestamps are not bucket identities or formula alignment keys.
3. **Fixed identity.** `.rollup(Nd|Nw)` means width `N × (1|7) × 86,400,000 ms`, anchor `0`, and index `floor((instant−anchor)/width)`. Timezone may format labels but cannot change membership. Changing width or anchor changes identity.
4. **No implicit conversion.** Keep these spellings; do not replace both with undifferentiated `bucket(1w)`. A common presentation must expose calendar/fixed mode, width, timezone where relevant, and anchor. An epoch-fixed week is not a Monday-start week.
5. **Conflicts.** Reject a calendar time dimension plus `.rollup`, and multiple calendar time dimensions, with spans and their current effective interpretation. Removing an ignored rollup may preserve current semantics; author confirmation is required if the intended width was multiweek. Do not simply drop a dimension from `by {day,week}`: the old executor can expose the other as a grouping dimension.
6. **Date-only observations.** Preserve `metricDate` / `temporalKind: civil-date`, not the storage timestamp as occurrence time. Calendar grouping uses that date; calendar windows compare it against intersecting civil dates in the captured range. Fixed-duration grouping requires an occurrence instant and reports incompatible temporal kind for date-only contributions. Do not silently exclude them or fabricate midnight. This is a breaking refusal where current fixed grouping uses a fetch timestamp; migration chooses calendar grouping or explicitly records a real instant, never guesses one.
7. **Multiweek meaning.** `last 2w` selects current-plus-previous calendar weeks; `.rollup(2w)` remains a 14×24-hour epoch-fixed bucket; `by {week}` groups individual calendar weeks. Introduce **no** calendar multiweek spelling here. A later proposal must specify a Monday civil-date phase anchor, N-week boundaries, DST behavior, and global versus range-relative alignment. Never silently repurpose `.rollup(4w)`.
8. **Formula alignment.** Align operands by structural bucket and group identity, never similar labels or representative timestamps. Diagnose calendar/fixed mismatches; `(normalize ...)` is not permission to convert them silently. Retain arithmetic, provenance, `corr`, and output-unit contracts; a new resampling feature is out of scope.

**Current examples with distinct meanings:**

```wql
sum:sessionLoad{} by {week} last 2w
sum:sessionLoad{}.rollup(2w) last 2w
sum:sessionLoad{} from 2026-03-01 to 2026-03-31
```

**Acceptance:** DST does not split a civil day; Monday midnight belongs only to the new week; fixed membership survives a display-timezone change; a Sunday metric recorded Monday keeps Sunday; `last 2w` on Wednesday starts the previous Monday; `.rollup(2w)` stays epoch-aligned across year boundaries; date-only/fixed incompatibility and formula bucket mismatches surface identically in every consumer. Rejected mixtures require migration/refusal, not an equivalence label.

## 5. Clause order and `where` ownership

### Current boundary

The suffix layer splits at a brace-aware `where`; the primary suffixes and join text do not share one complete recursive grammar. `parseJoinClause` keeps a relative window on a `find` operand, rejects its range window, and constructs a metric predicate without retaining the parsed metric operand's window. The executor also has separate join paths. A suffix that parses is therefore not proof that its window is applied, and source comments describing raw-log recomputation do not override the current stored-event implementation.

### Proposed grammar contract — illustrative, not current syntax

```text
aggregate := agg:metric{filters} [by {dims}] [.rollup(period)] [in unit] [window] [where (find-operand)]
discovery := find:target{filters} [window] [where (metric-operand comparison number)]
rows      := rows:target{filters} [window] [| presentation-pipes]
```

The bucket conflict in §4 still applies. The canonical order is head, filters, grouping, fixed rollup where legal, display unit, primary window, then `where (...)`. The operand has its own filters and optional relative window **inside** parentheses; metric operands do not accept grouping, rollup, or display-unit suffixes. No nested joins. A clause outside its owner is an error with an insertion location, never silently reassigned.

```text
find:note{tags:pr,source:journal} last 8w where (sum:totalVolume{} last 4w > 5000)
sum:totalVolume{} by {week} last 8w where (find:note{tags:competition} last 12w)
```

Here the first primary window filters note creation time; the operand window filters observation time per candidate block. The second primary window filters observations; its operand window filters content creation time. Keep join windows relative (`last Nd|Nw`) in this release; range windows on operands are refused, not silently dropped. Adding range syntax inside joins is unnecessary to settle ownership and remains out of scope. Registry-only `find:effort` has no creation/observation-time contract: explicit windows or joins there are refused instead of ignored. No automatic conversion to “efforts performed during the window.”

Precedence is **assignment-local primary window > document default > host default**, independently for the primary query. An operand uses only its explicitly authored window; absence means all time, not inheritance from the outer query. Both resolve against the same capture. Group defaults apply only to aggregate primaries. Rows/find never gain aggregation through defaults. Duplicate clauses diagnose both spans; `|` remains OR within filters and a presentation pipe only at top level on rows, never a second join.

**Migration/refusal:** wrap only an unambiguous currently effective operand, preserving its ownership. Reorder a query only after recovering its full effective structure, not by moving text matching `last`. A previously ignored metric-operand window requires an explicit choice between preserving all-time behavior and adopting the written window; never activate it silently. A window after a comparison, a duplicated clause, unsupported effort window/join, or ambiguous scope placement requires author repair. This deliberately replaces the old permissive authored contract, not a supposedly behavior-preserving parser cleanup.

**Acceptance:** primary and operand windows select different fixtures as specified; captured context is identical on both sides; a word `where` inside a quoted filter never splits the query; two block predicates do not become one note-wide sum; defaults never leak into an operand; imported noncanonical queries either migrate with unchanged effective meaning or report a precise refusal.

## 6. Typed parameters across editor and document execution

### Current behavior

[Dashboard substitution](../packages/wql/src/dashboard/model.ts) and [shared-runner substitution](../packages/wql/src/queryDocumentRunner.ts) replace `$name` with raw strings before parsing. The grammar has no parameter node. [Document parsing](../packages/wql/src/document.ts) classifies assignments by head and reports query diagnostics, so an unbound dashboard expression can look syntactically invalid outside substitution-based consumers.

### Proposed contract

Keep the authored `$name` spelling but change its meaning from text macro to typed value reference. Parameter names use `[A-Za-z_][A-Za-z0-9_-]*`, matching the wider existing runner/assignment convention. Names are case-sensitive and distinct from formula assignment identifiers. Parameters are recognized outside comments and quoted literals only; `"$name"` is literal text, not interpolation. This quoted-literal rule is a breaking change for existing substitution-based templates.

The initial value slots are filter atoms, comparison numbers, whole relative-window periods, civil-date endpoints, and display units. Infer a slot's expected type, then check the supplied declaration/binding: string or field-compatible scalar; finite number; positive integer `d|w` period; real civil date; registered compatible unit. An exact scope id and a validated `source:` value remain typed strings with their existing constraints. Parameterizing a head, field path, filter key, group dimension, operator, pipe, formula body, or fragment of a period/identifier is refused. This is value binding, not a new metaprogramming language.

```text
defaults last $window
a = sum:sessionLoad{intensity:$intensity} by {week}
b = max:resistance{effort:$effort} in $unit from $start to $end
show a, b
```

These are illustrative proposed parameter positions. A host binding might provide `window = {size: 8, unit: "w"}`, `intensity = "high"`, and `start = {civilDate: "2026-01-01"}`; the syntax does not stringify those structures. A scalar value containing commas, quotes, `|`, or `where` remains **one value**. It cannot create extra filters or clauses. Multi-select controls, if already used, bind a declared list to the existing OR-value list; a raw pipe-containing string is never guessed to be a list.

Parse → resolve parameter expectations and document references → bind → validate domain constraints → execute. Unbound parameters are a well-formed editable AST with “requires value” diagnostics, not generic parse errors. The editor can complete and serialize them without bindings. An execution request with missing, wrongly typed, or conflicting-use bindings is refused before any assignment runs; report all offending parameter spans. A parameter reused as a date and a number is an error, not context-dependent coercion.

Use existing dashboard controls/frontmatter as the binding source; do not invent a second declaration language in WQL. Convert legacy controls through an explicit adapter or migration with a recorded expected type. CLI/API callers and documents receive the same binding contract. Serialize the authored parameter reference, not the active control value. Cache identity includes typed bindings and captured context; execution does not mutate the authored document. Independent overlapping runs cannot exchange bindings or clocks.

All consumers must use the same parsed document and bound execution contract: Explorer, dashboard route, embedded note blocks, editor diagnostics/completion, previews, and export/API execution. A one-line body remains a degenerate document; assignments, forward references, cycle errors, `defaults`, `show`, formulas, `(normalize ...)`, and `-> unit` remain supported. The new runner must carry complete find/scoped-row payloads as well as tables and series; switching to a shared class name without preserving output is not acceptance.

**Migration/refusal:** preserve a simple filter-value `$intensity` by declaring/inferencing its scalar type; migrate known multi-select choices to a typed list. Refuse source-fragment tokens and partial identifiers/periods; offer literal specialization of a saved template or author restructuring, never an unsafe concatenation fallback. Quoted interpolation requires author conversion to a whole-value parameter. **Acceptance:** an unbound dashboard is editable; its run is blocked with a parameter diagnostic; delimiter-containing text cannot alter query structure; the same binding yields the same population on every surface; malformed bindings cannot execute a partially valid document.

## 7. Whiteboard retained inventory, not a tiny grammar

The following is the retained semantic inventory. It is not a claim that every arbitrary combination is supported. The current grammar, unit registry, and effective dialect extensions determine valid combinations; doc 17 makes unsupported/malformed combinations visible rather than inventing a meaning.

| Surface | Retained contract and boundary |
| --- | --- |
| `time` / `log`, optional `:sport` | Preserve runnable prescription versus recorded-work affordances and sport-scoped dialect selection. Editor language aliases are not automatically runnable fence tags. |
| Bare numeric reps, `?` | Preserve numeric rep values and athlete-collected reps, including their prescription/runtime origins. |
| Effort text | Preserve multiword movement identity and supported punctuation; words are not limited to a fixed exercise keyword list. |
| `(N)`, `(a-b-c)` | Preserve numeric rounds and ordered rep ladders; each nesting level owns its children. Quoted labels below replace the overloaded name branch, not counts/ladders. |
| `M:SS`, `:SS`, `H:MM:SS` | Preserve timer values and runtime behavior, not just duration metric equality. |
| `*`, `^`, `:?`, supported `^:?` combinations | Preserve valid required-timer behavior, direction, and collectibles. Duplicate-primary combinations, including a prescribed timer plus `:?`, are subject to doc 17's ambiguity diagnostics; two emitted metrics do not establish a supported prescribed/recorded pair. Do not replace count-up with merely a label. |
| Number + unit, adjacent/spaced forms | Preserve supported length, mass, energy, and other registered dimensions; spelling aliases and conversion remain registry responsibilities. |
| `bw` with an explicit amount | Preserve bodyweight multiples such as `1.5bw`; do not silently treat trailing `Dip bw` as an already-supported load. |
| `%` | Preserve intensity percentages and their metric meaning. |
| `?lb`, `?kg`, `?m`, other supported collectible units | Preserve collection prompts, unit identity, and collected-value origin. |
| `@135lb` / sport-sensitive `@N` | Retain explicit load syntax; in climbing retain attempt counts. Never globally strip `@`. |
| `1/4 mile` | Retain legitimate numeric fractions with registered units; `/` is not a synonym for choice. |
| `A \| B`, `185 \| 125 lb` | Preserve supported homogeneous choices, ordered alternatives, selection behavior, units, and origins. Heterogeneous or unsupported forms need diagnostics, not discarded separators. |
| `+`, `-`, indentation, blank lines | Preserve ordered child groups: `+` appends to the previous group; ordinary/`-` children start another. Keep `-` until all observable Group-metric consequences are explicitly addressed. Blank lines do not invent a new ownership boundary. |
| `[Action]`, `[:!pinned]` | Preserve action steps and pinned cues, including their behavior within child groups. |
| `//`, `#` in-block headings | Preserve text and heading levels as statement content; do not mistake them for note metadata. |
| Property statements and inline JSON | Preserve canonical/custom scalar metrics and statement ownership; see §9. |
| AMRAP, EMOM, TABATA, FOR TIME | Preserve valid keyword positions and existing implicit inference subject to doc 17's explicit-protocol precedence. A new reserved group-head protocol position is not approved here. |
| Domain dialects and extensions | Preserve accepted strength/metcon/skills/wod/superset, cardio, yoga, and habits text. Any removal of emitted hints must satisfy doc 18 or become a separately reviewed stored-data change. |
| Climbing | Preserve supported route names, V/Font/YDS and other implemented grade recognition, send types/aliases, attempts, high points, and disciplines. Declared grade-system types do not imply parser support for every spelling. |

The [climb dialect](../packages/lang/src/dialects/ClimbDialect.ts), [dialect registry](../packages/lang/src/dialects/DialectStack.ts), and [unit registry](../packages/lang/src/metrics/units/UnitRegistry.ts) remain extension boundaries. Removing a built-in dialect because another registry knows an effort's discipline does not prove its output/hints irrelevant to external consumers or persisted records.

**No nesting cap.** Valid deep nesting remains valid. A resource ceiling may guard pathological input only as an independently justified operational limit with a diagnostic; corpus rarity cannot define language validity. Flattening a nested group or replacing it with `+` can change loops, rest transitions, interval ownership, and outputs.

**Acceptance:** include nested rounds inside timers and named groups, depths beyond two, composed child groups, required/count-up timers, choices with nondefault selections, bodyweight and energy values, collectibles, and sport-specific attempts. Compare transitions and runtime configuration, ordered children, metric values/units/origins, outputs, analytics, persistence, and query behavior—not behavior class names alone.

## 8. Named labels: quote text, do not restrict names

### Current behavior and proposed contract

The syntax mapper selects a numeric sequence when one exists and otherwise takes an identifier; classification emits a string-valued `RoundsMetric` for names. [GenericLoopStrategy](../packages/lang/src/runtime/compiler/strategies/components/GenericLoopStrategy.ts) defaults a nonnumeric rounds value to one traversal. Thus a current name is not merely a free-text comment, and digit-bearing annotations cannot be repaired by a lexical substitution alone.

Propose three unambiguous group forms: `(3)` for a count, `(21-15-9)` for a ladder, and `("Warm up 2 — Épaules")` for a named group. A quoted name is a nonempty JSON-escaped string without literal line breaks; accept spaces, Unicode, digits, and punctuation. Do not case-fold, slugify, or trim meaningful interior text. Retain the source spelling separately from the decoded label. Numeric-looking `("25")` is a name, never 25 rounds. Unquoted mixed/name parentheses are rejected after migration; no ASCII-only `[A-Za-z]+` rule.

To avoid coupling this syntax change to a runtime redesign, quoted names lower to the existing string-valued named-group contract, including its child ownership and traversal behavior. The quote does not create an effort or protocol. A future separation of label metrics from rounds is a different runtime/data change; it must not ride on this syntax migration.

```text
("Warm up 2 — Épaules")
  (3)
    10 Air Squats
    *:30 Rest
```

**Migration/refusal:** `(Warmup)` becomes `("Warmup")` when that is the full effective label. A multiword label currently truncated by parsing requires a choice between preserving that effective label and restoring the intended full label. `(3 Rounds)` can preserve the count as `(3)`; retaining its annotation elsewhere requires author consent about presentation. `(25 each leg)` requires choosing count, name, or annotation; do not infer from its digits. `("25 each leg")` and `(25) // each leg` are different workouts.

**Acceptance:** ASCII and Unicode names with spaces, escaped quotes, punctuation, and digits round-trip without becoming reps, protocols, or metadata. A migrated simple name keeps its label and runtime trace. Ambiguous mixed headers receive distinct previews of the possible interpretations and block execution until resolved.

## 9. Metadata ownership: note, block, statement

### Current behavior

The classifier maps property lines and inline JSON into `PropertyMetric` objects. [PropertyMetric](../packages/lang/src/runtime/compiler/metrics/PropertyMetric.ts) keeps `originalKey` and a typed `fieldRef` with normalized path/value kind. Known keys map to canonical metric types; unknown keys remain custom. A property line is a statement and can participate in nesting. An inline object belongs to the containing statement; several objects can contribute metrics there. Neither automatically rewrites note frontmatter.

The application separately models [script block identity, sport, and source positions](../packages/core/src/types/section.ts). A note can contain several blocks, each with many statements. There is no proven semantic equivalence between placing `rpe: 8` inside one block and placing `rpe: 8` in the note header.

### Proposed retained scope contract

| Owner | Representation and scope | Prohibited implicit operation |
| --- | --- | --- |
| Note | Existing note frontmatter for genuinely note-wide values. | No fan-out into every workout's recorded metrics merely because keys match. |
| Block | Existing block envelope for identity, fence/sport, and block-specific state. | No invented generic block-property header or inheritance rule in this release. |
| Statement | Existing property statement or inline JSON on that statement; known/custom metric identity retained. | No hoisting to note metadata, copying to siblings, flattening into an unscoped map, or reassignment by line ordinal. |

Retain statement JSON in the guide and grammar. It is the compact existing surface for statement-local typed values, not a duplicate of note frontmatter. Preserve supported numbers, strings, booleans, and null; null is neither absence nor the string `"null"`. Preserve metric ordering/multiplicity, canonical key mapping, field identity, and provenance through runtime output, persistence, catalog extraction, and WQL projection. Changing collision/duplicate-key policy requires a separate explicit contract; this redesign does not introduce inheritance or last-write-wins merging between scopes.

**Current statement-local example:**

```time
5 Back Squat 225lb {"rpe": 8, "note": "tough", "flag": true}
5 Back Squat 225lb {"rpe": 6, "note": "easy"}
```

**Migration/refusal:** no global “properties leave the fence” migration. An author-confirmed note-wide date/location may move to frontmatter only with a before/after scope review, preserving other blocks' values and naming changed consumers. Statement values remain statement values; a new generic block-scoped metadata syntax is deferred, so migration to it is unavailable. The hierarchy identity fix is independent and belongs in doc 17, not contingent on metadata removal.

**Acceptance:** two statements with different RPE values remain distinguishable after save/reopen; two blocks in one note do not acquire each other's metadata; a property statement with children keeps ownership; custom number/text variants do not collapse into one field; false, zero, and null remain distinct; note-level tags are not retroactively manufactured as per-effort observations.

## 10. Vocabulary and discovery remain dynamic

The static aggregate/target vocabulary and the discovered Field Catalog serve different purposes. [IFieldCatalog](../packages/wql/src/catalog.ts) supplies bounded prefix/exact lookups, typed variants, original spellings, units, and categorical values. Its contract forbids per-query event/history scans. [Completion](../packages/wql/src/language.ts) already merges catalog fields with static metrics; grouping suggestions still use static virtual/tag dimensions. Do not claim that discovery alone implements execution support for every proposed field expression or dimension.

Retain family keys, effort-scoped keys, registered calcs, user-defined/discovered field identities, source/catalog filters, and supported tag/virtual dimensions. Unknown or conflicting typed fields must produce a useful diagnostic or explicit variant choice, never silently aggregate unlike types. Completion is a bounded view, not an exhaustive language whitelist: an empty catalog or missing first-page suggestion does not make an authored path a syntax error. Type/domain validation can remain unresolved until bindings/catalog data exist.

The declared but uncomputed `round` dimension must not be advertised as meaningful round grouping. Removing it is a breaking semantic-validation change, not an inert cleanup: an existing query may currently expose an unassigned group. In this release, remove it from recommendations and disclose its limitation; do not invent a round fact or rewrite it to `session`.

**Acceptance:** newly saved custom fields appear through catalog invalidation; typed variants remain distinct; installed effort/calculation vocabularies remain discoverable; suggestions do not scan result history; absent suggestions do not reject otherwise valid authored syntax.

## 11. Breaking removals and migration ledger

Only the following changes are selected for the proposed breaking release. Everything retained above remains accepted, subject to doc 17's correctness diagnostics. Migration is a standalone authoring operation, not an alias path in the active parser.

| Breaking change | Migration or refusal | Consumer acceptance |
| --- | --- | --- |
| Unquoted names and mixed group headers | Quote the complete effective label or preserve a numeric count/ladder; refuse ambiguous/truncated text without author choice (§8). | Labels, traversal, child groups, and outputs retain the approved meaning. |
| Undelimited joins and noncanonical clause order | Emit `where (...)` from an unambiguous effective query; refuse ambiguous or ignored operands/windows (§5). | Both populations and windows match the approved before/after interpretation. |
| Calendar-plus-rollup / multiple-time-dimension mixtures | Remove only proven ignored syntax when preserving current behavior; otherwise author chooses the intended partition (§4). | Bucket identity, point populations, absence, and formulas match the selected interpretation. |
| Fixed buckets over date-only observations; implicit formula temporal mixing | Choose calendar grouping, provide a real occurrence instant, or restructure the formula; no timestamp fabrication. | Incompatible input reports an error rather than an apparently valid time series. |
| Raw `$` interpolation, including quoted interpolation | Migrate value references to typed bindings; refuse source fragments, unresolved types, and ambiguous list strings (§6). | Unbound authoring works; delimiter-containing values cannot alter structure; every runner agrees. |
| Ignored registry-effort windows/joins | Remove the ineffective clause only with an explicit interpretation review, or author a different recorded-data query. | Effort definitions never silently become performed-effort rows. |
| Legacy `in <scope>` on find/rows | Convert to `source:` filters where the conjunction is unambiguous; retain `in <unit>` only for display. Conflicting existing source filters require review. | The selected content/events and source semantics are unchanged. |
| Bare `rows:{...}` normalization | Write `rows:all{...}` and retain required scope filters. After cutover the old spelling errors with that replacement. | The same stored events/runs are returned; no content-discovery reinterpretation. |

The last two are already advisory-normalized by [normalizeWql](../packages/wql/src/wql.ts); this proposal removes the aliases rather than adding another advisory period. Accepted old input still constitutes a breaking removal even when a mechanical conversion is available.

**Explicitly not selected:** head collapse; `bucket(...)` unification; property/JSON removal; stripping `@`; deleting fractions or `-`; forced protocol-head keywords; hint/tag deletion; `round`→`session`; or nesting limits. If any is selected later, its syntax/data contract and migration/refusal need a reviewed amendment here—not an allow-list entry in doc 18.

In particular, there is no safe blanket slash rewrite. A confirmed mathematical `1/4 mile` may be explicitly converted to `0.25 mile`; a repeating decimal needs a chosen precision/value contract. `185/125 lb` may be a mistaken choice or a deliberate fraction: converting it to `185 | 125 lb` or `1.48 lb` without author intent is refused. Unit-sensitive `@135lb` may be equivalent to `135lb` for a particular load, but `@12` in climbing is an attempt count. Deleting `-` may retain child grouping yet change a stored Group metric. None is automatically “low risk.”

## 12. Clean cutover and acceptance gate

1. **Name the authored-language revision and effective contract.** Freeze the supported grammar and required binding/result interfaces together. Package/editor parsers, serializer, document parser, executors, examples, generators, importers, and exported authoring APIs change in the same release. No dual parser, temporary syntax alias, or hidden execution fallback.
2. **Inventory more than checked-in notes.** Cover templates, dashboard frontmatter/control values, query documents, embedded fences, imported content, URL/saved queries, and locally persisted authored documents. Historical corpus counts establish only one part of that inventory. Each changed source records original bytes, effective old interpretation, proposed new interpretation, scope, and consumer impact; unresolved cases block execution rather than being silently normalized.
3. **Separate source migration from historical data reading.** Existing saved output events, metric origins, hints, field identities, timestamps/civil dates, and source references remain readable under their stored-data contract. Do not reparse historical results into the new syntax, renumber old statement references by ordinal, or recompute observations from today's source. Statements are unique within a parse; source spans remain separate. A source rewrite that changes a content hash needs an explicit authored-content identity mapping; it must not sever old runs from their original content or rewrite their metrics.
4. **Make refusal recoverable.** Keep the original authored bytes for export/review; display spans, old interpretation where recoverable, proposed options, and affected scopes. A refused query produces no misleading empty-success result; a refused workout cannot start. Unsupported imports remain readable as text, not executable through an obsolete parser. Recovery uses an explicit migration decision, not a compatibility alias.
5. **Prove retained and changed behavior separately.** Retained Whiteboard cases satisfy doc 18's full observable gate. Breaking cases use a reviewed old→new expectation with an author-intent decision where necessary. Query cases compare population/identities, eligible observations, coverage, bucket identities, count semantics, units, absence/errors, and provenance—not serialized syntax alone. No undifferentiated exception list may hide data loss.
6. **Exercise every consumer before release.** Use editor and standalone/document parsing, runtime start/choice/transition/completion, save/reopen, analytics/catalog projection, Explorer, embedded queries, dashboard controls, previews, and exports. Every example in §§3–10 is an acceptance obligation, not a claimed completed test. Confirm full find payloads, scoped runs, tables, and formula outputs survive the shared execution path.

Release is accepted only when every selected breaking row has a migration/refusal path, all retained constructs have consumer coverage, and all owned authored material is migrated or explicitly blocked with recoverable source. A passing corpus-only fingerprint, fewer parser branches, or attractive common syntax is insufficient. This document supplies the design and acceptance contract; it does not claim that any cutover, migration, or behavioral verification has been performed.
