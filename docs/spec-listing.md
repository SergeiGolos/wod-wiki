# Project Spec File Listing

This document lists all test specification files (`.test.ts`) within the `src` directory, organized by module and functionality.

## Components
### Fragments
- **File**: `src/components/fragments/FragmentVisualizer.ColorMap.test.ts`
  - **Description**: Tests `fragmentColorMap` and `getFragmentColorClasses` for visual fragment color assignment.

## Dialects
- **File**: `src/dialects/CrossFitDialect.test.ts`
  - **Description**: Tests the `CrossFitDialect` for detecting workout formats like AMRAP, EMOM, FOR TIME, and TABATA.

## Editor
- **File**: `src/editor/WodWikiSyntaxInitializer.test.ts`
  - **Description**: Tests the initialization of Monaco editor syntax highlighting and rules.
- **File**: `src/editor/LRUCache.test.ts`
  - **Description**: Tests the Least Recently Used (LRU) cache implementation, including eviction, deletion, and stats.
- **File**: `src/editor/frontmatter/FrontMatterParser.test.ts`
  - **Description**: Tests the parsing of YAML frontmatter in workout files.
- **File**: `src/editor/ExerciseSearchEngine.test.ts`
  - **Description**: Tests the exercise search engine functionality, including immediate and debounced search, filtering, and caching.

## Lib
- **File**: `src/lib/timeUtils.test.ts`
  - **Description**: Tests shared time utility functions like `formatTimestamp`, `formatTime`, and `calculateDuration`.

## Markdown Editor
- **File**: `src/markdown-editor/utils/blockDetection.test.ts`
  - **Description**: Tests utilities for detecting WOD blocks, finding blocks at specific lines, and extracting block content.

## Parser
Tests for the `MdTimerParser` fragment parsers.
- **File**: `src/parser/__tests__/action-fragment.parser.test.ts`
  - **Description**: Tests parsing of action fragments (e.g., "Rest").
- **File**: `src/parser/__tests__/distance-fragment.parser.test.ts`
  - **Description**: Tests parsing of distance fragments (e.g., "400m", "5km").
- **File**: `src/parser/__tests__/effort-fragment.parser.test.ts`
  - **Description**: Tests parsing of effort fragments (e.g., exercise names like "Pushups").
- **File**: `src/parser/__tests__/increment-fragment.parser.test.ts`
  - **Description**: Tests parsing of increment fragments (e.g., "+5lbs").
- **File**: `src/parser/__tests__/lap-fragment.parser.test.ts`
  - **Description**: Tests parsing of lap/round syntax.
- **File**: `src/parser/__tests__/rep-fragment.parser.test.ts`
  - **Description**: Tests parsing of repetition counts, including valid formats and semantic validation errors.
- **File**: `src/parser/__tests__/resistance-fragment.parser.test.ts`
  - **Description**: Tests parsing of weight/resistance specifications (e.g., "135lbs").
- **File**: `src/parser/__tests__/rounds-fragment.parser.test.ts`
  - **Description**: Tests parsing of round counts (e.g., "5 Rounds").
- **File**: `src/parser/__tests__/timer-fragment.parser.test.ts`
  - **Description**: Tests parsing of time durations (e.g., "10:00").

## Runtime
Tests for the core execution runtime.
### Core
- **File**: `src/runtime/__tests__/RuntimeStackLifecycle.test.ts`
  - **Description**: Tests the lifecycle of the `ScriptRuntime`, including stack manipulation and event handling.
- **File**: `src/runtime/__tests__/RuntimeDebugMode.test.ts`
  - **Description**: Validate the debugging and testing architecture, including `TestableBlock` and custom wrappers.
- **File**: `src/runtime/__tests__/RootLifecycle.test.ts`
  - **Description**: Tests the `RootLifecycleBehavior`, verifying idle block injection and top-level orchestration.
- **File**: `src/runtime/__tests__/NextEventHandler.test.ts`
  - **Description**: Tests the `NextEventHandler` logic for processing `next` events.
- **File**: `src/runtime/__tests__/NextEvent.test.ts`
  - **Description**: Tests the `NextEvent` data structure.
