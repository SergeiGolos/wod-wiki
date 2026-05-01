# Page: Collection List

**Route:** `/collections`
**Template:** [ListTemplate](../01.page-templates/list-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Implemented
**Source:** `playground/src/views/CollectionsPage.tsx`

---

## Overview

The Collection List displays all available workout collections grouped by category. Each collection is a named folder under `markdown/collections/` containing a `README.md`. Collections are read-only, bundled at build time. The page is a browsable directory — no search, no filtering by default (the template's `?q=` param is available but not wired in the current implementation).

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/collections` |
| `?q=` (nuqs, optional) | Text filter for collection names. `history: 'replace'`. Not yet visible in the UI — filtering is computed but the text input is not rendered. |
| `?category=` (nuqs, optional) | Active category filter. Selects which `getCategoryGroups()` buckets are shown. |

---

## Template Overrides

| ListTemplate behaviour | Collection List override |
|----------------------|------------------------|
| `queryOrganism` | None currently rendered (text filter computed but hidden) |
| `renderItem` | `CollectionLink` — folder icon, collection name, workout count, chevron |
| `sources` | `['collections']` only — no playground or journal data |
| `onSelectItem(item)` | `navigate('/collections/:collectionId')` |
| `onCreateItem` | Not applicable — collections are read-only |
| `emptyState` | "No collections found." centered message |

---

## Grouping

Collections are grouped into named categories defined in `playground/src/config/collectionGroups.ts`. Each category maps to an ordered list of collection IDs. Collections not assigned to any group appear in an "Other" bucket when no category filter is active.

| Group | Example collections |
|-------|---------------------|
| Strength | `dan-john`, `wendler-531` |
| Metcon | `crossfit-girls`, `hero-wods` |
| Other | Ungrouped collections |

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|---------|
| `leftPanel` | Category filter tree (strength / metcon / etc.) |
| `contentHeader` | "Collections" heading |
| `contentPanel` | Grouped collection list |
| `rightPanel` | — (not used) |

---

## Data

All data is bundled at build time via `import.meta.glob` — no network or IndexedDB calls.

| Data | Source | When |
|------|--------|------|
| Collection metadata | `getWodCollections()` — derived from `markdown/collections/` glob | Build time; `useMemo` on mount |
| Category groups | `getCategoryGroups()` | Build time; `useMemo` on mount |

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Tap collection | `/collections/:collectionId` |
