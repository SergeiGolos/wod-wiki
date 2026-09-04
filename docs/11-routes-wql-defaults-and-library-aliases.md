# Routes, WQL Defaults, and Library Route Aliases

**Status**: SPECIFICATION & ARCHITECTURAL PROPOSAL  
**Date**: 2026-09-02  
**Context**: Monorepo packages (`@bitcobblers/wod-wiki-engine`, `@bitcobblers/wod-wiki-wql`, `@bitcobblers/wod-wiki-ui`) and `apps/playground`. Builds on [WQL Deep Dive (09-wql-deep-dive.md)](09-wql-deep-dive.md), [WQL Composition Style (10-wql-composition-style.md)](10-wql-composition-style.md), and [Screens and Workflow (07-screens-and-workflow.md)](07-screens-and-workflow.md).

---

## 1. Overview & Objectives

In WOD Wiki, the **Whiteboard Query Language (WQL)** serves as the unified data access and exploration plane across training logs, curated collections, community feeds, exercise registries, and analytical telemetry. 

Currently, several routes load or redirect into WQL queries:
1. **The Library (`/library`)** serves as the unified content discovery surface, but legacy routes (`/journal`, `/collections`, `/feeds`) currently execute HTTP-level client-side redirects to `/library?note=...&session=...&post=...`, which an adapter then normalizes into WQL queries (`find:note{source:...}`).
2. **The Explorer & Dashboard (`/dashboard`)** provides multi-family exploration (aggregates, discovery, and raw rows) defaulting to volume trends.
3. **Efforts (`/efforts`)** operates on the effort catalog plane defaulting to `find:effort`.
4. **Home (`/`)** showcases live analytical queries illustrating training volume, intensity, and consistency.
5. **Retired review routes (`/review/:runtimeId`, `/note/:noteId/review`)** redirect to `/dashboard` with row queries (`rows:{result:...}`).

This document specifies:
- **Part 1**: The complete, authoritative reference of all application routes, the page components they render, their default WQL queries, parameter bindings, and query execution mechanisms.
- **Part 2**: The architectural redesign to split the `/library` into clean **first-class route aliases** (`/journal`, `/collections`, `/feed` / `/feeds`, and `/library`), replacing legacy parameter rewrites with route-native WQL preloading.
- **Part 3**: Future route aliases for deep execution analytics, specifically a dedicated **Results & Segments View** (`/results`, `/results/:resultId`, `/results/segments`) powered by the WQL `rows:` query plane.
- **Part 4**: Concrete implementation blueprint across routing, state hooks, and UI adapters.

---

## 2. Complete Inventory: Routes & WQL Defaults

### 2.1 Route Matrix Summary

| Route Pattern | Page / Component | Query Family | Default WQL Query (Landing State) | URL Parameter Hydration | Engine Dispatch Method |
|---|---|---|---|---|---|
| `/library` | `LibraryPage` | `find:note` | `find:note last 2w` | `?q=<wql>` | `queryService.runFind` |
| `/journal` | Redirect → `/library` *(Current)* | `find:note` | `find:note{source:journal} last 2w` | `?note=on&session=hide&post=hide` → `?q=` | `queryService.runFind` |
| `/collections` | Redirect → `/library` *(Current)* | `find:note` | `find:note{source:collections} last 2w` | `?note=hide&session=on&post=hide` → `?q=` | `queryService.runFind` |
| `/feeds` | Redirect → `/library` *(Current)* | `find:note` | `find:note{source:feeds} last 2w` | `?note=hide&session=hide&post=on` → `?q=` | `queryService.runFind` |
| `/efforts` | `EffortsCatalogPage` | `find:effort` | `find:effort` | `?q=<wql>` (migrates legacy `?origin=&discipline=`) | `queryService.runFind` (`runFindEffort`) |
| `/dashboard` | `AnalyticsExplorerPage` | Any (`aggregate`, `find`, `rows`) | `sum:totalVolume{}` | `?q=<wql>&weeks=16` | `queryService.runQuery` or `runFind` or `runRows` |
| `/dashboard/:slug` | `DashboardViewPage` | Multiple embedded `aggregate` blocks | *Per-dashboard markdown specification* (see §2.4) | Note frontmatter & query fences | `queryService.runQuery` (via `useAnalyticsQueries`) |
| `/` (Home) | `HomeView` / `HomeAnalyticsSection` | 6 `aggregate` queries | *6 showcase queries* (see §2.5) | In-memory / live IndexedDB | `queryService.runQuery` |
| Global Palette (`Cmd+K`) | `PaletteShell` | `find:note` (+ `find:block`) | `find:note` | Transient palette input | `queryService.runFind` via `paletteExecute` |
| `/review/:runtimeId` | Redirect → `/dashboard` | `rows:all` | `rows:{result:<runtimeId>}` *(Normalizes to `rows:all`)* | Redirect destination `?q=` | `queryService.runRows` |
| `/note/:noteId/review` | Redirect → `/dashboard` | `rows:all` | `rows:{note:<noteId>}` *(Normalizes to `rows:all`)* | Redirect destination `?q=` | `queryService.runRows` |
| Note Query Fences | CodeMirror `QueryBlockView` | Any (`rows:`, `sum:`, `avg:`, etc.) | `rows:all{result:<resultId>}` (session table default) | Markdown document body | Injected `QueryExecutor` |

