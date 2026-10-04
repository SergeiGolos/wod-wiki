# Proposed Learning Collection — Design Review & Page Map

> **Status: PROPOSED.** These eight chapters are review documents for the homepage rebuild. They carry **no `route:` frontmatter** and are **not registered** anywhere — production routes under `/guide/*` stay untouched until this collection is approved.

**The shared example.** Every chapter from [First Workout](./start.md) through Dashboards reuses one workout, `markdown/canvas/home/sample-script.md` verbatim:

```time
(3)
  10 Kettlebell Swings 24kg
  *:30 Rest
```

You edit it, run it, watch what the clock records (Metrics), query the records (WQL), and pin the query to a dashboard.

---

## 1. Design review of the current learning surface

**Exact routed count.** A route-frontmatter search across `markdown/` finds **20 routed pages**: syntax 8, analytics 6, behaviors 4, plus the homepage `canvas/home/README.md` (`/`) and `canvas/ai-first/README.md` (`/ai-first`). That gives **18 learning pages**. The inventory report's "19 routed" counted the homepage row but missed that `/ai-first` also carries `route:` frontmatter. Per scope, **homepage and `/ai-first` are product/marketing, not learning pages**, and are excluded from the collection (ai-first stays linked from First Workout as "generate with AI").

**Orphans.** 65 of the 73 files in `markdown/canvas/syntax/` are non-routed tab-page fixtures (`search: hidden`, scroll-stage sources). They are compiled by tests and rendered only as scroll stages — several contradict their own routed captions. The collection de-orphans every unique topic without keeping the dead scroll plumbing.

**Duplicates merged (unique topics preserved).**

