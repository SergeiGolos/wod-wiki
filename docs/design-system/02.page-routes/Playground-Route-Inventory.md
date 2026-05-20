# Playground Route Inventory

> **Audited:** 2026-05-20  
> **Primary sources:** `playground/src/App.tsx`, `playground/src/canvas/canvasRoutes.ts`, route page components under `playground/src/pages/` and `playground/src/views/`

This document records the playground browser routes supported by the current router and the route-governance gaps identified in [WOD-490](/WOD/issues/WOD-490).

It is intentionally source-first: every route below traces back to the router or generated canvas registration.

## Current explicit routes

| Route | Handler | Notes |
|---|---|---|
| `/` | `HomeRoute` | Redirects into playground creation unless an `id` query param is present. |
| `/getting-started` | `AppContent` | Generated canvas docs route. |
| `/syntax` | `AppContent` | Generated canvas docs route. |
| `/journal` | `AppContent` → `JournalWeeklyPage` | Journal index / timeline. |
| `/plan` | `AppContent` → `PlanPage` | Planning surface. |
| `/feeds` | `AppContent` → `FeedsPage` | Feed index. |
| `/feeds/:feedSlug` | `AppContent` → `FeedDetailPage` | Feed detail. |
| `/feeds/:feedSlug/:feedDate/:feedItem` | `AppContent` → `FeedItemPage` | Feed item/editor route. |
| `/collections` | `AppContent` → `CollectionsPage` | Collection directory. |
| `/collections/:slug` | `AppContent` | Collection canvas route via `findCanvasPage()`. |
| `/workout/:category/:name` | `AppContent` → `WorkoutEditorPage` | Bundled workout note route. |
| `/load` | `LoadZipPage` | Shared-content import utility. |
| `/playground` | `PlaygroundRedirect` | Canonical new playground-note entry point. |
| `/playground/:id` | `AppContent` → `PlaygroundNotePage` | Playground note route. |
| `/note/:category/:name` | `AppContent` | Compatibility note alias. |
| `/journal/:id` | `AppContent` → `JournalPage` | Journal note route. |
| `/tracker/:runtimeId` | `TrackerPage` | Runtime execution route. |
| `/review/:runtimeId` | `ReviewPage` | Persisted review route. |
| `*` | `AppContent` | Wildcard fallback; currently also acts as route resolver for generated pages. |

## Generated routes

### Canvas routes from `markdown/canvas/**/*.md`

Current generated browser routes:

- `/` from `markdown/canvas/home/README.md` (**shadowed** by the explicit home/playground entry flow)
- `/getting-started` from `markdown/canvas/getting-started/README.md`
- `/syntax` from `markdown/canvas/syntax/README.md`
- `/syntax/basics` from `markdown/canvas/syntax/basics.md`
- `/syntax/complex` from `markdown/canvas/syntax/complex.md`
- `/syntax/protocols` from `markdown/canvas/syntax/protocols.md`
- `/syntax/structure` from `markdown/canvas/syntax/structure.md`

### Collection README routes from `markdown/collections/**/README.md`

Collection READMEs are registered as `/collections/:slug` pages at build time.

Examples:

- `/collections/crossfit-games-2024`
- `/collections/crossfit-girls`
- `/collections/dan-john`
- `/collections/girevoy-sport`
- `/collections/mark-wildman`
- `/collections/strongfirst`
- `/collections/unconventional`

## Route-model problems found in the audit

1. **Mixed mental models at the top level**
   - personal surfaces: `/playground`, `/journal`
   - library/content surfaces: `/collections`, `/feeds`, docs pages
   - execution lifecycle pages: `/tracker/:runtimeId`, `/review/:runtimeId`
   - compatibility aliases: `/note/:category/:name`

2. **One resource can have multiple URL shapes**
   - playground notes can be reached through `/playground/:id` and `/note/playground/:id`

3. **Generated routes are partially hidden behind `*`**
   - today the wildcard fallback is not just a 404 path; it is part of the real route-resolution model

4. **Collection workouts are outside the collection namespace**
   - `/collections/:slug` and `/workout/:category/:name` belong to the same conceptual family but use different top-level namespaces

5. **The docs namespace is long and inconsistent**
   - `/getting-started` and `/syntax/*` are product docs, but they sit beside user/library/runtime surfaces at the top level

## Approved direction from this issue

The follow-on route-governance ADR recommends a more consistent resource-first route model:

- keep readable browse/index namespaces
- nest related pages together
- treat legacy shapes as redirects instead of first-class canonical URLs
- if shorter note-detail URLs are added later, apply them narrowly to high-frequency direct note routes rather than collapsing the whole tree into one-letter paths

See [ADR: Playground Route Governance](../../adr/playground-route-governance.md).

## Validation checklist

- compare this inventory against `playground/src/App.tsx`
- compare generated route claims against `playground/src/canvas/canvasRoutes.ts`
- verify shadowed `/` content is documented as shadowed, not public
- verify wildcard behavior is called out as a current risk rather than ignored
