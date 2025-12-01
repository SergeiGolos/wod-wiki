# Codebase Cleanup and Refactoring Plan

This document outlines a plan to refactor files in the codebase that have grown too large (> 80 lines) or complex. The goal is to improve maintainability, readability, and testability.

## File Analysis and Refactoring Proposals

### 1. `src/editor/WodWiki.tsx` (592 lines)

**Analysis:**
This is the main editor component. It handles Monaco initialization, syntax highlighting, suggestion engine setup, theming, content resizing, and cursor tracking. It has a lot of `useEffect` hooks and refs managing different aspects of the editor lifecycle.

**Refactoring Proposal:**
- **Extract Hooks:** Move logic for specific features into custom hooks:
    - `useMonacoEditor(props)`: Initialize editor, handle mount/unmount.
    - `useEditorTheme(theme)`: Handle theme application.
    - `useEditorResize(editorRef)`: Handle content size changes.
    - `useCursorHighlighting(editorRef, cursor, highlightedLine)`: Handle decorations for cursor/line highlighting.
- **Separate Initializers:** The `WodWikiSyntaxInitializer` is already separate, but instantiation and setup inside the component is verbose. Create a helper or hook `useSyntaxInitializer`.
- **Component Composition:** Split the render into smaller components if possible, though it's mostly a wrapper around `Editor`.

### 2. `src/runtime/behaviors/TimerBehavior.ts` (485 lines)

**Analysis:**
This class manages timer logic (start, stop, pause, tick), memory interaction, and event emission. It handles both count-up and count-down (AMRAP) logic. It also deals with legacy vs. new memory references.

**Refactoring Proposal:**
- **Extract State Management:** Move the `TimerState` management (updating spans, start/stop logic) into a separate `TimerStateManager` or `TimerMemoryService` class. The behavior should only orchestrate actions.
- **Strategy Pattern:** Split `count-up` and `count-down` logic into separate strategies (`CountUpStrategy`, `CountDownStrategy`) or subclasses if they diverge significantly.
- **Utility Functions:** Extract time calculation (elapsed, display time) into a utility helper `TimeCalculator`.

### 3. `src/markdown-editor/MarkdownEditor.tsx` (363 lines)

**Analysis:**
Similar to `WodWiki.tsx`, this component initializes a full-page Markdown editor with custom features like WOD blocks, context overlay, command palette, and rich markdown (cards). It has grown large due to feature accumulation.

**Refactoring Proposal:**
- **Custom Hooks:**
    - `useMarkdownEditorSetup()`: Handle Monaco mount and configuration.
    - `useThemeManager(monaco, theme)`: Handle custom theme definitions.
    - `useFoldingManager(editor)`: Encapsulate folding logic.
- **Sub-components:**
    - `MarkdownToolbar`: Extract the toolbar JSX and logic.
- **Event Handlers:** Move complex event handlers (like card actions) to a separate `EditorActionHandler` class or hook.

### 4. `src/runtime/ScriptRuntime.ts` (338 lines)

**Analysis:**
This is the core runtime engine. It manages the stack, memory, event handling loop, and execution logging. The `_setupMemoryAwareStack` method is particularly complex and monkey-patches the stack.

**Refactoring Proposal:**
- **Extract Stack Logic:** Move the "memory-aware stack" logic into a subclass of `RuntimeStack` (e.g., `MemoryAwareRuntimeStack`) or a decorator/middleware pattern, instead of monkey-patching in the runtime constructor.
- **Event Loop Extraction:** Move the `handle()` loop logic into a `RuntimeEventLoop` or `ExecutionEngine` class.
- **Metrics/Logging:** Move execution logging (`ExecutionRecord` creation/updates) into a dedicated `ExecutionLogger` service that subscribes to runtime events.

### 5. `src/editor/inline-cards/RowBasedCardManager.ts` (333 lines)

**Analysis:**
Manages inline cards (widgets) within the editor. It handles parsing, rendering, resizing, and cursor interactions. It has complex state management for preventing layout thrashing (debouncing).

