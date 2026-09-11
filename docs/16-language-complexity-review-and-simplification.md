# Language Complexity Review & Simplification Proposal

**Status**: HISTORICAL REVIEW + PROPOSAL. No implementation is claimed. Measurements and
equivalence claims below describe the original review and have not been revalidated as current.

**Superseding designs:** [Correctness fixes](./17-language-correctness-fixes-design.md),
[behavior-preserving cleanup](./18-language-behavior-preserving-cleanup-design.md), and
[language redesign](./19-language-redesign-design.md) replace the recommendations in their
respective categories. In particular, compiled Metric values alone do not establish runtime
equivalence; content discovery differs from recorded-result retrieval, and calendar buckets
differ from fixed-duration rollups. Treat the original risk estimates and projected reductions
below as proposals, not acceptance evidence.

**Scope**: the two authored languages — the **Whiteboard Language** (`time`/`log` fences) and
**WQL** — graded on a complexity scale, plus a staged simplification that keeps the parser and
compiler behaviour for *the collection of metrics per compiled effort section* identical.

**Evidence base** (all numbers reproduced by the audits in §10):

| Measure | Value |
| --- | --- |
| Corpus scanned | 886 markdown notes, 2,286 fenced blocks, 10,818 parsed statements |
| Fence tags in corpus | `time` 2,282 · `log` 4 · `:sport` suffix 3 (`climbing`) |
| Compiled groups (production strategies, simulated) | 10,333 |
| Metric types reaching a compiled leaf effort section | 6 shapes cover 94.6% |
| Hint metrics emitted | 7,805 — **1,367 (17.5%) consumed, 6,438 (82.5%) written and never read** |
| WQL query fences in corpus | 63 — 48 aggregate, 1 `find:`, **0 rows**; 0 windows, 0 joins, 0 pipes, 0 display units |

Sources: `packages/lang/src/parser/*`, `packages/lang/src/dialects/*`,
`packages/lang/src/runtime/compiler/**` (+ `strategies/`, `behaviors/`),
`packages/lang/src/analytics/**`, `packages/wql/src/*`.

---

## 1. The complexity scale

Five axes, each 0–4. Total 0–20.

| Axis | 0 | 4 |
| --- | --- | --- |
| **L** Lexical | one token shape to know | four+ token shapes / reserved characters for the same job |
| **S** Structural | meaning is local (token → metric) | meaning depends on neighbours, indentation, or a distant clause |
| **R** Redundancy | exactly one way to say it | three or more spellings/channels for one semantic |
| **I** Indirection | what you write is what the compiler reads | ≥2 transformation layers between the text and the decision |
| **F** Failure visibility | a wrong write is a loud parse error | a wrong write silently produces a different workout |

Bands: **Core 0–3**, **Familiar 4–7**, **Advanced 8–12**, **Hazardous 13–20**.

Calibration rules (so grades stay falsifiable):

- A grade must cite either a measured corpus count, a measured spelling-variant count, or an
  executed failure case. No vibes.
- **F** is graded by what actually happens, not by intent: any construct with an executed
  *silent* mis-parse scores ≥3 even if the correct spelling is simple.

---

## 2. Whiteboard Language — graded inventory

Usage = metric occurrences in the 2,286-block corpus. Variants = distinct surface spellings
observed for the same concept (digits normalised).

