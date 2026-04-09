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

## Query Parameters (`nuqs`)

- `q`: (string) The active fuzzy search query.
- `cat`: (string) Optional category filter (e.g., "Kettlebell", "CrossFit").

## UI Transitions

- **Command Palette**: The palette remains functional for contextual actions (Statement Builder) but the "Global Search" (Ctrl+K) hint is removed.
- **Sidebar Menu**: The "Search" item in the sidebar now links directly to this route instead of launching the palette.

## Workflow

1.  **Discovery**: User types into the large, sticky search input at the top of the page.
2.  **Filter**: Results update in real-time as the user types, categorized by type (Collection, Personal Note, Result).
3.  **Selection**: Clicking a result navigates to the appropriate detail view (Note Workspace or Review Page).
