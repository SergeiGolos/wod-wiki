# Remaining Tasks from UI Component Deep Dive

Based on the analysis in `docs/UI-component-deep-dive.opus.md` (Generated 2026-02-09), the following tasks remain to fully optimize the codebase.

## 1. High Priority Refactoring

### Consolidate Timer Elapsed Logic (✅ Completed - 2026-02-09)
~~There are currently three parallel implementations for calculating elapsed time. These must be consolidated into a single hook using the shared `calculateDuration` logic.~~

**STATUS: COMPLETED**

All inline `reduce` implementations for timer elapsed calculations have been consolidated to use the canonical `calculateDuration` utility from `src/lib/timeUtils.ts`.

- **Source**: `src/lib/timeUtils.ts` (Canonical `calculateDuration`)
- **Hooks Already Using `calculateDuration`**:
  - ✅ `src/runtime/hooks/useTimerElapsed.ts` 
  - ✅ `src/clock/hooks/useStopwatch.ts` (exported as `useTimespan`)
  - ✅ `src/runtime/hooks/useBlockMemory.ts` (`useTimerDisplay`)
- **Components Updated to Use `calculateDuration`**:
  - ✅ `src/components/workout/TimerDisplay.tsx` (replaced inline `getElapsed`)
  - ✅ `src/clock/components/EnhancedTimerHarness.tsx` (replaced inline `calculateElapsed`)
- **Result**: Single source of truth for duration calculation across all timer implementations.

### Merge Context Panels (✅ Completed - 2026-02-09)
~~Two components share ~70% of their code and should be unified.~~

**STATUS: COMPLETED**

The context panel components have been successfully consolidated into a single unified component.

- **Components Consolidated**:
  - ✅ `src/components/workout/WorkoutContextPanel.tsx` (Enhanced version - now canonical)
  - ✅ `src/markdown-editor/components/ContextPanel.tsx` (Deleted - was deprecated wrapper)
- **Implementation Details**:
  - ✅ `WorkoutContextPanel` enhanced with optional props: `showErrors`, `showMetadata`, `showTimerDialog`, `activeStatementIds`, `mobile`, `compact`
  - ✅ Supports three modes: `edit`, `run`, `analyze`
  - ✅ `ContextOverlay` updated to use `WorkoutContextPanel` directly
  - ✅ Backward compatibility note added in `markdown-editor/index.ts`
- **Result**: Single unified context panel component with all features from both original versions.

### Unify Stack Subscriptions (✅ Completed - 2026-02-09)
~~Multiple hooks subscribe to the runtime stack using slightly different patterns.~~

**STATUS: COMPLETED**

Stack subscription hooks have been successfully unified with `useStackSnapshot` as the canonical source.

- **Canonical Hook**:
  - ✅ `useStackSnapshot` (from `src/runtime/hooks/useStackSnapshot.ts`) - Primary stack subscription hook
  - ✅ `useSnapshotBlocks` - Convenience wrapper returning blocks array
  - ✅ `useSnapshotCurrentBlock` - Convenience wrapper returning top block
- **Deprecated Hooks (Removed)**:
  - ✅ `useStackBlocks` - Deleted, replaced by `useSnapshotBlocks`
  - ✅ `useCurrentBlock` - Deleted, replaced by `useSnapshotCurrentBlock`
- **Cleanup**:
  - ✅ Updated comment in [TimerDisplay.tsx](src/components/workout/TimerDisplay.tsx) to reference correct hook name
  - ✅ No code references to deprecated hooks remain
  - ⚠️ Historical documentation files still reference old names (preserved for context)
- **Result**: Single unified stack subscription pattern with rich snapshot data and convenient accessors.

## 2. Naming & Organization

### Rename "Analyze" to "Review" (✅ Completed - 2026-02-09)
~~The term "Analyze" is considered suboptimal for the user experience.~~

**STATUS: COMPLETED**

All references to "Analyze" have been renamed to "Review" across the codebase.

- **Changes Made**:
  - ✅ `ViewMode` type: `'analyze'` → `'review'`
  - ✅ Component renamed: `AnalyzePanel.tsx` → `ReviewPanel.tsx`
  - ✅ Component exports: `AnalyzePanelIndex`, `AnalyzePanelPrimary` → `ReviewPanelIndex`, `ReviewPanelPrimary`
  - ✅ Props renamed: `analyzeIndexPanel`, `analyzePrimaryPanel` → `reviewIndexPanel`, `reviewPrimaryPanel`
  - ✅ `WorkoutContextMode`: `'analyze'` → `'review'`
  - ✅ UI labels: "Analyze" button → "Review" button
  - ✅ Comments and documentation updated
- **Files Modified**:
  - [ReviewPanel.tsx](src/components/workbench/ReviewPanel.tsx) (renamed from AnalyzePanel.tsx)
  - [SlidingViewport.tsx](src/components/layout/SlidingViewport.tsx)
  - [UnifiedWorkbench.tsx](src/components/layout/UnifiedWorkbench.tsx)
  - [WorkbenchContext.tsx](src/components/layout/WorkbenchContext.tsx)
  - [WorkoutContextPanel.tsx](src/components/workout/WorkoutContextPanel.tsx)
- **Result**: Consistent "Review" terminology throughout the UI and codebase.

### Clarify Runtime Providers (✅ Completed - 2026-02-09)
~~Two components share the name `RuntimeProvider` but serve different purposes.~~

**STATUS: COMPLETED**

File and component names have been clarified to distinguish lifecycle management from context injection.

