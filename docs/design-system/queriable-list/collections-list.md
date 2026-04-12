# Route: `/collections` (Index)

| | |
|--|--|
| **Route Pattern** | `/collections` |
| **Template** | [Queriable List](_template.md) |
| **Query Organism** | **Text Filter** (`TextFilterStrip` subheader) |
| **Component** | `CollectionsPage` (`playground/src/views/CollectionsPage.tsx`) |
| **Shell** | `CanvasPage` (title-bar mode) |

## Description

The root `/collections` index is a browseable, filterable directory of all available workout libraries. It uses the Queriable List pattern — a sticky Query Organism drives a client-side Filtered List — but with a **custom grouped layout** in place of the standard `QueriableListView`.

Collections are partitioned into methodology groups (Kettlebell, CrossFit, Swimming, Other). Selecting any item navigates to the individual collection's Canvas page ([collections-view](../canvas/collections-view.md)).

## Configuration (Queriable List Template)

| Property           | Configuration                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data Source**    | `getWodCollections()` — static list derived from `markdown/collections/` folder structure at build time. Read-only.                                                  |
| **Query Organism** | `TextFilterStrip` — single-line text input mounted as the `CanvasPage` subheader. Filters collection name and slug client-side; no server round-trip.                |
| **Filtered List**  | Custom `CollectionsPage` grouped list. Items rendered as `CollectionLink` rows (folder icon + name + workout count). Grouped into predefined methodology categories. |

## Query Organism — Text Filter

The `TextFilterStrip` is mounted as the `subheader` prop of `CanvasPage`, placing it in the sticky subheader layer below the title bar:

```tsx
<CanvasPage
  title="Collections"
  subheader={<TextFilterStrip placeholder="Filter collections…" />}
  …
>
  <CollectionsPage />
</CanvasPage>
```

The strip writes `?q=` on every keystroke via `nuqs`. `CollectionsPage` reads `?q=` independently to filter its list — the Query Organism and Filtered List communicate **only through the URL param**, not via a shared `QueryObject`.

## Filtered List Organism — Grouped Collection List

Unlike other Queriable List pages, the Filtered List here is not a generic virtualized list. It uses a **custom grouped-list layout** specific to collections.

### Data Type: Collection Entry

| Attribute | Display                                            |
| ----------------- | -------------------------------------------------- |
| **Name** | Uppercase, bold, truncated.                        |
| **Workout count** | Subtitle (`N workouts`).                           |
| **Icon** | Folder icon (amber-tinted).                        |
| **Interaction** | Full-row button → `navigate('/collection/:slug')`. |

### Grouping Logic

Collections are sorted into predefined category groups. Slugs not assigned to any group fall into **Other**.

| Group | Assigned slugs |
|-------|---------------|
| **Kettlebell** | `kettlebell`, `dan-john`, `geoff-neupert`, `girevoy-sport`, `joe-daniels`, `keith-weber`, `mark-wildman`, `steve-cotter`, `strongfirst` |
| **Crossfit** | `crossfit-games - 2020/21/22/23/24`, `crossfit-girls` |
| **Swimming** | `swimming-pre-highschool` through `swimming-triathlete` (7 slugs) |
| **Other** | `unconventional` + any unassigned slugs |

Group headers render as uppercase section dividers (`bg-muted/30`). Empty groups (all items filtered out) are hidden.

## Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ [CanvasPage title bar — "Collections"]       z-30 sticky │
├──────────────────────────────────────────────────────────┤
│ [TextFilterStrip — "Filter collections…"]    z-10 sticky │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Grouped Filtered List]                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │ KETTLEBELL                                         │  │
│  │ [CollectionLink: dan-john]                         │  │
│  │ [CollectionLink: geoff-neupert]                    │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ CROSSFIT                                           │  │
│  │ [CollectionLink: crossfit-girls]                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

> **Scroll behaviour:** `CollectionsPage` renders `h-full overflow-hidden` with an inner `overflow-y-auto` container — it fills the content column provided by `CanvasPage` and scrolls internally, not via document scroll.

## State Management

### URL State

| Param | Mechanism                    | `history` | Purpose                                                                                                         |
| ----- | ---------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `?q=` | `nuqs` via `TextFilterStrip` | default   | Text filter applied client-side to all collection names and IDs. Survives page refresh.                         |
| `?s=` | `nuqs` via `CanvasPage`      | `push`    | Active TOC section ID (title-bar mode). Not meaningfully used here — no `index` prop is passed to `CanvasPage`. |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `allCollections` | `WodCollection[]` | Full collection list from `getWodCollections()`; memoised on mount. |
| `filtered` | `WodCollection[]` | Subset matching `?q=`; recomputed on each query change. |
| `grouped` | `{ label: string; items: WodCollection[] }[]` | `filtered` partitioned into display groups; recomputed when `filtered` changes. |

All three are derived (`useMemo`) — no independent `useState`.

## Workflow

1. **Browse**: User arrives at `/collections`; all groups are shown with full collection counts.
2. **Filter**: User types into the `TextFilterStrip`; the `?q=` param updates and the grouped list narrows in real-time.
3. **Select**: Clicking a `CollectionLink` row navigates to `/collection/:slug`, loading the collection's Canvas page.

## Related

- [Collections View](../canvas/collections-view.md) — the per-slug Canvas page loaded when a collection is selected
- [Search](search.md) — global search across all data types
- [Queriable List template](_template.md) — the standard filter+list pattern this page follows
