---
title: "Next Steps: Metric Inheritance Integration"
date: 2025-06-29
tags: [roadmap, metric-inheritance, integration]
parent: ./metric-inheritance-implementation-complete.md
---

# Next Steps: Metric Inheritance Integration

This document outlines the immediate next steps for integrating the completed metric inheritance system into the broader WOD Wiki project. These steps are derived from the "Next Steps" section of the [Metric Inheritance Implementation Complete](./metric-inheritance-implementation-complete.md) document.

## Overview of Next Steps

The core metric inheritance system is robust and tested. The focus now shifts to integrating it with existing and future components of the JIT Compiler and runtime.

### 1. Integration with Block Strategies

**Objective**: Update existing block strategies to utilize the newly composed metrics provided by the metric inheritance system.

**Details**:
- Identify all existing block strategies that process or generate metrics.
- Modify these strategies to accept and apply the `RuntimeMetric` objects that have been processed by the `MetricComposer`.
- Ensure that the strategies correctly interpret and use the inherited metric values.

### 2. Concrete Block Implementations

**Objective**: Implement the `inherit()` methods within actual block classes to ensure proper metric propagation through the runtime hierarchy.

**Details**:
- Review `src/runtime/IRuntimeBlock.ts` and its concrete implementations.
- For each concrete block class, implement the `inherit()` method to correctly apply inherited metrics to its children or internal state.
- This involves understanding how each block type should modify or pass down metrics based on its specific logic.

### 3. Advanced Patterns

**Objective**: Explore and implement more advanced metric inheritance patterns, such as time-based, percentage-based, and context-aware inheritance.

**Details**:
- Design and implement new `IMetricInheritance` classes for these advanced scenarios.
- Examples include:
    - **Time-based**: Adjusting metrics based on elapsed time or time targets.
    - **Percentage-based**: Applying percentage multipliers to metric values (e.g., for progressive overload).
    - **Context-aware**: Modifying metrics based on external factors or runtime context (e.g., user performance, environmental conditions).

### 4. Performance Optimization

**Objective**: Evaluate and optimize the performance of the metric inheritance system, if necessary, based on real-world usage and profiling.

**Details**:
- Conduct performance profiling once the system is fully integrated and in use.
- Identify any bottlenecks or areas for optimization within the `MetricComposer` or individual `IMetricInheritance` implementations.
- Implement optimizations as needed to ensure the system remains efficient for complex WODs.

## Dependencies

- Completion of the core metric inheritance system (already achieved).
- Understanding of existing JIT Compiler block strategies and runtime block implementations.

## Success Criteria

- All relevant block strategies successfully integrate and utilize inherited metrics.
- Concrete block implementations correctly propagate and apply inherited metrics.
- New advanced inheritance patterns are implemented and tested.
- The system maintains acceptable performance under typical usage scenarios.

## Related Documents

- [Metric Inheritance Implementation Complete](./metric-inheritance-implementation-complete.md)
- [JIT Compiler Design](../../Core/Compiler/JitCompiler.md)
