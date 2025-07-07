---
title: "Implementation Plan: Connecting the 'Next' Button to the Runtime"
date: 2025-07-06
tags: [runtime, plan, next-button, state-management]
parent: ../Core/IScriptRuntime.md
related: ["../Core/IRuntimeBlock.md", "../Core/IRuntimeAction.md"]
---

# Implementation Plan: Connecting the 'Next' Button to the Runtime

## Overview

This document outlines a refined plan to make the "Next" button in the `JitCompilerDemo` story drive the `ScriptRuntime` forward. The implementation will be based on the core principle that the runtime's execution state is defined entirely by the `RuntimeStack`.

## Core Principle: The Stack is the Cursor

The `RuntimeStack` will serve as the definitive cursor for our position in the workout script. There will be no external index tracking which statement is next. Instead, the currently active block (the one at the top of the stack) is solely responsible for determining what happens next.

This approach treats the runtime as a state machine, where the `next()` method of the current block triggers the transition to the next state.

## Proposed Execution Flow

The following sequence describes the process from a user clicking the "Next" button to the UI reflecting the new runtime state:

1.  **UI (`JitCompilerDemo.tsx`):** The user clicks the "Next" button, which calls a new `advance()` method on the `scriptRuntime` instance.

2.  **Runtime API (`ScriptRuntime.ts`):** A new public method, `advance()`, will be implemented. Its job is to orchestrate the state transition.

3.  **Get Current Block:** The `advance()` method retrieves the current block from the top of the stack (`this.stack.current`).

4.  **Invoke Block's Logic:** It then calls the `currentBlock.next()` method. This delegates the decision of what to do next to the block itself.

5.  **Receive Actions:** The `next()` method will return an array of `IRuntimeAction` objects. These actions represent the specific operations needed to transition to the next state (e.g., push a new block, pop the current one).

6.  **Execute Actions:** The `advance()` method iterates through the returned actions and executes them using a `do(runtime)` method on each action. This keeps the `ScriptRuntime` as the central authority for modifying its own state.

7.  **Notify UI:** After all actions are executed, `scriptRuntime.tick()` is called to emit the new state via the RxJS `Subject`, causing the UI to update.

## Required Implementations

To make this flow functional, the following components and interfaces need to be created or completed:

1.  **Define `IRuntimeAction` Interface (`Core/IRuntimeAction.md`):**
    *   **Need:** A formal contract for actions that can be returned by a block.
    *   **Plan:** Create a new core interface `IRuntimeAction` with a single method: `do(runtime: IScriptRuntime): void;`. Then, implement concrete action classes:
        *   `PopBlockAction`: Removes the top block from the `RuntimeStack`.
        *   `CompileAndPushAction`: Takes a `JitStatement`, uses the `JitCompiler` to create a new `IRuntimeBlock`, and pushes it onto the `RuntimeStack`.

2.  **Implement `RuntimeStack.push()` and `pop()`:**
    *   **Need:** The stack needs methods to be manipulated by the actions.
    *   **Plan:** Implement these two fundamental methods in the `RuntimeStack.ts` file. `push()` should add a block and set it as `current`. `pop()` should remove the top block and update `current` to the new top.

3.  **Implement `IRuntimeBlock.next()`:**
    *   **Need:** This is where the primary logic for script progression will live.
    *   **Plan:** Each type of `IRuntimeBlock` will have a unique implementation of `next()`.
        *   **`RootBlock`:** Its `next()` method will look at the script's statements. If there's an unprocessed statement, it will return a `[new CompileAndPushAction(nextStatement)]`. If all statements are done, it might do nothing or trigger a completion state.
        *   **Other Blocks (e.g., `TimerBlock`, `RoundsBlock`):** Their `next()` method will check their internal completion criteria. When complete, they will return a `[new PopBlockAction()]` to signal they are finished.

4.  **Complete the `JitCompiler`:**
    *   **Need:** The `CompileAndPushAction` is dependent on a functional compiler.
    *   **Plan:** The placeholder logic in `JitCompiler.ts` must be replaced with a working implementation that can successfully turn a `JitStatement` into a concrete `IRuntimeBlock`.
