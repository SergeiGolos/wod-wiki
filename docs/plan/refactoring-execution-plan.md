# Refactoring Execution Plan

This document outlines the step-by-step plan to execute the codebase cleanup and refactoring identified in `docs/plan/cleanup-refactor.md`. It focuses on creating common abstractions, separating concerns, and ensuring test coverage.

## Goals
1.  **Reduce Component Bloat:** Shrink large files (`UnifiedWorkbench`, `ScriptRuntime`, `WodWiki`) by extracting logic.
2.  **Promote Reusability:** Create shared hooks and services for common patterns (Editor, Runtime, Timer).
3.  **Improve Testability:** Isolate complex logic into pure functions/classes that are easier to test.

---

## Phase 1: Foundation & Utilities
*Focus: Extract pure logic and shared utilities. Low risk, high value.*

### Step 1.1: Time Utilities
- **Objective:** Extract time formatting and calculation logic from `TimerBehavior`, `TimerDisplay`, and `TimerMemoryVisualization`.
- **Action:**
    - Create `src/lib/timeUtils.ts`.
    - Move `formatTimestamp`, `formatTime` (HH:MM:SS), and elapsed time calculations here.
- **Verification:**
    - Create `src/lib/timeUtils.test.ts`.
    - Update `TimerBehavior.ts` and `TimerMemoryVisualization.tsx` to use new utils.

### Step 1.2: Analytics Transformation Service
- **Objective:** Extract the massive `transformRuntimeToAnalytics` function from `UnifiedWorkbench.tsx`.
- **Action:**
    - Create `src/services/AnalyticsTransformer.ts`.
    - Move `transformRuntimeToAnalytics` and helper interfaces there.
- **Verification:**
    - Create `src/services/AnalyticsTransformer.test.ts` (Move any relevant logic tests from `UnifiedWorkbench` context if they exist, or create new ones).
    - Update `UnifiedWorkbench.tsx` to import the service.

### Step 1.3: Runtime Types & Interfaces
- **Objective:** Ensure all strategies and behaviors use consistent interfaces, removing deprecated `RuntimeMetric` references.
- **Action:**
    - Audit `src/runtime/IRuntimeBlockStrategy.ts`.
    - Clean up `src/runtime/strategies.ts` (remove commented out code) *before* splitting it.

---

## Phase 2: Runtime Core & Strategies
*Focus: Refactor the execution engine and strategy pattern. Critical path.*

### Step 2.1: Split Strategies
- **Objective:** Break `src/runtime/strategies.ts` into individual files.
- **Action:**
    - Create directory `src/runtime/strategies/`.
    - Move `TimerStrategy` to `src/runtime/strategies/TimerStrategy.ts`.
    - Move `RoundsStrategy` to `src/runtime/strategies/RoundsStrategy.ts`.
    - Move `EffortStrategy` to `src/runtime/strategies/EffortStrategy.ts`.
    - Move `IntervalStrategy` to `src/runtime/strategies/IntervalStrategy.ts`.
    - Move `TimeBoundRoundsStrategy` to `src/runtime/strategies/TimeBoundRoundsStrategy.ts`.
    - Move `GroupStrategy` to `src/runtime/strategies/GroupStrategy.ts`.
    - Update imports in `src/runtime-test-bench/services/testbench-services.ts` and other consumers.
- **Verification:**
    - Run existing runtime tests (`npm test src/runtime`).

### Step 2.2: Extract Block Context Logic
- **Objective:** Simplify `BlockContext.ts` and potentially abstract common context creation logic used by strategies.
- **Action:**
    - Refactor `getOrCreateAnchor` in `BlockContext.ts` for readability.
    - Create `BlockContextFactory` if strategy context creation code is repetitive.

### Step 2.3: Refactor ScriptRuntime
- **Objective:** De-clutter `ScriptRuntime.ts` by extracting the stack monkey-patching and event loop.
- **Action:**
    - Create `src/runtime/MemoryAwareRuntimeStack.ts` (extends `RuntimeStack`) to encapsulate the "pop/dispose" logic.      
    - Create `src/runtime/ExecutionLogger.ts` to handle `ExecutionRecord` logic (observer pattern).
    - Update `ScriptRuntime` to use these new classes instead of inline logic.