| # | Construct | L | S | R | I | F | Total | Band | Corpus usage / variants |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `10 Pushups` (rep + effort) | 0 | 0 | 0 | 0 | 1 | **1** | Core | rep 6,739 / 9 variants |
| 2 | `// comment` | 0 | 0 | 0 | 0 | 0 | **0** | Core | 26 statements |
| 3 | `(N)` rounds | 0 | 1 | 1 | 1 | 1 | **4** | Familiar | 2,044 numeric rounds |
| 4 | `5:00` / `:30` / `1:30:00` | 2 | 0 | 1 | 1 | 1 | **5** | Familiar | 1,534 / 7 variants |
| 5 | `[Action]` | 1 | 1 | 1 | 1 | 1 | **5** | Familiar | 13 statements |
| 6 | `(a-b-c)` ladder | 1 | 2 | 1 | 1 | 1 | **6** | Familiar | 430 ladder statements (2–12 values) |
| 7 | `n%` intensity | 1 | 2 | 1 | 1 | 1 | **6** | Familiar | 17 |
| 8 | `225lb` / `400m` adjacent unit | 1 | 2 | 1 | 1 | 2 | **7** | Familiar | 1,624 distance + 493 resistance / 20 unit spellings |
| 9 | Collectibles `?`, `:?`, `?lb`, `?kg`, `?m` | 2 | 1 | 2 | 1 | 1 | **7** | Familiar | 73 |
| 10 | `a \| b` choice | 2 | 1 | 1 | 2 | 1 | **7** | Familiar | 142 |
| 11 | `:sport` suffix | 1 | 2 | 1 | 2 | 1 | **7** | Familiar | 3 |
| 12 | `*` required · `^` count-up · `:?` collectible | 2 | 1 | 2 | 1 | 2 | **8** | Advanced | 23 required · 2 count-up |
| 13 | `bw` bodyweight | 1 | 2 | 2 | 1 | 2 | **8** | Advanced | 3 |
| 14 | `+` compose lap | 1 | 3 | 1 | 2 | 2 | **9** | Advanced | 805 |
| 15 | Indentation ownership | 0 | 3 | 1 | 2 | 3 | **9** | Advanced | child statements 6,313; depth ≤1 = 99.11% |
| 16 | `{json}` metric object | 3 | 1 | 2 | 1 | 2 | **9** | Advanced | 5 |
| 17 | `@135lb` explicit load | 2 | 2 | 1 | 2 | 2 | **9** | Advanced | 10 |
| 18 | `-` branch lap | 2 | 3 | 2 | 2 | 2 | **11** | Advanced | 16 |
| 19 | `1/4 mile` fraction | 3 | 2 | 2 | 1 | 3 | **11** | Advanced | 65 slash pairs |
| 20 | Climb grades / send / attempts | 3 | 2 | 2 | 2 | 3 | **12** | Advanced | 6 grades · 9 sends · 10 attempts |
| 21 | Implicit EMOM | 0 | 4 | 1 | 4 | 3 | **12** | Advanced | 242 `workout.implicit_emom` hints |
| 22 | `(Label)` named group | 2 | 3 | 2 | 2 | 4 | **13** | Hazardous | 26 labels; 37 `(…)` variants; **digit labels silently become counts** |
| 23 | Protocol keywords AMRAP/EMOM/TABATA/FOR TIME | 2 | 3 | 3 | 3 | 3 | **14** | Hazardous | 527 keyword tokens delivered by 3 channels |
| 24 | Domain keyword dialects (strength/metcon/skills/wod/superset, yoga, habits, cardio) | 3 | 2 | 4 | 4 | 1 | **14** | Hazardous | 8 + 4 + 2 + 2 hints; 6,438 unread |
| 25 | `key: value` property line | 4 | 2 | 3 | 2 | 4 | **15** | Hazardous | 33 lines; **self-parent cycle** |

**Band totals (Whiteboard): Core 2 · Familiar 9 · Advanced 11 · Hazardous 4 (25 constructs).**

### Executed failure cases behind the F grades

| Input | Result | Expected by an author |
| --- | --- | --- |
| `(25 each leg)` | `rounds=25` | an annotation, 1 group |
| `(8 sets per exercise)` | `rounds=8` | an annotation |
| `(9 ft)` | `rounds=9` | a distance note |
| `(60 total)` | `rounds=60` | an annotation |
| `(8 rounds: 20s on, 10s off)` | `rounds=8` + junk metrics from the tail | a Tabata header |
| `date: 2026-05-26` | **two statements, the second parented to itself** (`id 1 → parent 1`, `children [[1]]`) — any parent/child walk loops forever | one metadata line |
| `rpe:8` | `duration=8000 ms` (the lexer takes `:8` as a timer) | a property |
| `10 Dip bw` | effort text `Dip bw` (no resistance) | bodyweight load |
| `2 pood` | `rep=2` + effort `pood` | 2 pood |
| `185/125 lb` | `resistance=1.48 lb` | a 185/125 lb choice |
| `5.10b` (climb) | yds grade rebuilt as `5.1b` | a YDS grade |
| `- 5 Pullups` vs no marker | identical structure (`children [[2],[3]]`), only an extra `group=round` fragment | different |

The self-parent cycle is shipped in this repo's own guide corpus
(`markdown/canvas/syntax/dialect-climb-{bouldering,hangboard}.md`, 12 statements).

---

## 3. WQL — graded inventory

