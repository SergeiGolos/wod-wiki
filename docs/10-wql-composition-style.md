# WQL Composition Style — findings, language variations, and the path to easy filters + graphs

**Status**: PROPOSAL — nothing here is shipped. Written 2026-08-27 after an
architecture review of how WQL composes table calculations and graphs
(`improve-codebase-architecture` pass). The shipped surface it builds on is
[`09-wql-deep-dive.md`](09-wql-deep-dive.md) (engine 0.10.41–0.11.0, C1–C7
landed, composed calcs live in `packages/lang/src/analytics/calc/`).

**The goal, plainly**: filtering lists and building graphs should be easy two
ways — through the WQL Composer Panel, or by hand-writing WQL — with typeahead
doing the heavy lifting in both. Every variation below is judged against that.

---

## 1. Findings (what the review found)

| # | Friction | Evidence | Cost today |
|---|----------|----------|------------|
| F1 | The Canonical Metric Key vocabulary is hand-synced across packages | `packages/wql/src/vocabulary.ts:55` — `WQL_CALC_TARGETS` says both "single source of truth" and "must match the keys the calc engine registers"; a cross-package test polices drift | New calc metrics need edits in two repos-of-record; user-authored calcs never appear in WQL typeahead or the dashboard gate |
| F2 | Every ad-hoc ratio becomes an engine seed | `packages/lang/src/analytics/calc/seeds.ts` STORE_CALCS: `calc.ef`, `calc.adherence`, `calc.pct1rm`, `calc.readiness`, `calc.mvcBw` are all one-off formulas (`hang / weight * 100`, `sessions / planned`) baked into lang | A user who wants a new ratio must write a calc line, save it, register it — the full recording-rule path — even for one graph |
| F3 | The formula machinery already exists, but only behind calc-line authoring | `calc/ast.ts:27` — `{ kind: 'wql', … }` nodes (`sum:sessionLoad{} by {day}`); `evaluator.ts:33` — `resolveWql`; `check.ts:32` — dimension inference for WQL atoms | The one capability that would make graphs flexible is invisible at the fence/dashboard where graphs are actually made |
| F4 | "Does this consume rollups?" is answered by string-sniffing, twice | `packages/ui/src/widgets/DashboardView.tsx:117`, `useAnalyticsQueries.ts:40` — `query.includes('calc.')` | False positives on any key containing `calc.`; silently wrong if the convention renames; orchestration duplicated |
| F5 | Every renderer re-pivots `QueryResult` | `packages/ui/src/widgets/WqlTable.tsx` vs `WqlBars`/`WqlTimeseries`; `useChartShape.ts` classifies; widget type scraped from the fence suffix by `parseQueryWidgetSuffix` | A new presentation (e.g. the #905 PMC composite) forks every renderer |

Adjacent (recorded, not part of this proposal): dashboard model forked
wholesale between `packages/wql/src/dashboard/` and
`apps/playground/src/lib/dashboard/` (the app copy is live); the 722-line
throwaway `CalcAuthoringPrototypePage.tsx` still routes at `/proto/calc-authoring`;
`markdown/canvas/analytics/{cookbook,cheatsheet}.md` still show pre-C2 syntax;
an `as unknown as IEffort` cast bridges two divergent `IEffort` interfaces in
`apps/playground/src/services/queryService.ts`.

**Key discovery that makes this cheap**: F3 means a Datadog-style formula
layer is not a new algebra to build — the Pratt expression parser, WQL-atom
lexing, dimension checking with authoritative casts, and zero-filled trailing
windows all ship today inside the calc engine. What's missing is a document-
level path to it and a registry so users' metrics are first-class.

---

## 2. Variations from comparable languages → WQL translation

Each entry: the pattern, how that language spells it, what it would mean in
WQL syntax and structure. Items marked **ADOPT**, **ADAPT**, or **DEFER**.

### 2.1 Datadog — lettered queries + read-time formulas — **ADOPT (fence level)**

Datadog dashboards name queries `a`, `b`, `c` and compose formulas over them
(`a / b`), with alignment rules (same rollup, same group-by) and `.fill()` for
sparse series. See [query functions](https://docs.datadoghq.com/dashboards/query_functions/).

WQL variation — a ` ```query ` fence may name its lines and add a formula:

````text
```query:timeseries
a = sum:totalVolume{discipline:strength} by {week}
b = sum:totalVolume{} by {week}
show a / b -> pct
```
````

- Plain single-query fences stay exactly as they are — this is additive.
- `a` and `b` are the same `kind: 'wql'` nodes store calcs already use; `show`
  is an expression in the same Pratt language (`reps * resistance` et al).
- Alignment rule, Datadog-style: all lines share the fence's window; group-by
  dims must match across lines referenced in one formula (a mismatch is a
  explained error, not a wrong graph).
- Structure impact: fence/dashboard parser gains multi-line bodies; the
  evaluator, dimension check, and unit casts are reused from lang. The WQL
  **grammar is untouched** — each `a = …` line is a normal WQL string.

### 2.2 PromQL — one-string expressions — **DEFER**

`sum(a) / sum(b)` with vector matching in a single query string
([operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)).
The WQL equivalent — `sum:totalVolume{discipline:strength} / sum:totalVolume{}`
inside one query — moves the Lezer grammar, the suffix peel order, the C6
serializer's canonical forms, and every composer pill. That is a language-train
sized change (C1–C7 took a release train to land safely). Defer until 2.1
formulas stabilize; then promote the stable subset into the grammar the way
the train always has.

### 2.3 KQL `extend` / ES|QL `EVAL` — derived columns on tables — **ADAPT (later)**

KQL's `extend` and ES|QL's `EVAL` add calculated columns to result rows,
immediately usable downstream ([extend](https://learn.microsoft.com/en-us/kusto/query/extend-operator),
[EVAL](https://www.elastic.co/docs/reference/query-languages/esql/commands/eval)).
The table-side analog for `rows:` queries:

````text
```query:table
rows:segment{note:2026-08-20} last 4w
pace = distance / elapsed -> min/km
```
````

Same machinery as 2.1 (expression over per-row atoms instead of over series).
Deliver after 2.1 lands — it shares the evaluator and only adds a rows-context
binding. Not in the first cut.

### 2.4 NRQL — `AS` naming and auto-bucketing — **ADAPT (small wins)**

NRQL names derived values in place and auto-buckets `TIMESLIES` from the time
range ([syntax](https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses/)).
WQL already has `.rollup(n)` and `in <unit>`; the adaptation is inference, not
syntax: when a query groups by `{day}`/`{week}` with no explicit `.rollup`,
default the bucket to the civil day/week grain (C1 already pinned local-civil
ISO keys). One fewer thing to type; nothing new to learn.

### 2.5 Vega-Lite / Grafana — one dataset, many presentations — **ADOPT**

Vega-Lite runs an ordered transform pipeline producing one dataset that
encodings consume ([transforms](https://vega.github.io/vega-lite/docs/transform.html));
Grafana feeds one DataFrame to any panel
([transform data](https://grafana.com/docs/grafana/latest/panels/query-a-transform-data/transform-data/)).

WQL variation — no syntax change at all. Structure only: one state-free
dataset module between `QueryResult` and the renderers classifies
(scalar/bars/timeseries/table) once, pivots once, formats once (unit labels,
civil-day keys — the ticket-014 lesson: locale-sensitive formatting gets
exactly one home). The widget type becomes a parsed field of the fence instead
of a string scrape. The dataset carries **N series from day one** so the #905
PMC composite (`calc.ctl` + `calc.atl` + `calc.tsb` on one chart) is a new
consumer, not a re-seam.

### 2.6 Flux — piped named streams — **REJECTED as surface, already embodied**

Flux names streams and pipes them through transformations
([Flux](https://docs.influxdata.com/influxdb/v2/query-data/get-started/)).
A full scripting surface is more language than this product wants users to
hold. Its good idea — named intermediate streams — is already the calc DAG's
node model; 2.1 simply exposes naming at the document level.

### 2.7 Frink — dimension algebra with explained errors — **ALREADY SHIPPED, share it**

Frink tracks units through every operation and explains mismatches instead of
hiding them ([Frink](https://frinklang.org/)). The calc layer ships exactly
this (#863 verdict A): exponent-vector dimensions, `convert()`, and named
zero-vector units (AU, pts, ratio) as authoritative casts where the declaration
wins. Any new formula surface (2.1, 2.3) must get the same checking from the
**same module** — which means moving `calc/{dimensions,units}.ts` (pure math,
no lang-specific deps) into **core**, so lang's engine and any consumer share
one truth instead of two.

### 2.8 SQL window functions (ACWR practice) — **SETTLED, record as invariants**

The ACWR literature and SQL practice agree on: zero-fill missing days,
division-safety guards, uncoupled windows. The repo already learned these —
`evaluator.ts` windowMap zero-fills missing days; #866 absorbed rollups into
store-scope calcs; ticket 014 pinned local civil training days. Preserve all
three when any of this moves.

---

## 3. The recommended shape (five decisions)

1. **Metric registry (fixes F1, F2's pipeline)** — the Canonical Metric Key
   vocabulary becomes a registry whose interface lives in wql and is injected
   at Query Service construction, beside the existing store seams. Two
   adapters (real seam, not hypothetical): lang's seed registry, and the app's
   user-calc store. `parseQuery` stays pure — the Query Service and the
   composer validate metric keys and report unknown-metric errors at run/edit
   time. Collisions: user wins, mirroring Calc Engine registration priority.
   `WQL_CALC_TARGETS` becomes fallback seeds; the cross-package sync test
   deletes.
2. **Document-level formulas (fixes F2)** — the 2.1 fence form, evaluated by
   the existing store-scope machinery (`kind: 'wql'` nodes + Pratt evaluator +
   dimension check). Promotion is explicit: a formula that keeps being used
   becomes a saved calc line (one action), the recording-rule move.
3. **Rollup truth from the AST (fixes F4)** — a `consumesRollupFacts`
   predicate over the parsed metric, backed by the registry; one state-free
   runner module owns widget fan-out + range + ensure-Rollup-Facts.
   `includes('calc.')` deletes from both call sites.
4. **Presentation dataset (fixes F5)** — 2.5: classify/pivot/format once,
   N-series, widget type as a parsed field.
5. **Dimension algebra to core** — 2.7: one shared truth for unit checking,
   mechanical cutover of lang imports; rides with decision 2 (formula errors
   need it).

Sequencing: 1 → 3 (registry-backed predicate) → 4 → 2 (+5). None of 1–5
touches the WQL string grammar.

---

## 4. Syntax impact summary

| Surface | Today | After (proposed) | Touched |
|---|---|---|---|
| WQL string grammar | `<head>{filters} by {dims} .rollup(n) in <unit> <window>` | **unchanged** | — |
| ` ```query ` fence | one WQL body, optional `:type` suffix | optional named lines + `show <expr> -> unit`; bare fences unchanged | fence parser (dashboard model — deduplicate the fork first) |
| Dashboard note | one WQL line per widget body | same; a widget may use the formula form | dashboard parser |
| Composer | AST pills + free-text escape hatch | unchanged; formula lines live in the free-text path with completion (§5) | none structural |
| `rows:` tables | raw rows | optional calc-column lines (2.3, later) | rows result + dataset module |
| Widget suffix | `:value :timeseries :bar :top :stacked :goal-rings :zone-distribution :table` | same vocabulary, parsed into a field | dataset module |

---

## 5. Typeahead magic (what completion offers, per surface)

| You type | You get | Backed by |
|---|---|---|
| `sum:` / `avg:` … | Canonical Metric Keys — engine seeds **and your saved calcs** (today: static list only) | registry (decision 1) |
| `{` inside braces | tag keys + value vocabularies | `language.ts` (exists) |
| `a`, `b` in a formula line | the fence's named lines as letters, plus functions (`min max abs round floor ceil clamp convert has lookup`) and units after `-> ` | calc language server (exists in CM6 calc editor) |
| fence suffix `:…` | widget types | exists |

The registry is the piece that makes *user-specified* metrics feel native in
hand-written WQL: author once, and `sum:calc.yourMetric` completes everywhere.

---

## 6. Effort ballparks

| Step | Depends on | Ballpark |
|---|---|---|
| Registry (decision 1) | — | ~1 day (interface + 2 adapters + app wiring; sync test deleted) |
| Rollup truth + runner (3) | registry | ~half day |
| Presentation dataset (4) | — | 1–2 days including renderer cutover |
| Fence formulas (2) + algebra move (5) | registry | 2–3 days (fence parser, evaluator bridge, completion) |

About a focused week end-to-end; each step ships independently.

---

## 7. What stays settled (guardrails)

- C1–C7 language train (all shipped): three families, AST + total serializer,
  window on every family, closed target enums on the text surface.
- #866 consolidated calc spec: three Calc Scopes, one expression language,
  inline WQL atoms legal in store scope only, rollup absorption (ACWR et al.
  are store-scope series calcs).
- #863 verdict A: authoring is text + completion; named zero-vector units are
  authoritative casts.
- #905: PMC ships as three keys until a series widget lands (decision 4 is
  that widget's runway).
- Package DAG: wql does not import lang — the registry injects, the formula
  evaluator is composed in the app, algebra lives in core.
- Recompute-on-open: rollup grains are never stored.

None of decisions 1–5 reopen these. The only reopening in this doc is 2.2
(grammar-level expressions), and it is explicitly deferred, not proposed.

---

## 8. Example gallery — today vs after, per job

Every "after" block is PROPOSED. Every "today" block is the shipped surface
(widget types and metrics verified against `markdown/dashboards/*.md` seeds
and `packages/wql/src/vocabulary.ts`).

### E1. Filter a list — hand-written (unchanged)

Job: "show my notes that mention air squats, excluding feed content, last 8
weeks."

```text
rows:note{text:"air squats",!source:feed} last 8w
```

Impact: none — decision set 1–5 does not touch this. It's here as the
baseline for what already works.

### E2. Filter a list — Composer path (unchanged, one improvement)

Job: same list, built from pills in the Library's WQL Composer Panel.

Today: source tri-state → include-only Note, free-text `air squats`, preset
`last 8w`. The composer serializes the AST to the E1 string.

After: identical — plus, when you open the `+ Filter` menu on the metrics
plane, your own saved calcs are listed as filterable metrics (registry,
decision 1). Today that menu only knows engine seeds.

### E3. Graph a ratio — the flagship formula example

Job: "what share of my weekly volume is strength, over the last block?"

Today — the full path, one commit of engine code per ratio:

```text
2. Author one line: strengthShare = strengthVol / totalVol -> ratio where strengthVol = sum:totalVolume{discipline:strength} by {week}, totalVol = sum:totalVolume{} by {week}
3. Save → registers (user priority)
4. avg:calc.strengthShare{} by {week} last 12w
```

After (decision 2, fence formulas) — write it where you look at it:

````text
```query:timeseries
a = sum:totalVolume{discipline:strength} by {week}
b = sum:totalVolume{} by {week}
show a / b -> ratio
```
````

Under the hood: `a` and `b` are the `kind: 'wql'` nodes store calcs already
use (`seeds.ts:397`); `show` evaluates in the existing Pratt evaluator with
dimension checking (`a/b` is dimensionless → the `-> ratio` cast confirms).
No new algebra. Used every week? Promote to a calc line; it then completes
as `calc.strengthShare` everywhere (§5).

Note on `/`: in the bare single-query form, a trailing `/ x` is already a
widget positional param (e.g. `max:calc.mvcBw{} / $hangGoal` in the
finger-strength seed). The named-line form (`a = …` … `show …`) is a
different shape, so there is no ambiguity between division and the
positional param.

### E4. Graph a derived unit — running efficiency

Job: "pace per heart rate, weekly, this marathon block."

Today: `calc.ef` exists only because it was shipped as an engine seed
(`dist / (elapsed/1000)` ÷ `hr`, `seeds.ts:593-599`). Any sibling ratio —
say swimming pace per RPE — is another seed.

After:

````text
```query:timeseries
dist    = sum:totalDistance{discipline:swimming} by {week}
seconds = sum:elapsed{discipline:swimming} by {week}
show dist / seconds -> min/km
```
````

Under the hood: dimension check derives m/s; the declared `-> min/km` cast
converts for display. A mismatch (`-> kg`) is an explained parse-time error,
not a wrong graph — the Frink rule (§2.7).

### E5. Composite series chart — the #905 PMC case

Job: "CTL, ATL, and TSB on one chart" — fitness/fatigue/form.

Today: impossible as one widget. `calc.ctl`, `calc.atl`, `calc.tsb` are
three separate keys; `calc.pmc` is deliberately absent from
`WQL_CALC_TARGETS` because no widget renders a composite
(`vocabulary.ts:50-53`). You get three stacked widgets.

After (decision 4, N-series dataset):

````text
```query:timeseries
show avg:calc.ctl{} by {day}, avg:calc.atl{} by {day}, avg:calc.tsb{} by {day} last 26w
```
````

Under the hood: the dataset module classifies once and carries N series; the
timeseries renderer consumes them with one color scale. This is the widget
`vocabulary.ts:50-53` says must wait for a "dedicated series widget".

### E6. One query, three presentations

Job: "reps by effort — as a chart for the dashboard, a table for the note,
and a top-5 for the summary."

Today: the same `sum:totalReps{} by {effort}` runs three times and each
renderer re-pivots the `QueryResult` itself (`WqlTable` vs `WqlBars` vs the
top-list renderer); the fence suffix (`:bar`, `:table`, `:top`) is scraped per widget.

After: same fence suffixes, same strings — but the suffix parses into a
field, and one dataset module feeds all renderers. User-visible change: none
on this query. Structural change: adding presentation #9 touches one
consumer, not every renderer (F5).

### E7. Your own metric, everywhere

Job: "track my best hang as %BW over the block, my formula, my name."

Today: author `hangPct = hang / weight * 100 -> pct` in
/settings/library/calcs; it runs and stores facts — but `WQL_CALC_TARGETS`
doesn't know it, so hand-typing `max:calc.hangPct{}` gets no completion, and
the dashboard composer gates it as "proposed metric".

After (decision 1, registry): the moment it saves, `max:` completion offers
`calc.hangPct`, parse validation accepts it (service-level), the dashboard
known-vs-proposed gate passes, and the rollup-ensure predicate (decision 3)
knows to refresh its facts. Zero engine commits.

### E8. Calc columns on a results table (later, §2.3)

Job: "session review table with a pace column."

Today: `rows:segment{result:…}` returns raw rows; any derived column is
rendered ad hoc by the review surface.

After (decision 2's rows variant, second wave):

````text
```query:table
rows:segment{note:2026-08-20} last 4w
pace = distance / elapsed -> min/km
```
````

Same evaluator, per-row binding instead of per-series. Shares E3/E4
machinery; ships after fence formulas prove out.

### E9. The string-sniff bug, concretely (decision 3)
Today: `DashboardView.tsx:117` runs `query.includes('calc.')` on the raw
string. A widget querying `rows:note{text:"calc.acwr notes"}` — a text
filter that merely *contains* the substring — fires `onEnsureRollupFacts`,
a write-path refresh, on a query that consumes no calc facts. Harmless
today, wrong by construction, and renaming the `calc.` namespace would
silently break the real cases.

After: the runner asks the registry whether the *parsed metric* is
calc-published. String shape becomes irrelevant; the false positive is
unexpressible.
