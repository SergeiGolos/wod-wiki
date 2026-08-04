# WOD Wiki — Domain Context

The shared language for parsing, executing, and analyzing workouts written as Markdown.
Terms here are the canonical names; prefer them over the listed aliases.

## Language

### Statement & metrics

**Metric**:
A typed, origin-stamped fact about a workout — the atomic currency of the system. Plan,
reality, and insight are all expressed as Metrics, differentiated by **Origin** and type.
_Avoid_: fragment (legacy), measurement, datapoint.

**Statement**:
One structural node of a parsed workout (`CodeStatement`). A `wod` (or `whiteboard` aliased) block parses into a
tree of Statements; each owns a metric collection.
_Avoid_: node, line, fragment.

**Origin**:
The stage that produced a Metric: `parser`, `dialect`, `compiler`, `runtime`, `user`,
`analyzed`, `prediction`. Drives precedence (which Metric wins for display).
- `prediction` (code today: `analyzed-estimated`): a derived value computed with
  fallback/assumed inputs — unresolved effort, unknown VO2max, etc. An estimate, not a
  confirmed derivation. **Read-only in replay**: preserved as recorded, never re-derived
  (a recorded workout's predictions are frozen at recording time).
_Avoid_: source, producer (ambiguous). estimate, guess (use **prediction**).
> Note: the code emits several origins not yet listed here (`execution`, `user-plan`,
> `collected`, `hinted`); the glossary lags the code and should be reconciled separately.

**Ownership Layer**:
The five-tier resolution key the metric ownership ledger uses to decide visibility:
`parser → dialect → user-plan → runtime → user-entry` (low→high). Distinct from
**Origin**, which carries finer producer detail.
_Avoid_: precedence tier, rank (use when describing the numeric form only).

**Hint**:
A semantic marker emitted by a **Dialect** or the parser, expressed as a
`MetricType.Hint` metric whose value is a dot-namespaced string (`workout.amrap`,
`behavior.required_timer`). Read with `hasHint` / `getHints`. Hints flow through the
single metric channel but are excluded from display, block fragments, and labels.
_Avoid_: tag, flag, semantic token. **Never** a `Set<string>` side-channel (removed).

**Suppressor**:
A Metric carrying `action: 'suppress'`, instructing the ownership ledger to hide all
Metrics of its type. The only live `MetricAction`.
_Avoid_: hidden metric, override.

### Units of measurement

**Unit**:
A recognized measurement token (`kg`, `m`, `mile`, `cal`, `pood`) with a canonical
spelling and a set of acronyms/aliases (`lb`/`lbs`/`pound`). Units are **not** a parser
concept — the parser emits bare Number and Text; a **Dialect** identifies them.
_Avoid_: suffix, measure.

**Dimension**:
The physical quantity a **Unit** measures: `length`, `mass`, `energy`, `count`, `time`.
Drives which Metric a fused number+unit becomes (length→Distance, mass→Resistance…).
_Avoid_: category, kind, unit type.

**Unit Registry**:
The core catalog (`src/core/metrics/units/`) of every base **Unit**, its **Dimension**,
and its aliases. Pure, importable data + lookup. **Dialects import unit sets from it**;
the parser never touches it.
_Avoid_: unit table, unit map, lexicon.

**Fusion**:
The rewrite that turns an adjacent bare Number + Text (`Rep(100)` + `Effort("m Run")`)
into a dimensioned Metric + residual Effort (`Distance(100, m)` + `Effort("Run")`),
driven by a **Unit Registry** set. Logic lives in one shared pass; *which* units it
recognizes is a **Dialect** choice.
_Avoid_: merge (overloaded), parsing.

**Choice Group**:
A single `MetricType.Choice` Metric (`ChoiceGroupMetric`) emitted by **Fusion** when
a slash (`/`) separates two homogeneous alternatives of the **same** Metric type
(e.g. `185/125 lb` → two `Resistance` options; `Run/Walk` → two `Effort` options).
Carries `alternatives: IMetric[]` at `origin: 'parser'`. Slash between *different*
Metric types is silently dropped — no Choice Group is emitted.
Resolved in the **Pre-Run Wizard** before the JIT compiles: the user picks one
alternative (first is pre-selected); the chosen metric is written at `origin:
'user-plan'` into the same Statement's `MetricContainer`, shadowing the group.
Never surfaces in compiled Blocks or display output once resolved.
_Avoid_: slash metric, OR metric, option group.

**Choice Collapse**:
The act of writing a **Choice Group**'s selected alternative back into its Statement
at `origin: 'user-plan'`, owned solely by `ChoiceResolution`
(`src/runtime/compiler/metrics/ChoiceResolution.ts`). Idempotent — re-selecting
replaces the prior user-plan pick rather than accumulating. Two seams drive it: the
**Pre-Run Wizard** (user selection, via the `resolveChoiceSelection` hooks facade)
and `RuntimeFactory.createRuntime`, which calls `collapseUnresolvedChoices` as the
enforced safety net — defaulting any still-unresolved group to its first alternative
**before the runtime spins up its first Block**, so a `MetricType.Choice` can never
reach a compiled Block on any entry point.
_Avoid_: resolve (overloaded with ownership resolution), pick.
### Persistence & storage
**Storage**:
The raw per-store layer below Persistence. A typed interface (`IStorage`,
`src/services/storage/IStorage.ts`) with operations keyed by **Store Name**
(`notes`, `segments`, `results`, `attachments`, `analytics`, `efforts`):
`readonly(store).get/getAll/getAllFromIndex`, `readwrite(store).put/delete`,
and `transaction(stores)` for cross-store atomic work. The interface is
parameterized by store name so callers and tests cross the same seam
without knowing which engine backs it. Schema (stores, key paths, indexes)
lives in the **Storage Adapter**, not the interface.
_Avoid_: database, table, repository (in the data-access sense).
**Storage Adapter**:
A concrete `IStorage` implementation. Two adapters ship in-tree:
`IndexedDBStorage` (production, over `idb`) and `InMemoryStorage` (test
default, pure `Map`-backed). Adapters own the schema, the open/close
lifecycle, and the per-store keying rule. Tests construct a fresh
`InMemoryStorage` per case — no IndexedDB globals, no `fake-indexeddb`,
no shared state.
_Avoid_: backend, store implementation, persistence impl.
**Persistence**:
The domain layer above Storage. `IndexedDBNotePersistence` exposes
`getNote / listNotes / mutateNote / deleteNote` for the Note
domain; it depends on the `NotePersistenceStorage` interface, which the
Storage layer satisfies. Persistence adapters compose raw **Storage**
calls into domain operations (latest-version lookup, cascade delete,
analytics write) — they do not embed engine specifics.
_Avoid_: data layer, store (overloaded).
### Analytics
**Canonical Metric Key**:
The join dimension for cross-workout analysis — the one key two workouts must share for a metric to be compared across them. A defined family/aggregate vocabulary (`reps`, `distance`, `resistance`, `elapsed`, `power`, `pace`, `totalVolume`, `totalDistance`, `tis`, `<effortSlug>.<family>`, `calc.<target>`), allocated in `docs/analytics-data-shapes-and-composition.md` §5. One resolver maps each metric to its canonical key; display derives a human label from it. **Not** the raw `MetricType` and **not** a display string — `repetitions` is retired as a key.
_Avoid_: metric type (the parser/runtime enum), display label, metric name.
**Annotation**:
A runtime-derived per-segment metric produced by a realtime processor (`origin: 'analyzed'` — power, pace). Distinct from **Prediction** (compile-time, `origin: 'prediction'`/`compiler`) and from summary aggregates. Re-derived on replay; predictions and Tier-0 metrics are preserved.
_Avoid_: enrichment, derived metric (too vague — say annotation or prediction).
**Analytics Store**:
The cross-workout query table (the `analytics` store). Holds fact rows at three **grains**: `summary` (Tier 2 workout-level aggregates — `totalVolume`, `tis`, `sessionLoad`, …, one row per result × **Canonical Metric Key** + sorted group tags, keep-last dedupe within a result), `rollup` (windowed per-point facts — ACWR, monotony, strain), and `segment` (per-segment numeric metrics, denormalized since V13 for indexed cross-workout threshold filters). Across all grains, `WorkoutResult.data.logs` stays authoritative for a single workout; the store is disposable and re-derivable — if store and logs disagree, logs win. Tier-2 facts feed in by **extracting `outputType: 'analytics'` statements from `data.logs`** — there is no separate `data.analytics` property on `WorkoutResults`.
_Avoid_: analytics table, metrics store, denormalized logs.
**WQL (Wod Query Language)**:
The Datadog-flavored query language for cross-workout analytics:
`<aggregator>:<metric.namespace>{<tag filters>} by {<dimensions>} .rollup(<period>`.
Parsed with a Lezer grammar (house pattern) and executed by the **Query Service**
over the **Analytics Store**. Metric namespaces build on **Canonical Metric Keys**.
_Avoid_: query string, analytics SQL.
**Tag**:
A `key:value` dimension carried on an **Analytics Store** fact row (`effort`,
`discipline`, `note`, …) that **WQL** filters and groups by. Tags are query-time
dimensions riding on fact rows — they never enter the `IMetric` stream.
A WQL filter key takes multiple values (`{note:a|b}` or repeated `note:a, note:b`)
— values OR within a key, keys AND across, `!` negates the whole list.
Distinct from markdown `tags:` frontmatter, which feeds the note_tags store.
_Avoid_: label, facet, frontmatter tag.
**Query Service**:
The executor of **WQL** against the **Analytics Store**: index-first SELECT
(by-metric + by-timestamp range fetches intersected in memory), then in-memory
BUCKET / AGGREGATE / GROUP. Inputs uncapped at personal-journal scale; widgets
and tables are dumb consumers of its results.
_Avoid_: analytics API, query backend.
**Rollup Fact**:
An **Analytics Store** fact row at `grain: 'rollup'` — a windowed aggregate
(ACWR, monotony, strain) computed lazily on analytics-surface open by the rollup
driver and persisted so widgets stay dumb queries. Recompute-on-open only; there
is no scheduler.
_Avoid_: materialized view, cron aggregate.
**Discipline & Discipline Factor**:
The canonical 10-value effort discipline vocabulary (`bodyweight`, `cycling`, `gymnastics`, `kettlebell`, `recovery`, `rowing`, `running`, `strength`, `swimming`, `walking`), defined in `src/effort-registry/disciplines.ts`. Serves as the single source of truth for the effort resolver, fact-row tags, WQL tag dictionary, UI filters, and the TIS discipline multiplier (loaded modalities 1.2, recovery 0.9, monostructural & bodyweight 1.0 default).
_Avoid_: modality (overloaded), exercise category, legacy factor tables.
### Dialect & runtime
**Block Dialect**:
The fence tag that declares a block's domain (` ```time `, ` ```climb `) — the one
property that parser and analytics key on (the runtime never reads the tag — it is
shaped indirectly via the hints the **Dialect Stack** produces, so there is no
tag-keyed strategy seam). Selects dialect-specific
overrides for a block; the universal defaults (base **Dialect Stack**, default
grammar, default analytics) always run underneath. A Block Dialect overrides; it
does not replace — no override for a concern means the default applies.
Each Block Dialect declares its own fence tags and aliases (`wod` → `wod`,
`whiteboard`); the registered set is the single source of truth for which fences
the parser treats as runnable — there is no closed enum of dialects.
_Avoid_: fence flavor, language tag, code-language.

**Dialect**:
A composable analyzer (`IDialect`) that recognizes a domain's patterns (CrossFit,
Cardio, Yoga…), contributes a **Unit** set, and emits **Hint** markers plus
domain-specific Metrics. Dialects never execute.
_Avoid_: parser plugin, ruleset.