| # | Construct | L | S | R | I | F | Total | Band | Corpus usage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `agg:metric{}` head | 0 | 0 | 0 | 1 | 1 | **2** | Core | 48 |
| 2 | `by {week, effort}` | 0 | 1 | 1 | 1 | 1 | **4** | Familiar | 34 |
| 3 | Filters (`!`, `\|`, `,`, `*`, `"…"`, `k:v`) | 2 | 1 | 2 | 1 | 2 | **8** | Advanced | 14 |
| 4 | `.rollup(1w)` | 1 | 2 | 1 | 2 | 2 | **8** | Advanced | 19 |
| 5 | Window `last` / `from … to` | 1 | 2 | 2 | 1 | 2 | **8** | Advanced | 0 |
| 6 | `rows:` pipes (`\| select … \| order by … \| limit …`) | 2 | 3 | 2 | 2 | 2 | **11** | Advanced | 0 |
| 7 | `in <unit>` vs legacy `in <scope>` | 1 | 3 | 3 | 2 | 3 | **12** | Advanced | 0 |
| 8 | Metric-key vocabulary (families + aggregates + `<effort>.<family>` + 17 `calc.*`) | 4 | 0 | 3 | 2 | 3 | **12** | Advanced | static in typeahead |
| 9 | Rows scopes / planes / `all` pseudo-target | 3 | 2 | 2 | 1 | 2 | **10** | Advanced | 0 |
| 10 | Dashboard widget suffix + `$tokens` | 2 | 2 | 2 | 2 | 2 | **10** | Advanced | 33 fences |
| 11 | `where` join (two directions, two grammars) | 2 | 4 | 1 | 3 | 3 | **13** | Hazardous | 0 |
| 12 | Query documents (`defaults`, assignments, formulas, `show`, `(normalize)`, `-> unit`) | 3 | 3 | 2 | 2 | 3 | **13** | Hazardous | 0 |
| 13 | Three heads (`find:` / `rows:` / aggregate) | 2 | 3 | 3 | 3 | 3 | **14** | Hazardous | 48 / 1 / 0 |

**Band totals (WQL): Core 1 · Familiar 1 · Advanced 7 · Hazardous 3 (13 constructs).**

### Executed failure cases

| Input | Result |
| --- | --- |
| `find:note{tags:pr} where sum:totalVolume{} > 5000 in journal last 8w` | `Cannot parse join "… in journal last 8w"` — **the shipped example in `markdown/canvas/analytics/joins.md` and the Analytics README is invalid** |
| `… where sum:totalVolume{} > 5000 last 8w` | also fails — a window may not appear after `where`; the working order is `<primary> last 8w where … > 5000` |
| `sum:sessionLoad{intensity:$intensity} by {week}.rollup(1w)` | `Cannot parse` — a tokenised dashboard query is un-parseable until `$` substitution, so it validates as an error everywhere except the runner |
| `rows:note{note:x}` vs `rows:all{note:x}` | two spellings, identical meaning |
| `by {round}` | declared virtual dim, no fact field → always the unassigned bucket |

---

## 4. The preservation contract — what the compiler actually needs

This is the constraint the simplification must respect. Measured from source and by running the
production strategy registry over the corpus.

### 4.1 Chassis decision inputs

Six strategies set a block type (`packages/lang/src/runtime/services/runtimeServices.ts`); they read
**only** these inputs:

| Strategy | Priority | Reads | Emits blockType |
| --- | --- | --- | --- |
| `AmrapLogicStrategy` | 90 | Duration **and** (Rounds **or** effort/action text `rounds`/`amrap`) | `AMRAP` |
| `IntervalLogicStrategy` | 90 | Duration **and** (hint `behavior.repeating_interval` **or** effort/action text `emom`) | `EMOM` |
| `GenericTimerStrategy` | 50 | Duration (`origin !== runtime`); hints `behavior.required_timer`, `behavior.inject_rest`; `DurationMetric.direction` | `Timer` |
| `GenericLoopStrategy` | 50 | Rounds; numeric Rep values (rep scheme) | `Rounds` |
| `GenericGroupStrategy` | 50 | `children.length > 0` and no timer/rounds | `Group` |
| `EffortFallbackStrategy` | 0 | nothing (leaf: no timer, no rounds, no children) | `effort` |

Plus `ChildrenStrategy` (container wiring), `SoundStrategy` / `ReportOutputStrategy`
(always-match enhancements), and `LabelComposer` (sole consumer of the four `workout.*` label
hints; has an uppercase-keyword fallback).

