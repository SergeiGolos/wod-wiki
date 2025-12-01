# Documentation Index and Implementation Status

This document provides an index of the existing documentation and an analysis of the implementation status of the features described therein.

## 1. Documentation Index

### Architecture & Overview
- **`docs/Architecture.md`**: High-level system architecture (Parser -> JIT -> Runtime -> UI).
- **`docs/runtime-overview.md`**: Deep dive into the Stack-Based Runtime Model.
- **`docs/Wod_Wiki_Syntax.md`**: Specification of the workout syntax (Time, Rounds, Actions).
- **`docs/UI_Overview.md`**: Overview of UI components and design philosophy.

### Runtime Engine
- **`docs/Runtime_Architecture_Blocks_Strategies.md`**: Details on Blocks (Timer, Rounds, Effort) and compilation strategies.
- **`docs/Runtime_Behaviors_Deep_Dive.md`**: Explanation of behaviors like `TimerBehavior` and `LoopCoordinatorBehavior`.
- **`docs/Runtime_Engine_Deep_Dive.md`**: Core stack execution logic.
- **`docs/fix-runtime-execution-loop.md`**: Plan to fix the sync execution loop (Completed/Addressed in current code).
- **`docs/Runtime_Test_Bench.md`**: Guide for the runtime debugger tool.
- **`docs/Runtime_Implementation_Review.md`**: Status check of the runtime (dated).
- **`docs/history-and-timer.md`**: Spec for History Timeline and Timer Display.
- **`docs/history-and-timer-gaps-and-plan.md`**: Plan to implement history and fix timer gaps.
- **`docs/SoundBehavior_Design.md`**: Design for audio cues.

### Metrics & Data
- **`docs/Metrics_Collection.md`**: Data structures for metrics (`RuntimeMetric`).
- **`docs/Metrics_Implementation_Plan.md`**: Plan for collecting and storing metrics.
- **`docs/memory-types.md`**: Proposal to standardize memory keys (Enum).
- **`docs/refactor-metrics-memory.md`**: Refactoring plan for metrics memory.
- **`docs/runtime-history-refactor.md`**: Plan for `ExecutionLog`.

### Editor (Monaco)
- **`docs/monaco-rich-markdown-plan.md`**: Plan for rich features (Images, Youtube, FrontMatter).
- **`docs/Monaco_Card_Behavior_Spec.md`**: Spec for inline cards/widgets.
- **`docs/Monaco_Inline_Widget_Implementation_Spec.md`**: Implementation details for widgets.
- **`docs/Monaco Editor Syntax Highlighting Integration.md`**: How highlighting works.
- **`docs/monaco-folding.md`**: Plan for folding regions.
- **`docs/Cursor_Aware_Formatting_Proposal.md`**: Smart cursor features (not implemented).

### UI & Layout
- **`docs/UnifiedWorkbench_Coupling_Analysis.md`**: Analysis of current coupling issues.
- **`docs/UnifiedWorkbench_Decoupling_Plan.md`**: Plan to refactor the Workbench.
- **`docs/Unified_Responsive_Layout.md`**: Plan for mobile/tablet support.
- **`docs/command-palette-implementation.md`**: Plan for `Cmd+K` menu.
- **`docs/timer-visual.md`**: Design concepts for the timer display.

### TV Casting (Future)
- **`docs/tv/*.md`**: Comprehensive specs for Android TV app and Casting protocol.

---

## 2. Implementation Status Analysis

### Runtime Engine

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Stack Architecture** | ✅ Done | Core `RuntimeStack`, `RuntimeBlock` are stable. |
| **Timer Behavior** | ✅ Done | High precision timing works. Refactored to use unified `TimerState` model. |
| **Looping** | ⚠️ Partial | `LoopCoordinator` handles Fixed Rounds and Rep Schemes. **Intervals/EMOMs are broken.** |
| **Intervals (EMOM)** | ❌ Missing | `IntervalStrategy.ts` is a stub. `LoopCoordinator` lacks timing wait logic. |
| **History Tracking** | ✅ Done | `HistoryBehavior` creates `ExecutionSpan` objects. |
| **Sound Cues** | ✅ Done | `SoundBehavior` logic is implemented (needs UI/AudioContext integration). |
| **Memory Types** | ✅ Done | `MemoryTypeEnum` fully implemented. Memory search uses `type` field consistently. |
| **Strategy Pattern** | ✅ Done | Strategies split into `src/runtime/strategies/` directory. |

### Editor

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Syntax Highlighting** | ✅ Done | Monarch tokenizer works. |
| **Folding** | ⚠️ Partial | `HeadingSectionFoldingFeature` works for headings/WOD blocks. **Rich folding (FrontMatter)** is missing. |
| **Inline Widgets** | ✅ Done | `RichMarkdownManager` with `RowBasedCardManager` in `src/editor/inline-cards`. |
| **Rich Markdown** | ⚠️ Partial | WOD block cards implemented. Images/Youtube/FrontMatter missing. |
| **Autocomplete** | ✅ Done | `ExerciseSuggestionProvider` with LRU cache and 150ms debounce. |
| **Editor Setup** | ✅ Done | `MarkdownEditor` refactored with `useMarkdownEditorSetup` hook. Reduced from 363→267 lines. |

