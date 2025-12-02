# Dead Code and Unused UI Analysis Report

This document identifies potentially dead code, orphaned files, and unused UI components in the WOD Wiki project.

## Summary

- **Total Source Files**: 90
- **React Components Found**: 113
- **Potentially Orphaned Files**: 29
- **Components Without Storybook Coverage or External Usage**: 43
- **Components Without Storybook but Used Internally**: 65

## 1. Orphaned Files (Never Imported)

These files are never imported anywhere in the codebase. They may be:
- Legacy code that was never cleaned up
- Features that were planned but never completed
- Utility scripts meant for one-time use

### Clock (1 file)

- `src/clock/hooks/useTimerHierarchy.ts`

### Components (6 files)

- `src/components/WorkoutJournal.tsx`
- `src/components/cast/CastButton.tsx`
- `src/components/layout/EditorIndexPanel.tsx`
- `src/components/layout/MobileWorkbench.tsx`
- `src/components/ui/dialog.tsx`
- `src/markdown-editor/components/SmartStatementInput.tsx`

### Core (1 file)

- `src/core/types/global.d.ts`

### Editor (3 files)

- `src/editor/frontmatter/FrontMatterTable.tsx`
- `src/editor/media/MediaWidget.tsx`
- `src/hooks/editor/useMonacoLifecycle.ts`

### Markdown Editor (1 file)

- `src/markdown-editor/utils/monacoLoader.ts`

### Parser (3 files)

- `src/parser/validators/CircularReferenceValidator.ts`
- `src/parser/validators/NestingDepthValidator.ts`
- `src/parser/validators/TimerEventValidator.ts`

### Runtime (9 files)

- `src/runtime/EventHandler.ts`
- `src/runtime/ResultSpanBuilder.ts`
- `src/runtime/StackValidator.ts`
- `src/runtime/behaviors/BlockCompleteEventHandler.ts`
- `src/runtime/behaviors/CompletionTrackingBehavior.ts`
- `src/runtime/behaviors/ParentContextBehavior.ts`
- `src/runtime/hooks/useAnchorSubscription.ts`
- `src/runtime/models/ExecutionRecord.ts`
- `src/views/runtime/RuntimeDebugView.tsx`

### Tools (4 files)

- `src/tools/ExerciseIndexer.ts`
- `src/tools/generateExerciseIndex.ts`
- `src/tools/testIndexer.ts`
- `src/tools/testNameIndexer.ts`

### Views (1 file)

- `src/views/analytics/AnalyticsLayout.tsx`

## 2. UI Components Never Loaded

These React components have no Storybook stories AND are never used by other components:

### src/clock

- **TimerMemoryVisualization** - `src/clock/TimerMemoryVisualization.tsx`

### src/clock/anchors

- **LabelAnchor** - `src/clock/anchors/LabelAnchor.tsx`
- **LabelDisplay** - `src/clock/anchors/LabelAnchor.tsx`
- **MetricAnchor** - `src/clock/anchors/MetricAnchor.tsx`

### src/clock/cards

- **ActiveBlockCard** - `src/clock/cards/DefaultCards.tsx`
- **FallbackCard** - `src/clock/cards/DefaultCards.tsx`
- **IdleCompleteCard** - `src/clock/cards/DefaultCards.tsx`
- **IdleStartCard** - `src/clock/cards/DefaultCards.tsx`
- **RestPeriodCard** - `src/clock/cards/DefaultCards.tsx`

### src/clock/components

- **DigitalClock** - `src/clock/components/DigitalClock.tsx`
- **EnhancedTimerHarness** - `src/clock/components/EnhancedTimerHarness.tsx`
- **MemoryCard** - `src/clock/components/EnhancedTimerHarness.tsx`
- **TimeDisplay** - `src/clock/components/TimeDisplay.tsx`
- **TimerControls** - `src/clock/components/EnhancedTimerHarness.tsx`

### src/components

- **WorkoutJournal** - `src/components/WorkoutJournal.tsx`

### src/components/cast

- **CastButton** - `src/components/cast/CastButton.tsx`

### src/components/fragments

