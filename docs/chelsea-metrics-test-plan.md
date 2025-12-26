# Test Plan: Preserve Metrics for “examples-crossfit--chelsea”

## Objective
Validate that the runtime block produced from the CrossFit “Chelsea” workout retains all three metrics emitted by its three source code statements after the workout is started and advanced via a `next` trigger. The assertion uses the unified metrics path (`SpanMetrics.metricGroups` and fragments) and must not rely on legacy `RuntimeMetric` arrays.

## Scope
- Vitest unit test (no browser/jsdom required).
- Uses existing parser + JIT + runtime stack with `RuntimeReporter` enabled.
- Uses deterministic time to avoid flaky duration assertions.

## Proposed Test File
`tests/runtime-execution/examples-crossfit-chelsea.metrics.test.ts`

## Preconditions / Fixtures
- Workout script: use the existing “examples-crossfit--chelsea” text (from examples directory or inline constant if no helper exists).
- Expectation: the script yields three code statements that compile into one runtime block; that block should carry three metrics in its span.
- Clock: mock runtime clock (or inject `startTime`) so duration math is stable.

## Test Steps (Arrange → Act → Assert)
1) **Arrange**
   - Parse the Chelsea script with the project parser to obtain `ICodeStatement[]`.
   - Compile via `JitCompiler` (or the runtime’s compile helper) to prepare/push the runtime block.
   - Stand up `ScriptRuntime`/`TestableRuntime` with `RuntimeReporter` active.

2) **Act**
   - Start execution so the block mounts and the span is created.
   - Dispatch a `next` (or equivalent runtime hook) to mirror “push next to start it,” ensuring the block is active and spans/logging are populated.

3) **Assert (metrics)**
   - Fetch the active (or completed) `TrackedSpan` via `runtime.tracker.getAllSpans()` or `getActiveSpansMap()`.
   - Verify `span.metrics.metricGroups` exists and contains three `RecordedMetricValue` entries (either in one group or across groups) corresponding to the three source statements. Check `type`/`unit`/`value` as per Chelsea’s statements.
   - Confirm `legacyMetrics` is *not* required for the pass (unified path only).

4) **Assert (fragments)**
   - Call `spanMetricsToFragments(span.metrics, span.label, span.type)`.
   - Verify three fragments/chips are produced that align with the three metrics (types/labels as expected).

## Guard Assertions
- Test passes even if `compiledMetrics`/`legacyMetrics` are absent; unified `metricGroups` drives the check.
- No reliance on wall-clock randomness; mocked timestamps avoid drift.

## Helpers / Mocks
- Mock or inject `runtime.clock.now` to a fixed value.
- If available, use `TestableRuntime.pushNext()` (or equivalent) to simulate the `next` event.

## Acceptance Criteria
- The test fails if fewer than three unified metrics are present on the span after start + next.
- The test fails if fragments rendered from `SpanMetrics` do not produce three chips.
- The test does not touch legacy adapters or `RuntimeMetric` arrays.