---

### 2.2 Content Discovery & Library Routes

#### `/library` (Unified Content Library)
- **Path Pattern**: `ROUTE_PATTERNS.library` (`/library`)
- **Primary Component**: `apps/playground/app/views/library/LibraryPage.tsx`
- **State Hook**: `useLibraryQueryState` (`apps/playground/app/hooks/useLibraryQueryState.ts`)
- **Default Query**:
  ```wql
  find:note last 2w
  ```
- **Query Target**: `note` (fetches whole notes across all catalogs/sources)
- **Search Scope Control**: Handled by `SourceScopeRadio.tsx` with four states:
  - `All` (`scope: 'all'`): emits no `source:` tag filter, searching `notes` across all storage.
  - `Collections` (`scope: 'collections'`): emits `find:note{source:collections}`.
  - `Feeds` (`scope: 'feeds'`): emits `find:note{source:feeds}`.
  - `Notes` (`scope: 'notes'`): emits `find:note{source:journal}`.
- **Full Text Search**: When text is typed in the `WqlComposer`, the query appends `{text:"<query>"}`. The execution engine simultaneously dispatches a secondary `find:block{text:"<query>"}` query to surface matching body blocks alongside note titles.
- **Time Window**: Defaults to `last 2w` (relative C1 window). Can be adjusted to `last 1w`, `last 4w`, `last 12w`, `last 52w`, or custom bounds.
- **Execution Pipeline**:
  ```ts
  const parsed = parseQuery(wql); // Validated AST
  const result = await queryService.runFind(parsed); // Note[] + BlockIndexRow[]
  const entries = result.notes.map(toEntry); // Grouped by date or shelf
  ```

#### Current Redirects: `/journal`, `/collections`, `/feeds`
Under the current `#813` implementation:
- Visiting `/journal` invokes `resolveLibraryRedirect('/journal', search)`:
  ```ts
  // routes.tsx
  { match: (p) => p === '/journal' || p === '/journal/', triState: 'note=on&session=hide&post=hide' }
  ```
  This redirects to: `/library?note=on&session=hide&post=hide`.
- `useLibraryQueryState` migrates these legacy tri-state parameters into canonical WQL:
  ```ts
  // Resulting migrated WQL:
  find:note{source:journal} last 2w
  ```
- Similarly:
  - `/collections` → `/library?note=hide&session=on&post=hide` → `find:note{source:collections} last 2w`
  - `/feeds` → `/library?note=hide&session=hide&post=on` → `find:note{source:feeds} last 2w`

---

### 2.3 Registry & Movement Routes

#### `/efforts` (Movement Registry Catalog)
- **Path Pattern**: `ROUTE_PATTERNS.efforts` (`/efforts`)
- **Primary Component**: `apps/playground/app/pages/EffortsCatalogPage.tsx`
- **State Hook**: `useEffortsComposerState` (`apps/playground/app/hooks/useEffortsComposerState.ts`)
- **Default Query**:
  ```wql
  find:effort
  ```
- **Query Target**: `effort` (queries the composite effort registry: bundled benchmarks + user custom movements).
- **Composer Configuration**: The `source` token slot is hidden because the page is strictly bound to the effort catalog.
- **Supported Filter Dimensions**:
  - `discipline:<discipline>` (`bodyweight`, `running`, `cycling`, `rowing`, `swimming`, `strength`, `kettlebell`, `gymnastics`, `recovery`, `walking`)
  - `origin:<origin>` (`bundled`, `user`, `imported`)
  - `text:<name>` (fuzzy substring matching on effort slug and aliases)
  - `intensity:<tier>` (`recovery`, `aerobic`, `threshold`, `anaerobic`, `max`)
- **Legacy Migration**: Plain-text queries (`/efforts?q=snatch`) or legacy filters (`/efforts?discipline=strength&origin=bundled`) are automatically migrated into composed WQL:
  ```wql
  find:effort{discipline:strength,origin:bundled,text:snatch} in all
  ```

---

### 2.4 Explorer & Dashboard Routes

#### `/dashboard` (Analytics Explorer)
- **Path Pattern**: `ROUTE_PATTERNS.dashboard` (`/dashboard`)
- **Legacy Aliases**: `/analytics`, `/analytics/explorer`, `/analytics/dashboard` (all 301/replace redirect to `/dashboard`).
- **Primary Component**: `apps/playground/app/views/analytics/AnalyticsExplorerPage.tsx`
- **State Hook**: `useExplorerQueryState` (`apps/playground/app/hooks/useExplorerQueryState.ts`)
- **Default Query**:
  ```wql
  sum:totalVolume{}
  ```
