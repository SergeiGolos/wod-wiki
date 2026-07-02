# App Route View — Implementation Plan

Companion to [`app-route-view.md`](./app-route-view.md). That ADR records the *decision*; this
doc records the *how* — the two-phase rollout that lands the pure classifier first and isolates
the riskier render restructure.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Pure `resolveRouteView(pathname, deps) → RouteView` + thin `useRouteView` hook | Derivations are already pure functions of pathname + data; name them, don't re-inline |
| 2 | Data (`recentResults`, `workoutItems`, `canvasPage`) + `navigate` injected as deps | `recentResults` feeds only the nav derivation → injecting it keeps the module pure and testable without IndexedDB |
| 3 | `RouteView` is a full render descriptor: `{ page, shell, props, nav, workout }` | Shell wrapping is route-derived; carrying it makes `AppContent` branch-free |
| 4 | Module returns shell *config* (data); `AppContent` owns shell *components* | Keeps the route module React-free; rendering stays where JSX lives |
| 5 | New `lib/routeView.ts`, layered above `routes.tsx` + `canvasRoutes.ts` | `routes.tsx` has JSX redirects + serves path-building; don't consolidate |
| 6 | Absorb the inline named-route table + canvas WOD-extraction into `routeView.ts` | They have no business inline in a render function |
| 7 | Two-phase: extract verbatim first, restructure render second | Phase 1 is behavior-preserving + adds tests; Phase 2 isolates the render risk |
| 8 | "Route View" not added to `CONTEXT.md` | It's a render descriptor (implementation), not a domain noun |

## Why the migration is safe

The two `useMemo` bodies (`currentWorkout` `:123-154`, `currentNavLinks` `:177-272`) and the
route-detection booleans (`:107-115`) are **already pure functions of `(pathname + data)`**.
Moving them into `resolveRouteView` is a verbatim relocation, not a rewrite — and Phase 1 leaves
the render ternary (`:357-424`) completely untouched, so the visible behavior is identical while
classification becomes independently testable. The structural risk is isolated in Phase 2.

## Phased rollout

### Phase 1 — Extract `resolveRouteView` verbatim (safe)

Goal: the derivations live in a pure, tested module; `AppContent` calls them; rendering is
unchanged.

1. Create `playground/src/lib/routeView.ts`:
   - Define `RouteView`, `PageKind`, `ShellConfig`, `PageProps` types.
   - Implement `resolveRouteView(pathname, deps)` by **moving** the route-detection booleans,
     the `currentWorkout` body (incl. the named-route table `:134-142`), and the `currentNavLinks`
     body (incl. canvas WOD-extraction) **verbatim** out of `AppContent`.
   - Keep it React-free: no JSX, no hooks. `deps = { workoutItems, canvasPage, recentResults,
     navigate }`.
2. Create `playground/src/lib/routeView.test.ts` — the unit tests that were impossible before:
   - `/journal` + sample `recentResults` → nav is the 10 most-recent distinct dates.
   - A collection canvas → nav lists its workouts (incl. the `{{workouts}}` fallback).
   - `/playground/:id` → `page: 'playground'`, correct `workout`.
   - Bare routes (`/feeds`, effort) → `shell.wrap: 'bare'`.
3. Add a thin `useRouteView()` hook (separate file, e.g. `useRouteView.ts`, so the pure core
   stays React-free): calls `useLocation`/`useNavigate`/`useWorkoutItems`/`useRecentResults` and
   delegates to `resolveRouteView`.
4. `AppContent`'s two `useMemo`s shrink to reading fields off `useRouteView()`. **The render
   ternary is untouched** — it still branches on `location.pathname` exactly as today.

**Verification:** `npm run build` + `npm run test` + manual smoke of each route family.
Behavior identical; classification now tested in isolation. Independently shippable.

### Phase 2 — Restructure the render into a lookup (structural)

Goal: the 9-branch ternary becomes `<Shell {...v.shell}><Page {...v.props}/></Shell>`.

