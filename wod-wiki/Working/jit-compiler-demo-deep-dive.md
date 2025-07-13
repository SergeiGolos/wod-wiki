---
title: "JIT Compiler Demo Deep Dive"
date: 2025-07-06
tags: [storybook, jit, compiler, documentation]
parent: ../Core/Compiler/RuntimeJitStrategies.md
related: ["../Core/IScriptRuntime.md", "../Core/IRuntimeBlock.md"]
---

# JIT Compiler Demo Deep Dive

## Overview

This document provides a deep dive into the `JitCompilerDemo.tsx` component. This component is a Storybook story that demonstrates the functionality of the Just-in-Time (JIT) compiler and the `ScriptRuntime`.

## Key Components

The demo is composed of several key components that visualize the runtime state of a WOD script.

### `JitCompilerDemo`

The main component that orchestrates the demo. It initializes the `ScriptRuntime` and manages the simulation of the workout execution.

### `RuntimeStackVisualizer`

This component visualizes the runtime stack of the `ScriptRuntime`. It displays the stack of `IRuntimeBlock` instances, with the current block highlighted.

### `RuntimeMetricVisualizer` and `MetricValueDisplay`

These components are responsible for displaying the metrics of a `RuntimeMetric`. The `MetricValueDisplay` component displays a single metric value, with a color-coded background based on the metric type.

### `RuntimeBlockDisplay`

This component displays the details of the current `IRuntimeBlock`. It shows the block's key and the metrics that have been compiled for it.

## Simulation

The demo simulates the execution of a WOD script by stepping through a series of predefined states. The `handleNext` function in the `JitCompilerDemo` component advances the simulation to the next step.

The simulation has four steps:

1.  **Initial state:** The root block is loaded onto the runtime stack.
2.  **Compilation phase:** The JIT compiler processes the script's statements. This is visualized with a pulsing animation.
3.  **Execution phase:** The runtime blocks are actively processing. This is visualized with green highlighting.
4.  **Completion phase:** The workout execution is finished. This is visualized with emerald highlighting.

## `ScriptRuntime` and `WodScript`

The `ScriptRuntime` is initialized with a `WodScript` instance. The `WodScript` is created from the text of the WOD script. The `ScriptRuntime` is responsible for managing the execution of the script, including the JIT compilation of the script's statements into `IRuntimeBlock` instances.

## Plan to Connect Visual Feedback to Runtime Values

The current implementation of the `JitCompilerDemo.tsx` component uses a simulated `simulationStep` to control the visual feedback. To make the demo more realistic, the visual feedback components should be connected to the public values tracked by the `ScriptRuntime`.

### `ScriptRuntime` Public Interface

The `ScriptRuntime` class has the following public properties that can be used to drive the visual feedback:

*   `stack`: A `RuntimeStack` instance that contains the stack of `IRuntimeBlock` instances.
*   `jit`: A `JitCompiler` instance that is responsible for compiling the script's statements into `IRuntimeBlock` instances.

### Implementation Steps

1.  **Expose Runtime State:** The `ScriptRuntime` needs to expose more of its internal state. This could be done by adding public properties or by emitting events. For example, the `ScriptRuntime` could emit an event whenever the stack changes.

2.  **Update the `JitCompilerDemo` Component:** The `JitCompilerDemo` component needs to be updated to use the public values of the `ScriptRuntime` to drive the visual feedback. This will involve removing the `simulationStep` state and instead using the `stack` and `jit` properties of the `scriptRuntime` state.

3.  **Connect the `RuntimeStackVisualizer`:** The `RuntimeStackVisualizer` component should be updated to take the `scriptRuntime.stack` as a prop. It will then render the stack of blocks based on the `stack.blocks` property.

4.  **Connect the `RuntimeBlockDisplay`:** The `RuntimeBlockDisplay` component should be updated to take the `scriptRuntime.stack.current` as a prop. It will then display the details of the current block.

### Missing Elements

The primary missing element is the exposure of the `ScriptRuntime`'s internal state. The `tick()` method in `ScriptRuntime` is a good candidate for emitting events that the UI can subscribe to. For example, it could emit a `tick` event that includes the current state of the runtime. The `JitCompilerDemo` could then listen for this event and update its state accordingly.

Additionally, the `JitCompiler` could expose its state, such as whether it is currently compiling a block. This would allow the UI to display a "compiling" indicator.