- **Default Range**: `16 weeks` (`?weeks=16`)
- **Engine Dispatch**:
  - If AST is `family === 'aggregate'`: dispatches `queryService.runQuery(submitted, { rangeStart, rangeEnd, preferredUnit })`.
  - If AST is `family === 'find'`: dispatches `queryService.runFind(parsed)`.
  - If AST is `family === 'rows'`: dispatches `queryService.runRows(parsed)`.

#### `/dashboard/:slug` (Prebuilt & Vault Dashboards)
- **Path Pattern**: `ROUTE_PATTERNS.dashboardView` (`/dashboard/:slug`)
- **Primary Component**: `apps/playground/app/views/dashboards/DashboardViewPage.tsx`
- **Behavior**: Resolves markdown document with frontmatter `dashboard: true` from either local vault or prebuilt bundled templates in `markdown/dashboards/`.
- **Shipped Prebuilt Dashboard Queries**:

1. **`benchmark-pr-board`** (`/dashboard/benchmark-pr-board`):
   - Scores Table: `last:elapsed{tags:benchmark} by {effort}`
   - Retest Trend: `last:elapsed{effort:fran} by {week}.rollup(1w)`
   - Work Capacity: `sum:totalReps{} by {week}.rollup(1w)`
   - Intensity Distribution: `sum:tis{} by {session}.rollup(1d)`
   - Consistency Calendar: `count:sessionLoad{} by {day}`

2. **`road-to-560-total`** (`/dashboard/road-to-560-total`):
   - Back Squat PR: `max:weight{effort:back-squat}`
   - Bench Press PR: `max:weight{effort:bench-press}`
   - Deadlift PR: `max:weight{effort:deadlift}`
   - Strength Volume Trend: `sum:totalVolume{discipline:strength} by {week}.rollup(1w)`

3. **`recovery-readiness`** (`/dashboard/recovery-readiness`):
   - Average Strain: `avg:tis{} by {week}.rollup(1w)`
   - Active Recovery Volume: `sum:sessionLoad{discipline:recovery} by {week}.rollup(1w)`

4. **`polarized-base-marathon`** (`/dashboard/polarized-base-marathon`):
   - Weekly Mileage: `sum:totalDistance{discipline:running} by {week}.rollup(1w)`
   - Zone Distribution: `sum:sessionLoad{} by {intensity}`

---

### 2.5 Home Page Showcase Queries

#### `/` (Landing Page)
- **Path Pattern**: `ROUTE_PATTERNS.home` (`/`)
- **Component**: `apps/playground/app/tour/HomeAnalyticsSection.tsx` (`HOME_ANALYTICS_QUERIES`)
- **Queries Executed**:
  1. **Reps by Effort**: `sum:totalReps{} by {effort} last 6w`
  2. **Weekly Volume (Tonnage)**: `sum:totalVolume{} by {week}.rollup(1w) last 6w`
  3. **Load by Intensity**: `sum:sessionLoad{} by {intensity}.rollup(1w) last 6w`
  4. **Strength Volume**: `sum:totalVolume{discipline:strength} by {effort} last 6w`
  5. **Average TIS Strain**: `avg:tis{} last 6w`
  6. **Total Volume**: `sum:totalVolume{} last 6w`

---

### 2.6 Global Search Palette (`Cmd+K`)

- **Trigger**: Global keyboard shortcut or header search trigger.
- **Service**: `apps/playground/app/services/wqlSearchSource.ts`
- **Default WQL Query**:
  ```wql
  find:note
  ```
- **Behavior**: Unbounded search across all notes, workouts, and collections. Dispatches dual searches:
  - `find:note{text:<query>} in all`
  - `find:block{text:<query>} in all`

---

### 2.7 Review & Results Redirects

#### `/review/:runtimeId` & `/note/:noteId/review`
- **Behavior**: Legacy review screens redirect to `/dashboard` with preselected WQL row queries:
  - `/review/:runtimeId` → `/dashboard?q=rows:{result:<runtimeId>}` (normalized to `rows:all{result:<runtimeId>}`)
  - `/note/:noteId/review` → `/dashboard?q=rows:{note:<noteId>}` (normalized to `rows:all{note:<noteId>}`)
  - `/note/:noteId/review/:sectionId/:resultId` → `/dashboard?q=rows:{result:<resultId>}`

---

## 3. Shared Component Architecture & First-Class Route Aliases

### 3.1 Design Philosophy: The Library Page as a Generalized Queriable Stream

Currently, the Library page is viewed as a single destination (`/library`) with redirects from `/journal`, `/collections`, and `/feeds`. 

