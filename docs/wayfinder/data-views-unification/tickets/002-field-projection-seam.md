---
state: open
assignee: null
labels: [wayfinder:prototype]
title: "FieldProjection seam and view configuration model"
blocked-by: []
---

## Question

`LibraryRow`, `EffortRow`, and `OutputStatementsTable` each hardcode their presentation of badges, titles, and metrics. There is no mechanism to customize which properties are emphasized when viewing data at different entity levels (`note`, `session`, `result`, `segment`, `effort`).

How do we design a minimal, deep `FieldProjection` seam and view settings model that:
1. Defines the available and default visible fields for each entity level:
   - **Note level**: title, tags, text excerpt, catalog source, date.
   - **Session level**: title, protocol, movements, target duration, session load.
   - **Result level**: title, elapsed time, total tonnage, TIS score, PR badges.
   - **Segment level**: split duration, round/lap index, reps, load, pacing/heart rate tier.
   - **Effort level**: label, canonical slug, discipline, MET score, intensity tier, aliases.
2. Supports layout projection into either a **Card Stream** (`LibraryRow`) or a **Property Table** (`OutputStatementsTable` / `WqlTable`) dynamically adapted to the active entity's fields.
3. Keeps configuration tucked away behind a clean, uncluttered "View Settings" modal/dialog rather than crowding the sticky header.
4. Persists the user's field and layout preferences cleanly per view route in client storage.