- **Changes Made**:
  - ✅ Renamed file: `RuntimeProvider.tsx` → `RuntimeLifecycleProvider.tsx`
  - ✅ Renamed file: `RuntimeContext.tsx` → `RuntimeLifecycleContext.tsx`
  - ✅ Renamed file: `useRuntime.ts` → `useRuntimeLifecycle.ts`
  - ✅ Updated all imports in consuming files
  - ✅ Updated documentation comments
- **Files Modified**:
  - [RuntimeLifecycleProvider.tsx](src/components/layout/RuntimeLifecycleProvider.tsx) (manages lifecycle)
  - [RuntimeContext.tsx](src/runtime/context/RuntimeContext.tsx) (provides context injection via ScriptRuntimeProvider)
  - [UnifiedWorkbench.tsx](src/components/layout/UnifiedWorkbench.tsx)
  - [useWorkbenchRuntime.ts](src/components/workbench/useWorkbenchRuntime.ts)
  - [TimerDisplay.tsx](src/components/workout/TimerDisplay.tsx)
- **Result**: Clear distinction between `RuntimeLifecycleProvider` (lifecycle) and `ScriptRuntimeProvider` (context injection).

### Consolidate `useOutputStatements` (✅ Completed - 2026-02-09)
~~Two hooks share the exact same name but live in different directories.~~

**STATUS: COMPLETED**

Hooks have been successfully consolidated with a single canonical implementation.

- **Changes Made**:
  - ✅ Canonical implementation: `src/runtime/hooks/useOutputStatements.ts`
  - ✅ Deleted deprecated re-export wrapper: `src/clock/hooks/useExecutionSpans.ts`
  - ✅ No imports reference the old path
- **Features**:
  - Works with or without runtime parameter
  - Returns enriched OutputStatementsData with indexed maps
  - Includes helper hooks: `useOutputStatement`, `useBlockOutputs`, `useOutputHierarchy`
- **Result**: Single unified hook for output statement subscriptions.

### Clean Up Type Definitions (✅ Completed - 2026-02-09)
~~Duplicate type definitions exist for fragments.~~

**STATUS: COMPLETED**

Duplicate type definitions have been removed in favor of canonical source.

- **Changes Made**:
  - ✅ Removed `FragmentTypeString` from `src/core/types/fragments.ts`
  - ✅ Removed `FragmentColorMap` from `src/core/types/fragments.ts`
  - ✅ Removed exports from `src/core/types/index.ts`
  - ✅ Added documentation comments noting canonical location
- **Canonical Source**: `src/views/runtime/fragmentColorMap.ts`
  - Contains `FragmentType` (equivalent to FragmentTypeString)
  - Contains `FragmentColorMap` with Tailwind CSS class mappings
  - Includes `fragmentColorMap` constant with actual color values
  - Provides `getFragmentColorClasses()` helper function
- **Result**: Single source of truth for fragment type definitions and color mappings.

## 3. Code Deletion & Cleanup

### Remove `QueueTestHarness` (✅ Completed - 2026-02-09)
~~This testing harness is superseded or no longer needed.~~

**STATUS: COMPLETED**

The deprecated `QueueTestHarness` component has been removed from the codebase.

- **Actions Taken**:
  - ✅ Deleted file: `src/testing/components/QueueTestHarness.tsx`
  - ✅ Removed exports from `src/testing/components/index.ts`
  - ✅ Removed exports from `src/runtime/testing/index.ts`
  - ✅ Removed documentation references
- **Rationale**: Component was superseded by newer testing patterns and harness tools
- **Result**: Cleaner testing module with no orphaned components.

### Consolidate `parseWodBlock` (✅ Completed - 2026-02-09)
~~Two hooks implement identical parsing logic.~~

**STATUS: COMPLETED**

Parsing logic has been extracted into a shared utility function.

- **Changes Made**:
  - ✅ Created utility: `src/markdown-editor/utils/parseWodBlock.ts`
  - ✅ Updated `useBlockParser` to use shared utility
  - ✅ Updated `useParseAllBlocks` to use shared utility
  - ✅ Exported from `src/markdown-editor/index.ts`
- **Utility Features**:
  - Pure function: `parseWodBlock(content, parser) => ParseResult`
  - Returns: `{ statements, errors, success }`
  - Handles empty content gracefully
  - Consistent error transformation
- **Result**: DRY parsing logic shared between hooks, easier to test and maintain.

## Summary Checklist

- [x] **Consolidate `useTimerElapsed` logic** ✅ Completed 2026-02-09
- [x] **Merge `WorkoutContextPanel` and `ContextPanel`** ✅ Completed 2026-02-09
- [x] **Unify `useStackSnapshot` stack subscriptions** ✅ Completed 2026-02-09
- [x] **Rename "Analyze" to "Review"** ✅ Completed 2026-02-09
- [x] **Remove `QueueTestHarness`** ✅ Completed 2026-02-09
- [x] **Rename `RuntimeProvider` (layout)** ✅ Completed 2026-02-09
- [x] **Unify `useOutputStatements` hooks** ✅ Completed 2026-02-09
- [x] **Clean up `fragments.ts` type duplication** ✅ Completed 2026-02-09
- [x] **Extract `parseWodBlock` utility** ✅ Completed 2026-02-09

---

## 🎉 All Tasks Complete!

All UI component refactoring tasks from the deep dive analysis have been successfully completed. The codebase now has:

- **Unified patterns** for timer calculations, context panels, and stack subscriptions
- **Clear naming** with "Review" terminology and distinct runtime provider names
- **Consolidated hooks** with single sources of truth for output statements and parsing
- **Reduced duplication** in type definitions and parsing logic
- **Cleaner testing** infrastructure with deprecated harnesses removed

Next steps could include performance optimization, additional test coverage, or tackling other architectural improvements from the deep dive document.
