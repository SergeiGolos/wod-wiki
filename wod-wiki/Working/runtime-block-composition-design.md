---
title: "Design Deep Dive: Runtime Block Composition and Metric Inheritance"
date: 2025-07-13
tags: [design, runtime, inheritance, composition, draft]
status: draft
related:
  - ../Core/Runtime/IRuntimeBlock.md
  - ../Core/Metrics/IMetricInheritance.md
---

# Design Deep Dive: Runtime Block Composition

## 1. Overview

This document explores how a parent `RuntimeBlock` can influence the metrics of its child blocks. When blocks are nested (e.g., a "5 rounds" block containing a "10 push-ups" block), the parent's context must modify the child's outcome to produce a final, composed metric (e.g., 50 total push-ups).

We need to define the rules and patterns for this composition to ensure the runtime behavior is predictable, flexible, and powerful.

## 2. Core Problem

The `MetricComposer` and `IMetricInheritance` strategies provide the low-level tools for modifying metrics. Now, we must integrate them into the `RuntimeStack` and `IRuntimeBlock` lifecycle.

A running script is represented by a `RuntimeStack` of active blocks. The `current` block is the one executing, and all other blocks below it on the stack are its parents or ancestors. The `inherit()` method on a block defines how it affects its children.

The central challenge is to define precisely how and when parent inheritance rules are applied to a child block's base metrics.

## 3. Key Design Questions (Your Input Needed)

Please provide your thoughts on the following questions. Your answers will guide the implementation and testing.

---

### Q1: Inheritance Chaining & Order of Operations

When multiple blocks are nested (e.g., Grandparent -> Parent -> Child), each may provide an `IMetricInheritance` rule. In what order should these rules be applied?

-   **Option A: Outermost-In (FIFO):** The Grandparent's rule is applied first, then the Parent's.
-   **Option B: Innermost-Out (LIFO):** The immediate Parent's rule is applied first, then the Grandparent's.
>

*Example Scenario:*
-   Child Metric: `{ reps: 10 }`
-   Parent Rule: `InheritMetricInheritance({ reps: 5 })` (Adds 5)
-   Grandparent Rule: `OverrideMetricInheritance({ reps: 1 })` (Sets to 1)

-   **Outcome with Option A (Outermost-In):**
    1.  Grandparent applies `Override`: `reps` becomes 1.
    2.  Parent applies `Inherit`: `reps` becomes `1 + 5 = 6`.
    3.  **Final: 6 reps.**

-   **Outcome with Option B (Innermost-Out):**
    1.  Parent applies `Inherit`: `reps` becomes `10 + 5 = 15`.
    2.  Grandparent applies `Override`: `reps` becomes 1.
    3.  **Final: 1 rep.**

**Your Decision:**
```
 Option B, bu Inhert work by replacing a value if it doesn't block doesn't already have it.  This would mean that the value would be 10 for a parent, as the child has a reps value already/  For the reps to override
```

---

### Q2: Default Inheritance Behavior

If a `RuntimeBlock` does not implement the `inherit()` method or returns `null`/`undefined`, what should happen?

-   **Option A: No Inheritance:** The block has no effect on its children (it is transparent).
-   **Option B: Default Inheritance:** A system-wide default is applied. For example, we could default to `InheritMetricInheritance` that adds values for matching metric types, effectively summing up metrics from parent to child.
-   **Option C: Explicit Required:** Throw a runtime error if `inherit()` is not explicitly defined. This would enforce strictness but reduce flexibility.

**Your Decision:**
```
 Option A, nothing from that block is inhertied
```

---

### Q3: Selective Inheritance

Should a parent block be able to apply its inheritance rules to only *some* of its direct children, or must it apply to all of them uniformly?

-   **Option A: Uniform Application:** The parent's `inherit()` rule applies to all children nested directly underneath it. This is simpler to implement.
-   **Option B: Selective Application:** The parent can dynamically choose whether to apply its rule based on the child block's key, type, or other properties. This is more powerful but adds complexity to the `IRuntimeBlock` interface.

**Your Decision:**
```
Option A or B.]
```

---

## 4. Proposed Implementation Sketch

Based on the current architecture, the process for composing metrics for a given block would be:

1.  When a block is about to be executed, the `ScriptRuntime` will look at its `RuntimeStack`.
2.  It will gather an array of `IMetricInheritance` objects from all parent blocks on the stack (from outermost to innermost, or vice-versa based on **Q1**).
3.  It will instantiate a `MetricComposer` with the current block's base metrics.
4.  It will pass the collected inheritance rules to the `composer.compose()` method.
5.  The resulting composed metrics will be used for the block's execution and output.

This approach centralizes the composition logic and keeps the blocks themselves focused on their specific behavior.

---

Once you provide your answers, I will proceed with creating a test suite that validates the chosen design.