- **BlockDisplay** - `src/components/fragments/StatementDisplay.tsx`
- **FragmentList** - `src/components/fragments/StatementDisplay.tsx`

### src/components/layout

- **EditorIndexPanel** - `src/components/layout/EditorIndexPanel.tsx`
- **MobileWorkbench** - `src/components/layout/MobileWorkbench.tsx`
- **WodWorkbench** - `src/components/layout/WodWorkbench.tsx`

### src/components/ui

- **DropdownMenuCheckboxItem** - `src/components/ui/dropdown-menu.tsx`
- **DropdownMenuGroup** - `src/components/ui/dropdown-menu.tsx`
- **DropdownMenuPortal** - `src/components/ui/dropdown-menu.tsx`
- **DropdownMenuRadioGroup** - `src/components/ui/dropdown-menu.tsx`
- **DropdownMenuRadioItem** - `src/components/ui/dropdown-menu.tsx`
- **DropdownMenuShortcut** - `src/components/ui/dropdown-menu.tsx`
- **DropdownMenuSub** - `src/components/ui/dropdown-menu.tsx`
- **DropdownMenuSubContent** - `src/components/ui/dropdown-menu.tsx`
- **DropdownMenuSubTrigger** - `src/components/ui/dropdown-menu.tsx`

### src/components/workout

- **AnalyticsHistoryPanel** - `src/components/workout/AnalyticsHistoryPanel.tsx`
- **ExecutionLogPanel** - `src/components/workout/ExecutionLogPanel.tsx`
- **RuntimeHistoryPanel** - `src/components/workout/RuntimeHistoryPanel.tsx`

### src/editor/frontmatter

- **FrontMatterTable** - `src/editor/frontmatter/FrontMatterTable.tsx`

### src/editor/inline-cards/components

- **CardContainer** - `src/editor/inline-cards/components/CardContainer.tsx`
- **CardFooter** - `src/editor/inline-cards/components/CardFooter.tsx`

### src/editor/media

- **MediaWidget** - `src/editor/media/MediaWidget.tsx`

### src/markdown-editor

- **MarkdownEditor** - `src/markdown-editor/MarkdownEditor.tsx`

### src/markdown-editor/components

- **FragmentEditor** - `src/markdown-editor/components/FragmentEditor.tsx`
- **SmartStatementInput** - `src/markdown-editor/components/SmartStatementInput.tsx`

### src/runtime-test-bench

- **RuntimeTestBench** - `src/runtime-test-bench/RuntimeTestBench.tsx`

### src/views/analytics

- **AnalyticsLayout** - `src/views/analytics/AnalyticsLayout.tsx`

### src/views/runtime

- **RuntimeDebugView** - `src/views/runtime/RuntimeDebugView.tsx`

## 3. Components Missing Storybook Coverage

These components ARE used internally but have no Storybook stories for documentation/testing:

- **ClockAnchor** (`src/clock/anchors/ClockAnchor.tsx`) - used 1 time(s)
- **StackedClockDisplay** (`src/clock/components/StackedClockDisplay.tsx`) - used 2 time(s)
- **TimeUnit** (`src/clock/components/TimeUnit.tsx`) - used 1 time(s)
- **WodScriptVisualizer** (`src/components/WodScriptVisualizer.tsx`) - used 2 time(s)
- **AudioProvider** (`src/components/audio/AudioContext.tsx`) - used 1 time(s)
- **AudioToggle** (`src/components/audio/AudioToggle.tsx`) - used 1 time(s)
- **StatementDisplay** (`src/components/fragments/StatementDisplay.tsx`) - used 2 time(s)
- **Dialog** (`src/components/headless/Dialog.tsx`) - used 2 time(s)
- **DialogContent** (`src/components/headless/Dialog.tsx`) - used 1 time(s)
- **DialogHeader** (`src/components/headless/Dialog.tsx`) - used 1 time(s)
- **DialogTitle** (`src/components/headless/Dialog.tsx`) - used 1 time(s)
- **DialogDescription** (`src/components/headless/Dialog.tsx`) - used 1 time(s)
- **RuntimeHistoryLog** (`src/components/history/RuntimeHistoryLog.tsx`) - used 1 time(s)
- **AnalyticsIndexPanel** (`src/components/layout/AnalyticsIndexPanel.tsx`) - used 1 time(s)
- **CollapsibleSection** (`src/components/layout/CollapsibleSection.tsx`) - used 1 time(s)
- **PlanPanel** (`src/components/layout/PlanPanel.tsx`) - used 1 time(s)
- **RuntimeProvider** (`src/components/layout/RuntimeProvider.tsx`) - used 6 time(s)
- **SlidingViewport** (`src/components/layout/SlidingViewport.tsx`) - used 1 time(s)
- **TimerIndexPanel** (`src/components/layout/TimerIndexPanel.tsx`) - used 1 time(s)
- **WodIndexPanel** (`src/components/layout/WodIndexPanel.tsx`) - used 3 time(s)
- **WorkbenchProvider** (`src/components/layout/WorkbenchContext.tsx`) - used 1 time(s)
- **ThemeProvider** (`src/components/theme/ThemeProvider.tsx`) - used 2 time(s)
- **ThemeToggle** (`src/components/theme/ThemeToggle.tsx`) - used 3 time(s)
- **CommitGraph** (`src/components/ui/CommitGraph.tsx`) - used 3 time(s)
- **DropdownMenu** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuTrigger** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuContent** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuItem** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuLabel** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **DropdownMenuSeparator** (`src/components/ui/dropdown-menu.tsx`) - used 1 time(s)
- **AnalyzePanelIndex** (`src/components/workbench/AnalyzePanel.tsx`) - used 1 time(s)
- **AnalyzePanelPrimary** (`src/components/workbench/AnalyzePanel.tsx`) - used 1 time(s)
- **TrackPanelIndex** (`src/components/workbench/TrackPanel.tsx`) - used 1 time(s)
- **TrackPanelPrimary** (`src/components/workbench/TrackPanel.tsx`) - used 1 time(s)
- **RefinedTimerDisplay** (`src/components/workout/RefinedTimerDisplay.tsx`) - used 1 time(s)
- **RuntimeDebugPanel** (`src/components/workout/RuntimeDebugPanel.tsx`) - used 1 time(s)
- **DebugButton** (`src/components/workout/RuntimeDebugPanel.tsx`) - used 2 time(s)
- **TimerDisplay** (`src/components/workout/TimerDisplay.tsx`) - used 1 time(s)
- **WorkoutContextPanel** (`src/components/workout/WorkoutContextPanel.tsx`) - used 2 time(s)
- **WorkoutOverlay** (`src/components/workout/WorkoutOverlay.tsx`) - used 1 time(s)
- **WodWiki** (`src/editor/WodWiki.tsx`) - used 3 time(s)
- **BlockquotePreview** (`src/editor/inline-cards/components/BlockquotePreview.tsx`) - used 1 time(s)
- **CardHeader** (`src/editor/inline-cards/components/CardHeader.tsx`) - used 2 time(s)
- **FrontMatterCard** (`src/editor/inline-cards/components/FrontMatterCard.tsx`) - used 1 time(s)
- **HeadingPreview** (`src/editor/inline-cards/components/HeadingPreview.tsx`) - used 1 time(s)
- **ImagePreview** (`src/editor/inline-cards/components/ImagePreview.tsx`) - used 1 time(s)
- **WodBlockCard** (`src/editor/inline-cards/components/WodBlockCard.tsx`) - used 1 time(s)
- **YouTubePreview** (`src/editor/inline-cards/components/YouTubePreview.tsx`) - used 1 time(s)
- **MarkdownEditorBase** (`src/markdown-editor/MarkdownEditor.tsx`) - used 2 time(s)
- **ContextPanel** (`src/markdown-editor/components/ContextPanel.tsx`) - used 1 time(s)
- **EditableStatementList** (`src/markdown-editor/components/EditableStatementList.tsx`) - used 2 time(s)
- **WodBlockManager** (`src/markdown-editor/components/WodBlockManager.tsx`) - used 1 time(s)
- **WorkoutTimerDialog** (`src/markdown-editor/components/WorkoutTimerDialog.tsx`) - used 1 time(s)
- **CompilationPanel** (`src/runtime-test-bench/components/CompilationPanel.tsx`) - used 1 time(s)
- **ControlsPanel** (`src/runtime-test-bench/components/ControlsPanel.tsx`) - used 2 time(s)
- **EditorPanel** (`src/runtime-test-bench/components/EditorPanel.tsx`) - used 1 time(s)
- **MemoryPanel** (`src/runtime-test-bench/components/MemoryPanel.tsx`) - used 2 time(s)
- **MemoryValueDialog** (`src/runtime-test-bench/components/MemoryValuePopover.tsx`) - used 1 time(s)
- **MemoryValueCell** (`src/runtime-test-bench/components/MemoryValuePopover.tsx`) - used 1 time(s)
- **RuntimeStackPanel** (`src/runtime-test-bench/components/RuntimeStackPanel.tsx`) - used 1 time(s)
- **StatusFooter** (`src/runtime-test-bench/components/StatusFooter.tsx`) - used 1 time(s)
- **TestBenchLayout** (`src/runtime-test-bench/components/TestBenchLayout.tsx`) - used 1 time(s)
- **Toolbar** (`src/runtime-test-bench/components/Toolbar.tsx`) - used 1 time(s)
- **TestBenchProvider** (`src/runtime-test-bench/context/TestBenchContext.tsx`) - used 1 time(s)
- **FragmentVisualizer** (`src/views/runtime/FragmentVisualizer.tsx`) - used 5 time(s)

