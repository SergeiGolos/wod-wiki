# Metric Inheritance Implementation Plan

This document outlines the steps required to implement metric inheritance in the JIT Compiler, as described in the updated `JitCompiler.md` documentation.

## 1. Define the Metric Inheritance Logic

The core of this change is the logic for how metrics are inherited. This will be managed by a `MetricComposer` that leverages a new `IMetricInheritance` interface.

A new file, `MetricComposer.ts`, will be created to encapsulate this logic. The `IFragmentCompiler` will be updated to return a `MetricComposer` for a given statement. This composer will then be passed the `IMetricInheritance` instances from the parent blocks in the `RuntimeStack` to generate the final `RuntimeMetric` array.

### IMetricInheritance Interface

We will define a new interface, `IMetricInheritance`, which will be returned by an `inherit()` method on an `IRuntimeBlock`. This interface provides a method to mutate a `RuntimeMetric` based on the block's inheritance rules.

```typescript
// In a new file: src/core/IMetricInheritance.ts
export interface IMetricInheritance {
    /**
     * Mutates the given metric based on the inheritance rules of the block.
     * @param metric The metric to mutate.
     */
    compose(metric: RuntimeMetric): void;
}
```

## 2. Update `IRuntimeBlock` Interface

The `IRuntimeBlock` interface will be updated to support the new inheritance model.

*   Add a `metrics` property that holds the final, composed metrics for that block.
*   Add an `inherit()` method that returns an `IMetricInheritance` object, which encapsulates the block's rules for modifying its children's metrics.

```typescript
// In src/core/IRuntimeBlock.ts
import { IMetricInheritance } from './IMetricInheritance';
import { RuntimeMetric } from './RuntimeMetric';

export interface IRuntimeBlock {
    // ... existing properties
    metrics: RuntimeMetric[];
    inherit(): IMetricInheritance;
}
```

## 3. Modify the JIT Compiler

The `JitCompiler.ts` file will be modified to implement the new compilation pipeline.

*   **Update `compile` method:**
    1.  The `IFragmentCompiler` will generate a `MetricComposer` for the given statements.
    2.  The `JitCompiler` will retrieve the stack of `IMetricInheritance` objects from the `RuntimeStack`.
    3.  It will then use the `MetricComposer`, providing it the parent inheritance rules, to compose the final metrics for the new block.
    4.  The composed metrics will be passed to the `strategyManager` to create the new `IRuntimeBlock`.

## 4. Update `IRuntimeBlock` Strategies

The `IRuntimeBlock` strategies will need to be updated to use the composed metrics.

*   The `canHandle` method of each strategy must be updated to use the composed metrics to determine if it can handle the statement.
*   The `compile` method of each strategy will be updated to accept the composed metrics instead of the raw fragment compilation results.

## 5. Testing

Thorough testing will be required to ensure that the metric inheritance logic is working correctly.

*   Unit tests should be created for the `MetricComposer` and different implementations of `IMetricInheritance`.
*   Integration tests should be created to test the entire compilation pipeline, from fragment compilation to block creation.
*   Existing tests will need to be updated to reflect the new changes.