**Seven hints are consumed**: `behavior.repeating_interval`, `behavior.required_timer`,
`behavior.inject_rest`, `workout.amrap`, `workout.emom`, `workout.tabata`, `workout.for_time`.
Everything else the parser emits is inert for compilation.

Note the redundancy this protects: three of the six chassis strategies branch on **raw Effort/Action
string equality** (`'emom'`, `'rounds'`, `'amrap'`) *in addition to* the hint channel — and
`AmrapLogicStrategy` and `IntervalLogicStrategy` share priority 90, so `(6) :60 EMOM` matches both
and the winner is decided by registration order plus last-write-wins in `BlockBuilder`.

### 4.2 Measured chassis distribution (10,333 compiled groups)

| Chassis | Groups | Share |
| --- | --- | --- |
| `effort` (leaf) | 7,225 | 70.0% |
| `Rounds` | 1,575 | 15.2% |
| `Timer` | 818 | 7.9% |
| `AMRAP` | 633 | 6.1% |
| `Group` | 58 | 0.6% |
| `EMOM` | 24 | 0.2% |

### 4.3 The metric collection per compiled effort section

Real compiler output for a leaf (`createCompiler()` → `JitCompiler.compile`):

```
"3 Back Squat 225lb"  →  blockType=effort
                         label="3 Back Squat 225 lb"
                         fragments=[ rep=3  effort="Back Squat"  resistance=225lb ]
                         sourceIds=[1]
```

Across the corpus, leaf effort sections carry six shapes (94.6% of the 7,225 leaves):

| Shape | Count |
| --- | --- |
| `effort + rep` | 3,853 |
| `distance + effort + hint` | 1,365 |
| `effort` | 963 |
| `effort + rep + resistance` | 345 |
| `effort + group + rep` | 180 |
| `choice + rep` | 128 |

Container sections carry `rounds` (and, for `Group`/`Rounds`, the children that hold the reps).
**That is the entire compiler-visible metric surface: `rep`, `effort`, `resistance`, `distance`,
`duration`, `rounds`, `group`, `choice`, `action`, `text`, children, and the 7 hints.**

### 4.4 Per-effort analytics outputs (also preserved)

Per-effort summary rows (`packages/lang/src/analytics/calc/seeds.ts`, folded by
`packages/wql/src/derivation.ts`) are keyed by *effort identity* (`effortSlug` + `discipline` +
`intensityTier`), derived from the `Effort` metric string via the effort registry — **not** from
domain hints. Keys per effort: `reps`, `totalVolume` (+ `totalSets`), and at workout scope
`sessionLoad`, `tis`, `calc.metMinutes`, `distance`. Segment annotations: `pace`, `power`,
`segmentVolume`, `calc.e1rm`, `calc.pct1rm`, `calc.sends`.

---

## 5. Findings

**F1 — One slot, four meanings.** `(…)` is count, ladder, label, and annotation. 37 distinct
spellings in the corpus. 30 statements carry a digit-bearing **annotation** that is silently
promoted to a round count: `(25 each leg)` → 25 rounds, `(8 sets per exercise)` → 8, `(9 ft)` → 9,
`(60 total)` → 60, `(8 rounds: 20s on, 10s off)` → 8 rounds plus junk metrics from the tail. A
further 35 statements use legitimate `(N Rounds)` / `(N Sets)` headers, which parse to the right
count but silently discard the label.

**F2 — One concept, three channels.** AMRAP/EMOM/TABATA/FOR TIME are delivered as (a) dialect
hints, (b) label hints for `LabelComposer`, and (c) raw case-insensitive string equality in
strategies plus an uppercase fallback in the label composer. 527 keyword tokens in the corpus
produce 1,367 consumed hints across two vocabularies (`workout.*` and `behavior.*`).

**F3 — The hint pipeline is 82.5% write-only.** 7,805 hint metrics emitted; 6,438 never read by any
source file outside the emitting dialects (grep across `packages/*/src` and `apps/playground/src`;
the only other references are doc comments and stale `dist/*.d.ts`). Four dialects (`WodDialect`,
`CardioDialect`, `YogaDialect`, `HabitsDialect`) produce *nothing but* unread hints. They are,
however, persisted into stored output `tags` (`AnalyticsTransformer`, `toStoredOutputStatement`), so
removing them is a data-shape change — see P4.

