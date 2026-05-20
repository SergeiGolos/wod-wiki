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
| Guide docs | `/guide/getting-started`, `/guide/syntax*` | `markdown/canvas/**`, `playground/src/canvas/canvasRoutes.ts` |
| Runtime / review | `/run/:runtimeId`, `/review/:runtimeId` | `playground/src/pages/TrackerPage.tsx`, `playground/src/pages/ReviewPage.tsx` |
| Import utility | `/load` | `playground/src/pages/LoadZipPage.tsx` |

## Validation checklist

- compare this file against `ROUTE_PATTERNS`, path builders, and `ROUTE_REDIRECTS`
- confirm canonical docs routes use `/guide/*`
- confirm canonical runtime docs use `/run/:runtimeId`
- confirm collection workout docs use `/collections/:collection/:workout`
- confirm wildcard behavior is documented as `NotFoundPage`
- confirm no docs claim shipped `/p/:id` or `/j/:date`