## 4. Potential Duplicate/Overlapping Components

These groups contain multiple components with similar functionality that may indicate duplication:

### Card-related Components (11 total)

- `IdleStartCard` - `src/clock/cards/DefaultCards.tsx`
- `IdleCompleteCard` - `src/clock/cards/DefaultCards.tsx`
- `ActiveBlockCard` - `src/clock/cards/DefaultCards.tsx`
- `RestPeriodCard` - `src/clock/cards/DefaultCards.tsx`
- `FallbackCard` - `src/clock/cards/DefaultCards.tsx`
- `MemoryCard` - `src/clock/components/EnhancedTimerHarness.tsx`
- `CardContainer` - `src/editor/inline-cards/components/CardContainer.tsx`
- `CardFooter` - `src/editor/inline-cards/components/CardFooter.tsx`
- `CardHeader` - `src/editor/inline-cards/components/CardHeader.tsx`
- `FrontMatterCard` - `src/editor/inline-cards/components/FrontMatterCard.tsx`
- `WodBlockCard` - `src/editor/inline-cards/components/WodBlockCard.tsx`

### Display-related Components (4 total)

- `LabelDisplay` - `src/clock/anchors/LabelAnchor.tsx`
- `TimeDisplay` - `src/clock/components/TimeDisplay.tsx`
- `StatementDisplay` - `src/components/fragments/StatementDisplay.tsx`
- `BlockDisplay` - `src/components/fragments/StatementDisplay.tsx`

### Panel-related Components (19 total)

- `AnalyticsIndexPanel` - `src/components/layout/AnalyticsIndexPanel.tsx`
- `EditorIndexPanel` - `src/components/layout/EditorIndexPanel.tsx`
- `PlanPanel` - `src/components/layout/PlanPanel.tsx`
- `WodIndexPanel` - `src/components/layout/WodIndexPanel.tsx`
- `AnalyzePanelIndex` - `src/components/workbench/AnalyzePanel.tsx`
- `AnalyzePanelPrimary` - `src/components/workbench/AnalyzePanel.tsx`
- `TrackPanelIndex` - `src/components/workbench/TrackPanel.tsx`
- `TrackPanelPrimary` - `src/components/workbench/TrackPanel.tsx`
- `AnalyticsHistoryPanel` - `src/components/workout/AnalyticsHistoryPanel.tsx`
- `ExecutionLogPanel` - `src/components/workout/ExecutionLogPanel.tsx`
- `RuntimeDebugPanel` - `src/components/workout/RuntimeDebugPanel.tsx`
- `RuntimeHistoryPanel` - `src/components/workout/RuntimeHistoryPanel.tsx`
- `WorkoutContextPanel` - `src/components/workout/WorkoutContextPanel.tsx`
- `ContextPanel` - `src/markdown-editor/components/ContextPanel.tsx`
- `CompilationPanel` - `src/runtime-test-bench/components/CompilationPanel.tsx`
- `ControlsPanel` - `src/runtime-test-bench/components/ControlsPanel.tsx`
- `EditorPanel` - `src/runtime-test-bench/components/EditorPanel.tsx`
- `MemoryPanel` - `src/runtime-test-bench/components/MemoryPanel.tsx`
- `RuntimeStackPanel` - `src/runtime-test-bench/components/RuntimeStackPanel.tsx`