**Refactoring Proposal:**
- **Separate Parsing Logic:** `CardParser` is already separate, but the manager still does a lot of coordination. Move the "diffing" logic (updating only changed cards) into a `CardReconciler`.
- **Event Handling:** Extract event listeners (cursor, content changes) into a `EditorSubscriptionManager`.
- **Rendering Logic:** The `RowRuleRenderer` is separate, but the manager's `updateEditingState` and `handleInternalAction` methods are complex. Simplify state updates, perhaps using a reducer pattern for card state.

### 6. `src/editor/inline-cards/CardParser.ts` (268 lines)

**Analysis:**
Parses text content into card objects. It contains logic for multiple card types (heading, blockquote, media, frontmatter, wod-block) in one file.

**Refactoring Proposal:**
- **Parser Strategy Pattern:** Create an interface `ICardTypeParser` and implement separate parsers for each type (`HeadingParser`, `MediaParser`, `WodBlockParser`).
- **Composite Parser:** `CardParser` should just iterate through registered parsers. This removes the monolithic `parseAllCards` method and makes adding new card types easier.

### 7. `src/views/runtime/RuntimeLayout.tsx` (376 lines)

**Analysis:**
Large layout component coordinating multiple panels (history, context, debug, timer, analytics). It also handles mock data generation (which is very large) and runtime initialization.

**Refactoring Proposal:**
- **Remove Mock Data:** Move `generateSessionData` and related logic to a separate `MockDataService` or `data/mocks.ts` file.
- **Extract Sub-panels:** `TimerDisplay` is defined inline; move it to `src/components/runtime/TimerDisplay.tsx`.
- **Hooks for Logic:** Move runtime initialization and event handling (start/stop/pause) into a `useRuntimeController` hook.

### 8. `src/runtime-test-bench/TestBench.tsx` (230 lines)

**Analysis:**
The main entry point for the test bench UI. It manages state for the script, runtime, and layout.

**Refactoring Proposal:**
- **State Management:** Use a reducer or a context provider (`TestBenchContext`) to manage the complex state (script, output, runtime, memory).
- **Component Extraction:** Extract the layout structure into a `TestBenchLayout` component, keeping `TestBench` as the container/controller.

### 9. `src/runtime/strategies.ts` (containing multiple strategies)

**Analysis:**
This file contains multiple strategy classes (`EffortStrategy`, `TimerStrategy`, `RoundsStrategy`, `IntervalStrategy`, `TimeBoundRoundsStrategy`, `GroupStrategy`) and deprecated code. It's a "god file" for strategies.

**Refactoring Proposal:**
- **Split Files:** Create a directory `src/runtime/strategies/` and move each strategy into its own file (`TimerStrategy.ts`, `RoundsStrategy.ts`, etc.).
- **Remove Deprecated Code:** Delete the commented-out/deprecated strategies.
- **Shared Helpers:** If strategies share logic (like `BlockContext` creation), extract it to a helper.

### 10. `src/editor/inline-cards/RowBasedCardSystem.tsx` (207 lines)

**Analysis:**
React wrapper around `RowBasedCardManager`. It handles lifecycle and integration with the Monaco editor instance.

**Refactoring Proposal:**
- **Simplify Lifecycle:** The `useEffect` that initializes the manager is long. Extract the setup logic into a function or hook.
- **Props Interface:** The interface is simple, but the component does a lot of "glue" work. Ensure it only focuses on React-Monaco integration.

### 11. `src/components/layout/UnifiedWorkbench.tsx` (761 lines)

**Analysis:**
Massive component handling the entire app layout, responsive behavior, runtime integration, analytics transformation, and view switching. It's doing too much.