Instead of having redirects and treating these destinations as legacy, **the core Library page is generalized into a shared queriable stream component** (`QueriableStreamView` / parameterized `LibraryPage`).

Each distinct route mounts this shared component with a **route-specific configuration profile**:
1. **Predefined Default WQL Query**: Seeded automatically on bare route landings without redirect hops.
2. **Unique Route Identity & URL State**: State encodes into `?q=` on the route itself (e.g. `/journal?q=...` or `/results?q=...`), keeping URLs bookmarkable, semantic, and decoupled from `/library`.
3. **Contextual Scope Lock & Identity**: Pre-selects the source or target plane (`notes`, `collections`, `feeds`, `all`, `rows`), with matching header title and subtitle.
4. **Unified Entry Parsing Pipeline**: Parses the data returned by WQL into a uniform `Entry[]` model, allowing both content-discovery queries (`find:note`, `find:block`) and execution-analytics queries (`rows:all`, `rows:segment`) to render through the same dated stream and shelf mechanics.

```
                         ┌─────────────────────────────────────────────────────────────┐
                         │           Shared Component: QueriableStreamView             │
                         │   - StickyPageHeader (Dynamic Title, Subtitle, Actions)    │
                         │   - WqlComposer (Interactive WQL Bar + Diagnostics)         │
                         │   - Dated Stream (Progressive batching, Sticky Date Groups) │
                         │   - Catalog Shelf (Undated sessions or summary cards)       │
                         └──────────────────────────────▲──────────────────────────────┘
                                                        │
         ┌───────────────────────┬──────────────────────┼───────────────────────┬────────────────────────┐
         │                       │                      │                       │                        │
   Route: /journal         Route: /collections    Route: /feeds          Route: /library          Route: /results
   Title: "Journal"        Title: "Collections"   Title: "Feeds"         Title: "Library"         Title: "Results"
   Plane: content (find)   Plane: content (find)  Plane: content (find)  Plane: content (find)    Plane: execution (rows)
   Default WQL:            Default WQL:           Default WQL:           Default WQL:             Default WQL:
   find:note{source:       find:note{source:      find:note{source:      find:note last 2w        rows:all{} last 4w
     journal} last 2w        collections} 2w        feeds} last 2w
   URL State:              URL State:             URL State:             URL State:               URL State:
   /journal?q=...          /collections?q=...     /feeds?q=...           /library?q=...           /results?q=...
```

---

### 3.2 Shared Component Specification (`LibraryPageProps` / `QueriableStreamProfile`)

The shared component receives a configuration descriptor (either injected via route props or derived via a pure helper from `location.pathname`):

```ts
export type StreamPlane = 'content' | 'rows';

export interface QueriableStreamProfile {
  /** Canonical base pathname (e.g. '/journal', '/collections', '/results') */
  basePath: string;
  /** Header title displayed in StickyPageHeader */
  title: string;
  /** Header descriptive subtitle */
  description: string;
  /** Target query plane */
  plane: StreamPlane;
  /** Predefined WQL query loaded when URL has no ?q= */
  defaultQuery: string;
  /** Scope radio configuration */
  scopeConfig: {
    initialScope: string;
    locked?: boolean;
    allowedScopes?: string[];
  };
  /** Custom data fetcher and mapper (defaults to unified searchLibrary) */
  dataParser?: (wql: string) => Promise<Entry[]>;
}
```

#### Profile Mapping by Route:

| Route Path | Title | Plane | Default WQL Query | Scope Config | Data Model Parsed |
|---|---|---|---|---|---|
| `/journal` | Journal | `content` | `find:note{source:journal} last 2w` | `initial: 'notes'` (scoped to journal) | User journal notes & daily logs |
| `/collections` | Collections | `content` | `find:note{source:collections} last 2w` | `initial: 'collections'` | Workout sessions & curated catalogs |
| `/feeds`, `/feed` | Feeds | `content` | `find:note{source:feeds} last 2w` | `initial: 'feeds'` | Daily programming posts |
| `/library` | Library | `content` | `find:note last 2w` | `initial: 'all'` (unrestricted) | Cross-catalog notes, sessions, posts |
| `/results` | Results | `rows` | `rows:all{} last 4w` | `initial: 'all'` (statement types) | Completed workout sessions & summaries |
| `/results/:resultId` | Session Results | `rows` | `rows:segment{result:<resultId>}` | `initial: 'segment'` | Segment splits, intervals, round times |
| `/results/segments` | Segment Explorer | `rows` | `rows:segment{} last 8w` | `initial: 'segment'` | Granular segment pacing across workouts |

---

### 3.3 URL State Encoding & Unique URL Contract

The URL synchronization engine (`useComposerQueryState`) operates directly on the current route's search parameters via `useSearchParams`:

