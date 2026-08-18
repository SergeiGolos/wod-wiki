# 958 — Extraction Plan: @bitcobblers/wod-wiki-ui (CodeMirror extensions + WQL widgets)

Wayfinder ticket [#958](https://github.com/SergeiGolos/wod-wiki/issues/958) · map
[#953](https://github.com/SergeiGolos/wod-wiki/issues/953). Inputs locked: #954
(peer-dep contract), #955 (IR datasets), #957 (lang/wql + carry-forwards S1/S3),
#956 (pack API). #959 consumes this package for the Storybook workbench.

## 1. Module inventory (grounded)

### Moves as-is — the dumb widgets (verified: type-only `QueryResult`/`Series` imports)
`src/components/molecules/analytics/`: `WidgetChart`, `WidgetFrame`, `QueryValue`,
`WqlTimeseries`, `WqlBars`, `WqlTable`, `TopList`, `StackedBar`, `GoalRings`,
`ZoneDistribution`, `WqlEmptyState`, `useChartShape`, `chartData`, `chartPalette`,
`RangeSelector` — the type imports re-point to `@bitcobblers/wod-wiki-wql`; behavior untouched.
They already satisfy the requirement: **IR file payloads and IndexedDB query
results are the same shape**, so these components render fixtures exactly as they
render live data.

### Moves with seam work — the orchestrators
| File | Tangle (located) | Seam |
|---|---|---|
| `DashboardView.tsx` | `queryService` singleton (`:3,137`) + `ensureStoreRollupFacts` (`:4`) | **U1/U2** |
| `useAnalyticsQueries.ts` | `queryService` singleton + `ensureStoreRollupFacts` (`:2-3,42`) | **U1/U2** |
| `QueryBlockView.tsx` | `queryService` (`:11-19`) + `onResultSaved` from resultRecorder (`:31`) | **U1/U3** |
| `useAnalyticsUnitPreference.tsx` | `localStorage` (`wod.analytics.unit` key) | **U4** |
| `RowsTable.tsx` | `getAnalyticsFromLogs` (`:15`) + app organism `ReviewGrid` (`:16`) | **U5** |

### Moves — editor extensions + blocks + composer
- `src/components/Editor/extensions/**` (19 extensions + tests) → ui. Two app couplings found: `link-open.ts` (`workbenchEventBus` from `@/hooks/useBrowserServices`, `:18`) → **U6**; `whiteboard-linter.ts` (`whiteboardScriptLanguage` via `@/hooks/useRuntimeParser`, `:15`) → **U7**.
- `src/components/Editor/blocks/`: `QueryBlockView`, `RowsResultsChrome`, `WqlQueryInspectorModal` → ui (**U3** on QueryBlockView).
- `src/components/organisms/wql-composer/` (`WqlComposer`, `WqlDiagnosticsStrip`) → ui — self-contained, the inspector's engine.
- From #957 S1: the position-aware `EditorState` functions (`extractSyntaxFacts`, `syntax-parser.ts`) land in ui — linter/autocomplete need doc positions; the string-in parse seam stays in lang.

### Addendum to #957's inventory
`src/services/AnalyticsTransformer.ts` (log→segment derivation) is pure lang-side
code (imports core models, `getHints`, runtime contracts, `INowProvider` only) —
missed by the services sweep; moves to **lang**. Only ui consumer: `RowsTable`.

### Stays in wod-wiki
`ReviewGrid` (review-workflow organism), `useBrowserServices`/`workbenchEventBus`,
the full `WodWiki` editor shell (app chrome), `resultRecorder`, IndexedDB store
adapters, the rollup driver trigger (#957 S5).

## 2. Seams

- **U1 QueryExecutor injection** (the map's "no backend in Storybook" requirement):
  ui never imports the `queryService` singleton. Orchestrators take an injected
  executor — `interface QueryExecutor { runQuery; runFind; runRows }` (types from
  wql). Hosts: app factory (IndexedDB stores per #957 S3), Storybook (#959,
  in-memory stores over IR corpora). This is the ui-side mirror of S3.
- **U2 Rollup trigger → host**: `ensureStoreRollupFacts` moves out of the
  components; the app host calls it on analytics-surface open (math already in
  lang per #957 S5).
- **U3 Results-recorder hook → prop**: `QueryBlockView` drops the `onResultSaved`
  import for an optional `onResultSaved?: (result) => void` callback; the app
  wires it to `resultRecorder`.
- **U4 Unit preference storage injectable**: `useAnalyticsUnitPreference` takes a
  `Storage` (default: in-memory); app passes `window.localStorage` — keeps the
  key name stable.
- **U5 RowsTable × ReviewGrid**: `RowsTable` accepts a segment-grid renderer prop
  (`renderSegments?: (segments: Segment[]) => ReactNode`); default = plain table
  rows. App passes the `ReviewGrid` composition; Storybook uses the default.
- **U6 link-open navigation**: a CM `Facet<NavigationHook>` (open-url callback);
  the app supplies the workbench bus; default = `window.open`.
- **U7 Linter language import**: re-point to `@bitcobblers/wod-wiki-lang`'s
  `whiteboardScriptLanguage`; the `useRuntimeParser` indirection dies for this path.
- **U8 Tailwind v4 token contract**: ui ships TSX source (not compiled CSS);
  consumers add `@source "../node_modules/@bitcobblers/wod-wiki-ui"` to their Tailwind entry.
  Document the required CSS custom-property tokens (`--border`, `--card`, …) —
  the app already defines them; Storybook defines them in its preview.
- **U9 `editorPreset(dialect)` export**: assembles CM extensions (language +
  lint + autocomplete + previews) into an EditorView config so Storybook (#959)
  and hosts get a live editor without the app's full editor shell.

## 3. Package shape

`@bitcobblers/wod-wiki-ui` — exports map: `.` (widgets + orchestrators + composer),
`./extensions` (CM extensions + `editorPreset` + facets). Peer deps: `react`,
`react-dom`, `@codemirror/*`, `@lezer/*`, `recharts`, `lucide-react` (all
already shipped by the app — zero new instances, per #954's singleton contract).
Regular deps: `clsx`, `tailwind-merge` (tiny utils, vendored via deps).
Depends on: `@bitcobblers/wod-wiki-core`, `@bitcobblers/wod-wiki-lang`, `@bitcobblers/wod-wiki-wql`.

## 4. Mechanics & verification

1. `git filter-repo` the inventory paths (per #954); land after lang/wql (#957 order).
2. Cut U1–U9 in-repo *first* where cheap (U3/U4/U6 are small; doing them in
   wod-wiki pre-move shrinks the extraction diff) — or at move time; either way
   the gates below are the proof.
3. **Gates:** (a) package builds + widget tests port green under Vitest;
   (b) CI lint asserts **zero** `@/services|indexedDB|localStorage` module-graph
   imports in `packages/ui/src` (U1–U4 proven mechanically); (c) every widget
   renders identically from an IR fixture prop as from a live query result
   (same corpus, #955 catalog — the parity contract #959 automates);
   (d) wod-wiki still compiles against the moved types via `@bitcobblers/wod-wiki-wql` re-exports.

**Carry-forward:** #959 consumes `editorPreset` (live editor), the in-memory
QueryExecutor over IR corpora (fixture parity), and `registerLanguagePack`
runtime switching; #960 wires the app-side executor factory + rollup trigger +
`onResultSaved` callback + `@source` directive.