1. Complete `ShellConfig` (`{ wrap: 'canvas' | 'bare', title, subheaderKind?, actionsMode? }`) and
   `PageProps` (per-page fields: `feedSlug/feedDate/feedItem`, `category/name/mdContent`,
   `canvasPage`, `workoutItems`, etc.) so `resolveRouteView` emits everything the render needs.
2. Introduce the `ROUTE_PAGES: Record<PageKind, React.ComponentType<ViewPageProps>>` lookup in
   `AppContent` (or a sibling).
3. Rewrite the ternary (`:357-424`) into the branch-free form. `AppContent` applies the shell
   from `v.shell` and renders `ROUTE_PAGES[v.page]` with `v.props`.

**Watch-item (the one place this silently breaks):** reproduce the per-branch `key` props
**exactly** — `PlaygroundNotePage key={effectivePlaygroundId}`, `WorkoutEditorPage
key={\`${category}/${name}\`}`. If the lookup drops or changes a `key`, React remounts component
state on navigation. The bare-vs-`CanvasPage` shell split must also be captured in `ShellConfig`.

**Verification:** build + test + a careful manual pass of every route family, watching for
unexpected remounts (lost editor state, re-fetched data, scroll resets).

### Phase 3 — Optional: lift the non-route effects

Goal: `AppContent` is resolve + render only.

1. `useRecentResults()` hook (wraps the IndexedDB fetch + the `location.pathname` refresh,
   `:157-165`) — already needed by `useRouteView` as a dep in Phase 1.
2. `useSearchPalette()` (the `Cmd+/`/`Cmd+P` shortcut + `openSearchPalette`, `:277-311`) and the
   theme/system-dark watcher (`:313-332`) into sibling hooks.

Not required for the deepening; lowers `AppContent` further. Defer unless desired.

## File inventory

| Area | Files | Phase |
|------|-------|-------|
| New pure module | `playground/src/lib/routeView.ts` (new) | 1 |
| New tests | `playground/src/lib/routeView.test.ts` (new) | 1 |
| New hook | `playground/src/lib/useRouteView.ts` (new) — React adapter over the pure core | 1 |
| AppContent | `playground/src/App.tsx` — `useMemo` bodies → `useRouteView()` fields | 1 |
| Render restructure | `App.tsx` `:357-424` → lookup + `ShellConfig` application; `ROUTE_PAGES` table | 2 |
| Untouched | `playground/src/lib/routes.tsx`, `playground/src/canvas/canvasRoutes.ts` | — |
| Optional effect hooks | `useRecentResults`, `useSearchPalette`, theme watcher | 3 (deferred) |

## Test strategy — replace, don't layer

- **New:** `routeView.test.ts` classifies URLs against injected data — no React mount, no
  IndexedDB. This is the core testability win.
- **Existing:** `App.tsx`-level / page-component tests (`MarkdownCanvasPage.test.tsx`, page
  smoke tests) are unchanged — they test the leaves, which still render the same.
- **Phase 2 manual:** the `key`-props regression is not unit-testable cheaply; it's a manual
  watch-item (state preservation across navigation).

## Risks & non-goals

- **Risk (Phase 2):** dropped/altered `key` props → silent state remounts. Mitigation: enumerate
  every branch's `key` before the rewrite; preserve verbatim; manual pass per route family.
- **Risk:** the bare-vs-`CanvasPage` shell split (and the `subheader`/`actions` variants) must all
  be expressible in `ShellConfig`. Mitigation: derive `ShellConfig` directly from the existing
  ternary arms before deleting them — one arm at a time.
- **Non-goal:** changing which page renders for which URL.
- **Non-goal:** the `Suspense` pages (`WallClockPage`, `ReviewPage`, `LoadZipPage`) — they're in
  `App()`'s route table, not the descriptor.

## Suggested first PR

**Phase 1 only** — extract `resolveRouteView` + `useRouteView`, add `routeView.test.ts`, shrink
`AppContent`'s `useMemo`s, leave the render ternary untouched. Pure relocation, zero behavior
change, classification now tested. The structural render change (Phase 2) is a separate, later PR.