1. **Landing on Bare Route (No `?q=`)**:
   - Visiting `/journal` loads `find:note{source:journal} last 2w` into the composer and runs the query immediately.
   - **No URL rewrite occurs**: the browser URL remains cleanly `/journal`.
   - The address bar is not polluted with defaults.

2. **User Modifies Query in Composer**:
   - Athlete types a search keyword or changes a tag filter:
     - Filter applied: `text:deadlift` + `discipline:strength`.
   - The composer serializes the new AST: `find:note{source:journal,discipline:strength,text:deadlift} last 2w`.
   - `setQuery` pushes to the browser history under the current route:
     ```
     /journal?q=find%3Anote%7Bsource%3Ajournal%2Cdiscipline%3Astrength%2Ctext%3Adeadlift%7D%20last%202w
     ```
   - Browser back/forward navigation restores the exact state.

3. **Deep Linking**:
   - Sharing or bookmarking `/results?q=rows:segment{effort:thruster} last 12w` directly hydrates the results view without routing through an intermediary explorer.

---

## 4. The Unified Data Parsing Pipeline: Parsing Data as a Library Page

A major advantage of using the Library page as the shared surface is its progressive, date-grouped presentation model. By extending the data mapper, both **Content Discovery** (`find:`) and **Execution Analytics** (`rows:`) parse into the unified `Entry` data contract.

### 4.1 Extended Entry Model

In `apps/playground/app/lib/entryMapper.ts`:

```ts
export type EntryKind = 'note' | 'session' | 'post' | 'result' | 'segment';

/** Payload carried when an Entry represents an executed session or segment */
export interface EntryExecutionData {
  resultId: string;
  noteId: string;
  timestamp: number;
  outputType: string;
  effortSlug?: string;
  elapsedMs?: number;
  reps?: number;
  loadLbs?: number;
  distanceMeters?: number;
  tis?: number;
  segmentCount?: number;
}

export interface Entry {
  id: string;
  kind: EntryKind;
  sourceCatalog: string;
  sourceItem: string;
  sourceId?: string;
  title: string;
  /** YYYY-MM-DD for date-grouped stream; null for undated shelf sessions */
  date: string | null;
  subtitle?: string;
  detail?: string;
  blockContentId?: string;
  block?: EntryBlock;
  execution?: EntryExecutionData;
}
```

---

### 4.2 Unified Query Dispatcher (`searchLibraryOrResults`)

The data fetching pipeline branches on the parsed WQL family:

```ts
export async function searchQueriableStream(wql: string): Promise<Entry[]> {
  const parsed = parseQuery(wql);
  if (parsed.error) return [];

  // 1. Content Discovery Plane (find:note / find:block)
  if (isFindQuery(parsed)) {
    return searchEntries(wql);
  }

  // 2. Execution Analytics Plane (rows:all / rows:segment / rows:event)
  if (isRowsQuery(parsed)) {
    const result = await queryService.runRows(parsed);
    return rowsQueryResultToEntries(result, parsed);
  }

  return [];
}
```

---

### 4.3 Parsing `rows:` Results into Library Entries

When `QueryService.runRows` executes, it returns `RowsQueryResult` containing `runs: RowsRun[]`. The mapper translates these into `Entry[]`:

#### Mode A: Session-Level Entries (`rows:all{}` or `/results`)
Each `RowsRun` represents one executed workout session:
- **`id`**: `run.resultId`
- **`kind`**: `'result'`
- **`title`**: Derived from parent note title or primary workout block name.
- **`date`**: `formatDateKey(new Date(run.timestamp))` (e.g. `2026-09-02`).
- **`subtitle`**: Aggregated performance summary:
  - Total elapsed duration: `Time: 14:22`
  - Load / TIS score: `TIS: 48 • Volume: 8,400 lbs`
  - Segment count: `5 rounds / splits`
- **`detail`**: Movement summary (`Thruster, Pull-up, Burpee`).

#### Mode B: Segment-Level Entries (`rows:segment{}` or `/results/:resultId`)
Each `UnifiedEventRecord` with `outputType: 'segment'` represents an interval, lap, or round:
- **`id`**: `event.id` (`${resultId}:${seq}`)
- **`kind`**: `'segment'`
- **`title`**: `event.effortSlug ? formatEffortName(event.effortSlug) : `Round ${index + 1}``
- **`date`**: `formatDateKey(new Date(event.timestamp))`
- **`subtitle`**: Split metrics:
  - Split duration: `01:45`
  - Output metrics: `21 Reps @ 95 lbs`
  - Heart rate / intensity: `Zone 4 • TIS 9.2`

---

### 4.4 Date Grouping & Progressive Rendering

Because both content entries and execution entries produce standard `YYYY-MM-DD` date strings:
1. **`groupEntriesByDate(entries)`** works universally:
   - Sessions and segments group automatically under their execution day.
   - Sticky date headers (`Today`, `Yesterday`, `August 28, 2026`) organize results chronologically.
