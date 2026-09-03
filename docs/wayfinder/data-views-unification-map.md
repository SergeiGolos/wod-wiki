---
labels: [wayfinder:map]
title: "Data views unification — shared queriable stream across notes, efforts, and results"
---

# Wayfinder Map — Data Views Unification

## Destination

A unified, deep `QueriableStreamView` in `apps/playground` that mounts directly on `/journal`, `/collections`, `/feeds`, `/library`, `/efforts`, and `/results/*` with route-native WQL defaults, eliminating redirect shims (`LibraryRedirect`), powered by a unified `StreamQueryEngine` and a level-configurable `FieldProjection` seam with a modal View Settings dialog and card/table toggles.

## Notes

- **Plan-mode override: this effort carries execution.** (Task tickets land code and tests).
- Guided by `/skill:improve-codebase-architecture`: deepen shallow modules, delete pass-through shims (`LibraryRedirect`, redundant catalog pages), and maximize locality and leverage at seams.
- Guided by `/skill:wayfinder`: never resolve more than one ticket per session.
- Domain context: [`docs/11-routes-wql-defaults-and-library-aliases.md`](../11-routes-wql-defaults-and-library-aliases.md), `CONTEXT.md`.
- Issue tracker: local markdown tracker in `docs/wayfinder/data-views-unification/`.
- Dashboard separation: `/dashboard` remains strictly the user's permanent, non-deletable personal dashboard note (customizable by adding/removing embedded ````query`` blocks); `/dashboard/:slug` serves named/seed dashboards. `/results` is dedicated to workout execution telemetry.

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then zoom the link for the detail the ticket holds -->
- [001: StreamQueryEngine across content, efforts, and rows planes](data-views-unification/tickets/001-stream-query-engine.md): Unified query intake seam accepting any find or rows query string/AST, dispatching to queryService, and mapping into extended Entry model with effort and telemetry metadata.

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

- **Segment-to-Effort cross navigation**: In-row affordances on segment splits that link directly into movement history or open an effort inspector drawer.
- **In-stream execution actions**: Enabling "Re-run block" or "Add to today" actions directly from past session result cards and segment splits.
- **Custom saved views**: User-defined stream presets that pin arbitrary WQL queries into the sidebar navigation.

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->

- Modifying the WQL grammar or AST in `@bitcobblers/wod-wiki-wql` (C1–C7 grammar is complete and frozen).
- Altering the IndexedDB database schema or event storage layout (`DB_VERSION = 16`).
- Merging the dashboard canvas into the library stream (`/dashboard` remains a dedicated composable widget canvas).
