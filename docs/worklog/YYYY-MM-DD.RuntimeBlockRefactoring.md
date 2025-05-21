# Refactoring Design Proposal: Runtime Blocks

**Date:** YYYY-MM-DD
**Author:** Cascade AI
**Version:** 1.0

## 1. Introduction

This document outlines a proposal for refactoring the runtime block implementations in `x:\wod-wiki\src\core\runtime\blocks`. The goal is to reduce code redundancy, improve maintainability, and enhance code reuse by leveraging and extending the `AbstractBlockLifecycle` and `RuntimeBlock` base classes.

## 2. Current Architecture Overview

- **`AbstractBlockLifecycle`**: Provides the template method pattern for block lifecycle (`enter`, `next`, `leave`) and manages `BlockContext` and `MetricsContext`. It defines template methods that call abstract `do...` hooks.
- **`RuntimeBlock`**: Extends `AbstractBlockLifecycle` and defines abstract `doEnter`, `doNext`, `doLeave` hooks for concrete blocks. It also overrides the `handle` method for event processing.
- **Concrete Blocks** (e.g., `TimerBlock`, `EffortBlock`, `RepeatingBlock`, `TimedGroupBlock`): Implement the `doXXX` hooks. They also frequently override `createResultSpan` and `enhanceResultSpan` (from `AbstractBlockLifecycle`) for customized `ResultSpan` management and metric additions.

## 3. Identified Patterns and Redundancies

### 3.1. `ResultSpan` Creation and Enhancement

- **Observation**: Most blocks that utilize `ResultSpan`s override `createResultSpan` primarily to set a custom `span.label`, and override `enhanceResultSpan` to add block-specific `RuntimeMetric`s.
  - `TimerBlock`: Label "Timer - {key}", Metrics: Planned Duration, Current Duration, Actual Duration.
  - `EffortBlock`: Label "{efforts} - {key}", Metrics: Last Updated Timestamp, Status (e.g., completed).
  - `RepeatingBlock`: Label "Round {current_round}/{total_rounds} - {key}", Metrics: Round information.
  - `TimedGroupBlock`: Aggregates child metrics into its span.
- **Redundancy**: The pattern of calling `super.createResultSpan()` then setting a label, and `super.enhanceResultSpan()` then adding specific metrics, is common across multiple blocks.

### 3.2. Lifecycle Method Commonalities (`doEnter`, `doLeave`)

- **Observation**:
  - `doEnter`: Several blocks perform common UI setup actions, such as `SetButtonsAction` and `SetClockAction` (e.g., `TimerBlock`, `EffortBlock`).
  - `doLeave`: Common teardown actions include stopping timers, finalizing metrics, creating `WriteResultAction`, and adding final events/metrics to `ResultSpan`s.
- **Redundancy**: Similar sequences of `IRuntimeAction` creation appear in different blocks for similar purposes.

### 3.3. Metric Initialization and Finalization in `ResultSpan`s

- **Observation**: Blocks often add initial metrics to `ResultSpan`s in `doEnter` (or via `createResultSpan`/`enhanceResultSpan` upon creation) and final/summary metrics in `doLeave` (or via `enhanceResultSpan` when the span is being closed).
- **Redundancy**: Logic for adding common metric types (e.g., status indicators, timestamps) might be duplicated or implemented with slight variations.

### 3.4. Deprecated `metrics()` Method

- **Observation**: Several blocks (e.g., `EffortBlock`, `RepeatingBlock`) still implement a deprecated `public metrics()` method that simply forwards the call to `this.getMetrics()`.

## 4. Proposed Refactorings

### 4.1. Enhance `AbstractBlockLifecycle` for `ResultSpan` Management

#### 4.1.1. Standardized `ResultSpan` Labeling

- **Proposal**: Introduce a protected helper method in `AbstractBlockLifecycle` or `RuntimeBlock` to assist with common label generation. Concrete blocks can then use this helper or provide specific parts of the label.

  ```typescript
  // In AbstractBlockLifecycle or RuntimeBlock
  protected generateBlockLabel(mainIdentifier: string, prefix?: string, suffix?: string): string {
    let label = mainIdentifier;
    if (this.blockKey) {
      label += ` - ${this.blockKey}`;
    }
    return `${prefix || ''}${label}${suffix || ''}`.trim();
  }

  // Example usage in a concrete block's createResultSpan:
  // const roundsInfo = `Round ${this.ctx.index + 1}/${this.totalRounds}`;
  // span.label = this.generateBlockLabel("Repeating Logic", roundsInfo);
  ```

- **Benefit**: Reduces boilerplate for label construction in each block's `createResultSpan` method and promotes consistent label formatting.

#### 4.1.2. Dedicated Hook for Adding Custom Metrics to `ResultSpan`