2. **`useBatchedItems`** handles massive histories:
   - Whether scrolling through 500 journal notes or 1,200 interval splits, virtual/progressive DOM batching ensures zero frame drops.
3. **Shelf vs Stream Separation**:
   - **Stream**: Dated journal notes, feed posts, executed workout sessions, and interval splits.
   - **Shelf**: Undated curated sessions (`kind: 'session'`) or pinned benchmark PR scorecards.

---

## 5. Efforts in the Library Model & WQL Filtration Capabilities

### 5.1 Are Efforts Part of the Library Conceptual Model?

**Yes, unequivocally.** In WOD Wiki’s domain architecture, the **Library is the unified discovery and browsing plane for all core entities**, not just markdown workout documents. 

The domain entities accessible through the Library conceptual model fall into three categories:
1. **Content Documents**: User journal logs (`find:note{source:journal}`), curated catalog workouts (`find:note{source:collections}`), and daily programming feeds (`find:note{source:feeds}`).
2. **Domain Movement Registry (Efforts)**: Canonical and user-defined exercises, standards, and benchmarks (`find:effort`).
3. **Execution Telemetry (Results & Segments)**: Historical session execution logs and interval round splits (`rows:all`, `rows:segment`).

Today, the Efforts catalog (`/efforts`) is already built on the exact same UI contract as the Library:
- Renders the standard `StickyPageHeader`.
- Uses `WqlComposer` in the sticky subheader slot.
- Manages URL state through `useComposerQueryState` via `useEffortsComposerState`.
- Executes queries through `QueryService.runFind` on the effort plane (`QueryService.runFindEffort`).

---

### 5.2 WQL Filtration ON Efforts Data (`find:effort{...}`)

When exploring the effort catalog directly, WQL provides a rich, multi-dimensional filter vocabulary operating over the composite registry (bundled movements + custom user exercises):

```wql
find:effort{<filter-predicates>} in all
```

#### Supported Effort Filter Dimensions:

1. **`discipline:<discipline>`** (Modality filtering):
   - Filters by the canonical 10-value discipline vocabulary (`strength`, `gymnastics`, `running`, `cycling`, `rowing`, `swimming`, `kettlebell`, `bodyweight`, `recovery`, `walking`).
   - Examples:
     - `find:effort{discipline:strength}` — All barbell, dumbbell, and resistance movements.
     - `find:effort{discipline:gymnastics}` — Pull-ups, muscle-ups, handstands, toes-to-bar.
     - `find:effort{discipline:running|rowing|cycling}` — Monostructural conditioning movements.
     - `find:effort{!discipline:recovery}` — Negation: exclude recovery/mobility movements.

2. **`origin:<origin>`** (Provenance & ownership):
   - Filters by registry source:
     - `find:effort{origin:bundled}` — Official library standards and benchmarks (Back Squat, Fran, Murph, 2k Row).
     - `find:effort{origin:user}` — Custom exercises created by the athlete in their local vault.
     - `find:effort{origin:synthetic-unresolved}` — Ad-hoc movements parsed from raw text with estimated MET metrics.

3. **`intensity:<tier>`** (Cardiorespiratory & metabolic demand):
   - Filters by exertion tier:
     - `find:effort{intensity:high}` — High-demand anaerobic movements (Thruster, Snatch, 400m sprint).
     - `find:effort{intensity:moderate}` — Steady-state aerobic efforts.
     - `find:effort{intensity:low}` — Warm-up and active recovery drills.

4. **`text:<query>`** (Fuzzy name and alias resolution):
   - Substring matching across exercise labels, canonical slugs, and recognized shorthand aliases:
     - `find:effort{text:squat}` — Matches Back Squat, Front Squat, Overhead Squat, Air Squat, and Zercher Squat.
     - `find:effort{text:pull}` — Matches Pull-up, Chest-to-Bar Pull-up, Jumping Pull-up.

5. **Compound Multi-Clause Filters**:
   - Cross-dimensional precision filtering:
     - `find:effort{discipline:strength,origin:user,text:press}` — Custom user-created pressing exercises.
     - `find:effort{discipline:gymnastics,intensity:high}` — Advanced gymnastic movements.

---

### 5.3 Cross-Plane Filtration: Using Efforts to Filter Notes & Results

Beyond querying the effort catalog itself, **Effort data acts as a primary filter dimension across the rest of the Library**:

#### 1. Filtering Journal Notes & Workouts by Effort:
Athletes can locate every workout containing a specific movement across the entire library:
- `find:note{effort:thruster}` — Finds all journal notes, benchmark collections, or feed posts containing Thrusters.
- `find:note{effort:pull-up,discipline:gymnastics}` — Workouts featuring gymnastics pull-ups.
- `find:block{effort:deadlift}` — Pins directly to the specific ````time`` or ````log`` block that contains Deadlifts.

