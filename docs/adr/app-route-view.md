# App Route View

**Status:** Accepted · **Date:** 2026-06-28

Pull route classification, view derivation, and the render decision out of `AppContent`
(`playground/src/App.tsx`) into a pure `resolveRouteView(pathname, deps) → RouteView` module, so
the highest-churn file in the repo (99.9th-%ile, 86 commits) stops being edited on every route
change, and so URL → view classification becomes unit-testable without mounting React.

## Context

`AppContent` (`App.tsx:98-431`, ~330 lines) is one function that does route-family detection
(`:107-115`), a 30-line `currentWorkout` derivation with an **inline named-route table**
(`'/'`→Home, `'/'journal`→Journal… at `:134-142`), a `recentResults` IndexedDB fetch (`:157-165`),
a 95-line `currentNavLinks` derivation (`:177-272`), the palette/keyboard-shortcut/theme effects,
and a **9-branch render ternary** (`:357-424`). Every new page or route edits this one file.

The derivations are already pure functions of `(pathname + data)` — `currentWorkout` depends only
on route flags, `canvasPage`, and `workoutItems`; `currentNavLinks` adds `recentResults` and a
`navigate` callback. Crucially, `recentResults` (the only impurity — an IndexedDB fetch) is
consumed **only** by `currentNavLinks`'s journal-date branch (`:252`), never passed to a page. So
the fetch can stay outside the derivation and be injected as a dependency, keeping the classifier
pure.

The render ternary varies on **two** axes: the page component (9 branches) *and* the shell
wrapping (`<CanvasPage title subheader actions>` for journal/plan/collections/canvas; bare for
feeds/efforts; fragment for the playground/journal/workout fallback). Classification alone (~10
lines of booleans) isn't worth extracting; the derivations and the shell decision are the friction.

## Decision

A pure route module + a branch-free shell.

- **`resolveRouteView(pathname, deps) → RouteView`** — owns route classification, the
  `currentWorkout` derivation, the `currentNavLinks` derivation, and the shell decision. Pure:
  takes `pathname` plus injected data (`workoutItems`, `canvasPage`, `recentResults`) and a
  `navigate` callback. Never fetches, never touches React. A thin `useRouteView()` hook wraps it
  for React and injects the deps.
- **`RouteView` is a full render descriptor** — `{ page: PageKind, shell: ShellConfig, props:
  PageProps, nav, workout }`. The module decides *both* the page and the shell *shape*
  (`ShellConfig` = wrap/bare, title, subheader kind, actions mode). `AppContent` collapses to
  `const v = useRouteView(); return <Shell {...v.shell}><Page {...v.props}/></Shell>` — zero
  branching. The module returns shell **config** (data); `AppContent` owns the shell
  **components** (`CanvasPage`, `PageActions`, `TextFilterStrip`).
- **Lives in a new `lib/routeView.ts`, layered above the existing route files.** It composes the
  matchers from `lib/routes.tsx` (`isPlaygroundNotePath`, `matchFeedItem`…) and
  `findCanvasPage`/`getSectionProse` from `canvasRoutes.ts`. It **absorbs the inline named-route
  table** and the canvas WOD-extraction logic. `routes.tsx` and `canvasRoutes.ts` are untouched.
- **Two-phase migration.** Phase 1 extracts `resolveRouteView` verbatim (the render ternary is
  untouched; classification gets unit tests). Phase 2 restructures the render into the lookup.
  Land the safe extraction first.

## Considered Options

**How the module treats the data its derivations need (`currentNavLinks` needs `recentResults`):**
- **(a) Pure function + thin hook; data injected as deps. — CHOSEN.** Maximally testable;
  classify a URL with no React, no IndexedDB. The `recentResults`-only-feeds-one-derivation
  finding makes this cost nothing.
- (b) One idiomatic hook that owns the fetch. — co-locates data with consumer, but
  classification can't be tested without mounting the hook and its IndexedDB call.

**How much `RouteView` carries:**
- **(b) Full render descriptor (page + shell + props). — CHOSEN.** The shell wrapping is
  route-derived (canvas routes get `CanvasPage`, feed routes don't), so it belongs in the
  descriptor; this is what makes `AppContent` branch-free.
- (a) Page kind only, `AppContent` keeps the shell branching. — leaves the second axis of the
  ternary exactly where it is; `AppContent` stays a branching mess around a lookup.

**Where the module lives:**
- **(i) New `lib/routeView.ts`, layered; don't consolidate. — CHOSEN.** `routes.tsx` carries JSX
  redirect components and serves path-building for all navigation; merging would mix a pure
  classifier with JSX and churn a clean, tested file.
- (ii) Fold into `routes.tsx`. — rejected for the above.

**Migration shape:**
- **(a) Extract, then simplify (two phases). — CHOSEN.** Phase 1 is a verbatim, behavior-
  preserving relocation that adds tests; Phase 2 is the isolated, riskier render restructure.
- (b) One-shot extract + simplify. — can't isolate the render-restructure risk.

## Consequences

- **`AppContent` shrinks to resolve-view + apply-shell + render-page**, branch-free. New routes
  add a `routeView` branch and a `ROUTE_PAGES` entry, not a ternary arm plus nav logic inline.
- **Classification is unit-testable** without React or IndexedDB — "given `/journal` + these
  results, nav is the 10 most-recent dates" becomes a plain unit test.
- **Churn on `App.tsx` should drop** — new routes stop editing the 330-line `AppContent`.
- **The non-route effects stay in `AppContent`** (or tiny sibling hooks): `recentResults` fetch,
  `Cmd+/` shortcut, theme watcher, scroll-sync. The route module does not own them.
- **Future reviews should not re-suggest** consolidating into `routes.tsx`, or moving the
  IndexedDB/theme/shortcut effects into the route module.

## Non-goals

- Changing *which page renders for which URL* — routing behavior is preserved.
- Touching the `Suspense`-wrapped pages (`WallClockPage`, `ReviewPage`, `LoadZipPage`) — those
  live in `App()`'s route table (`:474-506`), not `AppContent`'s ternary; the descriptor doesn't
  cover them.
- Migrating the non-route effects. Optional follow-up; out of scope for this deepening.

## Documentation note

"Route View" is **not** added to `CONTEXT.md`. What `resolveRouteView` returns is a render
descriptor (implementation shape), not a domain noun. `CONTEXT.md` is the workout-domain glossary
(Statement, Metric, Dialect, NoteRef…); this seam is plumbing and lives here, in the ADR. If a
domain noun crystallizes later (e.g. "the current Page" as something pages reason about), that
would earn an entry — not the render descriptor.