### Timer-related Components (7 total)

- `TimerMemoryVisualization` - `src/clock/TimerMemoryVisualization.tsx`
- `EnhancedTimerHarness` - `src/clock/components/EnhancedTimerHarness.tsx`
- `TimerControls` - `src/clock/components/EnhancedTimerHarness.tsx`
- `TimerIndexPanel` - `src/components/layout/TimerIndexPanel.tsx`
- `RefinedTimerDisplay` - `src/components/workout/RefinedTimerDisplay.tsx`
- `TimerDisplay` - `src/components/workout/TimerDisplay.tsx`
- `WorkoutTimerDialog` - `src/markdown-editor/components/WorkoutTimerDialog.tsx`

## 5. Recommendations

### High Priority (Safe to Remove)

These files appear to be completely unused and can likely be safely removed:

- `src/parser/validators/CircularReferenceValidator.ts`
- `src/parser/validators/NestingDepthValidator.ts`
- `src/parser/validators/TimerEventValidator.ts`
- `src/runtime/StackValidator.ts`
- `src/tools/ExerciseIndexer.ts`
- `src/tools/generateExerciseIndex.ts`
- `src/tools/testIndexer.ts`
- `src/tools/testNameIndexer.ts`

### Medium Priority (Needs Review)

These UI components may have been replaced or are legacy code:

- `src/components/WorkoutJournal.tsx`
- `src/components/cast/CastButton.tsx`
- `src/components/layout/EditorIndexPanel.tsx`
- `src/components/layout/MobileWorkbench.tsx`
- `src/components/ui/dialog.tsx`
- `src/markdown-editor/components/SmartStatementInput.tsx`
- `src/views/analytics/AnalyticsLayout.tsx`
- `src/views/runtime/RuntimeDebugView.tsx`

### Low Priority (Add Storybook Coverage)

These actively-used components should have Storybook stories added:

- `RuntimeProvider` (6 usages)
- `FragmentVisualizer` (5 usages)
- `ThemeToggle` (3 usages)
- `CommitGraph` (3 usages)
- `WodIndexPanel` (3 usages)
- `WodWiki` (3 usages)
- `WodScriptVisualizer` (2 usages)
- `StatementDisplay` (2 usages)
- `ThemeProvider` (2 usages)
- `Dialog` (2 usages)

## 6. Investigation Notes

### Parser Validators
The following parser validators are defined but never used:

- `src/parser/validators/CircularReferenceValidator.ts`
- `src/parser/validators/NestingDepthValidator.ts`
- `src/parser/validators/TimerEventValidator.ts`

These may have been planned for future validation features.

### Runtime Behaviors
Several runtime behaviors appear to be unused:

- `BlockCompleteEventHandler.ts` - May be replaced by newer event handling
- `CompletionTrackingBehavior.ts` - Possibly superseded by other completion logic
- `ParentContextBehavior.ts` - May be legacy parent/child context code

### Tools Directory
The `src/tools/` directory contains indexing scripts that are likely meant for CLI use:

- `ExerciseIndexer.ts` - Generates exercise index
- `generateExerciseIndex.ts` - Index generation script
- `testIndexer.ts` / `testNameIndexer.ts` - Test utilities

These may need to be moved to a `scripts/` directory or documented.

---

*Generated: Analysis of wod-wiki repository*
