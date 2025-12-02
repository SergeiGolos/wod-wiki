# Dead Code and Unused UI Analysis Report

This document identifies potentially dead code, orphaned files, and unused UI components in the WOD Wiki project.

## Summary

- **React Components Found**: 113
- **Orphaned Files Removed**: 28 files deleted
- **Components Without Storybook but Used Internally**: 65

## 1. Deleted Orphaned Files

The following files were identified as orphaned (never imported) and have been removed from the codebase:

### Clock (1 file)
- ~~`src/clock/hooks/useTimerHierarchy.ts`~~ **DELETED**

### Components (6 files)
- ~~`src/components/WorkoutJournal.tsx`~~ **DELETED**
- ~~`src/components/cast/CastButton.tsx`~~ **DELETED**
- ~~`src/components/layout/EditorIndexPanel.tsx`~~ **DELETED**
- ~~`src/components/layout/MobileWorkbench.tsx`~~ **DELETED**
- ~~`src/components/ui/dialog.tsx`~~ **DELETED**
- ~~`src/markdown-editor/components/SmartStatementInput.tsx`~~ **DELETED**

### Core (1 file)
- ~~`src/core/types/global.d.ts`~~ **DELETED**

### Editor (3 files)
- ~~`src/editor/frontmatter/FrontMatterTable.tsx`~~ **DELETED**
- ~~`src/editor/media/MediaWidget.tsx`~~ **DELETED**
- ~~`src/hooks/editor/useMonacoLifecycle.ts`~~ **DELETED**

### Parser (3 files)
- ~~`src/parser/validators/CircularReferenceValidator.ts`~~ **DELETED**
- ~~`src/parser/validators/NestingDepthValidator.ts`~~ **DELETED**
- ~~`src/parser/validators/TimerEventValidator.ts`~~ **DELETED**

### Runtime (9 files)
- ~~`src/runtime/EventHandler.ts`~~ **DELETED**
- ~~`src/runtime/ResultSpanBuilder.ts`~~ **DELETED**
- ~~`src/runtime/StackValidator.ts`~~ **DELETED**
- ~~`src/runtime/behaviors/BlockCompleteEventHandler.ts`~~ **DELETED**
- ~~`src/runtime/behaviors/CompletionTrackingBehavior.ts`~~ **DELETED**
- ~~`src/runtime/behaviors/ParentContextBehavior.ts`~~ **DELETED**
- ~~`src/runtime/hooks/useAnchorSubscription.ts`~~ **DELETED**
- ~~`src/runtime/models/ExecutionRecord.ts`~~ **DELETED**
- ~~`src/views/runtime/RuntimeDebugView.tsx`~~ **DELETED**

### Tools (4 files)
- ~~`src/tools/ExerciseIndexer.ts`~~ **DELETED**
- ~~`src/tools/generateExerciseIndex.ts`~~ **DELETED**
- ~~`src/tools/testIndexer.ts`~~ **DELETED**
- ~~`src/tools/testNameIndexer.ts`~~ **DELETED**

### Views (1 file)
- ~~`src/views/analytics/AnalyticsLayout.tsx`~~ **DELETED**

## 2. Components Missing Storybook Coverage

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

## 3. Recommendations

### Add Storybook Coverage (Low Priority)

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

---

*Updated after cleanup: 28 orphaned files removed*
