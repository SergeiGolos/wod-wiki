# ADR-0001: App route view and stream composition

Status: accepted (records decisions already implemented on `wql-fix` —
commits bfcd3cca, 2628347f, 14e1b9d0)

## Context

Playground routes were classified and rendered ad hoc: AppContent held a
render ternary, every call site hand-built record URLs, list surfaces were a
hardcoded path list, and the same view variations (which secondary rail, which
default query, which empty message) were re-derived per page. Rebranding a
route for a different note type meant touching many files. Target scheme and
link rules: [../link-crosswalk.md](../link-crosswalk.md) and
[../playground-routes.md](../playground-routes.md).

## Decisions

1. **Pure classification.** `routeView.resolveRouteView` is a pure function
   (pathname + params + injected data → view). `useRouteView` is its React
   adapter. AppContent maps `PageKind → element` through a `renderInner`
   record; no routing logic lives in JSX closures.

2. **Stream composition via profiles.** A stream surface is fully declared by
   a `StreamProfile` in `views/stream/streamProfile.ts`: route, default WQL,
   entity level, type options, shelf, empty message, **secondary rail**
   (`secondary?: MenuSpec`), and **display title**. `QueriableStreamView`
   renders any of them. Adding or rebranding a stream route = adding a
   profile; no view code changes.

3. **One stream registry.** `isStreamRoute` (streamProfile) is the single
   membership test `routeView.derivePage` consults for the `library` page
   kind — routeView keeps no parallel path list. `streamRouteTitle` is
   similarly the single source for stream display names in `deriveWorkout`.

4. **Secondary rails are profile-owned.** AppContent renders
   `profile.secondary`; no page-level constant invents a rail. Surfaces
   declare variations (sessions and playgrounds have their own rails).

5. **Canonical note route + dual ids.** Every stored note opens at
   `/notes/:noteId` from every surface. Note records carry `noteId` (editor)
   and `pageId` (`/p/:slug` page render) so lists link either. Slugs are
   pages: `/c/:slug`, `/e/:slug`, `/d/:slug` are specialized views, `/p/:slug`
   the generic one.

6. **Redirect components, not scattered literals.** Each retired path family
   has one Navigate component in `lib/routeRedirects.tsx`, mounted in the App
   route table. `lib/routes.ts` (pure, no React) keeps patterns, builders, and
   the legacy resolveRedirect matrix; nav derivation lives in
   `lib/routeNav.ts`.

## Consequences

- New stream surface = profile + route pattern; classification, membership,
  title, and secondary follow from the profile.
- Old paths keep working through redirects; behavior changes land in one
  component each.
- Note ids no longer route inside collections — scoping is a view
  (`/c/:slug/:date`, `/c/:slug/:page-slug`), not a link target.