**F4 — Token meaning depends on position.** A unit only fuses as the *leading* token after a number
(`1.5bw` works, `10 Dip bw` does not); `+` appends to the previous child group while every other
child starts a new one; `-` is structurally identical to no marker; `@` means load in a workout and
attempts in climbing.

**F5 — Colon-adjacent text is the most fragile surface in the language.** `key: value` lines
(33 uses) can produce a second statement on the same line whose parent is itself
(`date: 2026-05-26`), or be re-read as a timer (`rpe:8` → 8000 ms). Root cause: statement identity
is the line number, and `applyIndentationNesting` never checks `parentId !== id`.

**F6 — Silent dimension degradation.** Unknown units (`pood`), trailing bodyweight (`Dip bw`),
zero-terminated grades (`5.10b`) and fraction-vs-choice (`185/125 lb`) all parse "successfully"
into different metrics than the author meant.

**F7 — WQL clause order is load-bearing but undocumented.** A `where` join tail is not suffix-peeled,
so a window after `where` fails; the shipped examples use exactly that broken order. Additionally a
`$token` query cannot parse before substitution, so tokenised dashboards are "invalid" in every
context except the runner.

**F8 — WQL's shipped surface is far larger than its use.** 48 aggregate + 1 `find:` + 0 `rows`
queries; zero windows, joins, pipes, display units, negations, wildcards. The expensive-to-learn
parts (join grammar, document formulas, rows planes, clause order) have no corpus instances.

---

## 6. Proposal — the Whiteboard Core

**Design rule: one concept → one channel → one spelling, and the channel the compiler reads is the
one the parser writes.** The metric model does not change at all.

### 6.1 Canonical surface (what the guide and typeahead show)

```
statement  := [protocol] [group] fragment+
group      := "(" count ")" | "(" a "-" b "-" … ")"       ; numbers only
protocol   := "amrap" | "emom" | "tabata" | "for time"    ; at most one per group
fragment   := value | effort | timer | action | comment
value      := number unit | "?" unit                      ; 225lb  400m  ?lb  ?m
timer      := time | "*" time | time ":?" | ":" "?"       ; 5:00  *:30  5:00 :?  :?
effort     := words                                       ; Back Squat
action     := "[" words "]"
comment    := "//" text
compose    := "+"                                         ; bundle children into one set
indent     := ownership (max 2 levels)
```

Eleven production rules, nine authored concepts — all Core/Familiar on the scale.

### 6.2 Phases

Each phase states the channels touched, the equivalence argument, the measured corpus impact, and
the risk. Phases are independent; P0 gates the rest.

#### P0 — Fingerprint harness (no behaviour change)

Add a corpus-wide equivalence harness that fingerprints every compiled group:

```
fingerprint(group) := {
  blockType, label,
  behaviorClasses: string[]           // in builder order
  fragments: metricType→value→unit    // per child group, hints excluded
  children: fingerprint[]             // recursive
  consumedHints: string[]             // the 7 CONSUMED_HINTS only
  sourceIds
}
```

The prototype already runs (`§10`): it produced the chassis distribution, the leaf shapes, and the
compiled fragment dumps in this document. Acceptance for every later phase: **all 2,286 blocks
fingerprint-identical**, except entries on an explicit, reviewed allow-list.

#### P1 — One protocol channel

- Parser keeps recognising `amrap|emom|tabata|for time` (case-insensitive) and emits the same
  hints; add the explicit *group-head protocol token* position so `AMRAP` can never be an
  exercise name.
- Delete the raw-string keyword branches in `AmrapLogicStrategy` / `IntervalLogicStrategy`, the
  `'rounds'` keyword branch, and `LabelComposer`'s uppercase fallback. Strategies read hints only.
- Delete `workout.implicit_emom` and `behavior.time_bound` (unread), or promote implicit EMOM to a
  real hint if it must survive.

Equivalence: the parser emits the identical hint set on the identical statements; the compiler's
predicates become hint-based versions of the same boolean. Verified by P0 fingerprints.
Corpus: 527 keyword tokens keep working; 3 code branches deleted. **Risk**: low — the ambiguity is
*reduced*.

#### P2 — Un-overload the group header

- `(N)` and `(a-b-c)` = count/ladder, **numerals only**.
- `(Name)` labels must match `[A-Za-z][A-Za-z]*` (no digits) — a digit-bearing header is a **loud
  parse error** with a fixit ("annotations belong in `//` comments or on their own line").