| Topic | Duplicates | Resolution |
|---|---|---|
| Calculated metrics ×3 | syntax/calculated-metrics.md (section document), custom-metrics-5.md (section custom-metrics), custom-and-calculated-metrics.md (section advanced) | one [Calculated](./metrics.md#calculated) section in metrics.md |
| AMRAP ×2 | protocols-1.md `20:00 (AMRAP)` vs classic-amrap.md `20:00 AMRAP` | keep the caption-blessed canonical `20:00 AMRAP` |
| EMOM ×4 | protocols-2 `10:00 (EMOM)`, protocols-5 implicit, basic-emom `(10) :60 EMOM`, alternating/longer/custom variants | keep canonical `(10) :60 EMOM` + longer-interval + alternating branches |
| Actions ×2 | supplemental-1 vs actions-comments | merged into [start.md#actions-comments](./start.md#actions-comments) |
| Rest ×2 | supplemental-2 vs timers-4 (both `*:30 Rest`) | merged into [protocols.md#required-rest](./protocols.md#required-rest) |
| Comments ×2 | supplemental-3 vs actions-comments | merged into start.md |
| Unknown loads ×2 | supplemental-4 vs metrics-5 (`?lb`) | merged into [metrics.md#capture](./metrics.md#capture) |
| Cheatsheets ×2 | /guide/syntax/cheatsheet + /guide/analytics/cheatsheet | **no separate cheat-sheet page** — compact reference tables fold into [start.md#reference](./start.md#reference) and [wql.md](./wql.md#aggregate); 8 pages max |
| Idioms tables | behaviors/README vs timers.md vs rounds.md (near row-for-row) | behaviors/README absorbed into [clock.md#run-next](./clock.md#run-next) |
| Prototype copies | root tour-redesign.prototype.html ≡ apps/playground copy | out of scope for markdown (IntegratedPrototype's); noted for cleanup |

**Contradictions — resolved or flagged.** Ground truth = `packages/lang` parser/runtime + `packages/wql` vocabulary (verified in source, not from docs).

| # | Docs say | Source says | Resolution in this collection |
|---|---|---|---|
| 1 | "wrap your workout in a `wod` block"; dialects page implies ```` ```wod ````/```` ```plan ````/```` ```climb ```` fences | runtime affords `time` (run) and `log` (record) fences only; dialect fixtures themselves use ```` ```time ````/```` ```log:climbing ```` | teach `time`/`log`/`log:climbing`; `wod`/`plan`/`climb` kept as *intent* vocabulary, flagged **needs validation** ([sessions.md#intent](./sessions.md#intent)) |
| 2 | home caption + prototypes: "```` ```wql ```` for queries"; cookbook shows ```wql copy blocks | real in-note fence is ```` ```query ````; no ```wql handling exists | use ```query everywhere; cookbook's ```wql snippet blocks flagged **needs validation** |
| 3 | analytics/README + anatomy document `source:all` | parser hard-errors: "source:all is retired — omit the source: filter" | omitting `source:` **is** the all-sources default; never write `source:all` |
| 4 | filters.md teaches singular `source:collection`/`source:feed` | `WQL_SOURCE_VALUES` = plural `journal, collections, feeds, guides, playground`; singular tolerated legacy | teach plural; note tolerance. `source:collection:<id>` spelling flagged **needs validation** — verified form is `collection:<id>` |
| 5 | structure.md caption: name groups `(Warmup)`; named-groups/mixed-sections fixtures use `// Warmup` | classifier emits a labeled group node for `(Warmup)` (`RoundsMetric(label)`); `//` is a text comment — different mechanisms, both legal | both documented with the difference ([structure.md#named-sections](./structure.md#named-sections)) |
| 6 | `:?` placement: timers-3 prefixes (`:? Max Effort`), capture/cheatsheet append (`5:00 Run :?`) | `:?` is a standalone collectible-duration token; both positions parse | append taught as the convention; prefix noted as equally legal ([metrics.md#capture](./metrics.md#capture)) |
| 7 | behaviors/timers.md: movement without duration counts up; timers-5.md: "no timer — stopwatch mode" | `DurationMetric.direction`: value 0/undefined/collectible → **up** | same behavior, two descriptions: a bare movement runs a count-up stopwatch ([clock.md](./clock.md)) |
| 8 | capture.md queries `avg:wod.rpe by {week}` | no `wod.rpe` key exists anywhere; session RPE is typed metric `session-rpe` | corrected to `avg:session-rpe{} by {week}` ([metrics.md#session-rpe](./metrics.md#session-rpe)) |
| 9 | anatomy.md lists `metMinutes` as a base metric | vocabulary registers it as `calc.metMinutes` (engine-published) | listed under calculated metrics ([metrics.md#calculated](./metrics.md#calculated)) |
| 10 | prototypes use `{tag:benchmark}`, `{intensity:zone4}`, `since:2026-01-01` | real keys: `tags:`; intensity tiers `low|moderate|high`; windows `last <n>d|w` / `from … to …` | corrected vocabulary shipped in wql.md; IntegratedPrototype notified |
| 11 | behaviors/README idiom `AMRAP 10` (label-first) | fixtures only show duration-first `20:00 AMRAP` (canonical per caption) | duration-first everywhere; label-first order flagged **needs validation** |
| 12 | home/README still carries a retired 720vh ```scroll:chapters spec; HomeView error cites nonexistent routes/home.md | dead plumbing | out of scope here — flagged for the homepage rebuild owner |
| 13 | behaviors/capture.md: `5:00 Run :?` asks for "actual distance covered in the 5 minutes"; "prompt for load **before** the first squat" | `:?` is a collectible **timer**: it mounts a count-up timer whose elapsed time is recorded on completion (compliance suites `timer.compliance`/`countup.compliance`; parse skill's collectible rule: prescribed time → collect distance with `?m`, prescribed distance → collect time with `:?`). No runtime evidence schedules a load prompt "before the first rep" — prompt timing is a capture-surface concern | metrics.md teaches the collectible family (`?` reps, `:?` time, `?lb`/`?kg` load, `?m`/`?km`/`?mile` distance) with prescribed-vs-outcome rule; prompt timing not asserted |

**Honesty rules carried into every chapter.** No invented HR/trend numbers; calculated metrics document only real prerequisites (e.g. `calc.readiness` publishes a value for a day only when soreness, sleep, and HRV were all captured that day — verified in `calc/seeds.ts`). Unlanded `calc.*` surfaces render a labeled "proposed" placeholder in the app; dashboards label sample answers as sample.

---

## 2. The eight proposed pages

| # | File | Proposed title | Absorbs |
|---|---|---|---|
| 1 | [start.md](./start.md) | First Workout | basics.md, syntax/README hub, core syntax tab pages, the printable cheat sheet |
| 2 | [protocols.md](./protocols.md) | Timers & Protocols | protocols.md, all timer/protocol tab pages, the timer half of behaviors/timers.md |
| 3 | [structure.md](./structure.md) | Structure & Rounds | structure.md, group tab pages, behaviors/rounds.md |
| 4 | [metrics.md](./metrics.md) | Metrics: Planned, Recorded, Calculated | custom-metrics.md, metric/calculated tab pages, behaviors/capture.md |
| 5 | [clock.md](./clock.md) | Run, Track & Capture (the Clock) | behaviors/README.md, the runtime halves of timers.md/capture.md |
| 6 | [wql.md](./wql.md) | Query Your Training (WQL) | analytics/README, anatomy, filters, joins |
| 7 | [dashboards.md](./dashboards.md) | Dashboards & Cookbook | analytics/cookbook, the query-block half of analytics/cheatsheet, the 6 seeded boards |
| 8 | [sessions.md](./sessions.md) | Dialects & Complex Sessions | dialects.md, complex.md, dialect/complex tab pages |

Reading order is the numbered order; 1–3 teach writing, 4–5 teach what running records, 6–7 teach querying, 8 composes everything.

## 3. Homepage placements (existing slots only)

| Homepage slot | Proposed links |
|---|---|
| Hero / editor-blank caption | "Start Lesson 1" → start.md#first-workout; add "See the full syntax" → start.md#reference |
| 01 Write — editor-metrics caption | add "What each line collects" → metrics.md |
| 01 Write — WORKOUT_PRESETS | each preset mirrors a protocols.md / structure.md example |
| 02 Run — behaviors caption | point "Read the behaviors explainer" → clock.md |
| 02 Run — timer-cast caption | clock.md#casting |
| 03 Own — metrics-d ("Measures ride along") | add action → metrics.md |
| 03 Own — metrics-c ("Efforts × measures compound") | add teaser → wql.md |
| 04 Explore (currently no inline analytics links; `home:analytics_guide_opened` telemetry declared but never fired) | header actions: "WQL in depth" → wql.md, "Copy-paste queries" → dashboards.md#cookbook; wql-dashboard/wql-live captions → dashboards.md#seeded-boards |
| CelebrationBridge ("Now learn the language") | render the 8-chapter map as the card row |
| TourChapterPicker / TourLearnSection | CHAPTER_ROUTES gains the 8 files |
| Footer "Where to next?" | add Learn column: start.md, wql.md, dashboards.md |
| /ai-first | stays a standalone marketing page, linked from start.md ("Generate with AI") |

## 4. Source coverage

Every routed learning page (18) and every underlying non-routed lesson source (65 syntax tab pages + 2 home sources), mapped to its target. Merged duplicates list only once with their union.

| Current source (routed unless marked) | Topics kept | → New page |
|---|---|---|
| syntax/README.md (hub) | core concepts map, dialect intro, new-note CTA | start.md (header/TOC), sessions.md#intent |
| syntax/basics.md | fences, one-thing-per-line, indentation, measurements, `?lb`, effort words, actions, comments | start.md |
| syntax/protocols.md + timers-rest, timer-modifiers, timers-1..5, longer-duration, mixed-timers, classic-amrap, time-cap, multiple-amrap-windows, basic-emom, longer-intervals, alternating-emom, protocols-1..5, custom-intervals, distance-intervals, supplemental-2 | countdown/countup/`^`/`*`/`:?`, H:MM:SS, AMRAP, caps, EMOM family, Tabata, intervals, rest | protocols.md |
| syntax/structure.md + groups-1..4, named-groups, mixed-sections, multiple-sets | rounds, rep schemes, nesting, named sections, sets | structure.md |
| syntax/custom-metrics.md + custom-metrics-1..5, calculated-metrics, custom-and-calculated-metrics, metrics-1..5, supplemental-4 | inline JSON, rpe/rir, multi-metric lines, calculate blocks, JSON rules, unknown loads `?lb`/`?kg` | metrics.md |
| syntax/dialects.md + dialect-wod/log/plan, dialect-climb-bouldering/hangboard/sport | intent distinction, `log:climbing`, climbing signals | sessions.md |
| syntax/complex.md + complex-nested-protocols, complex-full-session, complex-barbell-cycling, complex-partner-workout, complex-swimming | nested protocols, full session, EMOM chains, partner windows, swimming | sessions.md |
| syntax/cheatsheet.md (routed) | one-page syntax | start.md#reference + per-page tables (no separate page) |
| syntax/single-movement, core-rules, measurements, effort-notes, actions-comments, supplemental-1, supplemental-3, document-1..4, welcome-1 (home/), sample-script.md (home/) | smallest workout, three rules, headers/checklists/equipment-table document patterns, actions/comments | start.md |
| behaviors/README.md | script→parse→compile→track, 3 behavior families, idioms | clock.md |
| behaviors/timers.md | timer strategy selection, sound/pause/skip/required-rest | clock.md (+ protocols.md for syntax forms) |
| behaviors/rounds.md | round behavior, rep math, supersets, interval groups, rounds↔timers | structure.md (+ clock.md) |
| behaviors/capture.md | `:?`, `?lb`/`?kg`, session RPE, trendlines, fact origins | metrics.md (+ clock.md for prompt behavior) |
| analytics/README.md | 3 WQL surfaces, 2 query planes, where-join | wql.md |
| analytics/anatomy.md | aggregators, base/calc metrics, dimensions, rollups, find targets | wql.md |
| analytics/filters.md | tag filters (negation/OR/substring), source filters, time windows, Library tri-state toggles | wql.md |
| analytics/joins.md | where joins, Block Content Id mechanics | wql.md |
| analytics/cookbook.md | 5 canonical queries, ```query embeds, dashboard notes, widget types/spans | dashboards.md (+ wql.md) |
| analytics/cheatsheet.md | WQL one-pager | wql.md tables + dashboards.md#widgets (no separate page) |
| markdown/dashboards/training-block-review.md | widget exemplars (see dashboards.md#seeded-boards) | dashboards.md |
| markdown/dashboards/road-to-560-total.md | strength PR board exemplar | dashboards.md#seeded-boards |
| markdown/dashboards/polarized-base-marathon.md | endurance polarization exemplar | dashboards.md#seeded-boards |
| markdown/dashboards/finger-strength-v8.md | climbing board exemplar (wellness capture, `calc.mvcBw`) | dashboards.md#seeded-boards |
| markdown/dashboards/benchmark-pr-board.md | benchmark table exemplar (`last:elapsed{tags:benchmark}`) | dashboards.md#seeded-boards |
| markdown/dashboards/recovery-readiness.md | ```wellness capture + readiness exemplar | dashboards.md#seeded-boards (+ metrics.md#calculated) |

Not counted as learning sources: `canvas/home/README.md` (product walkthrough — the homepage itself stays), `canvas/ai-first/README.md` (AI marketing, linked as an aside). Orphaned scroll plumbing (```scroll blocks, getTabExamples/getHomeExample, protocols-1's `(AMRAP)` spelling) is dropped, not migrated.

## 5. Run & observe

Each chapter ends with a **Run & observe** block: what to write, what pressing Run should do, and what the review grid / clock should show — a reviewer checklist, not a test report. Every syntax, behavior, and query claim in this collection comes from **source review only** (parser grammar, compiler metrics, WQL vocabulary/seeds, shipped fixtures); no runtime smoke runs were executed for these drafts.