### UI & UX

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Workbench** | ✅ Done | Decoupled via `RuntimeFactory`, `RuntimeProvider`, `WorkoutEventBus`. Reduced from 761→493 lines. |
| **Timer Display** | ✅ Done | `StackedClockDisplay` works, hooks use unified `TimerState` model. |
| **Command Palette** | ✅ Done | `CommandPalette` component with `Ctrl+.` binding. |
| **Mobile Layout** | ⚠️ Partial | `SlidingViewport` provides responsive behavior. |

### TV Casting

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Client Manager** | ✅ Done | `CastManager.ts` is implemented. |
| **Protocol Types** | ✅ Done | Types defined in `src/types/cast/messages.ts`. |
| **Relay Server** | ❌ Missing | Server code not found. |
| **TV App** | ❌ Missing | Native Android TV app not started. |

---

## 3. Gap Analysis & Priorities

### Critical Gaps (Blocks Core Functionality)
1.  **Intervals / EMOM**: Users cannot run standard EMOM workouts. This is a core WOD feature.
    *   *Docs*: `Runtime_Architecture_Blocks_Strategies.md`, `Runtime_Behaviors_Deep_Dive.md`.
    *   *Fix*: Implement `IntervalStrategy` and update `LoopCoordinatorBehavior` to respect interval timing.

### High Value / Low Effort (Quick Wins)
1.  **Command Palette**: Significantly improves UX.
    *   *Docs*: `command-palette-implementation.md`.
2.  **Sound Integration**: Connect the existing `SoundBehavior` to an actual Audio Context to play beeps.
    *   *Docs*: `SoundBehavior_Design.md`.

### Technical Debt (Maintenance)
1.  **Workbench Decoupling**: ✅ **COMPLETED** - Refactored via `RuntimeFactory`, `RuntimeProvider`, and `WorkoutEventBus`.
    *   *Docs*: `UnifiedWorkbench_Decoupling_Plan.md`.
2.  **Metric Refactor**: ✅ **COMPLETED** - Migrated to unified `TimerState` model with `MemoryTypeEnum`.
    *   *Docs*: `refactor-metrics-memory.md`.
3.  **MarkdownEditor Cleanup**: ✅ **COMPLETED** - Extracted `useMarkdownEditorSetup` hook.
    *   *Docs*: `cleanup-refactor.md`.

### Strategic Features (Differentiation)
1.  **Rich Editor**: Images and FrontMatter make it a "real" Wiki.
    *   *Docs*: `monaco-rich-markdown-plan.md`.
2.  **TV Casting**: The "killer feature" for gym use.
    *   *Docs*: `docs/tv/*`.

---

## 4. Proposed Execution Plan

### Phase 1: Core Runtime Fixes ⚠️ PARTIAL
**Goal**: Ensure all standard WOD types (For Time, AMRAP, EMOM, Rep Schemes) run correctly.
1.  **Implement `IntervalStrategy`**: ❌ Create the blocks for EMOMs. (Still needed)
2.  **Update `LoopCoordinatorBehavior`**: ❌ Add logic to wait for the interval timer to expire before starting the next round. (Still needed)
3.  **Verify Sound**: ❌ Hook up `SoundBehavior` to play simple beeps. (Still needed)
4.  **Timer Memory Model**: ✅ **COMPLETED** - Unified `TimerState` model with `TimerSpan[]` and memory search by `type` field.
5.  **Strategy Pattern Cleanup**: ✅ **COMPLETED** - Strategies split into `src/runtime/strategies/` directory.

### Phase 2: UI Foundation & UX ✅ COMPLETED
**Goal**: Make the app cleaner and more responsive.
1.  **Decouple Workbench**: ✅ **COMPLETED** - `RuntimeFactory`, `RuntimeProvider`, `useWorkbenchRuntime` hook, `WorkoutEventBus`.
2.  **Command Palette**: ✅ **COMPLETED** - `CommandPalette` component with `Ctrl+.` binding.
3.  **Responsive Layout**: ✅ **COMPLETED** - `SlidingViewport` provides mobile tab switching.

### Phase 3: Editor Enhancements ⚠️ PARTIAL
**Goal**: "IDE-like" experience.
1.  **Rich Markdown**: ⚠️ WOD block cards done. Add Image drag-and-drop and Header styling. (Still needed)
2.  **Autocomplete**: ✅ **COMPLETED** - `ExerciseSuggestionProvider` with LRU cache.
3.  **MarkdownEditor Cleanup**: ✅ **COMPLETED** - `useMarkdownEditorSetup` hook extracted.

### Phase 4: Expansion (TV)
**Goal**: Extend to the living room.
1.  **Relay Server**: ❌ Deploy the WebSocket server. (Still needed)
2.  **Cast UI**: ❌ Add "Cast" button to the web app. (Still needed)
3.  **TV App**: ❌ Build the React Native TV client. (Still needed)