- Annotations move to `//` (or the trailing free-text slot).

Equivalence: statements that parse today keep identical metrics. The 30 statements that silently
became `rounds=25` / `rounds=60` are already wrong — P2 converts silent wrongness into a visible
error, which is why the impact is *negative* (a fix, not a regression). The 35 `(N Rounds)` /
`(N Sets)` headers keep their count and move their label to a comment. **Risk**: medium — needs a
one-time corpus sweep of the affected files; the allow-list must name them.

#### P3 — Delete `-`

`-` produces `children [[2],[3]]`, structurally identical to no marker, and adds only a
`group=round` fragment that no consumer reads (`LabelComposer` explicitly excludes Group from
identity; no strategy reads `MetricType.Group`). 16 corpus uses.
Equivalence: identical minus one inert fragment. **Risk**: very low.

#### P4 — Retire the write-only dialects

- Keep `UnitsDialect` (fusion), `CrossFitDialect` (7 consumed hints), `ClimbDialect` (real
  metrics: `climb-grade`, `climb-send-type`, `climb-attempt-count`, `climb-high-point`).
- Retire `WodDialect`, `CardioDialect`, `YogaDialect`, `HabitsDialect` — 6,438 unread hint metrics
  and zero decisions. Their intent (discipline, modality) already lives in the **effort registry**
  (`EffortResolver` → `discipline`, `intensityTier`, `met`), which is what the per-effort summaries
  actually use.
- Keep the `:sport` suffix as the one place a dialect set is selected.

