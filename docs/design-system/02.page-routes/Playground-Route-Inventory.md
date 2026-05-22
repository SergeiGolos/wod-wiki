# Playground Route Inventory

> **Audited:** 2026-05-20  
> **Primary sources:** `playground/src/lib/routes.tsx`, `playground/src/App.tsx`, `playground/src/canvas/canvasRoutes.ts`, route page components under `playground/src/pages/` and `playground/src/views/`

This document is the live browser-route contract for the playground app. It is source-first: if this file disagrees with `routes.tsx` or `App.tsx`, the code wins.

## Canonical router table

### First-class routes

| Route | Handler | Contract |
|---|---|---|
| `/` | `PlaygroundRedirect` | Creates a fresh playground note, then redirects to `/playground/:id`. |
| `/playground` | `PlaygroundRedirect` | Same create-and-redirect entry as `/`. |
| `/playground/:id` | `AppContent` → `PlaygroundNotePage` | Canonical playground note route. |
| `/journal` | `AppContent` → `JournalWeeklyPage` | Journal index / timeline surface. |
| `/journal/:id` | `AppContent` → `JournalPage` | Canonical journal note route. |
| `/plan` | `AppContent` → `PlanPage` | Forward-looking planning surface. |
| `/feeds` | `AppContent` → `FeedsPage` | Feed index across all configured feeds. |
| `/feeds/:feedSlug` | `AppContent` → `FeedDetailPage` | Single-feed timeline. |
| `/feeds/:feedSlug/:feedDate/:feedItem` | `AppContent` → `FeedItemPage` | Feed workout detail/editor surface. |
| `/collections` | `AppContent` → `CollectionsPage` | Collection directory plus injected collection intro canvas. |
| `/collections/:slug` | `AppContent` → `MarkdownCanvasPage` via `findCanvasPage()` | Collection README canvas page. |
| `/collections/:collection/:workout` | `AppContent` → `WorkoutEditorPage` | Canonical bundled workout note route. |
| `/guide/getting-started` | explicit generated canvas route | Canonical getting-started docs page. |
| `/guide/syntax` | explicit generated canvas route | Canonical syntax index page. |
| `/guide/syntax/basics` | explicit generated canvas route | Canonical syntax sub-page. |
| `/guide/syntax/structure` | explicit generated canvas route | Canonical syntax sub-page. |
| `/guide/syntax/protocols` | explicit generated canvas route | Canonical syntax sub-page. |
| `/guide/syntax/complex` | explicit generated canvas route | Canonical syntax sub-page. |
| `/run/:runtimeId` | `TrackerPage` | Canonical transient runtime execution route. |
| `/review/:runtimeId` | `ReviewPage` | Canonical persisted review route. |
| `/load` | `LoadZipPage` | Import / shared-content utility route. |
| `/efforts` | `AppContent` → `EffortsCatalogPage` | Effort registry index and search catalog. |
| `/effort/:slug` | `AppContent` → `EffortDetailPage` | Single effort definition + resolved instance inspector. |
| `*` | `NotFoundPage` | Dedicated 404 surface. |

### Compatibility routes and redirects

| Route | Behavior | Canonical destination |
|---|---|---|
| `/note/playground/:name` | Redirect component | `/playground/:name` |
| `/note/:category/:name` | Supported compatibility route for note surfaces | Usually equivalent to `/collections/:category/:name` for bundled workouts |
| `/workout/:category/:name` | Redirect component | `/collections/:category/:name` |
| `/getting-started` | Redirect component | `/guide/getting-started` |
| `/getting-started/*` | Redirect component | `/guide/getting-started` |
| `/syntax` | Redirect component | `/guide/syntax` |
| `/syntax/*` | Redirect component | `/guide/syntax/*` |
| `/tracker/:runtimeId` | Redirect component | `/run/:runtimeId` |

## Generated route registration

`playground/src/canvas/canvasRoutes.ts` builds explicit route entries from markdown at build time.

### Generated canvas routes from `markdown/canvas/**/*.md`

| Route | Source markdown | Reachable in browser? |
|---|---|---|
| `/` | `markdown/canvas/home/README.md` | **No** — shadowed by the explicit `/` playground redirect. |
| `/guide/getting-started` | `markdown/canvas/getting-started/README.md` | Yes |
| `/guide/syntax` | `markdown/canvas/syntax/README.md` | Yes |
| `/guide/syntax/basics` | `markdown/canvas/syntax/basics.md` | Yes |
| `/guide/syntax/structure` | `markdown/canvas/syntax/structure.md` | Yes |
| `/guide/syntax/protocols` | `markdown/canvas/syntax/protocols.md` | Yes |
| `/guide/syntax/complex` | `markdown/canvas/syntax/complex.md` | Yes |

### Generated collection README routes

Collection `README.md` files are registered explicitly as `/collections/:slug` routes at build time.

Examples:

- `/collections/crossfit-games-2024`
- `/collections/crossfit-girls`
- `/collections/dan-john`
- `/collections/girevoy-sport`
- `/collections/mark-wildman`
- `/collections/strongfirst`
- `/collections/unconventional`

## Route-resolution rules that matter to product behavior

### 1. `/` is a note-creation entry point, not a content page

The browser route `/` always runs `PlaygroundRedirect`. The legacy home canvas markdown still exists as hidden content, but it is not the public route contract.

### 2. Docs pages live under `/guide/*`