**Refactoring Proposal:**
- **Extract Analytics Logic:** The `transformRuntimeToAnalytics` function is huge. Move it to `src/services/AnalyticsTransformer.ts`.
- **Extract Panels:** The definition of panels (`trackIndexPanel`, `timerDisplay`, etc.) clutters the render method. Move these to separate component files or render methods.
- **Custom Hooks:**
    - `useWorkbenchNavigation()`: Handle view modes and mobile checks.
    - `useWorkbenchRuntime()`: Handle runtime integration and event bus subscriptions.

### 12. `src/markdown-editor/widgets/TimerWidget.tsx` (181 lines)

**Analysis:**
Visual widget for timers in the editor.

**Refactoring Proposal:**
- **Sub-components:** Split into `TimerDisplay`, `TimerControls`, and `TimerSettings`.
- **Logic Extraction:** Move timer calculation logic to `useTimer` hook if not already done.

### 13. `src/runtime-test-bench/services/TestBenchExecutionService.ts` (179 lines)

**Analysis:**
Service to manage execution in the test bench.

**Refactoring Proposal:**
- **Single Responsibility:** Ensure it only handles execution. If it handles UI state, move that out.
- **Simplify Methods:** Break down large methods like `executeStep` or `runFull` into smaller, testable steps.

### 14. `src/runtime/strategies/IntervalStrategy.ts` & `RoundsStrategy.ts`

**Analysis:**
These are currently part of `src/runtime/strategies.ts` (as found in analysis). If they were separate, they would be candidates for cleanup.
- **Cleanup:** As mentioned in step 9, separate them into files. Ensure `match` and `compile` logic is clean.

### 15. `src/clock/TimerMemoryVisualization.tsx` (162 lines)

**Analysis:**
Visualizes timer memory state.

**Refactoring Proposal:**
- **Sub-components:** Extract `TimeSpanList` and `TimerStatus` components.
- **Formatting:** Move date formatting to a shared utility.

### 16. `src/runtime-test-bench/components/RuntimeStackPanel.tsx` (161 lines)

**Analysis:**
Displays the runtime stack.

**Refactoring Proposal:**
- **Recursive Component:** The recursive `renderBlockTree` is fine, but could be its own component `BlockTreeItem`.
- **Styles:** Move tailwind class strings to a constants file or use a cleaner styling solution (like `class-variance-authority` if available, or just helper functions).

### 17. `src/clock/hooks/useDisplayStack.ts` (151 lines)

**Analysis:**
A file containing multiple hooks (`useDisplayStack`, `useCurrentTimer`, etc.).

**Refactoring Proposal:**
- **Split Hooks:** Move each hook to its own file if they are used independently often, or keep them grouped but ensure they share common logic efficiently.
- **Refine Types:** Ensure return types are strict.

### 18. `src/runtime/BlockContext.ts` (148 lines)

**Analysis:**
Manages memory allocation context.

**Refactoring Proposal:**
- **Logic Simplification:** The `getOrCreateAnchor` method is complex. Extract it or simplify the searching logic.
- **Validation:** Add more robust validation for released contexts.

### 19. `src/markdown-editor/components/SmartStatementInput.tsx` (147 lines)

**Analysis:**
Input component with autocomplete suggestions.

**Refactoring Proposal:**
- **Custom Hook:** Extract the suggestion fetching logic into `useExerciseSuggestions(value)`.
- **Component Split:** Separate the `SuggestionList` into its own component.

## General Recommendations

1.  **Directory Structure:**
    - Create `src/hooks` subdirectories for domain-specific hooks (e.g., `src/hooks/editor`, `src/hooks/runtime`).
    - Enforce one component per file rule more strictly.

2.  **State Management:**
    - For complex components like `UnifiedWorkbench` and `ScriptRuntime`, consider using a state machine (like XState) or a more robust reducer pattern to manage transitions and states explicitly.

3.  **Testing:**
    - Large files are hard to test. Refactoring them into smaller functions/classes will make unit testing significantly easier.
    - Write tests for the extracted logic (e.g., `CountUpStrategy`, `TimeCalculator`) immediately after refactoring.

4.  **Dead Code:**
    - Aggressively remove commented-out code and deprecated classes (found in `strategies.ts`).