Equivalence: every per-effort summary key/value is unchanged (verified: no calc/processor gates on
those hints; TIS's discipline factor comes from `effort-data`). **Data-shape change**: stored
output `tags` shrink. Ship as a normalizer + deprecation advisory, and keep reading old tags.
**Risk**: medium (contract surface, not behaviour).

#### P5 — Property lines leave the fence

- Frontmatter (`---`) is the only place for `key: value`; inside a fence, a `key: value` line is a
  loud error pointing at frontmatter.
- Independently, fix the identity bug: assign every statement a unique id (not the line number),
  and assert `parentId !== id` in `applyIndentationNesting`.

Equivalence: the 33 property statements move to frontmatter, where they already belong
(`date:`, `location:`, `rpe:` are note metadata). Removes the self-parent cycle class entirely.
**Risk**: low, and it closes a shipped defect.

#### P6 — Publish the value/modifier matrix; retire the trap spellings

- One rule, documented and completed in the editor: `?` replaces a value (`?` reps, `?lb` load,
  `?m` distance, `:?` timer); `*` = required, `^` = count up.
- Retire `@135lb` (10) in favour of `135lb`; retire the fraction path (65) in favour of `0.25 mile`
  and `|` for choices; keep `%` as the single intensity spelling (17).
- Delete `MetricObjectPrimitive`'s JSON surface from the guide (5 uses) — properties already cover
  it — but keep parsing it for one release.

Equivalence: each sugar already maps 1:1 onto a canonical metric, so the fingerprint of a migrated
line is identical. **Risk**: low; migration is mechanical and countable.

#### P7 — Cap nesting at two levels

Measured depth: 0 → 4,505 · 1 → 6,217 · 2 → 94 · 3 → 2. Two levels cover 99.98% of real content;
deeper becomes a loud error telling the author to split the block or compose with `+`.
Equivalence: none of the 3+ cases occur in production content. **Risk**: very low.

### 6.3 What must NOT change

- The metric model: `rep`, `effort`, `duration`, `rounds`, `group`, `resistance`, `distance`,
  `action`, `text`, `choice`, children groups.
- The six chassis strategies and their priorities; the behaviour sets per chassis.
- The seven consumed hints and their keys.
- `+` bundling, indentation ownership, and per-effort summary keys.

---

## 7. Proposal — WQL Core

WQL's difficulty is mostly **vocabulary** and **clause order**, not grammar. The grammar itself is
already minimal (one `Word` token, parser-context disambiguation). Reductions:

| # | Change | Rationale | Risk |
| --- | --- | --- | --- |
| W1 | Publish one canonical clause order — `<head>{filters} by {dims} .rollup(1w) in <unit> <window> where <join>` — and make any other order a parse error naming the correct one. Fix the join tail so a window may follow `where`. | F7: the shipped example is invalid; clause order is currently guesswork | low |
| W2 | Merge `by {…}.rollup(n u)` into one bucket clause: `bucket(1w) by {effort}` (keep `.rollup` as an alias for one release). | Two clauses for one idea; `.rollup` is read-time bucketing and only `d`/`w` are legal | medium |
| W3 | Collapse the three heads to two surfaces: `metrics:` (aggregate) and `rows:` (tabular, covering today's `find:` via `rows:note\|block\|effort`). `find:` stays as an advisory-rewritten alias. | 48 aggregate vs 1 `find:` vs 0 `rows` in the corpus; `find:` is already marked legacy in the deep-dive | low |
| W4 | One target rule for rows: `all` is the default (`rows:{…}` ≡ `rows:all{…}`); drop the `rows:note{note:x}` ≡ `rows:all{note:x}` duplicate. | Two spellings, one meaning | low |
| W5 | Delete the legacy `in <scope>` path once its advisory ages out; make `$token` a first-class grammar token so a tokenised document parses before substitution. | F7: tokenised dashboards currently validate as errors | low |
| W6 | Registry-backed metric keys + dims: typeahead lists engine keys *and* user calcs; delete `round` or implement it. | F8 + 17 `calc.*` keys + families + effort-scoped keys is the single largest memorisation cost | medium (already the direction of `docs/10-wql-composition-style.md`) |
| W7 | Keep `\|` as "OR" only inside braces and as pipe only at depth 0; document it as one rule with two positions. | The same character currently means two things | low |

---

## 8. Guardrails

1. **P0 harness gates everything.** No phase ships while a corpus fingerprint changes except by
   allow-list entry naming the file, statement, old value, new value, and reason.
2. **Deprecation mechanics already exist** — the C2 normalizer + `advisories` channel is the
   precedent: rewrite silently, warn loudly, delete on a schedule.
3. **Deletions become evidence, not opinion**: every phase should delete more code than it adds
   (branch counts: 3 keyword comparisons in P1, 4 dialects in P4, 1 column path in P6).
4. **Two shipped defects ride along** (P5 self-parent cycle, W1 join tail) — fix them as part of
   the migration rather than as separate work.

---

## 9. Expected complexity delta

| | Whiteboard before | after | WQL before | after |
| --- | --- | --- | --- | --- |
| Constructs documented | 25 | 12 | 13 | 8 |
| Core | 2 | 4 | 1 | 2 |
| Familiar | 9 | 6 | 1 | 3 |
| Advanced | 11 | 2 | 7 | 3 |
| Hazardous | 4 | 0 | 3 | 0 |
| Channels per concept (max) | 3 (protocol) | 1 | 2 (`in`, three heads) | 1 |
| Hint metrics emitted per corpus pass | 7,805 | ~1,380 | — | — |
| Silent-misparse classes (executed) | 11 | 0 (loud errors) | 2 | 0 |

Acceptance criteria:

- 100% of the 2,286 corpus blocks fingerprint-identical after each phase (allow-listed exceptions
  only), with the harness re-run in CI.
- No construct above **Familiar** in the published guide.
- Zero silent mis-parses: every construct in §2's failure table produces either the intended
  metrics or a parse error with a fixit.
- The compiler's consumed-hint set is unchanged (7 keys) and read from one channel.

---

## 10. Appendix — reproducing the measurements

Corpus audits (run from the repo root; `bun` resolves the workspace imports):

```bash
# 1. Surface inventory: construct counts, spelling variants, unit spellings
#    walk markdown/**, extract ```time|log|wod|whiteboard fences, parseScript, aggregate
#    metric types + metricMeta.raw (normalised digits → #)

# 2. Chassis distribution + leaf metric collections
#    strategyRegistry.list() from packages/lang/src/runtime/services/runtimeServices
#    buildChildGroupsWithContext(...) from strategies/SessionRootStrategy
#    classify(group) = first strategy (priority desc) whose match() returns true

# 3. Compiled fingerprint
#    createCompiler() from runtimeServices; compiler.compile(topLevelStatements, fakeRuntime)
#    read blockType / getMemoryByTag('metric:display' | 'metric:label') / behavior classes

# 4. WQL corpus audit
#    extract ```wql|```query[:type] fences, parseDocument() + parseQuery(), count families,
#    filters, rollup, windows, joins, pipes, diagnostics
```

Footprint numbers in this document come from those four passes over the 886-file corpus; the
failure cases in §2/§3 are single-line `parseScript` / `parseQuery` executions.