**Dialect Stack**:
The ordered list of configured Dialects (`1..n`) each line is processed through, in
order: a base **Units Dialect** first, then sport Dialects that compute *expecting*
fused units, then a personal-overrides Dialect last. Later Dialects observe earlier
**Strategy**:
A priority-ranked compiler rule (`IRuntimeBlockStrategy`) that decides which
**Behaviors** a runtime block receives.
_Avoid_: rule, handler.

**Behavior**:
A composable capability (`IRuntimeBehavior`) attached to a runtime block (timing,
rounds, sound, reporting).
_Avoid_: component, aspect (legacy in code), plugin.

**Block**:
A runtime execution unit (`IRuntimeBlock`) compiled from one or more Statements.
_Avoid_: node, step.

### Cast (sender-side)

**Cast Backend**:
The module that turns "user wants to cast" into a connected `IRpcTransport`.
Defined by the `ICastBackend` port. Two adapters ship: `ChromecastBackend`
(production; native device picker + WebRTC over the Cast message channel) and
`LocalTabBackend` (dev / dual-pane preview; opens a popup tab and uses a
`MessageChannel` over `BroadcastChannel` rendezvous). The factory
`getCastBackend()` returns the build's adapter based on `VITE_CAST_BACKEND`.
_Avoid_: cast manager, cast service, cast adapter (in conversation prefer
"the chromecast adapter" or "the local adapter" — they're both Cast Backends).

**Cast Backend Kind**:
The build-time string (`chromecast` | `local` | `auto`) that the factory
reads from `VITE_CAST_BACKEND`. `'auto'` resolves at runtime: `chromecast` in
production-like builds (`MODE === 'production'`), `local` in dev. Release
workflows set the value explicitly; dev workflows can leave it unset.
_Avoid_: cast mode, cast variant.

### Workbench

**Workbench Session**:
The coherent state of the workout-editing session the workbench holds: the open
note's content and parsed document, the active view, the selected block, the
running workout's runtime and execution, the accumulated analytics, the
results, and the actions on them. One module (`workbenchSessionStore`);
exercisable without React. Persistence and loads go through injected
**Persistence** / **Storage Adapter** collaborators; selection and view changes
emit navigation intents through an injected callback. The runtime instance is
hydrated from a **Workbench Effect** (it owns a `dispose()` lifecycle and cannot
live in a plain store); analytics and active segments are derived reactively from
the runtime's **output + stack observer seams** while a runtime is mounted, and
from persisted logs otherwise — so the live and fallback paths share one
derivation. The runtime is *driven* by execution controls in a Workbench Effect,
not by the session; the session only observes it.
_Avoid_: workbench context, workbench store (legacy split names).

**Workbench Effect**:
A renderless React adapter whose only job is the genuinely lifecycle-bound work
a plain store cannot own: runtime create/dispose, wake-lock, before-unload
guards, unmount reset, and reading route params into the **Workbench Session**.
Generalizes the cast "Bridge" pattern. Today `useWorkbenchEffects`,
`WorkbenchCastBridge`, `EditorCastBridge` are Workbench Effects; after the
Workbench Session deepening, one thin effect replaces the hydration + bridge
work and the rest dissolve into the session store.
_Avoid_: bridge (cast-specific legacy), effects hook (too generic).

### Identity & result recording

**Note Identity (NoteRef)**:
A typed, routable reference to a note — `{ kind: 'journal' | 'playground' | 'workout'; id; raw }`. A note's canonical storage identity is its **UUID** (`Note.id`); that UUID is what **Blocks**, **WorkoutResults**, and cross-note references point to. `raw` is the **Slug** — routing sugar resolved to the UUID on load, never the storage or join key. `parseNoteId` / `noteRefToPath` are the single home for the composite-id parse and the kind→route rule.
_Avoid_: note id (overloaded), note ref (informal).
`playground/src/lib/noteIdentity.ts` — `parseNoteId`, `noteRefToPath`.

**Slug**:
The routing-sugar string for a **Note** (`journal/2024-01-15`, a collection id) — what appears in the URL and what a user types. Distinct from the note's **UUID**: the slug resolves to the UUID on load and is never a storage or join key.
_Avoid_: url, path, route id (overloaded — a route resolves *to* the UUID; it isn't the id).

**Block Content Id**:
A content-stable identity for a **Block** — a hash of its normalized fenced content, independent of where the block sits in the document. Unlike the line-embedded section id, it survives clone / reorder / edit-above, so results keyed by it stay linked to the right workout even when the block moves. Carried as `contentId` on **ScriptBlock** / **Section** and as `blockContentId` on **WorkoutResult**; the line-based `sectionId` is retained as a legacy fallback join key. Minted in **both** section-building paths (the editor's `section-state` and the persistence `sectionParser`) via one `blockContentId()` function, so a live block and its persisted clone share an id. Two blocks with identical content share an id by design (same workout → shared history, scoped per note).
_Avoid_: content hash (implementation detail), stable id (ambiguous).
`src/components/Editor/utils/sectionParser.ts` — `blockContentId`.

**Catalog**:
Bundled, read-only workout seed-data a user loads into their own notes. A block cloned from a Catalog shares its **Block Content Id** with the source (identical content → identical hash), so the same workout run across different notes and days is one identity, not many. A Catalog exposes two flavors of item: **Session** (undated, named — e.g. "Fran" inside the "CrossFit Girls" Catalog) and **Post** (dated, e.g. "2026-01-15 Morining" inside the dated posts Catalog). Distinct from a **Note**, which the user owns and edits.
_Avoid_: bundle, library, pack, collection (legacy), feed (legacy).

**Library**:
The unified `/library` route that lists **Entries** across all three kinds (Notes + Sessions + Posts) in a single date-windowed surface built on the Journal's layout, with a search panel that exposes source toggles, free-text, and the full WQL composer. **Replaces the three LIST routes** (`/journal`, `/collections`, `/feeds`) — the Library becomes the single entry point for browsing your training. The deep detail routes (`/journal/:date`, `/journal/:date/:uuid`, `/journal/:identity`, `/collections/:cat`, `/collections/:cat/:workout`, `/feeds/:feedSlug`, `/feeds/:feedSlug/:date/:item`) **survive unchanged** as direct links into a specific Entry; the Library's *Open* row action routes Notes to `/journal/:date`, Sessions to `/collections/:cat/:workout`, Posts to `/feeds/:feedSlug/:date/:item`. Nav label and document title: `Library` (`Wod.Wiki - Library`).
_Avoid_: content library, library page.

**Entry**:
One row in the Library — the unified concept that abstracts a journal **Note**, a Catalog **Session**, and a Catalog **Post**. Identity = `{ source.catalog, source.item }`; kind = `Note | Session | Post`; carries title, optional **Date**, **Block Content Id**, and row actions (Open / Add to today / Run / Compare). A workout that exists in multiple sources lists as one Entry per source (a Session and a Post on the same date are two distinct Entries).
_Avoid_: content item, library row, search result.

**Session**:
One named, undated workout inside a Catalog — a hard-set workout you can clone into your own journal (e.g. "Fran" in "CrossFit Girls"). Source: `{ catalog: <catalog id>, item: <session id> }`. No Date. An Add-to-today row action clones it into today's journal Note.
_Avoid_: collection item (legacy), feed item (legacy), drill, standard, prescription.

**Post**:
One dated workout entry inside the dated posts Catalog (e.g. "2026-01-15 Morining"). Source: `{ catalog: <YYYY-MM-DD>, item: <post id> }`. Carries a Date. Distinct from a Session only by being dated and posting-context.
_Avoid_: feed item (legacy), post item.

**Grouping**:
A bundled markdown directory of workout items under one slug
(`markdown/collections/{slug}/` or `markdown/feeds/{slug}/`), loaded by
`src/repositories/script-groupings.ts`. A **Catalog** is a Grouping whose items carry either named sessions (Collections) or dated posts (Feeds); the two flavors share the Grouping machinery but diverge in item shape and sort order. The public adapters (`script-collections.ts`, `script-feeds.ts`) own item shape and sort order; the Grouping module owns file discovery and display-name derivation.
_Avoid_: loader, bundle directory.

**Result Recorder**:
The single playground seam for persisting a **WorkoutResult**. Owns identity resolution (noteId from a **Note Identity**, blockContentId from the run block, sectionId resolved against the destination note's blocks) and the write — replacing the per-page ad-hoc `saveResult` / `mutateNote` calls that each re-derived identity from scratch. Built by `createResultRecorder(sink)` (testable with an in-memory sink); `playgroundRecorder` is the production instance over the **Storage** `results` store.
_Avoid_: result service, result saver (too generic).
`playground/src/services/resultRecorder.ts`.

**WQL Composer Panel**:
The Library's sticky search header (component `WqlComposerPanel`) that composes a WQL query from three categories of controls: (a) three **Source Tri-State Toggles** (Note / Session / Post), each cycling `neutral → include-only → hide → neutral` with **at most one source in `include-only` at a time**; (b) a free-text input that emits `{text:<q>}` substring filter; (c) a Datadog-style time-range selector (presets `last 1d / 3d / 1w / 2w / 4w / 12w / 26w / 52w` plus a **Custom** range). Plus an `+ Add filter` menu that emits additional WQL filter chips (catalog, tag, effort, discipline). The panel renders a live preview of the resulting WQL string. The hand-edited raw composer is a separate, debug-gated field; when visible (under `useDebugMode()`), it round-trips with the panel state — the WQL string is parsed back into the toggles, time range, and filter chips on every edit, and any toggle edit re-emits the string. Distinct from the Analytics Explorer's existing `parseQuery` editor — the panel is content-query-only.
_Avoid_: search box, query input, filter bar.

**WQL Source Filter**:
The `source:` filter key in content-discovery WQL (e.g. `find:block{!source:feed} in all`), introduced for the **WQL Composer Panel**. Values: `journal`, `collection`, `feed`, or a specific catalog id (`collection:crossfit-girls`, `feed:crossfit-programming`). Maps onto the existing `sourceId` field on **Note** and **BlockIndexRow** rows. Negation (`!source:feed`) excludes that source from the result set. Distinct from `in <scope>`, which picks a *primary* scope; the source filter is a *fine-grained* inclusion/exclusion layered on top. The two compose: e.g. `find:block{!source:feed} in journal` means "look in journal, then drop anything tagged feed". Wired through `QueryService.runFind` and `runFindBlock` (which today already key off `sourceId.startsWith('collection:' / 'feed:')`).
_Avoid_: catalog filter (the source filter *subsumes* catalog filtering — `source:collection:crossfit-girls` is the form), tag-source.

**WQL Time Range Parameter**:
The structured `{start, end}` time window passed alongside a WQL string to the **Query Service** (rather than embedded in the WQL as `last <n>w` / `from <date> to <date>`). The grammar accepts only relative `last <n>w|d`; the panel's **Custom** range produces absolute dates, which are passed as the structured parameter and combined with the WQL's scope/filter clauses. The WQL string the panel composes is a *partial* query (scope + filters); the host that calls the query service merges in the time range from the parameter. Presets are computed client-side and passed identically.
_Avoid_: embedded time range (the parameter is the form; `last <n>w` is only a shortcut that the parser expands).

A block cloned from a **Catalog** (Session or Post) shares its **Block Content Id** with the
source, so results for the same workout aggregate across notes by content id.

- An **Entry**'s `source` identifies the catalog it belongs to — `{ catalog: <catalog id>, item: <item id> }`. A Journal note's Entry uses `catalog: 'journal'`; a Post uses `catalog: <YYYY-MM-DD>`. Two Entries share a **Block Content Id** when they reference the same workout across different sources; the Library does NOT dedupe across sources.
- A **Statement** owns many **Metrics**; each Metric has exactly one **Origin**.
- An **Origin** maps to exactly one **Ownership Layer**.
- A **Dialect** emits **Hint** Metrics (and domain Metrics) onto a **Statement**.
- A **Strategy** assigns **Behaviors** to a **Block** compiled from **Statements**.
- A **Hint** is a **Metric** (type `Hint`); it is never a separate channel.
- A **Unit** belongs to one **Dimension**; the **Unit Registry** is its catalog.
- A **Dialect** imports a **Unit** set from the **Unit Registry** and **Fusion**
  applies it; the **Dialect Stack** composes these sets in order (later wins).
- The parser is **Unit**-free: it emits bare Number + Text; **Fusion** (a Dialect
  concern) turns them into dimensioned Metrics.
- A block cloned from a **Collection** shares its **Block Content Id** with the
  source, so results for the same workout aggregate across notes by content id.

## Example dialogue

- A **Dialect** imports a **Unit** set from the **Unit Registry** and **Fusion**
  applies it; the **Dialect Stack** composes these sets in order (later wins).
- The parser is **Unit**-free: it emits bare Number + Text; **Fusion** (a Dialect
  concern) turns them into dimensioned Metrics.
- A **Storage Adapter** satisfies **Storage** for one engine; **Persistence**
  composes **Storage** calls into domain operations; domain code depends on
  **Persistence**, not on a concrete adapter.

## CI/CD

- **Environment seam** — the composite action `.github/actions/setup-env`.
  The single module behind "a ready CI runner": Bun version, dependency
  cache (keyed on `bun.lock`), and the Playwright browser cache. Every job
  declares `browsers:` ('chromium' | 'all' | ''); no job installs anything
  directly.
- **PR pipeline** — `pull-request.yml`. The one graph per MR update:
  `slug → verify (unit/story/coverage + deploy-shaped build gate + journal
  e2e) → preview (downloads verify's `playground-dist` artifact, adds
  receiver + storybook, syncs S3) → e2e (deployed-artifact e2e in
  `preview-e2e.yml`, gated on the preview **build fingerprint**) → destroy
  (on close)`. The deployed-artifact e2e publishes its Playwright HTML
  report to `s3://<bucket>/<slug>/e2e-report/` — browsable at
  `https://<slug>.e2e.wod.wiki` and linked from the job's step summary and
  the PR preview comment.
- **Main pipeline** — `main.yml`. The one graph per merge:
  `verify (no e2e, no smoke build) → release (Pages + tag + smoke e2e)` and
  `verify → site (S3 deploy) → e2e (deployed-artifact e2e in
  `preview-e2e.yml`, gated on the site's **build fingerprint**)`. Exactly
  one e2e run (deployed-artifact).
- **Build fingerprint** — the hashed entry-bundle name (`main-<hash>.js`)
  emitted by a build job. The deployed-artifact e2e waits until the live
  `index.html` references it, so tests never race a stale CloudFront cache.
- npm publication is gated behind the `NPM_PUBLISH_ENABLED` repo var
  (WOD-436); the library build and its artifact exist only when it is set.