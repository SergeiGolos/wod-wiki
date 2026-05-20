# ADR: Playground Route Governance

- **Status:** Accepted
- **Date:** 2026-05-20
- **Authors:** CTO audit from [WOD-490](/WOD/issues/WOD-490)
- **Implemented by:** [WOD-503](/WOD/issues/WOD-503), [WOD-504](/WOD/issues/WOD-504), [WOD-505](/WOD/issues/WOD-505), [WOD-506](/WOD/issues/WOD-506), [WOD-507](/WOD/issues/WOD-507)
- **Related:** `playground/src/lib/routes.tsx`, `playground/src/App.tsx`, `docs/design-system/02.page-routes/Playground-Route-Inventory.md`

## Context

The playground router had drift between documented URLs and the live app contract:

- docs pages still described legacy `/getting-started`, `/syntax*`, `/tracker/:runtimeId`, and `/workout/:category/:name` paths as primary routes
- the old wildcard `*` route doubled as an implicit route resolver, which hid true 404s
- playground-note compatibility aliases were not documented as compatibility-only
- per-page route docs had fallen behind the code after the route cleanup work landed

The stabilized router now has a single source of truth for canonical patterns and compatibility redirects in `playground/src/lib/routes.tsx`, with final route registration in `playground/src/App.tsx`.

## Decision

### 1. Canonical browser routes

The canonical browser contract is:

- `/` and `/playground` create a fresh playground note, then redirect to `/playground/:id`
- `/playground/:id` is the canonical playground note URL
- `/journal` and `/journal/:id` remain the journal index and journal note routes
- `/plan` remains the planning surface
- `/feeds`, `/feeds/:feedSlug`, and `/feeds/:feedSlug/:feedDate/:feedItem` are the feed surfaces
- `/collections`, `/collections/:slug`, and `/collections/:collection/:workout` are the collection surfaces
- `/guide/getting-started` and `/guide/syntax*` are the canonical documentation routes
- `/run/:runtimeId` is the canonical runtime execution route
- `/review/:runtimeId` is the persisted review route
- `/load` remains the import utility route

### 2. Compatibility paths stay explicit and limited

Legacy URLs are preserved only as compatibility affordances:

- `/note/playground/:name` → `/playground/:name`
- `/workout/:category/:name` → `/collections/:category/:name`
- `/getting-started` and `/getting-started/*` → `/guide/getting-started`
- `/syntax` and `/syntax/*` → `/guide/syntax*`
- `/tracker/:runtimeId` → `/run/:runtimeId`
- `/note/:category/:name` remains supported for non-playground note surfaces, but it is not the canonical published URL for bundled workouts

### 3. Generated docs routes must be explicit product routes

Generated markdown canvas routes are registered explicitly from `canvasRoutes` rather than being discovered through a permissive wildcard fallback. Unknown paths now resolve to `NotFoundPage`.

### 4. Short note-detail routes are not part of the shipped contract

The live router does **not** implement `/p/:id` or `/j/:date`.
Until code adds them, documentation must treat `/playground/:id` and `/journal/:id` as the canonical note-detail URLs and must not imply a shipped short-route contract.

## Consequences

### Positive

- route ownership is centralized in `ROUTE_PATTERNS`, path builders, and redirect rules
- canonical vs compatibility paths are explicit
- documentation can be verified directly against the router
- unknown URLs now produce an intentional 404 experience

### Negative

- legacy links still need compatibility maintenance
- generated `/` canvas content still exists in markdown but is not browser-reachable because `/` is reserved for playground-note creation
- future route work must update both `routes.tsx` and the route docs together

## Validation path

- verify `playground/src/lib/routes.tsx` matches `playground/src/App.tsx`
- verify `/guide/*`, `/run/:runtimeId`, `/collections/:collection/:workout`, and explicit generated routes are documented as canonical
- verify compatibility redirects are documented as redirects or aliases, not as primary paths
- verify `*` is documented as `NotFoundPage`, not as a resolver
- verify no route docs claim shipped `/p/:id` or `/j/:date` support