- **Verification:**
    - Run `src/runtime/tests/RootLifecycle.test.ts` and `NextEvent.test.ts` to ensure no regression in execution flow.

### Step 2.4: Timer Behavior Refactoring
- **Objective:** Clean up `TimerBehavior.ts`.
- **Action:**
    - Extract `TimerState` management into `TimerStateManager` class.
    - Use `TimeCalculator` from Phase 1.
- **Verification:**
    - Run `src/runtime/behaviors/TimerBehavior.test.ts`.

---

## Phase 3: Editor Unification
*Focus: Consolidate Monaco editor logic.*

### Step 3.1: Shared Monaco Hooks
- **Objective:** Extract common Monaco setup from `WodWiki.tsx` and `MarkdownEditor.tsx`.
- **Action:**
    - Create `src/hooks/editor/useMonacoLifecycle.ts` (mount/unmount).
    - Create `src/hooks/editor/useMonacoTheme.ts` (theme definitions).
    - Create `src/hooks/editor/useEditorResize.ts` (layout handling).
- **Verification:**
    - Update `WodWiki.tsx` to use hooks.
    - Update `MarkdownEditor.tsx` to use hooks.
    - Manual verification via Storybook (since editor tests are sparse).

### Step 3.2: Card Parsing & Management
- **Objective:** Refactor `RowBasedCardManager` and `CardParser`.
- **Action:**
    - Split `CardParser.ts`: Create `src/editor/parsers/` and move specific parsers (`HeadingParser`, `MediaParser`, etc.).
    - Update `CardParser` to use a strategy pattern to iterate these parsers.
    - Extract event handling from `RowBasedCardManager` into `useEditorEvents` hook or helper class.
- **Verification:**
    - Create unit tests for individual parsers (e.g., `HeadingParser.test.ts`).

---

## Phase 4: UI Component Decomposition
*Focus: Break down large UI components.*

### Step 4.1: Unified Workbench Decomposition
- **Objective:** Shrink `UnifiedWorkbench.tsx`.
- **Action:**
    - Extract sub-panels into separate files:
        - `src/components/workbench/TrackPanel.tsx`
        - `src/components/workbench/AnalyzePanel.tsx`
        - `src/components/workbench/PlanPanel.tsx`
    - Extract `useWorkbenchRuntime` hook to encapsulate the `useRuntime` + `useWorkoutEvents` + `useEffect` glue code.
- **Verification:**
    - Manual verification of the workbench in the app.

### Step 4.2: Runtime Layout Cleanup
- **Objective:** Shrink `RuntimeLayout.tsx`.
- **Action:**
    - Ensure `MockDataService` (if still needed) is separate.
    - Move `TimerDisplay` to its own component `src/components/runtime/TimerDisplay.tsx` (if not already done/collided with `Step 4.1` work).

### Step 4.3: Test Bench Refactor
- **Objective:** Clean up `TestBench.tsx`.
- **Action:**
    - Create `TestBenchContext` to hold state.
    - Extract `TestBenchLayout`.

---

## Phase 5: Test Cleanup & Validation
*Focus: Ensure the test suite is healthy and reflects the new structure.*

### Step 5.1: Test Location Audit
- Move any tests that are currently co-located in `src/runtime` but belong in `__tests__` or similar standard locations if strictly enforced (optional, but good for organization).

### Step 5.2: New Test Coverage
- Ensure the new Services (`AnalyticsTransformer`, `ExecutionLogger`) have high coverage.
- Ensure the new Strategies (`TimerStrategy`, etc.) have basic unit tests verifying their `match` logic.

### Step 5.3: End-to-End Verification
- Run the full test suite (`npm test`).
- Verify crucial flows (Workout Start -> Tick -> Complete) using the Test Bench or `useRuntimeExecution.test.ts`.