- **Proposal**: `AbstractBlockLifecycle.enhanceResultSpan` can remain the primary point for enriching spans. Subclasses will continue to override it to add their specific metrics after calling `super.enhanceResultSpan()`.
- **Refinement**: Consider adding a new protected virtual method `_addDefaultSpanMetrics(span: ResultSpan)` in `AbstractBlockLifecycle` that `enhanceResultSpan` calls. This could add truly common metrics like a creation timestamp automatically, if applicable to almost all spans.

  ```typescript
  // In AbstractBlockLifecycle
  protected enhanceResultSpan(span: ResultSpan): void {
    // Existing common enhancement logic from AbstractBlockLifecycle (if any)
    // e.g., ensuring parentSpanId is set if applicable
    this._addDefaultSpanMetrics(span); 
    // Subclasses will call super.enhanceResultSpan() and then add their specific metrics.
  }

  protected _addDefaultSpanMetrics(span: ResultSpan): void {
    // Example: Add a creation timestamp or a basic status metric if widely applicable
    // if (!span.metrics.some(m => m.effort === 'CreationTimestamp')) {
    //   span.metrics.push({ sourceId: this.blockId, effort: 'CreationTimestamp', values: [{ type: 'timestamp', value: span.start?.timestamp.getTime() || Date.now(), unit: 'ms' }] });
    // }
  }
  ```

- **Benefit**: Provides a clear place for block-specific metrics in the overridden `enhanceResultSpan`, while allowing the base class to handle very common, default metrics.

### 4.2. Consolidate Common Lifecycle Action Sequences

#### 4.2.1. Helper Methods for Common UI and State Actions

- **Proposal**: Introduce protected helper methods in `RuntimeBlock` (or `AbstractBlockLifecycle` if general enough) for common action sequences performed in `doEnter` or `doLeave`.

  ```typescript
  // In RuntimeBlock
  protected getStandardEntryActions(customButtons: any[] = [completeButton]): IRuntimeAction[] {
    return [
      new SetClockAction("primary"), // Default, could be parameterized
      new SetButtonsAction(customButtons, "runtime")
    ];
  }

  protected getStandardExitActions(): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    // Example: Automatically generate WriteResultAction if metrics exist
    const metrics = this.getMetrics(false, false); // Get only own metrics
    if (metrics.length > 0) {
        actions.push(new WriteResultAction(this.blockKey, metrics));
    }
    actions.push(new PopBlockAction());
    return actions;
  }

  // Example in TimerBlock.doEnter:
  // protected doEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
  //   // ... timer specific setup ...
  //   return this.getStandardEntryActions();
  // }

  // Example in TimerBlock.doNext (if only popping):
  // protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
  //   return this.getStandardExitActions(); // Or a more specific helper for 'next'
  // }
  ```

- **Benefit**: Reduces duplication of `IRuntimeAction` instantiation and makes lifecycle methods in concrete blocks more concise and focused on their unique logic.

### 4.3. Remove Deprecated `metrics()` Method

- **Proposal**: Systematically remove all instances of the `public metrics(...)` method from concrete blocks, ensuring all usages are migrated to `this.getMetrics(...)`.
- **Benefit**: Code cleanup, reduces confusion, and enforces the use of the correct API provided by `AbstractBlockLifecycle`.

## 5. Impact Analysis

- **Improved Readability**: Centralizing common logic will make individual block implementations cleaner and easier to understand.
- **Reduced Boilerplate**: Less repeated code for `ResultSpan` labeling, metric addition, and action creation.
- **Easier Maintenance**: Changes to common behaviors (e.g., default button setup) can be made in a single place.
- **Testability**: Smaller, more focused methods in base classes can be unit-tested more effectively. Concrete blocks will still require specific tests for their unique behaviors.
- **Backward Compatibility**: Proposed changes aim to refactor internal implementations while preserving the external behavior of the blocks. The primary changes are within the inheritance hierarchy of the blocks themselves.

## 6. Next Steps

1. Implement the proposed refactorings in `AbstractBlockLifecycle` and `RuntimeBlock`.
2. Update all concrete block implementations (`TimerBlock`, `EffortBlock`, `RepeatingBlock`, `TimedGroupBlock`, `DoneRuntimeBlock`, `IdleRuntimeBlock`, `RootBlock`) to utilize the new helper methods and patterns.
3. Thoroughly test the changes, including running existing unit tests (e.g., `ResultSpanMetrics.test.ts`) and potentially adding new ones to cover the refactored base class logic.
4. Review the changes for any unintended side effects or performance implications.

## 7. Conclusion

The proposed refactorings aim to make the runtime block system more robust, maintainable, and easier to extend. By consolidating common patterns into base classes and helper methods, we can significantly reduce redundancy and improve the overall code quality of the wod.wiki platform.