#### 2. Filtering Execution Results & Segments by Effort:
Athletes can review split times, pacing, and performance specifically for segments where an effort occurred:
- `rows:segment{effort:clean}` — All historical segment executions of Cleans across sessions.
- `rows:segment{effort:thruster} last 12w` — Split pacing for Thruster workouts over the past quarter.
- `rows:segment{effort:running,discipline:running} last 26w` — Running interval splits.

#### 3. Analytical Aggregates Filtered by Effort:
- `sum:totalVolume{effort:back-squat} by {week}.rollup(1w) last 12w` — Weekly tonnage progression for Back Squat.
- `max:weight{effort:deadlift}` — All-time PR for Deadlift.
- `sum:totalReps{} by {effort} last 6w` — Breakdown of rep distribution by exercise.

---

### 5.4 Mapping Efforts into the Shared Stream (`QueriableStreamView`)

In the unified component model, `/efforts` can be mounted directly as a stream profile:

```ts
function effortToEntry(effort: IEffort): Entry {
  return {
    id: effort.slug,
    kind: 'effort' as EntryKind,
    sourceCatalog: effort.registrySource,
    sourceItem: effort.slug,
    title: effort.label,
    date: null, // Undated reference catalog item
    subtitle: `${effort.baseAttributes.discipline ?? 'General'} • MET ${effort.baseAttributes.met.toFixed(1)} • ${effort.baseAttributes.intensityTier ?? 'standard'}`,
    detail: effort.aliases && effort.aliases.length > 0 ? `Aliases: ${effort.aliases.join(', ')}` : undefined,
  };
}
```

#### Grouping Strategy for Efforts:
While workouts and results group by **Date** (`groupEntriesByDate`), reference entities like efforts group naturally by:
- **Discipline**: Sticky group headers for `Strength`, `Gymnastics`, `Running`, `Rowing`, etc.
- **Origin**: Groups for `Custom Movements` vs `Bundled Standards`.
- **Alphabetical**: `A`, `B`, `C` index anchors.

This demonstrates that the **Stream & Shelf** architecture is completely universal across content, movements, and telemetry.

---

## 6. Detailed Route Structure Plan

### 6.1 Route Hierarchy

```
App Router (<Routes>)
│
├── /journal ──────────────────────────> Shared Stream (Profile: Journal)
│     └── ?q=<wql>                         Default: find:note{source:journal} last 2w
│
├── /collections ──────────────────────> Shared Stream (Profile: Collections)
│     └── ?q=<wql>                         Default: find:note{source:collections} last 2w
│
├── /feeds (and /feed) ────────────────> Shared Stream (Profile: Feeds)
│     └── ?q=<wql>                         Default: find:note{source:feeds} last 2w
│
├── /library ──────────────────────────> Shared Stream (Profile: Unified Library)
│     └── ?q=<wql>                         Default: find:note last 2w
│
├── /efforts ──────────────────────────> Shared Stream (Profile: Movement Registry)
│     └── ?q=<wql>                         Default: find:effort
│
├── /results ──────────────────────────> Shared Stream (Profile: Results Sessions)
│     └── ?q=<wql>                         Default: rows:all{} last 4w
│
├── /results/:resultId ────────────────> Shared Stream (Profile: Session Segments)
│     └── ?q=<wql>                         Default: rows:segment{result:<resultId>}
│
├── /results/segments ─────────────────> Shared Stream (Profile: Segment Explorer)
│     └── ?q=<wql>                         Default: rows:segment{} last 8w
│
└── /dashboard ────────────────────────> Analytics Explorer (sum:totalVolume{})
```


### 6.2 Implementation Blueprint: Code Modifications

#### 1. Route Definitions (`apps/playground/app/lib/routes.tsx`)
Update `ROUTE_PATTERNS` and add canonical path builders:

```ts
export const ROUTE_PATTERNS = {
  ...
  journal: '/journal',
  collections: '/collections',
  feeds: '/feeds',
  feedAlias: '/feed',
  library: '/library',
  results: '/results',
  resultDetail: '/results/:resultId',
  resultsSegments: '/results/segments',
  ...
} as const;

export function resultsPath(): string {
  return '/results';
}

export function resultDetailPath(resultId: string): string {
  return `/results/${encodeURIComponent(resultId)}`;
}

export function resultsSegmentsPath(): string {
  return '/results/segments';
}
```

#### 2. Route View Classification (`apps/playground/app/lib/routeView.ts`)
Remove redirect interception and categorize routes into `library` (or `queriableStream`):

