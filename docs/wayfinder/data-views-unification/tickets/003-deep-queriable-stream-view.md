---
state: closed
assignee: null
labels: [wayfinder:task]
title: "Deep QueriableStreamView component and View Settings dialog"
blocked-by: ["001-stream-query-engine.md", "002-field-projection-seam.md"]
---

## Question

`LibraryPage.tsx` and `EffortsCatalogPage.tsx` duplicate ~80% of their UI structure: sticky header integration, `WqlComposer` subheader wiring, URL query state synchronization, progressive batching (`useBatchedItems`), error banners, and empty-state remedies.

How do we consolidate these duplicate surfaces into a single deep `QueriableStreamView` component that:
1. Takes a `StreamProfile` (route path, default WQL query, title, subtitle, scope lock, projection profile).
2. Connects to `StreamQueryEngine` (ticket 001) for unified execution across notes, efforts, and rows.
3. Renders either the progressive Date Group Stream or the Property Table layout based on active view settings (ticket 002).
4. Provides a discrete "View Settings" modal dialog (gear/sliders button in the header action bar) allowing athletes to customize visible fields and toggle stream vs table view modes.
5. Preserves all sticky boundaries, progressive DOM batching, and search palette integrations.
