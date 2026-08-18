# @wod-wiki/ui

Interactive UI package for Whiteboard Language & WQL: CodeMirror extensions, state-free analytics widgets, and dashboard components.

## Features

- **15 State-Free Analytics Widgets**: `WqlTimeseries`, `WqlBars`, `WqlTable`, `TopList`, `StackedBar`, `GoalRings`, `ZoneDistribution`, `QueryValue`, `WidgetChart`, and more, consuming pure IR `QueryResult` data structures.
- **Injected QueryExecutor**: `DashboardView`, `useAnalyticsQueries`, and `QueryBlockView` accept an injected `QueryExecutor` with 0 IndexedDB/backend coupling.
- **CodeMirror Extensions**: Complete set of CodeMirror 6 extensions (`@wod-wiki/ui/extensions`) for autocomplete, linting, block previews, syntax hiding, theme, line IDs, and navigation.
- **Live Editor Preset**: `editorPreset(dialect)` helper to configure live CodeMirror instances without the app's full editor shell.
- **Consumer Dedupe Constant**: `CODEMIRROR_SINGLETON_DEPS` exported for Vite / bundler deduplication.

## Installation

```bash
bun add @wod-wiki/ui @wod-wiki/engine
```
