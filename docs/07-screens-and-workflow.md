# 07 — Screens & the Plan / Track / Analyze Workflow

The reference application (`playground/src/`) organizes everything around a
three-phase loop: **Plan** a workout, **Track** it while you do it, then **Analyze**
what happened. The same `Metric` flows through all three (doc 04); the screens are just
windows onto different stages of that flow.

```
   PLAN ───────────────► TRACK ──────────────► ANALYZE
   write / browse        run on the clock      review & chart
   editor, collections   tracker / run         review grid, journal trends
   efforts, plan, feeds  (live timer)          analytics metrics
        ▲                                            │
        └──────────────── journal history ◄──────────┘
```

Routes are defined in `playground/src/lib/routes.tsx` (`ROUTE_PATTERNS`).

---

## 7.1 PLAN — author and choose the work

| Screen | Route | What it does |
|--------|-------|--------------|
| **Workout Editor / Note** | `/note/:category/:name`, `/playground/:id` | The Markdown + `wod` editor (CodeMirror with live grammar highlighting & suggestions). Where you write the plan. |
| **Plan** | `/plan` | The planning view for upcoming work / a day's session. |
| **Collections** | `/collections`, `/collections/:slug`, `/collections/:collection/:workout` | Browse libraries of workouts (e.g. the `markdown/collections/**` sets: ZombieFit, Steve Cotter, swimming). Pick one to run or copy. |
| **Efforts catalog** | `/efforts`, `/effort/:slug` | Browse/define exercises (`IEffort`): MET value, discipline, aliases, notes. Feeds analytics and editor autocomplete. |
| **Feeds** | `/feeds`, `/feeds/:feedSlug`, `/feeds/:feedSlug/:feedDate/:feedItem` | Date-indexed streams of workouts/sessions. |

Output of this phase: a **note** (Markdown with `wod` blocks) persisted in the `notes`
store, parsed into a `CodeStatement` tree of `parser`-origin metrics.

## 7.2 TRACK — execute on the clock

| Screen | Route | What it does |
|--------|-------|--------------|
| **Tracker / Run** | `/run/:runtimeId`, `/tracker/:runtimeId` | The live execution screen. The JIT-compiled blocks run on the `RuntimeClock`; timers count, rounds advance, sound cues fire, and you log actual reps/load/RPE. |

During tracking the runtime emits **OutputStatements** carrying `runtime`-origin
metrics (spans, elapsed, total, current round) plus any `user`-origin metrics you
enter. These are persisted as **WorkoutResults** in the `results` store. The clock UI
lives in `src/clock/**` and the runtime overlays in `src/components/Editor/overlays/**`
(e.g. `RuntimeTimerPanel`, `FullscreenTimer`).

## 7.3 ANALYZE — review and derive insight

| Screen | Route | What it does |
|--------|-------|--------------|
| **Review** | `/review/:runtimeId` | Post-session review of a completed run: timeline, per-segment results, and the analytics metrics derived from them. |
| **Review grid** | `src/components/review-grid/**` | A sortable/filterable grid of results with search, sort, graph toggle, row selection. |
| **Journal** | `/journal`, `/journal/:id` | Date-organized history of sessions; the long-term trend surface. |

This phase runs the **AnalyticsEngine** over the OutputStatements to produce
`analyzed`-origin compound metrics (volume, pace, power, MET-minutes, session-load,
TIS — doc 08), then charts/queries them.

## 7.4 Supporting / cross-cutting screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Home | `/` | Landing |
| Import (zip) | `/load`, `/load/journal`, `/load/journal/:date` | Import a workout/journal entry encoded in a URL |
| Guides | `/guide/getting-started`, `/guide/syntax` | In-app help |
| Cast receiver | `playground/receiver-rpc.html`, `tv/` | Chromecast/TV display of the live timer |
| Not found | `*` | 404 |

The command palette (`src/components/command-palette/**`, opened with the search
action) provides quick navigation and actions across all of the above.

---

## 7.5 Persistence model (IndexedDB)

All durable state lives in IndexedDB via `src/services/db/IndexedDBService.ts`. The
schema (object stores and their indexes) is the storage-level reflection of the
domain:

| Store | Key | Indexes | Holds |
|-------|-----|---------|-------|
| `notes` | `id` | `by-updated`, `by-target-date` | The Markdown workout/journal notes (the **plan**) |
| `segments` | `[id, version]` | `by-note`, `by-type` | Versioned structural slices of a note |
| `results` | `id` | `by-segment`, `by-note`, `by-completed` | **WorkoutResults** from tracking (the **reality**) |
| `attachments` | `id` | `by-note`, `by-time` | Files attached to a note |
| `analytics` | `id` | `by-type`, `by-segment`, `by-result` | Persisted **analyzed** metrics (the **insight**) |
| `efforts` | `slug` | `by-discipline`, `by-source` | The effort registry (`IEffort` records) |

Notice the three workflow phases map directly onto stores: `notes` (plan) →
`results` (track) → `analytics` (analyze), with `efforts` as the shared reference data
that links tracked work to physiological coefficients.

---

## 7.6 The loop closes

Analyzed results feed back into the **Journal**, which informs the next **Plan** — so
the application is a continuous plan → track → analyze → re-plan cycle, all expressed in
one metric model.

➡ The analytics math: [08 — Analytics](./08-analytics.md).
