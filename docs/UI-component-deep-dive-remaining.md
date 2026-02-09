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

### Merge Context Panels (🟡 Important)
Two components share ~70% of their code and should be unified.

- **Components**:
  - `src/components/workout/WorkoutContextPanel.tsx` (Workbench version)
  - `src/markdown-editor/components/ContextPanel.tsx` (Editor widget version)
- **Plan**:
  - Enhance `WorkoutContextPanel` to support optional props (`showErrors`, `showMetadata`, `showTimerDialog`, `activeStatementIds`).
  - Update `ContextOverlay` to use this unified component.
  - Delete `ContextPanel.tsx`.

### Unify Stack Subscriptions (🟡 Important)
Multiple hooks subscribe to the runtime stack using slightly different patterns.

- **Goal**: Standardize on `useStackSnapshot` (from `src/runtime/hooks/useStackSnapshot.ts`) as the canonical source.
- **Deprecated/To Remove**:
  - `useStackBlocks` (in `src/runtime/hooks/useStackBlocks.ts`)
  - `useCurrentBlock`

## 2. Naming & Organization

### Rename "Analyze" to "Review"
The term "Analyze" is considered suboptimal for the user experience.

- **Action**: Rename the "Analyze" view to "Review" across the UI and codebase.
- **Scope**:
  - View enum (`ViewMode`)
  - Component names (`AnalyzePanel` → `ReviewPanel`)
  - UI labels

### Clarify Runtime Providers
Two components share the name `RuntimeProvider` but serve different purposes.

- **Conflict**:
  - `src/components/layout/RuntimeProvider.tsx` (Lifecycle management)
  - `src/runtime/context/RuntimeContext.tsx` (Context injection)
- **Action**: Rename `src/components/layout/RuntimeProvider.tsx` to `RuntimeLifecycleManager` or similar to distinguish it from the actual context provider.

### Consolidate `useOutputStatements`
Two hooks share the exact same name but live in different directories.

- **Conflict**:
  - `src/runtime/hooks/useOutputStatements.ts`
  - `src/clock/hooks/useExecutionSpans.ts` (exports `useOutputStatements`)
- **Action**: Keep the richer version (from `clock/hooks`), move it to `src/runtime/hooks/`, and delete the simpler version.

### Clean Up Type Definitions
Duplicate type definitions exist for fragments.

- **File**: `src/core/types/fragments.ts`
- **Action**: Remove `FragmentTypeString` and `FragmentColorMap` from here, as they are canonically defined in `src/views/runtime/fragmentColorMap.ts`.

## 3. Code Deletion & Cleanup

### Remove `QueueTestHarness`
This testing harness is superseded or no longer needed.

- **File**: `src/testing/components/QueueTestHarness.tsx`
- **Action**: Delete the file and any associated tests or screens that depend on it.

### Consolidate `parseWodBlock`
Two hooks implement identical parsing logic.

- **Hooks**: `useBlockParser` and `useParseAllBlocks`
- **Action**: Extract the parsing logic into a shared `parseWodBlock(content)` utility function.

## Summary Checklist

- [x] **Consolidate `useTimerElapsed` logic** ✅ Completed 2026-02-09
- [ ] Merge `WorkoutContextPanel` and `ContextPanel`
- [ ] Rename "Analyze" to "Review"
- [ ] Remove `QueueTestHarness`
- [ ] Rename `RuntimeProvider` (layout)
- [ ] Unify `useOutputStatements` hooks
- [ ] Clean up `fragments.ts` type duplication
- [ ] Extract `parseWodBlock` utility