- **File**: `src/runtime/__tests__/NextAction.test.ts`
  - **Description**: Tests the `NextAction` logic.
- **File**: `src/runtime/__tests__/LifecycleTimestamps.test.ts`
  - **Description**: Tests timestamp tracking across the runtime lifecycle.
- **File**: `src/runtime/__tests__/JitCompiler.test.ts`
  - **Description**: Tests the `JitCompiler` integrity, including dialect registry integration and strategy registration.

### Actions
- **File**: `src/runtime/actions/__tests__/ActionStackActions.test.ts`
  - **Description**: Tests actions related to stack manipulation (Push/Pop).

### Behaviors
- **File**: `src/runtime/behaviors/__tests__/TimerBehavior.test.ts`
  - **Description**: Tests `TimerBehavior`, including start/stop, pause/resume, and countdown logic.
- **File**: `src/runtime/behaviors/__tests__/IBehavior.test.ts`
  - **Description**: Tests the `IBehavior` base class and composition utilities (`composeBehaviors`).
- **File**: `src/runtime/behaviors/__tests__/LoopCoordinatorBehavior.test.ts`
  - **Description**: Tests `LoopCoordinatorBehavior` for handling multi-round/EMOM structures.
- **File**: `src/runtime/behaviors/__tests__/CompletionBehavior.test.ts`
  - **Description**: Tests `CompletionBehavior`, focusing on completion detection patterns and event triggers.
- **File**: `src/runtime/behaviors/__tests__/ActionLayerBehavior.test.ts`
  - **Description**: Tests `ActionLayerBehavior` for handling action layers.

### Strategies
- **File**: `src/runtime/strategies/__tests__/TimerStrategy.test.ts`
  - **Description**: Tests compilation of timer blocks.
- **File**: `src/runtime/strategies/__tests__/TimeBoundRoundsStrategy.test.ts`
  - **Description**: Tests compilation of time-bound round blocks (e.g. AMRAP).
- **File**: `src/runtime/strategies/__tests__/RoundsStrategy.test.ts`
  - **Description**: Tests compilation of simple round-based blocks.
- **File**: `src/runtime/strategies/__tests__/IntervalStrategy.test.ts`
  - **Description**: Tests compilation of interval-based blocks.
- **File**: `src/runtime/strategies/__tests__/GroupStrategy.test.ts`
  - **Description**: Tests compilation of generic grouping blocks.
- **File**: `src/runtime/strategies/__tests__/EffortStrategy.test.ts`
  - **Description**: Tests compilation of effort blocks (exercises).

## Runtime Test Bench
- **File**: `src/runtime-test-bench/services/testbench-services.test.ts`
  - **Description**: Tests testbench-specific services like global parser and compiler.
- **File**: `src/runtime-test-bench/selectors/runtime-selectors.test.ts`
  - **Description**: Tests selectors for querying runtime state (blocks, memory, status).

## Services
- **File**: `src/services/__tests__/DialectRegistry.test.ts`
  - **Description**: Tests the `DialectRegistry` for managing workout dialects.
- **File**: `src/services/ExerciseDefinitionService.test.ts`
  - **Description**: Tests the `ExerciseDefinitionService`.
- **File**: `src/services/AnalyticsTransformer.test.ts`
  - **Description**: Tests `AnalyticsTransformer` for converting runtime data into analytics segments.

## Timeline / Analytics
- **File**: `src/timeline/analytics/analytics/engines/VolumeProjectionEngine.test.ts`
  - **Description**: Tests `VolumeProjectionEngine` for calculating volume metrics.
- **File**: `src/timeline/analytics/analytics/AnalysisService.test.ts`
  - **Description**: Tests `AnalysisService` for managing projection engines and running projections.

## Tracker
- **File**: `src/tracker/__tests__/ExecutionTracker.test.ts`
  - **Description**: Tests `RuntimeReporter` and `RuntimeSpan` lifecycle, metrics, and segments.
- **File**: `src/tracker/__tests__/ExecutionSpanDebugMetadata.test.ts`
  - **Description**: Tests `RuntimeSpan` metadata creation, serialization, and usage.
