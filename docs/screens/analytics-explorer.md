# Screen: Analytics Explorer

- **Route:** `/dashboards` (legacy `/dashboard`, `/analytics/explorer`)
- **Host Component:** `apps/playground/app/views/analytics/AnalyticsExplorerPage.tsx`
- **Domain Models:** `EventRecord`, `Session`, `FieldCatalogEntry`, `FieldValueRecord`, `FieldSourceRecord`, `CatalogBackfillState`

---

## 1. Component & Service Dependencies

### Core UI Components
- `ExplorerCommandBar` (`apps/playground/app/views/analytics/ExplorerCommandBar.tsx`). Interactive WQL query input with real-time syntax checking.
- `WidgetFrame` (`@bitcobblers/wod-wiki-ui`). Responsive container hosting dynamic chart visualizations.
- `WqlBars`, `WqlTimeseries`, `RowsTable`, `QueryValue` (`@bitcobblers/wod-wiki-ui`). Visualization renders mapped from query AST.
- `ParsedQueryChips` (`apps/playground/app/views/analytics/ParsedQueryChips.tsx`). Interactive query anatomy chips.

### Services & Catalogs
- `queryService` (`apps/playground/src/services/queryService.ts`). Primary WQL execution engine.
- `startFieldCatalogBackfill` (`apps/playground/app/services/fieldCatalog.ts`). Background scanner populating field vocabulary.
- `useExplorerVocabulary` (`apps/playground/src/utils/analytics/useExplorerVocabulary.ts`). Autocomplete data provider.

---

## 2. Desktop View Layout (≥1024px)

- **Sticky Command Bar:**
  - WQL text input with keyboard shortcut hints.
  - Time range selector (weeks slider or preset pills).
  - Unit preference toggle (Imperial / Metric).
  - "Save to Dashboard" action button.
- **Main Widget Frame:** Dynamic chart presentation taking primary focus.
- **Inspection Disclosures:**
  - "Inspect Pipeline": Displays AST tokens, filter tree, and execution strategy.
  - "Records Table": Displays raw underlying fact rows from `events`.

---

## 3. Mobile View Layout (<1024px)

- **Header:** Sticky page header hidden. Title displayed in top navbar.
- **Visual Chart:** Full-bleed mobile chart with touch tooltips and crosshairs.
- **Bottom Thumb Composer:** Tap on query footer opens the full-screen or bottom-sheet WQL composer.
- **Thumb Dock:** Quick unit switch and share buttons.

---

## 4. Composable Behaviors

- **Live Draft vs Submitted Split:**
  - Live query typing validates syntax and displays token chips without re-running expensive aggregations.
  - Hitting Enter or clicking Run dispatches the submitted query to `queryService`.
- **Adaptive Chart Selection:**
  - Aggregate queries render as bar charts or metric stat cards.
  - Time-bucketed queries automatically render as time series line charts.
  - Rows queries render as interactive tables.