```ts
export type PageKind =
  | 'feedDetail'
  | 'feedItem'
  | 'effortsCatalog'
  | 'effortDetail'
  | 'analyticsExplorer'
  | 'dashboardExplorer'
  | 'dashboardView'
  | 'canvas'
  | 'playground'
  | 'workout'
  | 'journalEntry'
  | 'library'; // Handles all queriable stream instances

function derivePage(flags: RouteFlags, pathname: string, canvasPage: ParsedCanvasPage | null): PageKind {
  if (
    pathname === '/library' ||
    pathname === '/journal' ||
    pathname === '/collections' ||
    pathname === '/feeds' ||
    pathname === '/feed' ||
    pathname.startsWith('/results')
  ) {
    return 'library';
  }
  ...
}
```

#### 3. Route-to-Profile Factory (`apps/playground/app/lib/streamProfiles.ts`)
Extract pure profile derivation:

```ts
export function getStreamProfile(pathname: string, params: Record<string, string | undefined>): QueriableStreamProfile {
  if (pathname.startsWith('/results/')) {
    const resultId = params.resultId;
    if (resultId) {
      return {
        basePath: `/results/${resultId}`,
        title: 'Session Results',
        description: `Granular segment splits and interval times for workout ${resultId}.`,
        plane: 'rows',
        defaultQuery: `rows:segment{result:${resultId}}`,
        scopeConfig: { initialScope: 'segment', locked: true },
      };
    }
    if (pathname === '/results/segments') {
      return {
        basePath: '/results/segments',
        title: 'Segment Explorer',
        description: 'Workout intervals, split times, and round pacing across sessions.',
        plane: 'rows',
        defaultQuery: 'rows:segment{} last 8w',
        scopeConfig: { initialScope: 'segment', locked: true },
      };
    }
  }

  if (pathname === '/results') {
    return {
      basePath: '/results',
      title: 'Workout Results',
      description: 'Completed workout sessions and performance logs.',
      plane: 'rows',
      defaultQuery: 'rows:all{} last 4w',
      scopeConfig: { initialScope: 'all', allowedScopes: ['all', 'segment', 'event'] },
    };
  }

  if (pathname === '/journal') {
    return {
      basePath: '/journal',
      title: 'Journal',
      description: 'Your training log — notes and results from every session.',
      plane: 'content',
      defaultQuery: 'find:note{source:journal} last 2w',
      scopeConfig: { initialScope: 'notes', locked: true },
    };
  }

  if (pathname === '/collections') {
    return {
      basePath: '/collections',
      title: 'Collections',
      description: 'Curated workout collections, ready to run or add to today.',
      plane: 'content',
      defaultQuery: 'find:note{source:collections} last 2w',
      scopeConfig: { initialScope: 'collections', locked: true },
    };
  }

  if (pathname === '/feeds' || pathname === '/feed') {
    return {
      basePath: '/feeds',
      title: 'Feeds',
      description: 'Programming feeds you follow, newest first.',
      plane: 'content',
      defaultQuery: 'find:note{source:feeds} last 2w',
      scopeConfig: { initialScope: 'feeds', locked: true },
    };
  }

  return {
    basePath: '/library',
    title: 'Library',
    description: 'Notes, collections, and feeds — one query over everything.',
    plane: 'content',
    defaultQuery: 'find:note last 2w',
    scopeConfig: { initialScope: 'all', allowedScopes: ['all', 'collections', 'feeds', 'notes'] },
  };
}
```

#### 4. Route Mounting in `App.tsx`
Eliminate `LibraryRedirect` in favor of direct `AppContent` mounting:

```tsx
<Route path={ROUTE_PATTERNS.journal} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
<Route path={ROUTE_PATTERNS.collections} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
<Route path={ROUTE_PATTERNS.feeds} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
<Route path={ROUTE_PATTERNS.feedAlias} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
<Route path={ROUTE_PATTERNS.library} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
<Route path={ROUTE_PATTERNS.results} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
<Route path={ROUTE_PATTERNS.resultDetail} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
<Route path={ROUTE_PATTERNS.resultsSegments} element={<AppContent searchHandlerRef={searchHandlerRef} />} />
```

---

## 7. Summary of Architectural Advantages

1. **Zero Redirect Churn**: Clean entry directly onto `/journal`, `/collections`, `/feeds`, or `/results` without flashing intermediate URL params.
2. **Unique, Shareable URLs**: Every route instance owns its query state (`/journal?q=...`, `/results/:resultId?q=...`), allowing athletes to bookmark exactly what they are viewing.
3. **Unified Codebase Seam**: Rather than creating separate fragmented page implementations for Journal, Feeds, and Results, a single, robust, batched `QueriableStreamView` powers all five experiences.
4. **Unified Entry Abstraction**: Both textual Markdown workouts and raw execution telemetry (`UnifiedEventRecord`) flow through the same dated stream, search bar, and sticky boundary layout.
5. **Full Backward Compatibility**: Legacy deep links with `?note=on&session=hide` continue to be seamlessly normalized by `useComposerQueryState` without breaking existing user bookmarks.
