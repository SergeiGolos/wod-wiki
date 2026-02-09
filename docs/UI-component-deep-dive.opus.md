# WOD Wiki — UI Component Deep Dive

> **Generated**: 2026-02-09  
> **Scope**: All React components across `src/`, `tv/src/`, and `stories/`  
> **Total Components Analyzed**: ~95+ components, contexts, and hooks

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Screen / View Map](#2-screen--view-map)
3. [Component Inventory](#3-component-inventory)
   - [Application Shell & Layout](#31-application-shell--layout)
   - [Plan View Components](#32-plan-view-components)
   - [Track View Components](#33-track-view-components)
   - [Analyze View Components](#34-analyze-view-components)
   - [Unified Visualization System](#35-unified-visualization-system)
   - [Fragment & Statement Display](#36-fragment--statement-display)
   - [Clock & Timer Components](#37-clock--timer-components)
   - [Editor Components](#38-editor-components)
   - [Inline Card System](#39-inline-card-system)
   - [Runtime Test Bench](#310-runtime-test-bench)
   - [UI Primitives](#311-ui-primitives)
   - [Context Providers](#312-context-providers)
   - [Headless / Utility Components](#313-headless--utility-components)
   - [Testing Components](#314-testing-components)
   - [TV App (React Native)](#315-tv-app-react-native)
4. [Component Relationship Diagrams](#4-component-relationship-diagrams)
5. [Data Flow Analysis](#5-data-flow-analysis)
6. [Key Type Definitions](#6-key-type-definitions)
7. [Public API Surface](#7-public-api-surface)
8. [Custom Hooks](#8-custom-hooks)

---

## 1. Architecture Overview

The WOD Wiki frontend is a **three-view single-page application** built around a "sliding viewport" model:

| View                | Purpose          | Index Panel (left/secondary) | Primary Panel (right/main) |
| ------------------- | ---------------- | ---------------------------- | -------------------------- |
| **Plan**            | Author workouts  | Document structure index     | Monaco markdown editor     |
| **Track**           | Execute workouts | Execution history log        | Timer display + controls   |
| ==**Analyze**==[^1] | Review results   | Segment selection list       | Timeline chart + metrics   |

The component tree is structured as a deeply nested provider stack:

```
ThemeProvider
  └── CommandProvider
        └── WorkbenchProvider
              └── AudioProvider
                    └── RuntimeProvider
                          └── SlidingViewport (3-view layout)
```

### Key Architectural Patterns

- **Unified Visualization**: All list views (statements, history, segments) share a single `UnifiedItemList` → `UnifiedItemRow` pipeline via `IDisplayItem` normalization
- **Behavior-driven Runtime**: Runtime blocks carry behaviors (timer, sound, loop) that are mounted/unmounted via stack operations
- **Adapter Pattern**: Multiple data sources (parser output, runtime stack, execution spans, analytics segments) are adapted to `IDisplayItem[]` via converter functions
- **Render-prop Harnesses**: Test/demo components use render-props for flexible composition (`EnhancedTimerHarness`, `QueueTestHarness`)

---

## 2. Screen / View Map

### Main Application Screens

```
┌──────────────────────────────────────────────────────────────────┐
│  UnifiedWorkbench (full app shell)                               │
│  ┌───────────────────── Header ──────────────────────────────┐  │
│  │ CommitGraph │ [Plan] [Track] [Analyze] │ 🔊 🌙 🐛 ⌘. 🔗  │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────── SlidingViewport ─────────────────────────────┐  │
│  │                                                             │  │
│  │  ┌─ Plan ──────────────────────────────────────────────┐   │  │
│  │  │  MarkdownEditor (Monaco) │ WodIndexPanel (sidebar)  │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                             │  │
│  │  ┌─ Track ─────────────────────────────────────────────┐   │  │
│  │  │  TimerIndexPanel (log)   │ TimerDisplay (clock)     │   │  │
│  │  │  [or RuntimeDebugPanel]  │ + transport controls     │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                             │  │
│  │  ┌─ Analyze ──────────────────────────────────────────┐   │  │
│  │  │  AnalyticsIndexPanel     │ TimelineView (charts)    │   │  │
│  │  │  (segment list)          │ + metric toggles         │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│  ┌──────────── CommandPalette (Ctrl+.) ───────────────────────┐  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Developer/Testing Screens

| Screen                       | Entry Point                   | Purpose                                                                     |
| ---------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| **RuntimeTestBench**         | `RuntimeTestBench.tsx`        | Full IDE-like debugger for WOD scripts with editor, stack, memory, controls |
| **BlockTestBench**           | `BlockTestBench.tsx`          | Compact split-view for testing individual block compilation/execution       |
| ==**QueueTestHarness**==[^2] | `QueueTestHarness.tsx`        | Queue-based step-by-step runtime action testing with snapshot diffs         |
| **JitCompilerDemo**          | `JitCompilerDemo.tsx` (story) | Interactive visualization of JIT compilation pipeline                       |
| **UnifiedClockStory**        | stories/clock/                | Timer component testing with memory visualization                           |

### TV Application Screens (React Native)

| Screen | Component | Purpose |
|--------|-----------|---------|
| **Home** | `HomeScreen` | WebSocket connection + cast request listener |
| **Workout** | `WorkoutScreen` | Remote timer display receiving state updates |
| **Settings** | `SettingsScreen` | Placeholder |

---

## 3. Component Inventory

### 3.1 Application Shell & Layout

#### `UnifiedWorkbench`
- **File**: [src/components/layout/UnifiedWorkbench.tsx](src/components/layout/UnifiedWorkbench.tsx)
- **Props**: `extends Omit<MarkdownEditorProps, ...> + { initialContent?: string }`
- **Consumes**: `WorkbenchContext` (content, blocks, viewMode), runtime, analytics, editor instance
- **Produces**: Orchestrates all view mode transitions, runtime lifecycle, analytics, editor/block navigation
- **Children**: `ThemeProvider` → `CommandProvider` → `WorkbenchProvider` → `AudioProvider` → `RuntimeProvider` → `SlidingViewport` + header controls (`CommitGraph`, `AudioToggle`, `ThemeToggle`, `DebugButton`, `CommandPalette`)
- **Role**: **Top-level application shell**. Wraps all providers, composes the three-view workbench, manages runtime initialization/disposal, screen wake lock during execution, and responsive layout detection.

#### `SlidingViewport`
- **File**: [src/components/layout/SlidingViewport.tsx](src/components/layout/SlidingViewport.tsx)
- **Props**: `{ currentView: ViewMode, onViewChange, planPanel, trackIndexPanel, trackPrimaryPanel, trackDebugPanel?, analyzeIndexPanel, analyzePrimaryPanel, isDebugMode?, className? }`
- **Consumes**: `currentView`, `isDebugMode`, `window.innerWidth` for responsive breakpoints
- **Produces**: `onViewChange(view)` on Ctrl+Arrow keyboard navigation
- **Role**: Core responsive layout engine. Desktop: side-by-side panels (2/3 + 1/3). Tablet: stacked with bottom sheets. Mobile: full-screen slides. Supports keyboard navigation (Ctrl+Arrow) and debug mode.

#### `PlanPanel` (layout version)
- **File**: [src/components/layout/PlanPanel.tsx](src/components/layout/PlanPanel.tsx)
- **Props**: `{ editorPanel: ReactNode, items: DocumentItem[], activeBlockId?, expandedBlockIds?, onBlockClick?, onExpandChange?, onStartWorkout?, isMobile?, overlayVisible?, onOverlayToggle?, className? }`
- **Consumes**: `DocumentItem[]`, active/expanded states
- **Produces**: `onBlockClick`, `onExpandChange`, `onStartWorkout`, `onOverlayToggle`
- **Children**: `CollapsibleSection`, `StatementDisplay`, `OverlayPanel` (internal), editor panel (passthrough)
- **Role**: Plan view combining Monaco editor with collapsible workout overlay panel. Desktop: editor 2/3, index 1/3. Mobile: full-screen index.

#### `CollapsibleSection`
- **File**: [src/components/layout/CollapsibleSection.tsx](src/components/layout/CollapsibleSection.tsx)
- **Props**: `{ title, children, defaultExpanded?, expanded?, onExpandedChange?, icon?, badge?, actions?, level?: 1|2|3, bordered?, contentPadded?, className?, headerClassName?, contentClassName? }`
- **Consumes**: Controlled (`expanded`) or uncontrolled state
- **Produces**: `onExpandedChange(expanded)`
- **Role**: Reusable animated collapsible section with three heading levels and composable slots.

#### `WodIndexPanel`
- **File**: [src/components/layout/WodIndexPanel.tsx](src/components/layout/WodIndexPanel.tsx)
- **Props**: `{ items: DocumentItem[], activeBlockId?, highlightedBlockId?, onBlockClick, onBlockHover, mobile? }`
- **Consumes**: `DocumentItem[]` with headers and WOD blocks
- **Produces**: `onBlockClick(item)`, `onBlockHover(blockId | null)`
- **Role**: Document structure index showing headers and WOD blocks with preview text, click-to-navigate, and hover highlighting.

#### `WodWorkbench` (Legacy)
- **File**: [src/components/layout/WodWorkbench.tsx](src/components/layout/WodWorkbench.tsx)
- **Props**: `extends Omit<MarkdownEditorProps, ...> + { initialContent?: string }`
- **Role**: Legacy workbench implementation (pre-`UnifiedWorkbench`). Provides Edit/Run/Analyze modes with full-width transitions.

---

### 3.2 Plan View Components

#### `PlanPanel` (workbench version)
- **File**: [src/components/workbench/PlanPanel.tsx](src/components/workbench/PlanPanel.tsx)
- **Props**: `extends MarkdownEditorProps + { onEditorMount, onStartWorkout, setActiveBlockId, setBlocks, setContent, setCursorLine, highlightedLine, monacoTheme }`
- **Children**: `MarkdownEditorBase`
- **Role**: Wrapper mapping workbench state setters to editor callbacks. Used as Plan view panel in `UnifiedWorkbench`.

#### `MarkdownEditor` / `MarkdownEditorBase`
- **File**: [src/markdown-editor/MarkdownEditor.tsx](src/markdown-editor/MarkdownEditor.tsx)
- **Props**: `{ initialContent?, onContentChange?, onTitleChange?, showToolbar?, showContextOverlay?, readonly?, theme?, className?, height?, width?, editorOptions?, onMount?, onBlocksChange?, onActiveBlockChange?, onCursorPositionChange?, highlightedLine?, onStartWorkout? }`
- **Consumes**: Custom hooks: `useWodBlocks`, `useContextOverlay`, `useWodDecorations`, `useParseAllBlocks`, `useSmartIncrement`, `useMarkdownEditorSetup`, `useMonacoTheme`, `useRegisterCommand`, `useCommandPalette`
- **Produces**: `onContentChange(content)`, `onBlocksChange(blocks)`, `onActiveBlockChange(block)`, `onCursorPositionChange(line, col)`, `onStartWorkout(block)`
- **Children**: `Editor` (@monaco-editor/react), `WodBlockManager`, `CommandProvider`, `CommandPalette`
- **Role**: Full-page Monaco-based markdown editor with WOD block detection, decorations, section folding, command palette, and theme sync.

#### `WodBlockManager`
- **File**: [src/markdown-editor/components/WodBlockManager.tsx](src/markdown-editor/components/WodBlockManager.tsx)
- **Props**: `{ editor, monaco, blocks: WodBlock[], activeBlock: WodBlock | null, onBlocksParsed? }`
- **Consumes**: Monaco editor instance, WOD blocks
- **Produces**: Monaco editor decorations (block boundaries, glyph margins, active block highlighting)
- **Role**: Manages visual decorations for WOD blocks in the Monaco editor. Renders nothing to DOM.

#### `WorkoutOverlay`
- **File**: [src/components/workout/WorkoutOverlay.tsx](src/components/workout/WorkoutOverlay.tsx)
- **Props**: `{ editor, activeBlock, onStart, onEditStatement, onDeleteStatement }`
- **Children**: `WorkoutContextPanel` via `createPortal` into Monaco content widget
- **Role**: Renders `WorkoutContextPanel` as a Monaco editor overlay widget on the right side.

#### `WorkoutContextPanel`
- **File**: [src/components/workout/WorkoutContextPanel.tsx](src/components/workout/WorkoutContextPanel.tsx)
- **Props**: `{ block: WodBlock | null, mode: 'edit' | 'run' | 'analyze', showStartButton?, onStart?, onEditStatement?, onDeleteStatement?, activeStatementIds?, className? }`
- **Children**: `EditableStatementList`, `Button`
- **Role**: Multi-mode panel for workout context. Edit/Run/Analyze modes with statement editing and start button.

#### `EditableStatementList`
- **File**: [src/markdown-editor/components/EditableStatementList.tsx](src/markdown-editor/components/EditableStatementList.tsx)
- **Props**: `{ statements: ICodeStatement[], onAddStatement?, onEditStatement?, onDeleteStatement?, readonly?, activeStatementIds? }`
- **Children**: `FragmentVisualizer`, internal `StatementItem`, `StatementGroupItem`
- **Role**: Views and edits workout statements. Groups linked statements, supports inline editing via command palette.

#### `FragmentEditor`
- **File**: [src/markdown-editor/components/FragmentEditor.tsx](src/markdown-editor/components/FragmentEditor.tsx)
- **Props**: `{ statements: ICodeStatement[], onAddStatement?, onEditStatement?, onDeleteStatement? }`
- **Role**: Interactive controls for adding/editing workout fragments with quick-add buttons for common types.

#### `ContextPanel`
- **File**: [src/markdown-editor/components/ContextPanel.tsx](src/markdown-editor/components/ContextPanel.tsx)
- **Props**: `{ block: WodBlock, compact?, showEditor?, onAddStatement?, onEditStatement?, onDeleteStatement?, onTrack?, readonly?, mobile? }`
- **Children**: `EditableStatementList`, `WorkoutTimerDialog`, `Button`
- **Role**: Side panel for the markdown editor showing workout context, parsing status, errors, and the editable statement list.

#### `ContextOverlay` (Class)
- **File**: [src/markdown-editor/widgets/ContextOverlay.tsx](src/markdown-editor/widgets/ContextOverlay.tsx)
- **Constructor**: `(editor, block, callbacks?)`
- **Children**: `ContextPanel` rendered via `ReactMonacoWidget.renderComponent()`
- **Role**: Overlay widget rendering `ContextPanel` at the top-right corner of the Monaco editor.

#### `WorkoutTimerDialog`
- **File**: [src/markdown-editor/components/WorkoutTimerDialog.tsx](src/markdown-editor/components/WorkoutTimerDialog.tsx)
- **Props**: `{ open, onOpenChange, block: WodBlock }`
- **Children**: `Dialog`, `DialogContent`, `DialogHeader`, `Button`, transport icons
- **Role**: Simplified stopwatch dialog for quick workout execution with start/pause/stop/reset controls.

---

### 3.3 Track View Components

#### `TrackPanelIndex` / `TrackPanelPrimary`
- **File**: [src/components/workbench/TrackPanel.tsx](src/components/workbench/TrackPanel.tsx)
- **Props (Index)**: `Pick<TrackPanelProps, 'runtime' | 'activeSegmentIds' | 'activeStatementIds' | 'hoveredBlockKey' | 'isMobile' | 'execution'>`
- **Props (Primary)**: Full `TrackPanelProps` including all control callbacks
- **Children (Index)**: `TimerIndexPanel`
- **Children (Primary)**: `ClockRuntimeProvider` → (`TimerIndexPanel` on mobile + `TimerDisplay`) or `WodIndexPanel` fallback
- **Role**: Composite Track view panels. Index shows execution history; Primary renders timer display with controls, or workout selection fallback when no runtime.

#### `TimerDisplay`
- **File**: [src/components/workout/TimerDisplay.tsx](src/components/workout/TimerDisplay.tsx)
- **Props**: `{ elapsedMs, hasActiveBlock, onStart, onPause, onStop, onNext, isRunning, compact?, onBlockHover?, onBlockClick?, enableDisplayStack? }`
- **Hooks**: `useRuntimeContext`, `usePrimaryTimer`, `useSecondaryTimers`, `useStackTimers`, `useActiveControls`, `useStackDisplayItems`
- **Children**: `RefinedTimerDisplay`
- **Role**: Stack-driven timer display subscribing to runtime stack events and block memory. Implements timer pinning, calculates elapsed time from `TimeSpan` objects, maps runtime data to display props. Falls back to basic display without runtime.

#### `RefinedTimerDisplay`
- **File**: [src/components/workout/RefinedTimerDisplay.tsx](src/components/workout/RefinedTimerDisplay.tsx)
- **Props**: `{ elapsedMs, hasActiveBlock, onStart, onPause, onStop, onNext, onAction?, isRunning, primaryTimer?, secondaryTimers?, currentCard?, compact?, controls?, stackItems?, actions?, focusedBlockId?, timerStates? }`
- **Children**: SVG circular progress ring, `UnifiedItemRow`, `CardTimerPill` (internal), transport buttons, dynamic action buttons
- **Role**: **Main timer UI**. Renders large circular progress ring with countdown/countup, stack panel of current blocks with timer pills, and transport controls (play/pause/stop/next) plus dynamic action buttons.

#### `TimerIndexPanel`
- **File**: [src/components/layout/TimerIndexPanel.tsx](src/components/layout/TimerIndexPanel.tsx)
- **Props**: `{ runtime, activeSegmentIds?, activeStatementIds?, highlightedBlockKey?, autoScroll?, mobile?, className?, children?, workoutStartTime? }`
- **Children**: `RuntimeHistoryLog`
- **Role**: Thin wrapper around `RuntimeHistoryLog` for the Track view's index panel. Passes `showActive=false`.

#### `RuntimeHistoryLog`
- **File**: [src/components/history/RuntimeHistoryLog.tsx](src/components/history/RuntimeHistoryLog.tsx)
- **Props**: `{ runtime, activeStatementIds?, highlightedBlockKey?, autoScroll?, mobile?, className?, workoutStartTime?, showActive?, compact? }`
- **Hooks**: `useOutputStatements`, `useState`, `useEffect`, `useMemo`
- **Children**: `UnifiedItemList`
- **Role**: Displays live execution history from a `ScriptRuntime` via 10Hz polling. Sorts by start time and delegates to `UnifiedItemList`.

#### `ExecutionLogPanel`
- **File**: [src/components/workout/ExecutionLogPanel.tsx](src/components/workout/ExecutionLogPanel.tsx)
- **Props**: `{ runtime, historicalSegments?, activeSegmentId?, disableScroll?, scrollRef?, children? }`
- **Hooks**: `useOutputStatements`, `useMemo`
- **Children**: `UnifiedItemList`
- **Role**: Dual-mode execution history panel: **live mode** (from `ScriptRuntime` memory) or **historical mode** (from `Segment[]`).

#### `RuntimeDebugPanel` / `DebugButton`
- **File**: [src/components/workout/RuntimeDebugPanel.tsx](src/components/workout/RuntimeDebugPanel.tsx)
- **Props (Panel)**: `{ runtime, isOpen, onClose, highlightedBlockKey?, embedded?, className?, activeBlock?, activeStatementIds? }`
- **Props (Button)**: `{ isDebugMode, onClick, disabled? }`
- **Children (Panel)**: Tab bar (Parser/Stack), `WorkoutContextPanel`, inline memory tables, `MemoryValueDialog`, backdrop overlay
- **Role (Panel)**: Debug inspection showing runtime stack state and parser output. Slide-out overlay or embedded inline modes. Subscribes to stack/output/tick events.
- **Role (Button)**: Toggle button with bug icon and green pulse indicator. Syncs `RuntimeLogger` enable/disable.

#### `RuntimeHistoryPanel`
- **File**: [src/components/workout/RuntimeHistoryPanel.tsx](src/components/workout/RuntimeHistoryPanel.tsx)
- **Role**: **Placeholder/stub** — not yet implemented.

---

### 3.4 Analyze View Components

#### `AnalyzePanelIndex` / `AnalyzePanelPrimary`
- **File**: [src/components/workbench/AnalyzePanel.tsx](src/components/workbench/AnalyzePanel.tsx)
- **Props (Index)**: `Pick<AnalyzePanelProps, 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'mobile' | 'groups'>`
- **Props (Primary)**: `Pick<AnalyzePanelProps, 'rawData' | 'segments' | 'selectedSegmentIds' | 'onSelectSegment' | 'groups'>`
- **Children (Index)**: `AnalyticsIndexPanel`
- **Children (Primary)**: `TimelineView`
- **Role**: Thin wrappers splitting the Analyze view for `SlidingViewport`. Index = segment list, Primary = timeline chart.

#### `AnalyticsIndexPanel`
- **File**: [src/components/layout/AnalyticsIndexPanel.tsx](src/components/layout/AnalyticsIndexPanel.tsx)
- **Props**: `{ segments: Segment[], groups?: AnalyticsGroup[], selectedSegmentIds?, onSelectSegment?, mobile?, className? }`
- **Children**: `UnifiedItemList`, mobile header, selection info footer
- **Role**: Segment selection panel for the Analyze view. Converts `Segment[]` into `IDisplayItem[]` with metric fragments (power, HR, duration) and renders via `UnifiedItemList`.

#### `AnalyticsHistoryPanel`
- **File**: [src/components/workout/AnalyticsHistoryPanel.tsx](src/components/workout/AnalyticsHistoryPanel.tsx)
- **Props**: `{ segments: Segment[], selectedSegmentIds?, onSelectSegment?, compact?, className? }`
- **Children**: `UnifiedItemList`, selection info footer
- **Role**: Historical execution view for the Analyze screen. Converts `Segment[]` to display items with depth calculation and metric fragment generation.

#### `TimelineView`
- **File**: [src/timeline/TimelineView.tsx](src/timeline/TimelineView.tsx)
- **Props**: `{ rawData: any[], segments: Segment[], selectedSegmentIds: Set<number>, onSelectSegment, groups?: AnalyticsGroup[] }`
- **Children**: Recharts (`LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `ReferenceArea`, `Brush`), Lucide icons
- **Hooks**: `useState`, `useMemo`
- **Role**: Comprehensive segment analysis with switchable timeline/overlay chart, metric toggles (power, HR, cadence), and details table with computed metrics and intensity labels.

---

### 3.5 Unified Visualization System

The unified visualization system normalizes all list data into `IDisplayItem` for consistent rendering:

```
Parser Output (ICodeStatement[])  ──→ statementsToDisplayItems()  ──┐
Runtime Spans (OutputStatement[]) ──→ outputStatementToDisplayItem() ┼──→ IDisplayItem[] ──→ UnifiedItemList
Runtime Blocks (IRuntimeBlock[])  ──→ blockToDisplayItem()          ┤                          └── UnifiedItemRow
Analytics Segments (Segment[])    ──→ (custom mapping per panel)    ──┘
```

#### `UnifiedItemList`
- **File**: [src/components/unified/UnifiedItemList.tsx](src/components/unified/UnifiedItemList.tsx)
- **Props**: `{ items: IDisplayItem[], activeItemId?, selectedIds?, size?, filter?, compact?, showTimestamps?, showDurations?, groupLinked?, autoScroll?, scrollBehavior?, renderActions?, onSelectionChange?, onHover?, className?, emptyMessage?, maxHeight? }`
- **Children**: `UnifiedItemRow` per item, `LinkedGroup` (internal wrapper)
- **Role**: **Core scrollable list**. Auto-scrolls to active items, groups linked items, manages selection/highlighting, and shows empty state.

#### `UnifiedItemRow`
- **File**: [src/components/unified/UnifiedItemRow.tsx](src/components/unified/UnifiedItemRow.tsx)
- **Props**: `{ item: IDisplayItem, isSelected?, isHighlighted?, size?, filter?, compact?, showTimestamp?, showDuration?, actions?, onClick?, onHover?, className? }`
- **Children**: `FragmentVisualizer`, `StatusDot` (internal), timestamp/duration columns, action slot
- **Role**: Single `IDisplayItem` row with status dot, depth-based indentation, fragment visualization, optional timing columns, and action slots.

---

### 3.6 Fragment & Statement Display

#### `FragmentVisualizer`
- **File**: [src/views/runtime/FragmentVisualizer.tsx](src/views/runtime/FragmentVisualizer.tsx)
- **Props**: `{ fragments: ICodeFragment[], error?: ParseError, className?, size?: 'compact' | 'normal' | 'focused', filter?, compact? }`
- **Role**: **Core visualization atom**. Renders parsed code fragments as color-coded inline badges with icons. Supports filtering by type/name/origin, three size variants, and error states. `React.memo` wrapped.

#### `StatementDisplay`
- **File**: [src/components/fragments/StatementDisplay.tsx](src/components/fragments/StatementDisplay.tsx)
- **Props**: `{ statement: ICodeStatement, isActive?, isGrouped?, compact?, actions?, className?, onClick? }`
- **Children**: `FragmentVisualizer`
- **Role**: Renders a single workout statement with color-coded fragments. Supports active highlighting, grouped/standalone modes, and action slots.

#### `BlockDisplay`
- **File**: [src/components/fragments/StatementDisplay.tsx](src/components/fragments/StatementDisplay.tsx) (same file)
- **Props**: `{ label, blockType, metrics?: ICodeFragment[], status?, depth?, isHighlighted?, isActive?, compact?, actions?, className?, onClick?, onMouseEnter?, onMouseLeave? }`
- **Children**: `FragmentVisualizer`, status dot, label, block type badge
- **Role**: Renders a runtime block with status indicator, depth-based indentation, metric fragments, and block-type badge.

#### `FragmentList`
- **File**: [src/components/fragments/StatementDisplay.tsx](src/components/fragments/StatementDisplay.tsx) (same file)
- **Props**: `{ fragments: ICodeFragment[], compact?, className? }`
- **Children**: `FragmentVisualizer`
- **Role**: Simple wrapper rendering `ICodeFragment[]` via `FragmentVisualizer`.

#### `WodScriptVisualizer`
- **File**: [src/components/WodScriptVisualizer.tsx](src/components/WodScriptVisualizer.tsx)
- **Props**: `{ statements: ICodeStatement[], showTimestamps?, showDurations?, autoScroll?, selectedLine?, highlightedLine?, size?, filter?, compact?, onSelectionChange?, renderActions?, className?, maxHeight? }`
- **Children**: `UnifiedItemList`
- **Role**: Converts `ICodeStatement[]` into unified display items via `statementsToDisplayItems()` adapter and renders via `UnifiedItemList`. Bridge between parser output and unified visualization.

#### `ParsedView`
- **File**: [src/components/ParsedView.tsx](src/components/ParsedView.tsx)
- **Props**: `{ wodscript: string, className?, size? }`
- **Children**: `WodScriptVisualizer` or error `<div>`
- **Role**: Parses raw WOD script text via Chevrotain (lex→parse→visit) into `ICodeStatement[]` and renders via `WodScriptVisualizer`.

---

### 3.7 Clock & Timer Components

#### `StackedClockDisplay`
- **File**: [src/clock/components/StackedClockDisplay.tsx](src/clock/components/StackedClockDisplay.tsx)
- **Props**: `{ className?, showStackDebug?, onButtonClick?, onPlay?, onPause?, onReset?, isRunning? }`
- **Hooks**: `useRuntimeContext`, `useStackTimers`, `usePrimaryTimer`, `useSecondaryTimers`, `useStackDisplayItems`, `useActiveControls`, `useStackBlocks`
- **Children**: `SecondaryTimersSection`, `PrimaryTimerSection`, `CardSection` (resolves card components from `CardComponentRegistry`), `StackDebugView` (internal)
- **Role**: **Full-featured clock UI** rendering the complete timer stack: secondary timer cards, primary clock, control buttons, activity card, and optional debug view.

Internal sub-components (same file):
| Component | Purpose |
|-----------|---------|
| `SecondaryTimersSection` | Floating timer cards (desktop) or rows (mobile) for non-primary timers |
| `SecondaryTimerCard` | Individual secondary timer display |
| `PrimaryTimerSection` | Main large clock display |
| `CardSection` | Resolves and renders activity cards from a registry |
| `StackDebugView` | Debug visualization of internal stack state |

#### `DigitalClock`
- **File**: [src/clock/components/DigitalClock.tsx](src/clock/components/DigitalClock.tsx)
- **Props**: `{ blockKey, title?, duration?, timerType?, currentRound?, metrics?, nextCardLabel? }`
- **Hooks**: `useTimerElapsed(blockKey)`
- **Children**: `Card`, `CardContent`, `CardHeader`, `Badge`
- **Role**: Standalone digital clock for half-screen layouts. Attaches to runtime via `blockKey`, shows digital time, optional countdown progress, and metrics.

#### `TimeDisplay`
- **File**: [src/clock/components/TimeDisplay.tsx](src/clock/components/TimeDisplay.tsx)
- **Props**: `{ timeUnits: TimeValue[] }` where `TimeValue = { value: string, label: string }`
- **Children**: `TimeUnit`
- **Role**: Renders a row of `TimeUnit` components separated by colons (e.g., HH:MM:SS).

#### `TimeUnit`
- **File**: [src/clock/components/TimeUnit.tsx](src/clock/components/TimeUnit.tsx)
- **Props**: `{ value: string, label: string }`
- **Role**: Presentational — single time unit (number in rounded box + label).

#### `EnhancedTimerHarness`
- **File**: [src/clock/components/EnhancedTimerHarness.tsx](src/clock/components/EnhancedTimerHarness.tsx)
- **Props**: `{ timerType: 'countdown' | 'countup', durationMs, autoStart?, timeSpans?, children: (harness) => ReactNode }`
- **Children**: `RuntimeProvider` wrapping `children` render-prop
- **Role**: Test harness creating a minimal runtime with behavior-based timer block. Render-prop pattern passes `{ runtime, blockKey, block, timerState, controls, isRunning, recalculateElapsed }` to children.

Also exports: `MemoryCard` (memory state display) and `TimerControls` (start/stop/pause/resume/reset buttons).

#### `TimerMemoryVisualization`
- **File**: [src/clock/TimerMemoryVisualization.tsx](src/clock/TimerMemoryVisualization.tsx)
- **Props**: `{ timeSpansRef, isRunningRef, blockKey, onMemoryHover?, isHighlighted? }`
- **Hooks**: `useMemorySubscription(timeSpansRef)`, `useMemorySubscription(isRunningRef)`
- **Role**: Displays timer memory allocations (time spans, running state) in a structured card.

#### `BlockTimerDisplay`
- **File**: [src/runtime/components/BlockTimerDisplay.tsx](src/runtime/components/BlockTimerDisplay.tsx)
- **Props**: `{ block: IRuntimeBlock | undefined, className?, showRounds?, compact? }`
- **Hooks**: `useTimerDisplay(block)`, `useRoundDisplay(block)`
- **Role**: Timer display using behavior-based hooks. 60fps animation, automatic countdown/countup detection, round display, zero polling for completed timers.

#### Clock Anchor Components

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `ClockAnchor` | [src/clock/anchors/ClockAnchor.tsx](src/clock/anchors/ClockAnchor.tsx) | `{ blockKey, title?, description?, duration?, showProgress?, showControls?, workoutType?, currentRound?, onPlay?, onPause?, onReset?, onRoundComplete?, isRunning? }` | Full clock card with title, progress bar, round counter, control buttons |
| `LabelAnchor` | [src/clock/anchors/LabelAnchor.tsx](src/clock/anchors/LabelAnchor.tsx) | `{ span?: CollectionSpan, template?, variant?, className? }` | Renders workout fragment data with styled badges and `{{key}}` template resolution |
| `MetricAnchor` | [src/clock/anchors/MetricAnchor.tsx](src/clock/anchors/MetricAnchor.tsx) | `{ span?, sourceId?, metricType?, aggregator? }` | Aggregates numeric values from fragment arrays (sum/avg/min/max/count) |

#### Default Card Components
- **File**: [src/clock/cards/DefaultCards.tsx](src/clock/cards/DefaultCards.tsx)
- **Shared Props**: `CardComponentProps = { entry: IDisplayCardEntry, onButtonClick? }`

| Card | Purpose |
|------|---------|
| `IdleStartCard` | "Start Workout" button with gradient background |
| `IdleCompleteCard` | Completion message with "View Analytics" button |
| `ActiveBlockCard` | Current block metrics (reps, weight, distance) with color-coded badges and action buttons |
| `RestPeriodCard` | Rest period display with optional skip button |
| `FallbackCard` | Unknown card type fallback |

---

### 3.8 Editor Components

#### `WodWiki`
- **File**: [src/editor/WodWiki.tsx](src/editor/WodWiki.tsx)
- **Props**: `{ id, code?, cursor?, onValueChange?, onMount?, readonly?, highlightedLine?, onLineClick?, exerciseProvider?, theme? }`
- **Hooks**: `useRef` (×5), `useState`, `useEffect` (×5), `useMonacoTheme`, `useEditorResize`
- **Children**: `Editor` (@monaco-editor/react)
- **Role**: **Top-level WOD editor component**. Wraps Monaco with custom WOD syntax highlighting, semantic tokens, inlay hints, exercise suggestions/hover, rich markdown rendering, cursor/line highlighting decorations.

#### `WodWikiSyntaxInitializer` (Class)
- **File**: [src/editor/WodWikiSyntaxInitializer.tsx](src/editor/WodWikiSyntaxInitializer.tsx)
- **Constructor**: `(tokenEngine, suggestionEngine, onChange?, editorId?, readonly?)`
- **Role**: Orchestrator registering all Monaco language services (syntax, tokens, completions, hover, inlay hints). Parses editor content via `MdTimerRuntime.read()` on changes.

#### `SemantcTokenEngine` (Class)
- **File**: [src/editor/SemantcTokenEngine.tsx](src/editor/SemantcTokenEngine.tsx)
- **Constructor**: `(tokens: WodWikiToken[])`
- **Role**: Encodes parsed WOD fragments into Monaco's delta-encoded semantic token format for syntax highlighting (durations, reps, resistance, distance, effort, rounds).

#### `SuggestionEngine` (Class)
- **File**: [src/editor/SuggestionEngine.tsx](src/editor/SuggestionEngine.tsx)
- **Constructor**: `(suggestionService: SuggestionService)`
- **Role**: Provides Monaco code-completion items from a `SuggestionService`, formatted as snippet completion items.

---

### 3.9 Inline Card System

All inline cards are rendered within the Monaco editor via `RichMarkdownManager` and `CardContainer`.

#### `CardContainer`
- **File**: [src/editor/inline-cards/components/CardContainer.tsx](src/editor/inline-cards/components/CardContainer.tsx)
- **Props**: `{ card: InlineWidgetCard, callbacks: CardCallbacks, monaco? }`
- **Role**: Router/dispatcher rendering the appropriate card preview based on `card.cardType`. Suppresses rendering in `edit-only` mode.

Routes to:

| Card Type | Component | Content Type | Key Data |
|-----------|-----------|-------------|----------|
| `heading` | `HeadingPreview` | `{ level: 1-6, text }` | Heading text with level-appropriate typography |
| `blockquote` | `BlockquotePreview` | `{ text }` | Quote text with accent border |
| `image` | `ImagePreview` | `{ url, alt }` | Image with error handling and alt caption |
| `youtube` | `YouTubePreview` | `{ embedUrl, videoId }` | Responsive 16:9 iframe embed |
| `frontmatter` | `FrontMatterCard` | `{ properties, rawYaml }` | YAML properties table with side-by-side raw view |
| `wod-block` | `WodBlockCard` | `{ statements, rawCode, parseState }` | Split-view: mini Monaco editor + live parsed preview with "Run Workout" button |

#### `CardHeader`
- **File**: [src/editor/inline-cards/components/CardHeader.tsx](src/editor/inline-cards/components/CardHeader.tsx)
- **Props**: `{ cardType, title?, icon?, className? }`
- **Role**: Gradient header bar with type-specific icon and title.

#### `CardFooter`
- **File**: [src/editor/inline-cards/components/CardFooter.tsx](src/editor/inline-cards/components/CardFooter.tsx)
- **Props**: `{ cardType, actions?: FooterAction[], onAction?, className? }`
- **Role**: Action button bar (start-workout, edit, expand/collapse).

---

### 3.10 Runtime Test Bench

#### `RuntimeTestBench`
- **File**: [src/runtime-test-bench/RuntimeTestBench.tsx](src/runtime-test-bench/RuntimeTestBench.tsx)
- **Props**: `{ initialCode?, onCodeChange?, className? }`
- **Children**: `TestBenchProvider` → `TestBenchLayout`
- **Role**: Full IDE-like debugger with all panels. Parses WOD scripts, compiles to runtime, enables step/play/pause/stop/reset execution.

#### `TestBenchLayout`
- **File**: [src/runtime-test-bench/components/TestBenchLayout.tsx](src/runtime-test-bench/components/TestBenchLayout.tsx)
- **Props**: `{ status, elapsedTime, onCodeChange, onCompile, onExecute, onPause, onStop, onReset, onStep, className? }`
- **Children**: `Toolbar`, `EditorPanel`, `CompilationPanel`, `RuntimeStackPanel`, `MemoryPanel`, `ControlsPanel`, `StatusFooter`
- **Role**: Layout orchestrator arranging six panels in a responsive grid with cross-panel highlighting.

| Panel | File | Purpose |
|-------|------|---------|
| `Toolbar` | [src/runtime-test-bench/components/Toolbar.tsx](src/runtime-test-bench/components/Toolbar.tsx) | Top nav with branding, navigation tabs, action buttons (compile/run/pause/stop/reset/step) |
| `EditorPanel` | [src/runtime-test-bench/components/EditorPanel.tsx](src/runtime-test-bench/components/EditorPanel.tsx) | Wraps `WodWiki` Monaco editor with status badges, error display, suggestion buttons |
| `CompilationPanel` | [src/runtime-test-bench/components/CompilationPanel.tsx](src/runtime-test-bench/components/CompilationPanel.tsx) | Tabbed output: parsed statements with `FragmentVisualizer` on "Output" tab, errors/warnings + compilation log on "Errors" tab |
| `RuntimeStackPanel` | [src/runtime-test-bench/components/RuntimeStackPanel.tsx](src/runtime-test-bench/components/RuntimeStackPanel.tsx) | Hierarchical runtime block stack as a tree with status indicators, fragment visualizations, hover/click highlighting |
| `MemoryPanel` | [src/runtime-test-bench/components/MemoryPanel.tsx](src/runtime-test-bench/components/MemoryPanel.tsx) | Filterable, groupable memory entries table with status indicators and click-to-inspect dialog |
| `ControlsPanel` | [src/runtime-test-bench/components/ControlsPanel.tsx](src/runtime-test-bench/components/ControlsPanel.tsx) | Play/pause/stop/reset buttons, step mode toggle, status indicator lights |
| `StatusFooter` | [src/runtime-test-bench/components/StatusFooter.tsx](src/runtime-test-bench/components/StatusFooter.tsx) | Status bar with execution state badge, cursor position, block count, elapsed time |

#### Memory Inspection Components

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `MemoryValueDialog` | [MemoryValuePopover.tsx](src/runtime-test-bench/components/MemoryValuePopover.tsx) | `{ data, isOpen, onClose }` | Modal showing syntax-highlighted JSON, type badges, validity status |
| `MemoryValueCell` | (same file) | `{ data, onClick, className? }` | Clickable truncated value that opens the dialog |

#### `BlockTestBench`
- **File**: [src/runtime-test-bench/components/BlockTestBench.tsx](src/runtime-test-bench/components/BlockTestBench.tsx)
- **Props**: `{ initialScript?, className? }`
- **Children**: `EditorPanel`, `RuntimeStackPanel`/`MemoryPanel` (togglable), `BlockTestControls`, `ResultsTable`
- **Role**: Compact block-level test bench with editor ↔ stack/memory ↔ results layout.

| Sub-component | File | Purpose |
|---------------|------|---------|
| `BlockTestControls` | [BlockTestControls.tsx](src/runtime-test-bench/components/BlockTestControls.tsx) | Start/Pause/Resume/Restart/Step buttons |
| `ResultsTable` | [ResultsTable.tsx](src/runtime-test-bench/components/ResultsTable.tsx) | Execution history table of runtime spans with metrics |

---

### 3.11 UI Primitives

All in [src/components/ui/](src/components/ui/):

| Component                                                   | File                                                     | Variants                                                                             | Base                                      |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| `Button`                                                    | [button.tsx](src/components/ui/button.tsx)               | default, destructive, outline, secondary, ghost, link × sizes: default, sm, lg, icon | CVA + Radix Slot                          |
| `Badge`                                                     | [badge.tsx](src/components/ui/badge.tsx)                 | default, secondary, destructive, outline                                             | CVA                                       |
| `Card` (+ Header, Footer, Title, Description, Content)      | [card.tsx](src/components/ui/card.tsx)                   | —                                                                                    | Semantic HTML + Tailwind                  |
| `Progress`                                                  | [progress.tsx](src/components/ui/progress.tsx)           | —                                                                                    | Radix UI Progress                         |
| `Label`                                                     | [label.tsx](src/components/ui/label.tsx)                 | —                                                                                    | Radix UI Label                            |
| `DropdownMenu` (+ Trigger, Content, Item, Label, Separator) | [dropdown-menu.tsx](src/components/ui/dropdown-menu.tsx) | align: start, center, end                                                            | Custom (no Radix)                         |
| `CommitGraph`                                               | [CommitGraph.tsx](src/components/ui/CommitGraph.tsx)     | —                                                                                    | Canvas-rasterized text → CSS grid heatmap |

---

### 3.12 Context Providers

| Provider | File | Context Value | Purpose |
|----------|------|---------------|---------|
| `ThemeProvider` | [ThemeProvider.tsx](src/components/theme/ThemeProvider.tsx) | `{ theme: 'dark'\|'light'\|'system', setTheme }` | Manages dark/light/system theme with localStorage persistence |
| `AudioProvider` | [AudioContext.tsx](src/components/audio/AudioContext.tsx) | `{ isEnabled, toggleAudio, playTestSound }` | Audio enable/disable state wrapping `audioService` singleton |
| `CommandProvider` | [CommandContext.tsx](src/components/command-palette/CommandContext.tsx) | `{ registerCommand, commands, isOpen, setIsOpen, activeContext, search, setSearch, activeStrategy, setStrategy }` | Command palette system with Ctrl+. shortcut, command registration, strategy management |
| `WorkbenchProvider` | [WorkbenchContext.tsx](src/components/layout/WorkbenchContext.tsx) | `{ content, blocks, activeBlockId, selectedBlockId, viewMode, results, set*, selectBlock, startWorkout, completeWorkout }` | Document state, view navigation, block selection, workout results |
| `RuntimeProvider` (layout) | [RuntimeProvider.tsx](src/components/layout/RuntimeProvider.tsx) | `{ runtime, isInitializing, error, initializeRuntime, disposeRuntime }` | Runtime lifecycle management via `IRuntimeFactory` injection |
| `RuntimeProvider` (clock) | [RuntimeContext.tsx](src/runtime/context/RuntimeContext.tsx) | `IScriptRuntime` | Direct runtime context for clock/timer components |
| `TestBenchProvider` | [TestBenchContext.tsx](src/runtime-test-bench/context/TestBenchContext.tsx) | `{ state: TestBenchContextState, dispatch }` | Reducer-based state management for test bench (code, parse results, snapshot, log, selected line) |

---

### 3.13 Headless / Utility Components

#### `Dialog` System
- **File**: [src/components/headless/Dialog.tsx](src/components/headless/Dialog.tsx)
- **Components**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- **Built on**: Headless UI `Dialog` + `Transition`
- **Role**: Animated modal dialog with composable sub-components.

#### `ThemeToggle`
- **File**: [src/components/theme/ThemeToggle.tsx](src/components/theme/ThemeToggle.tsx)
- **Role**: Sun/Moon icon button cycling dark ↔ light themes.

#### `AudioToggle`
- **File**: [src/components/audio/AudioToggle.tsx](src/components/audio/AudioToggle.tsx)
- **Role**: Volume icon button toggling audio on/off.

#### `CommandPalette`
- **File**: [src/components/command-palette/CommandPalette.tsx](src/components/command-palette/CommandPalette.tsx)
- **Built on**: `cmdk` library
- **Role**: Ctrl+. command palette with grouped/filtered commands and pluggable input strategies.

---

### 3.14 Testing Components

#### `QueueTestHarness`
- **File**: [src/testing/components/QueueTestHarness.tsx](src/testing/components/QueueTestHarness.tsx)
- **Props**: `{ initialScript?, initialTemplate?, customTemplates?, onExecutionComplete?, className?, showRuntimeView?, layout? }`
- **Children**: `SnapshotDiffViewer`, `SnapshotDiffSummary`, `RuntimeProvider` → `StackedClockDisplay`
- **Role**: Queue-based step-by-step runtime action testing. Parses WOD scripts, builds action queues (push/mount/next/unmount/pop/tick/simulate), executes step-by-step or all-at-once, and visualizes stack/memory diffs. Includes 3 default test templates.

#### `SnapshotDiffViewer` / `SnapshotDiffSummary` / `ModifiedValuesViewer`
- **File**: [src/testing/components/SnapshotDiffViewer.tsx](src/testing/components/SnapshotDiffViewer.tsx)
- **Props (Viewer)**: `{ diff: SnapshotDiff, className? }`
- **Props (Summary)**: `{ diff: SnapshotDiff, className? }`
- **Role**: Visual side-by-side diff (green/red/yellow) for before/after runtime snapshots. Summary shows change counts.

---

### 3.15 TV App (React Native)

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `App` | [tv/src/App.tsx](tv/src/App.tsx) | — | Root navigator with 3 screens via React Navigation stack |
| `HomeScreen` | [tv/src/screens/HomeScreen.tsx](tv/src/screens/HomeScreen.tsx) | — | WebSocket connection status + cast request listener. Navigates to `WorkoutScreen` on `castRequest` event |
| `WorkoutScreen` | [tv/src/screens/WorkoutScreen.tsx](tv/src/screens/WorkoutScreen.tsx) | route params: `{ sessionId, workout }` | Remote timer display receiving `stateUpdate` events via WebSocket |
| `SettingsScreen` | [tv/src/screens/SettingsScreen.tsx](tv/src/screens/SettingsScreen.tsx) | — | Placeholder |

**Communication**: `TVWebSocketService` singleton → relay server (`ws://10.0.2.2:8080`) → events: `castRequest`, `stateUpdate`, `castStop`

---

## 4. Component Relationship Diagrams

### Main Application Component Tree

```
UnifiedWorkbench
├── ThemeProvider ─── useTheme()
│   └── ThemeToggle
├── CommandProvider ─── useCommandPalette(), useRegisterCommand()
│   └── CommandPalette
├── WorkbenchProvider ─── useWorkbench()
├── AudioProvider ─── useAudio()
│   └── AudioToggle
├── RuntimeProvider ─── runtime lifecycle
│
├── Header
│   ├── CommitGraph (logo)
│   ├── ViewMode Buttons [Plan | Track | Analyze]
│   ├── DebugButton
│   ├── AudioToggle
│   ├── ThemeToggle
│   └── GitHub Link
│
└── SlidingViewport
    ├── Plan View
    │   └── PlanPanel (workbench)
    │       └── MarkdownEditorBase
    │           ├── Editor (Monaco) ← WodWiki engine
    │           ├── WodBlockManager (decorations)
    │           └── inline CardContainer
    │               ├── HeadingPreview
    │               ├── BlockquotePreview
    │               ├── ImagePreview
    │               ├── YouTubePreview
    │               ├── FrontMatterCard
    │               └── WodBlockCard
    │
    ├── Track View
    │   ├── TrackPanelIndex
    │   │   └── TimerIndexPanel
    │   │       └── RuntimeHistoryLog
    │   │           └── UnifiedItemList
    │   │               └── UnifiedItemRow
    │   │                   └── FragmentVisualizer
    │   │
    │   ├── TrackPanelPrimary
    │   │   ├── (runtime active)
    │   │   │   └── TimerDisplay
    │   │   │       └── RefinedTimerDisplay
    │   │   │           ├── SVG Progress Ring
    │   │   │           ├── UnifiedItemRow (stack items)
    │   │   │           └── Transport Controls
    │   │   └── (no runtime)
    │   │       └── WodIndexPanel (workout selector)
    │   │
    │   └── RuntimeDebugPanel (optional)
    │       ├── WorkoutContextPanel (Parser tab)
    │       └── Stack View (Stack tab)
    │
    └── Analyze View
        ├── AnalyzePanelIndex
        │   └── AnalyticsIndexPanel
        │       └── UnifiedItemList
        │
        └── AnalyzePanelPrimary
            └── TimelineView (Recharts)
```

### Unified Visualization Pipeline

```
┌─────────────────────┐
│   Data Sources       │
├─────────────────────┤
│ ICodeStatement[]     │──→ statementsToDisplayItems()
│ OutputStatement[]    │──→ outputStatementToDisplayItem()
│ IRuntimeBlock[]      │──→ blockToDisplayItem()
│ Segment[]            │──→ (custom per panel)
└─────────────────────┘
           │
           ▼
    IDisplayItem[]
    {
      id, label, fragments[],
      status, depth, isHeader,
      startTime?, endTime?,
      duration?, linkedIds?,
      origin, sourceId?
    }
           │
           ▼
┌─────────────────────┐
│  UnifiedItemList     │ ← auto-scroll, grouping, selection
│  └── UnifiedItemRow  │ ← status dot, indentation, timing
│      └── Fragment-   │
│         Visualizer   │ ← color-coded inline badges
└─────────────────────┘
```

### Context Provider Dependency Graph

```
ThemeProvider (localStorage, system preference)
    │
    ├──→ useTheme() → ThemeToggle, CommitGraph, useMonacoTheme
    │
CommandProvider (keyboard shortcuts, commands)
    │
    ├──→ useCommandPalette() → CommandPalette, EditableStatementList
    ├──→ useRegisterCommand() → MarkdownEditorBase
    │
WorkbenchProvider (document state, view navigation)
    │
    ├──→ useWorkbench() → UnifiedWorkbench
    │
AudioProvider (audio service)
    │
    ├──→ useAudio() → AudioToggle
    │
RuntimeProvider (ScriptRuntime lifecycle)
    │
    ├──→ runtime context → TimerDisplay, StackedClockDisplay,
    │                       RuntimeDebugPanel, ExecutionLogPanel,
    │                       RuntimeHistoryLog, all timer hooks
    │
TestBenchProvider (reducer state)
    │
    ├──→ useTestBenchContext() → All test bench panels
```

---

## 5. Data Flow Analysis

### Plan → Track Transition

```
1. User writes WOD script in MarkdownEditor
2. MarkdownEditor parses content → WodBlock[] (via useWodBlocks hook)
3. User clicks "Start Workout" on a WodBlock
4. WorkbenchProvider.startWorkout(block) → sets selectedBlockId, switches viewMode to 'track'
5. UnifiedWorkbench detects selectedBlockId change:
   a. Creates JitCompiler with all strategies
   b. RuntimeProvider.initializeRuntime(block) → ScriptRuntime created
   c. ExecutionLogService integrated
6. TrackPanelPrimary renders TimerDisplay connected to runtime
7. TimerDisplay subscribes to runtime stack events → displays timer UI
```

### Track → Analyze Transition

```
1. Workout completes or user switches view
2. UnifiedWorkbench calls getAnalyticsFromRuntime(runtime):
   a. Extracts Segment[] from execution spans
   b. Generates AnalyticsDataPoint[] time series
   c. Creates AnalyticsGroup[] graph configurations
3. analyticsState = { segments, rawData, groups, selectedSegmentIds }
4. AnalyzePanelIndex receives segments → AnalyticsIndexPanel → UnifiedItemList
5. AnalyzePanelPrimary receives rawData + groups → TimelineView → Recharts
6. User selects segments → onSelectSegment → filters chart data
```

### Runtime Event Flow

```
ScriptRuntime.handle(event)
    │
    ├──→ eventBus.emit() → subscribers (components via useEffect)
    │
    ├──→ RuntimeStack operations (push/pop/mount/unmount)
    │     └──→ IRuntimeBlock lifecycle (constructor → mount → next → unmount → dispose)
    │           └──→ Behavior hooks (TimerBehavior, SoundBehavior, LoopCoordinatorBehavior, ...)
    │
    ├──→ RuntimeMemory allocations (timeSpans, counters, flags)
    │     └──→ useMemorySubscription() → component re-renders
    │
    └──→ RuntimeClock ticks
          └──→ useTimerElapsed() → 60fps animation frames → UI updates
```

### Editor Data Flow

```
Monaco Editor Content Change
    │
    ├──→ WodWikiSyntaxInitializer.handleMount()
    │     ├──→ MdTimerRuntime.read(content) → IScript (WodScript)
    │     ├──→ SemantcTokenEngine.write(code, script) → Uint32Array (semantic tokens)
    │     ├──→ SuggestionEngine.suggest() → CompletionItem[] (autocomplete)
    │     └──→ onChange(script) → WodWiki.onValueChange callback
    │
    ├──→ useWodBlocks() → extracts WodBlock[] from content
    │     └──→ onBlocksChange(blocks) → parent state
    │
    ├──→ useParseAllBlocks() → parses all WOD code blocks
    │
    ├──→ WodBlockManager → Monaco decorations (block boundaries, active block)
    │
    └──→ RichMarkdownManager → inline card widgets
          └──→ CardContainer → per-type card previews
```

---

## 6. Key Type Definitions

### Core Data Types

```typescript
// Parser output
interface ICodeStatement {
  id: number;
  text: string;
  fragments: ICodeFragment[];
  position: { startLine: number; endLine: number; startColumn: number; endColumn: number };
  parentId?: number;
  children?: ICodeStatement[];
}

interface ICodeFragment {
  type: FragmentType;  // 'Timer' | 'Rounds' | 'Rep' | 'Effort' | 'Distance' | 'Resistance' | 'Action' | 'Increment' | 'Group' | 'Text'
  name: string;
  value: string;
  origin?: string;
  position?: { line: number; column: number; length: number };
}

// Unified visualization
interface IDisplayItem {
  id: string;
  label: string;
  fragments: ICodeFragment[];
  status?: 'pending' | 'active' | 'running' | 'complete' | 'skipped' | 'failed';
  depth: number;
  isHeader: boolean;
  startTime?: number;
  endTime?: number;
  duration?: number;
  linkedIds?: string[];
  origin: 'parser' | 'runtime' | 'output';
  sourceId?: number;
}

// Workout block (from markdown parser)
interface WodBlock {
  content: string;
  startLine: number;
  endLine: number;
  statements: ICodeStatement[];
  errors: any[];
  state: 'parsed' | 'error' | 'pending';
}

// Document structure
interface DocumentItem {
  type: 'header' | 'wod-block';
  id: string;
  text: string;
  line: number;
  level?: number;  // for headers
  block?: WodBlock; // for wod-blocks
}

// View navigation
type ViewMode = 'plan' | 'track' | 'analyze';

// Analytics
interface Segment {
  id: number;
  type: string;
  startTime: number;
  endTime: number;
  duration: number;
  metrics: Record<string, number>;
  fragments: ICodeFragment[][];
  parentId?: number;
  depth: number;
}

interface AnalyticsGroup {
  id: string;
  label: string;
  graphs: Array<{
    metricKey: string;
    label: string;
    color: string;
    unit: string;
  }>;
}

interface AnalyticsDataPoint {
  timestamp: number;
  [metricKey: string]: number;
}

// Timer display
interface ITimerDisplayEntry {
  blockKey: string;
  label: string;
  elapsedMs: number;
  durationMs?: number;
  isRunning: boolean;
  role: 'primary' | 'secondary';
}

interface IDisplayCardEntry {
  type: string;
  blockKey: string;
  label: string;
  metrics: Record<string, any>;
  actions: ActionDescriptor[];
}

// Runtime
interface IScriptRuntime {
  stack: IRuntimeStack;
  memory: IRuntimeMemory;
  clock: IRuntimeClock;
  eventBus: IEventBus;
  handle(event: IEvent): void;
  dispose(): void;
}

// Execution snapshot (test bench)
interface ExecutionSnapshot {
  stack: { blocks: Array<{ key, label, blockType, status, depth, ... }>; depth: number };
  memory: { entries: Array<{ id, label, type, ownerId, value, ... }> };
  timestamp: number;
}

// Test bench panels
interface VisualizerSize = 'compact' | 'normal' | 'focused';

interface VisualizerFilter {
  nameOverrides?: Record<string, string>;
  typeOverrides?: Record<string, string>;
  allowedOrigins?: string[];
}

// Inline card system
interface InlineWidgetCard<T = unknown> {
  cardType: CardType;  // 'wod-block' | 'frontmatter' | 'image' | 'youtube' | 'heading' | 'blockquote'
  content: T;
  displayMode: 'edit-only' | 'side-by-side' | 'full-preview';
  lineRange: { startLine: number; endLine: number };
}

interface CardCallbacks {
  onEdit: () => void;
  onAction: (actionId: string) => void;
  onContentChange?: (newValue: string) => void;
}
```

---

## 7. Public API Surface

The library exports via three entry points:

### `wod-wiki/core` ([src/core-entry.ts](src/core-entry.ts))

| Category | Exports |
|----------|---------|
| **Models** | `WodScript`, `BlockKey`, `Duration`, `SpanDuration`, `CodeStatement`, `OutputStatement`, `FragmentType`, `ICodeFragment` |
| **Parser** | Full `timer.parser`, `timer.tokens`, `timer.visitor` re-exports |
| **Runtime Engine** | `ScriptRuntime`, `JitCompiler`, `RuntimeStack`, `RuntimeMemory`, `RuntimeBlock`, `BlockContext` |
| **Runtime Interfaces** | `IScriptRuntime`, `IRuntimeBlock`, `IRuntimeAction`, `IRuntimeMemory`, `IRuntimeBlockStrategy`, `IMemoryReference`, `IEvent`, `IEventHandler`, `IBlockContext` |
| **Actions** | `PushBlockAction`, `ErrorAction` |
| **Behaviors** | All from `runtime/behaviors` |
| **Blocks** | `EffortBlock` |
| **Strategies** | All from `runtime/compiler/strategies` |
| **Fragments** | `TimerFragment`, `RoundsFragment`, `RepFragment`, `EffortFragment`, `DistanceFragment`, `ResistanceFragment`, `ActionFragment`, `IncrementFragment`, `GroupFragment`, `TextFragment` |

### `wod-wiki/clock` ([src/clock-entry.ts](src/clock-entry.ts))

| Category | Exports |
|----------|---------|
| **Components** | `DigitalClock`, `EnhancedTimerHarness`, `TimeDisplay`, `TimeUnit` |
| **Anchors** | `ClockAnchor`, `LabelAnchor`, `MetricAnchor` |
| **Hooks** | `useTimespan`, `useTimerElapsed` |
| **Visualization** | `TimerMemoryVisualization` |

### `wod-wiki/editor` ([src/editor-entry.ts](src/editor-entry.ts))

| Category | Exports |
|----------|---------|
| **Editor** | `WodWiki`, `MarkdownEditor` |
| **Exercise** | `ExerciseIndexManager`, `ExerciseSuggestionProvider`, `ExerciseHoverProvider`, `ExerciseSearchEngine` |
| **Monaco Integration** | `WodWikiSyntaxInitializer`, `SemantcTokenEngine`, `SuggestionEngine`, `DefaultSuggestionService` |
| **Utilities** | `LRUCache` |
| **UI Components** | `CommandPalette`, `CommandProvider`, `useCommandPalette`, `useRegisterCommand`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` |

---

## 8. Custom Hooks

### Application Hooks

| Hook | File | Consumes | Produces | Used By |
|------|------|----------|----------|---------|
| `useTheme` | [ThemeProvider.tsx](src/components/theme/ThemeProvider.tsx) | ThemeProvider context | `{ theme, setTheme }` | ThemeToggle, CommitGraph, useMonacoTheme |
| `useAudio` | [AudioContext.tsx](src/components/audio/AudioContext.tsx) | AudioProvider context | `{ isEnabled, toggleAudio, playTestSound }` | AudioToggle |
| `useCommandPalette` | [CommandContext.tsx](src/components/command-palette/CommandContext.tsx) | CommandProvider context | `{ commands, isOpen, setIsOpen, search, ... }` | CommandPalette, EditableStatementList |
| `useRegisterCommand` | [CommandContext.tsx](src/components/command-palette/CommandContext.tsx) | CommandProvider context | `void` (registers command on mount) | MarkdownEditorBase |
| `useWorkbench` | [WorkbenchContext.tsx](src/components/layout/WorkbenchContext.tsx) | WorkbenchProvider context | `{ content, blocks, viewMode, set*, startWorkout, ... }` | UnifiedWorkbench |
| `useWorkoutEvents` | [useWorkoutEvents.ts](src/hooks/useWorkoutEvents.ts) | Global event bus | Subscribes to workout lifecycle events | (internal) |
| `useWorkoutEmit` | [useWorkoutEvents.ts](src/hooks/useWorkoutEvents.ts) | Global event bus | `emit(event)` function | (internal) |
| `useWakeLock` | [useWakeLock.ts](src/hooks/useWakeLock.ts) | Screen Wake Lock API | `{ isActive, isSupported, request, release }` | UnifiedWorkbench |

### Runtime Hooks

| Hook | File | Consumes | Produces | Used By |
|------|------|----------|----------|---------|
| `useRuntimeContext` | [RuntimeContext.tsx](src/runtime/context/RuntimeContext.tsx) | RuntimeProvider context | `IScriptRuntime` | TimerDisplay, StackedClockDisplay |
| `useTimerElapsed` | (clock hooks) | Runtime memory via blockKey | `{ elapsed, isRunning }` | DigitalClock, ClockAnchor |
| `useTimerDisplay` | (runtime hooks) | IRuntimeBlock | `{ formatted, isRunning, isComplete, remaining }` | BlockTimerDisplay |
| `useRoundDisplay` | (runtime hooks) | IRuntimeBlock | `{ label }` | BlockTimerDisplay |
| `usePrimaryTimer` | (runtime hooks) | Runtime stack events | `ITimerDisplayEntry \| null` | TimerDisplay |
| `useSecondaryTimers` | (runtime hooks) | Runtime stack events | `ITimerDisplayEntry[]` | TimerDisplay |
| `useStackTimers` | (runtime hooks) | Runtime stack events | Timer state map | StackedClockDisplay |
| `useStackDisplayItems` | (runtime hooks) | Runtime stack events | `IDisplayItem[]` | TimerDisplay, StackedClockDisplay |
| `useActiveControls` | (runtime hooks) | Runtime stack events | `RuntimeControls` | TimerDisplay, StackedClockDisplay |
| `useStackBlocks` | (runtime hooks) | Runtime stack events | Block array | StackedClockDisplay |
| `useOutputStatements` | (runtime hooks) | Runtime memory | `OutputStatement[]` | RuntimeHistoryLog, ExecutionLogPanel |
| `useMemorySubscription` | (runtime hooks) | `TypedMemoryReference<T>` | Reactive value `T` | TimerMemoryVisualization |

### Editor Hooks

| Hook | File | Consumes | Produces | Used By |
|------|------|----------|----------|---------|
| `useEditorResize` | [useEditorResize.ts](src/hooks/editor/useEditorResize.ts) | window resize events | Calls `editor.layout()` | WodWiki |
| `useMonacoTheme` | [useMonacoTheme.ts](src/hooks/editor/useMonacoTheme.ts) | useTheme() + Monaco API | Sets Monaco theme | WodWiki, MarkdownEditorBase |
| `useWodBlocks` | (markdown-editor hooks) | Editor content | `WodBlock[]` | MarkdownEditorBase |
| `useContextOverlay` | (markdown-editor hooks) | Editor + blocks | Overlay widget management | MarkdownEditorBase |
| `useWodDecorations` | (markdown-editor hooks) | Editor + blocks | Monaco decorations | MarkdownEditorBase |
| `useParseAllBlocks` | (markdown-editor hooks) | Block content | Parsed statements | MarkdownEditorBase |
| `useSmartIncrement` | (markdown-editor hooks) | Editor commands | Number increment/decrement | MarkdownEditorBase |
| `useMarkdownEditorSetup` | (markdown-editor hooks) | Editor instance | Setup/teardown | MarkdownEditorBase |

### Test Bench Hooks

| Hook | File | Consumes | Produces | Used By |
|------|------|----------|----------|---------|
| `useTestBenchContext` | [TestBenchContext.tsx](src/runtime-test-bench/context/TestBenchContext.tsx) | TestBenchProvider context | `{ state, dispatch }` | All test bench panels |
| `useRuntimeExecution` | (runtime hooks) | ScriptRuntime | `{ status, start, pause, stop, step, reset }` | RuntimeTestBench, BlockTestBench |
| `useHighlighting` | (test bench hooks) | Internal state | `{ blockHighlight, memoryHighlight, set* }` | TestBenchLayout |
| `useTestBenchShortcuts` | (test bench hooks) | Keyboard events | Maps shortcuts to actions | RuntimeTestBench |
| `useMemoryValueDialog` | [MemoryValuePopover.tsx](src/runtime-test-bench/components/MemoryValuePopover.tsx) | Internal state | `{ dialogData, isOpen, openDialog, closeDialog }` | MemoryPanel, RuntimeDebugPanel |

---

## 9. Redundancy Analysis

### 9.1 Dead Code — Confirmed Unused Components (~1,032+ lines)

These components have **zero importers** in the codebase and can be safely deleted:

| Component | File | Lines | Why Dead |
|-----------|------|-------|----------|
| `WodWorkbench` | [src/components/layout/WodWorkbench.tsx](src/components/layout/WodWorkbench.tsx) | ~323 | Superseded by `UnifiedWorkbench`. Has `runtime={undefined}` hardcoded — cannot run workouts. No importers. |
| `PlanPanel` (layout) | [src/components/layout/PlanPanel.tsx](src/components/layout/PlanPanel.tsx) | ~405 | Replaced by `workbench/PlanPanel` + `SlidingViewport` system. No importers. |
| `RuntimeLayout` | [src/views/runtime/RuntimeLayout.tsx](src/views/runtime/RuntimeLayout.tsx) | ~31 | Empty placeholder ("pending implementation"). Only imported by dead `WodWorkbench`. |
| `RuntimeHistoryPanel` | [src/components/workout/RuntimeHistoryPanel.tsx](src/components/workout/RuntimeHistoryPanel.tsx) | ~20 | Placeholder stub. No importers. |
| `ExecutionLogPanel` | [src/components/workout/ExecutionLogPanel.tsx](src/components/workout/ExecutionLogPanel.tsx) | ~78 | Near-duplicate of `RuntimeHistoryLog`. No importers. |
| `AnalyticsHistoryPanel` | [src/components/workout/AnalyticsHistoryPanel.tsx](src/components/workout/AnalyticsHistoryPanel.tsx) | ~175 | Superseded by `AnalyticsIndexPanel`. No importers. |
| `RuntimeTestBench` | [src/runtime-test-bench/RuntimeTestBench.tsx](src/runtime-test-bench/RuntimeTestBench.tsx) | ~317 | Superseded by `BlockTestBench`. No story or component imports found. |

**Total deletable: ~1,349 lines across 7 files.**

### 9.2 Duplicate Components — Merge Candidates

#### A. Two Context Panels (70% overlap)

| Component | File | Used By |
|-----------|------|---------|
| `WorkoutContextPanel` | [src/components/workout/WorkoutContextPanel.tsx](src/components/workout/WorkoutContextPanel.tsx) | `RuntimeDebugPanel`, `WorkoutOverlay` |
| `ContextPanel` | [src/markdown-editor/components/ContextPanel.tsx](src/markdown-editor/components/ContextPanel.tsx) | `ContextOverlay` (Monaco widget) |

Both render `EditableStatementList` for `WodBlock.statements` with edit/delete/readonly modes and a "Start Workout" button. Differences:

| Feature | WorkoutContextPanel | ContextPanel |
|---------|--------------------:|-------------:|
| Multi-mode (edit/run/analyze) | ✅ | ❌ |
| Parse error display | ❌ | ✅ |
| Block metadata (lines, state, size) | ❌ | ✅ |
| Timer dialog | ❌ | ✅ |
| Active statement highlighting | ✅ | ❌ |
| Mobile support | ❌ | ✅ |

**Recommendation**: Merge into a single `WorkoutContextPanel` with configurable optional props (`showErrors`, `showMetadata`, `showTimerDialog`, `activeStatementIds`).

#### B. EditableStatementList re-implements StatementDisplay

[src/markdown-editor/components/EditableStatementList.tsx](src/markdown-editor/components/EditableStatementList.tsx) renders `FragmentVisualizer` directly for each statement row, duplicating ~40 lines of styling/layout that [src/components/fragments/StatementDisplay.tsx](src/components/fragments/StatementDisplay.tsx) already provides. `EditableStatementList` should use `StatementDisplay` internally and pass edit/delete buttons through its `actions` prop.

#### C. Parallel Timer Display Systems

Five timer display components exist with overlapping functionality:

```
Production path:
  TimerDisplay → RefinedTimerDisplay       (Track view — runtime stack-driven, SVG ring)

Test/demo only:
  StackedClockDisplay                       (QueueTestHarness — card-based, 733 lines)
  BlockTimerDisplay                         (Stories only — behavior-hook-based, simple)
  DigitalClock                              (Stories/public API — card-based, standalone)
```

`StackedClockDisplay` (733 lines) is the largest single component in the codebase, used only by `QueueTestHarness`. If the test harness can be migrated to use `TimerDisplay`, it should be deleted.

### 9.3 Duplicate Hooks — Consolidation Needed

#### A. Timer Elapsed Calculation — 4 Implementations

| Hook/Function | File | Mechanism | Input |
|---------------|------|-----------|-------|
| `useTimerElapsed` | [src/runtime/hooks/useTimerElapsed.ts](src/runtime/hooks/useTimerElapsed.ts) | RAF polling | `blockKey: string` |
| `useTimerDisplay` | [src/runtime/hooks/useBlockMemory.ts](src/runtime/hooks/useBlockMemory.ts) | RAF polling | `IRuntimeBlock` |
| `useTimespan`/`useStopwatch` | [src/clock/hooks/useStopwatch.ts](src/clock/hooks/useStopwatch.ts) | `setInterval(100ms)` | `TimeSpan[]` |
| `useTimerReferences` | [src/runtime/hooks/useTimerReferences.ts](src/runtime/hooks/useTimerReferences.ts) | **DEPRECATED** — returns `undefined` | `blockKey` |

All perform the same core calculation: `spans.reduce((sum, span) => sum + elapsed(span), 0)`. The elapsed-from-spans logic is duplicated verbatim. `useTimerReferences` is dead code.

**Recommendation**: Extract shared `calculateElapsed(spans, now)` utility (already exists in `lib/timeUtils.ts` as `calculateDuration`). Delete `useTimerReferences`. Consolidate `useTimerElapsed` and `useTimerDisplay` into a single hook with block-key vs block-ref variants.

#### B. TWO `useOutputStatements` Hooks (Same Name!)

| Hook | File | Input | Returns |
|------|------|-------|---------|
| `useOutputStatements()` | [src/runtime/hooks/useOutputStatements.ts](src/runtime/hooks/useOutputStatements.ts) | None (uses `useRuntimeContext()`) | `IOutputStatement[]` |
| `useOutputStatements(runtime)` | [src/clock/hooks/useExecutionSpans.ts](src/clock/hooks/useExecutionSpans.ts) | `IScriptRuntime \| null` | `OutputStatementsData` (richer: includes `byId`, `byBlockKey`, `segments`) |

Both subscribe to `runtime.subscribeToOutput()`. The clock version is richer but they share the same name, creating import confusion.

**Recommendation**: Keep the richer version, move to `runtime/hooks/`, delete the simpler one.

#### C. Duplicate Stack Subscription Hooks

| Hook | File | Returns |
|------|------|---------|
| `useStackBlocks()` | [src/runtime/hooks/useStackBlocks.ts](src/runtime/hooks/useStackBlocks.ts) | `IRuntimeBlock[]` |
| `useCurrentBlock()` | (same file) | single block (wraps above) |
| `useSnapshotBlocks()` | [src/runtime/hooks/useStackSnapshot.ts](src/runtime/hooks/useStackSnapshot.ts) | `IRuntimeBlock[]` |
| `useSnapshotCurrentBlock()` | (same file) | single block (wraps above) |
| `useStackSnapshot()` | (same file) | `StackSnapshot` (richer: includes `type`, `clockTime`) |

`useStackBlocks` and `useSnapshotBlocks` return identical data via different subscription mechanisms. `useCurrentBlock` and `useSnapshotCurrentBlock` are functionally identical.

**Recommendation**: Pick `useStackSnapshot` (richer) as canonical. Delete `useStackBlocks` / `useCurrentBlock`.

#### D. Deprecated `useDisplayStack` Still Present

[src/clock/hooks/useDisplayStack.ts](src/clock/hooks/useDisplayStack.ts) exports `useDisplayStack`, `useCurrentTimer`, `useCurrentCard` — all marked `@deprecated`. Their replacements (`useStackTimers`, `usePrimaryTimer`) already exist in [src/runtime/hooks/useStackDisplay.ts](src/runtime/hooks/useStackDisplay.ts). The deprecated file should be audited for remaining consumers and deleted.

### 9.4 Time Formatting — 15+ Inline Duplicates

The most pervasive redundancy in the codebase. A shared utility exists at [src/lib/timeUtils.ts](src/lib/timeUtils.ts) but is largely ignored:

| Location | Function | Format |
|----------|----------|--------|
| `lib/timeUtils.ts` | `formatTime(ms)` | MM:SS.ms ✅ canonical |
| `lib/timeUtils.ts` | `formatTimestamp(date)` | HH:MM:SS ✅ canonical |
| `runtime/hooks/useBlockMemory.ts` | `formatTime(ms)` | MM:SS ❌ inline dup |
| `components/workout/RefinedTimerDisplay.tsx` | `formatTime(ms)` | MM:SS ❌ inline dup |
| `clock/components/StackedClockDisplay.tsx` | `formatTimeCompact(ms)` | MM:SS ❌ inline dup |
| `clock/components/StackedClockDisplay.tsx` | `formatTime(ms)` | MM:SS ❌ 2nd dup in same file! |
| `clock/components/EnhancedTimerHarness.tsx` | `formatElapsedTime(ms)` | MM:SS ❌ inline dup |
| `clock/utils/fragmentsToDisplayMetrics.ts` | `formatDuration(ms)` | MM:SS/HH:MM:SS ❌ inline dup |
| `runtime/behaviors/TimerOutputBehavior.ts` | `formatDuration(ms)` | MM:SS ❌ inline dup |
| `markdown-editor/.../EditableStatementList.tsx` | `formatDuration(sec)` | MM:SS ❌ dup (**seconds** input!) |
| `markdown-editor/.../FragmentEditor.tsx` | `formatDuration(sec)` | MM:SS ❌ dup (**seconds** input!) |
| `timeline/TimelineView.tsx` | `formatTime(sec)` | MM:SS ❌ dup (**seconds** input!) |
| `timeline/TimelineView.tsx` | `formatDuration(sec)` | MM:SS ❌ dup |
| `markdown-editor/.../WorkoutTimerDialog.tsx` | `formatTime(ms)` | MM:SS.ms ❌ inline dup |
| `runtime-test-bench/.../StatusFooter.tsx` | `formatElapsedTime(ms)` | MM:SS/HH:MM:SS ❌ inline dup |
| `components/layout/AnalyticsIndexPanel.tsx` | `formatElapsedTime(sec)` | MM:SS ❌ dup (**seconds** input!) |
| `components/unified/UnifiedItemRow.tsx` | `formatTimestamp(ts)` | HH:MM:SS ❌ inline dup |
| `components/unified/UnifiedItemRow.tsx` | `formatDuration(ms)` | MM:SS.ms ❌ inline dup |

**Note**: Some use milliseconds input, others use **seconds** — a subtle bug-prone inconsistency.

**Recommendation**: Create consolidated formatters in `src/lib/formatTime.ts`:
- `formatTimeMMSS(ms)` — `MM:SS`
- `formatTimeHHMMSS(ms)` — `HH:MM:SS`
- `formatTimePrecise(ms)` — `MM:SS.ms`
- `formatSecondsMMSS(seconds)` — for seconds-input callers

Replace all 15+ inline implementations with shared imports.

### 9.5 Duration Calculation — 4 Duplicate Implementations

| File | Function | Notes |
|------|----------|-------|
| `lib/timeUtils.ts` | `calculateDuration(spans, now)` | ✅ Canonical — handles both span shapes |
| `runtime/hooks/useBlockMemory.ts` | `calculateElapsed(spans, now)` | ❌ Duplicate |
| `runtime/hooks/useTimerElapsed.ts` | Inline `reduce` in `useMemo` | ❌ Duplicate |
| `clock/hooks/useStopwatch.ts` | Inline in `useEffect` | ❌ Duplicate |

All four implement the same span-summation math. Only `lib/timeUtils.ts` is the proper shared version.

### 9.6 Parser Instantiation — Not Centralized

`MdTimerRuntime` is instantiated independently in 5 locations with no shared singleton:

| File | Pattern |
|------|---------|
| `runtime-test-bench/services/testbench-services.ts` | `globalParser` singleton |
| `markdown-editor/hooks/useBlockParser.ts` | Per-hook ref instance |
| `markdown-editor/hooks/useParseAllBlocks.ts` | Per-hook ref instance |
| `editor/WodWikiSyntaxInitializer.tsx` | Module-level singleton |
| `editor/parsers/WodBlockParser.ts` | Module-level singleton |

`MdTimerRuntime` is stateless/thread-safe after construction, so a single application-wide singleton (e.g., `src/parser/parserSingleton.ts`) would eliminate wasted memory and initialization overhead.

### 9.7 `FragmentColorMap` Type — Defined in Two Places

`FragmentColorMap` and the `FragmentType` union are defined in both:
- [src/views/runtime/fragmentColorMap.ts](src/views/runtime/fragmentColorMap.ts) — canonical implementation
- [src/core/types/fragments.ts](src/core/types/fragments.ts) — duplicate type definition (as `FragmentTypeString`)

Additionally, `getFragmentIcon()` is defined inline in [src/views/runtime/FragmentVisualizer.tsx](src/views/runtime/FragmentVisualizer.tsx) rather than co-located with `getFragmentColorClasses()` in the color map file.

### 9.8 `useBlockParser` vs `useParseAllBlocks` — Overlapping Parsing Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useBlockParser` | [src/markdown-editor/hooks/useBlockParser.ts](src/markdown-editor/hooks/useBlockParser.ts) | Parse a single `WodBlock` with debounce |
| `useParseAllBlocks` | [src/markdown-editor/hooks/useParseAllBlocks.ts](src/markdown-editor/hooks/useParseAllBlocks.ts) | Parse all `WodBlock[]`, tracks parsed set |

Both create their own `MdTimerRuntime` instances. `useParseAllBlocks` iterates blocks doing the same work `useBlockParser` does per-block. A shared `parseWodBlock(content)` utility would eliminate the duplication.

### 9.9 `useStackDisplayItems` Re-implements Adapter

`useStackDisplayItems()` in [src/runtime/hooks/useStackDisplay.ts](src/runtime/hooks/useStackDisplay.ts) converts stack blocks to `IDisplayItem[]` inline, partially duplicating `blockToDisplayItem()` from [src/core/adapters/displayItemAdapters.ts](src/core/adapters/displayItemAdapters.ts). It should use the shared adapter.

### 9.10 Naming Collisions & Confusion

| Collision | Files | Issue |
|-----------|-------|-------|
| Two `RuntimeProvider` components | `components/layout/RuntimeProvider.tsx` vs `runtime/context/RuntimeContext.tsx` | Different purposes (lifecycle management vs pass-through injection) but same name |
| Two `useOutputStatements` hooks | `runtime/hooks/` vs `clock/hooks/` | Different signatures, same name |
| Two `RuntimeContext` files | `components/layout/RuntimeContext.ts` vs `runtime/context/RuntimeContext.tsx` | Maintenance hazard |
| `EventBus` vs `WorkoutEventBus` | `runtime/events/` vs `services/` | Distinct systems but confusing naming — one is runtime-internal with scoping, the other is UI-level pub/sub |

---

## 10. Recommendations

### 10.1 Immediate Actions (Dead Code Removal)

| Priority | Action | Impact |
|----------|--------|--------|
| 🔴 | Delete `WodWorkbench.tsx` + `RuntimeLayout.tsx` | -354 lines, resolves workbench confusion |
| 🔴 | Delete `layout/PlanPanel.tsx` | -405 lines, only `workbench/PlanPanel` is used |
| 🔴 | Delete `RuntimeHistoryPanel.tsx`, `ExecutionLogPanel.tsx`, `AnalyticsHistoryPanel.tsx` | -273 lines, dead duplicates |
| 🔴 | Delete deprecated `useTimerReferences` hook | Dead code returning `undefined` |

### 10.2 Short-Term Refactoring

| Priority | Action                                                                                   | Impact                                                            |
| -------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 🟡       | Consolidate 15+ inline time formatters into `lib/formatTime.ts`                          | Eliminates most pervasive duplication, fixes ms/sec inconsistency |
| 🟡       | Merge `WorkoutContextPanel` + `ContextPanel` into one configurable component             | -70% shared code                                                  |
| 🟡       | Consolidate timer elapsed hooks (`useTimerElapsed` + `useTimerDisplay` + `useStopwatch`) | Eliminates 3 parallel implementations                             |
| 🟡       | Unify `useOutputStatements` (delete simpler runtime version, keep richer clock version)  | Resolves same-name collision                                      |
| 🟡       | Consolidate stack subscription hooks (`useStackBlocks` → `useStackSnapshot`)             | Eliminates parallel subscription patterns                         |
| 🟡       | Extract shared `parseWodBlock()` utility from `useBlockParser` / `useParseAllBlocks`     | Eliminates duplicated parsing logic                               |

### 10.3 Architectural Improvements

| Priority | Action | Impact |
|----------|--------|--------|
| 🟢 | Rename `RuntimeProvider` variants for clarity (lifecycle vs injection) | Reduces developer confusion |
| 🟢 | Create `MdTimerRuntime` singleton | Eliminates 5 independent parser instantiations |
| 🟢 | Standardize `FragmentVisualizer` import paths to barrel export | Consistent import conventions |
| 🟢 | Move `getFragmentIcon()` to co-locate with `getFragmentColorClasses()` | Better module cohesion |
| 🟢 | Have `EditableStatementList` use `StatementDisplay` internally | -40 lines of duplicated rendering |
| 🟢 | Evaluate `StackedClockDisplay` (733 lines) for retirement | Largest component, test-only usage |
| 🟢 | Extract shared test bench hook from `RuntimeTestBench` + `BlockTestBench` | -80 lines of duplicate runtime setup |

### 10.4 Design Observations (from Gemini cross-reference)

These recommendations from the Gemini audit are validated by this analysis:

1. **`TimerDisplay` separation is already done correctly** — `TimerDisplay` (data/subscription layer) wraps `RefinedTimerDisplay` (pure UI). The separation exists but could be formalized by extracting the subscription logic into a dedicated hook (e.g., `useRuntimeTimerState`) that returns the exact prop shape `RefinedTimerDisplay` expects.

2. **`FragmentVisualizer` is correctly stateless** — confirmed `React.memo` wrapped with no internal state. Safe to use across Plan, Track, and Analyze views.

3. **Editor decoupling** — `MarkdownEditor` / `MarkdownEditorBase` are tightly coupled to WOD-specific hooks (`useWodBlocks`, `useWodDecorations`, `useParseAllBlocks`). If generic markdown support is ever needed, these would need to be abstracted into a pluggable `LanguageFeatureProvider` pattern. Currently acceptable since WOD editing is the sole use case.

---

## 11. Redundancy Heat Map

Files ranked by redundancy involvement (higher = more urgent to refactor):

| Severity | File                                                   | Issues                                                           |
| -------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 🔴🔴🔴   | `clock/components/StackedClockDisplay.tsx`             | 733 lines, test-only, 2 inline formatters, parallel timer system |
| 🔴🔴     | `components/layout/WodWorkbench.tsx`                   | 323 lines, dead code, broken runtime                             |
| 🔴🔴     | `components/layout/PlanPanel.tsx`                      | 405 lines, dead code                                             |
| 🔴🔴     | `runtime/hooks/useTimerElapsed.ts`                     | Duplicates `useTimerDisplay` core logic                          |
| 🔴🔴     | `clock/hooks/useStopwatch.ts`                          | 3rd implementation of elapsed calculation                        |
| 🔴       | `clock/hooks/useDisplayStack.ts`                       | Deprecated, replacements exist                                   |
| 🔴       | `clock/hooks/useExecutionSpans.ts`                     | Name collision with `runtime/hooks/useOutputStatements`          |
| 🔴       | `components/workout/ExecutionLogPanel.tsx`             | Dead dup of `RuntimeHistoryLog`                                  |
| 🔴       | `components/workout/AnalyticsHistoryPanel.tsx`         | Dead dup of `AnalyticsIndexPanel`                                |
| 🟡       | `components/workout/RefinedTimerDisplay.tsx`           | Inline formatTime dup                                            |
| 🟡       | `markdown-editor/components/EditableStatementList.tsx` | Re-implements StatementDisplay rendering                         |
| 🟡       | `markdown-editor/components/ContextPanel.tsx`          | 70% overlap with WorkoutContextPanel                             |
| 🟡       | `runtime/hooks/useStackBlocks.ts`                      | Duplicates `useStackSnapshot` functionality                      |
| 🟡       | `timeline/TimelineView.tsx`                            | 2 inline formatters                                              |
| 🟢       | `views/runtime/FragmentVisualizer.tsx`                 | Inconsistent import paths                                        |
| 🟢       | `core/types/fragments.ts`                              | Duplicate type definitions                                       |

---

*End of deep dive report.*

[^1]: "Analyze" is a bad term, lets rename this to "Review"

[^2]: Remove this, and any testing screen / test associated with it.