The product contract for syntax and getting-started docs is `/guide/getting-started` and `/guide/syntax*`. Old `/getting-started` and `/syntax*` URLs are compatibility redirects only.

### 3. Runtime execution is `/run/:runtimeId`

`/tracker/:runtimeId` is preserved for external links but immediately redirects to `/run/:runtimeId`.

### 4. Generated routes are explicit now

The router registers every generated canvas route directly via `canvasRoutes.map(...)`. The old wildcard resolver is gone.

### 5. Unknown paths hit a real 404

`*` now renders `NotFoundPage`, so unsupported paths no longer fall through to generic editor surfaces.

### 6. Short note-detail routes are not shipped

The live router does **not** define `/p/:id` or `/j/:date`. Current canonical note-detail URLs remain `/playground/:id` and `/journal/:id`.

## Route families and ownership

| Route family | Canonical surface | Primary source |
|---|---|---|
| Playground creation | `/`, `/playground` | `playground/src/pages/PlaygroundRedirect.tsx` |
| Playground notes | `/playground/:id` | `playground/src/pages/PlaygroundNotePage.tsx` |
| Journal | `/journal`, `/journal/:id`, `/plan` | `playground/src/views/ListViews.tsx`, `playground/src/pages/JournalPage.tsx`, `playground/src/views/PlanPage.tsx` |
| Feeds | `/feeds`, `/feeds/:feedSlug`, `/feeds/:feedSlug/:feedDate/:feedItem` | `playground/src/views/FeedsPage.tsx`, `playground/src/pages/FeedDetailPage.tsx`, `playground/src/pages/FeedItemPage.tsx` |
| Collections | `/collections`, `/collections/:slug`, `/collections/:collection/:workout` | `playground/src/views/CollectionsPage.tsx`, `playground/src/canvas/canvasRoutes.ts`, `playground/src/pages/WorkoutEditorPage.tsx` |
| Efforts | `/efforts`, `/effort/:slug` | `playground/src/pages/EffortsCatalogPage.tsx`, `playground/src/pages/EffortDetailPage.tsx` |
| Guide docs | `/guide/getting-started`, `/guide/syntax*` | `markdown/canvas/**`, `playground/src/canvas/canvasRoutes.ts` |
| Runtime / review | `/run/:runtimeId`, `/review/:runtimeId` | `playground/src/pages/TrackerPage.tsx`, `playground/src/pages/ReviewPage.tsx` |
| Import utility | `/load` | `playground/src/pages/LoadZipPage.tsx` |

## Effort route contract (attribute metrics & resolved instance inspection)

### `/efforts` — Effort registry catalog

**Purpose**: Browse and search all efforts (bundled + user-defined).

**Query params** (page controls only):
- `q`: search/filter text
- `tab`: filter by category (optional)

### `/effort/:slug` — Effort definition + resolved instance

**Purpose**: View effort definition, inspect resolved instances with modifiers, edit custom efforts.

**URL params**:
- `:slug` — effort identifier (e.g., `run`, `bench-press`, `sprint`)

**Query params** (split into modifiers vs. page controls):

#### Modifier params (fed to `EffortResolver`)

Any query param **not** in the reserved set below is treated as an attribute metric modifier and passed to `resolver.resolveEffort(slug, { modifiers })`.

Examples:
- `?speed=6mph` — resolve effort with speed modifier
- `?speed=6mph&surface=treadmill&incline=5%` — multiple modifiers
- `?speed=6mph&weight=135lb&mode=view&tab=resolved` — mixed modifiers and controls; only `speed` and `weight` feed the resolver

#### Reserved page-control params

| Param | Values | Default | Purpose |
|---|---|---|---|
| `mode` | `view`, `edit` | `view` | Read-only inspection vs. edit form. Ignored for bundled efforts. |
| `tab` | `definition`, `resolved` | `definition` if no modifiers; `resolved` if modifiers present | Display view. When modifiers are present, default switches to `resolved` to show effective instance. |
| `q` | search text | (none) | Search within effort metadata (labels, aliases). |
| `origin` | `user`, `bundled`, `default` | (none) | Filter by registry source. |

**View behavior**:

1. **Definition view** (default, no modifiers): Shows stored effort attributes, aliases, derivation chain, metadata.
2. **Resolved view** (when `?speed=6mph` etc. present): Shows effective MET, discipline factor, applied modifiers, parent chain with coefficient impact, resolved source, estimated badge.

**Tab switching**:

When modifiers are present, two tabs appear: **Resolved** (primary) and **Definition** (reference). User can toggle between views. Without modifiers, only **Definition** view is shown.

## Effort route validation checklist

- `/efforts` catalog shows all bundled + user efforts
- `/effort/:slug` without query params shows definition view
- `/effort/:slug?speed=6mph` resolves effort and defaults to resolved view
- `/effort/:slug?speed=6mph&tab=definition` allows switching back to definition
- Reserved params (`mode`, `tab`, `q`, `origin`) do not feed the resolver
- Modifier extraction via `parseEffortRouteModifiers(searchParams)` in `playground/src/lib/routes.tsx`

## Validation checklist

- compare this file against `ROUTE_PATTERNS`, path builders, and `ROUTE_REDIRECTS`
- confirm canonical docs routes use `/guide/*`
- confirm canonical runtime docs use `/run/:runtimeId`
- confirm collection workout docs use `/collections/:collection/:workout`
- confirm wildcard behavior is documented as `NotFoundPage`
- confirm no docs claim shipped `/p/:id` or `/j/:date`
