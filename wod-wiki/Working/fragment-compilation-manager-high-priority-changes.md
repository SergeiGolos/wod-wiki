---
title: "High-Priority Changes for FragmentCompilationManager"
date: 2025-07-13
tags: [runtime, compilation, design-options]
related:
  - ./scriptruntime-implementation-assessment.md
  - ../../src/runtime/FragmentCompilationManager.ts
status: draft
---

# High-Priority Changes for FragmentCompilationManager

This document outlines the necessary high-priority work for `src/runtime/FragmentCompilationManager.ts`, based on the findings in the [ScriptRuntime Implementation Assessment](./scriptruntime-implementation-assessment.md). The focus is on completing the fragment compilation system to enable the Just-In-Time (JIT) compiler to function correctly.

## 1. Implement Concrete Fragment Compilers

The `FragmentCompilationManager` relies on a set of compilers, each responsible for a specific fragment type. None of these concrete implementations currently exist.

**Required Work:**
- Create a class for each fragment type that implements the `IFragmentCompiler` interface.
- Each class must implement the `compile` method to transform a code fragment into an array of `MetricValue` objects.

**Required Implementations:**
- `TimeFragmentCompiler`
- `DistanceFragmentCompiler`
- `RepetitionFragmentCompiler`
- `ResistanceFragmentCompiler`
- `EffortFragmentCompiler`
- `IncrementFragmentCompiler`
- `LapFragmentCompiler`
- `RoundsFragmentCompiler`
- `TextFragmentCompiler`
- `ActionFragmentCompiler`

## 2. Design a Fragment Compiler Registration System

The `FragmentCompilationManager` needs a mechanism to access the concrete compiler implementations. The current implementation accepts an array of compilers in its constructor, but this could be formalized or replaced with a more robust system.

**Design Options:**

*   **Option A: Constructor Injection (Current Method)**
    *   **Description:** An array of `IFragmentCompiler` instances is created and passed directly to the `FragmentCompilationManager`'s constructor.
    *   **Pros:** Simple, explicit dependencies, easy to test with mock compilers.
    *   **Cons:** Can lead to verbose setup code where the manager is instantiated.

*   **Option B: Registry/Factory Pattern**
    *   **Description:** A singleton or static `FragmentCompilerRegistry` class is created. Each compiler implementation registers itself with the registry. The `FragmentCompilationManager` would then request the necessary compilers from this central registry, rather than having them injected.
    *   **Pros:** Decouples the manager from the creation of compilers, simplifies instantiation of the manager.
    *   **Cons:** Can hide dependencies (service locator anti-pattern), may be less explicit and harder to test.

## 3. Define the Compilation Context

The `compileStatementFragments` method in the manager and the `compile` method in the `IFragmentCompiler` interface are expected to receive a `context` object. The structure and purpose of this object are not yet defined.

**Required Work:**
- Define a `FragmentCompilationContext` interface.
- This interface should specify the data that a fragment compiler might need to perform its compilation task.

**Potential Context Properties:**
- `parentMetrics`: Metrics inherited from parent blocks in the runtime stack.
- `runtimeState`: The current state of the script runtime (e.g., 'running', 'idle').
- `configuration`: Global or workout-specific settings that might influence compilation.

## 4. Establish an Error Handling Strategy

The system needs a consistent strategy for handling invalid fragments or compilation failures.

**Design Options:**

*   **Option A: Throw Exceptions**
    *   **Description:** If a compiler encounters an error (e.g., an invalid value in a fragment), it throws an exception. The calling code (likely the `JitCompiler`) is responsible for catching and handling the error.
    *   **Pros:** Fails fast, follows standard error handling patterns in many languages.
    *   **Cons:** Can be expensive if errors are common, may use exceptions for control flow.

*   **Option B: Return a Result Object**
    *   **Description:** The `compile` method returns a discriminated union or a result object (e.g., `{ success: boolean; value?: MetricValue[]; error?: string }`). The caller must inspect the object to determine if the compilation was successful.
    *   **Pros:** Avoids exceptions, makes the success/failure path explicit.
    *   **Cons:** Requires more boilerplate code for checking the result type.

*   **Option C: Return Null/Undefined**
    *   **Description:** The `compile` method returns `null` or `undefined` if compilation fails.
    *   **Pros:** Simple to implement.
    *   **Cons:** The reason for the failure is lost unless logged separately, can lead to null reference errors if not handled carefully by the caller.
