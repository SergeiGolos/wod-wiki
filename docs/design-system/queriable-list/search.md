# Route: `/search`

| | |
|--|--|
| **Route Pattern** | `/search` |
| **Template** | [Queriable List](_template.md) |
| **Query Organism** | **Fuzzy Search** |

## Description

A dedicated page for global discovery across the entire WodScript ecosystem. This replaces the use of the Command Palette for primary search tasks, providing a more robust and permanent interface for exploring results.

## Configuration (Queriable List Template)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Full Merged Source (Collections + Playground + Journal). |
| **Query Organism** | `FuzzySearchQueryOrganism` (Large sticky input). |
| **Filtered List** | Comprehensive results including Notes, Workout Blocks, and historical Results. |

## State Management

`/search` is wrapped in `CanvasPage` (title-bar mode) with a `TextFilterStrip` as the sticky subheader.

### URL State

| Param | Mechanism | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?s=` | `nuqs` via `CanvasPage` | `push` | Active TOC section ID. |
| `?q=` | `nuqs` via `TextFilterStrip` | default | The active search query string; updated on every keystroke in the search input. |

### Local State (outside URL)

None. Results are derived directly from `?q=` plus the in-memory workout item list passed from `App.tsx`.

> **Note:** The `?cat=` param documented in earlier drafts is used by `PlaygroundPage` (the `/playground` route), not `/search`. The Search page has no category filter.

## UI Transitions

- **Command Palette**: The palette remains functional for contextual actions (Statement Builder) but the "Global Search" (Ctrl+K) hint is removed.
- **Sidebar Menu**: The "Search" item in the sidebar now links directly to this route instead of launching the palette.

## Workflow

1.  **Discovery**: User types into the large, sticky search input at the top of the page.
2.  **Filter**: Results update in real-time as the user types, categorized by type (Collection, Personal Note, Result).
3.  **Selection**: Clicking a result navigates to the appropriate detail view (Note Workspace or Review Page).
