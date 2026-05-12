# Comprehensive Runtime Test Suite - Implementation Strategy

## Overview
As the WhiteboardScript engine matures and supports more complex workout structures, interactions, and dialects, our testing strategy must evolve. We need a comprehensive, data-driven test suite that explicitly covers all permutations of block types, metric inheritance, and the specific effects of dialects on runtime execution.

## Goals
- Ensure absolute reliability of the runtime engine across complex, nested workout structures (e.g., AMRAP inside For Time, Intervals with varying rest periods).
- Validate metric propagation and inheritance (e.g., weight cascading from a parent group to child efforts).
- Explicitly test the divergent behaviors introduced by different execution dialects (`wod`, `log`, `plan`).
- Provide a clear, easily extensible framework for adding new edge cases as they are discovered.

## Key Testing Dimensions

### 1. Structural Combinations
Test deep nesting and sequential combinations:
- `For Time` containing `AMRAP` segments.
- `EMOM` sequences transitioning into `Max Effort` blocks.
- `Rounds` with embedded `Rest` periods vs. global `Rest` blocks.
- deeply nested groups (3+ levels deep) to ensure scope and variable resolution hold up.

### 2. Metric & Scope Resolution
Test how metrics behave across boundaries:
- Inheritance: Does a weight defined at the root apply to all valid children?
- Overrides: Does a child specifying a different weight correctly override the inherited one?
- Accumulation: Are total reps/volume correctly aggregated across complex loops?

### 3. Dialect Effects (Crucial)
The runtime behaves differently based on the active dialect:
- **`wod` (Execution):** Timers tick, user input is required to advance manual blocks, full state machine lifecycle.
- **`log` (Historical):** Timers should likely complete instantly or wait for manual entry; the focus is on data capture, not real-time pacing.
- **`plan` (Future):** Validation of targets, simulation of total volume, but no active ticking or required completion events.
*The test suite must run the same structural AST through all three dialect strategies and assert the differing outcomes.*

## Testing Architecture

### Data-Driven Fixtures
Instead of purely programmatic tests, we should define test cases using a declarative fixture format (e.g., YAML or JSON alongside a `.wod` file).
- `input.wod`: The WhiteboardScript snippet.
- `expected_wod.json`: Expected AST and runtime emission trace for the `wod` dialect.
- `expected_log.json`: Expected behavior for the `log` dialect.
- `expected_plan.json`: Expected behavior for the `plan` dialect.

### Snapshot / Trace Verification
Use the `OutputTracingHarness` to capture the exact sequence of events (mount, tick, pop, output emission) and compare them against approved snapshots.

## Next Steps
- [ ] Define the schema for the data-driven test fixtures.
- [ ] Create a dedicated directory (`tests/runtime-compliance`) for these comprehensive suites.
- [ ] Implement a test runner that automatically executes all fixtures across the three primary dialects.
- [ ] Migrate existing complex integration tests into this new fixture format.
