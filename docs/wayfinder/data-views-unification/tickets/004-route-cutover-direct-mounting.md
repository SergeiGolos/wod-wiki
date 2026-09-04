---
state: closed
assignee: null
labels: [wayfinder:task]
title: "Route cutover: replace LibraryRedirect with direct route mounting"
blocked-by: ["003-deep-queriable-stream-view.md"]
---

## Question

Currently, `/journal`, `/collections`, and `/feeds` route through `LibraryRedirect` in `routes.tsx` which performs HTTP/client-side redirects into `/library?note=...`, rewriting the browser address bar and causing history churn. Additionally, `/efforts` is routed separately to `EffortsCatalogPage`.

How do we perform a clean cutover in `routes.tsx`, `routeView.ts`, and `App.tsx` that:
1. Mounts `QueriableStreamView` directly under `/journal`, `/collections`, `/feeds`, `/library`, and `/efforts`.
2. Passes route-aware `StreamProfile` configurations (seeded with their canonical WQL defaults: `find:note{source:journal} last 2w`, `find:note{source:collections} last 2w`, `find:note{source:feeds} last 2w`, `find:note last 2w`, and `find:effort`).
3. Deletes `LibraryRedirect`, `LIBRARY_REDIRECTS`, `resolveLibraryRedirect`, and `EffortsCatalogPage.tsx`.
4. Ensures existing bookmarks and deep links with legacy parameters continue to parse and normalize seamlessly into `?q=`.
