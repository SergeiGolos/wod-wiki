# Implementation Roadmap: The Transition

This plan outlines a phased migration from the current **Behavior-Based** system to the **Fragment-Centric** architecture.

## Refinement of Mental Model

Throughout this transition, we must adhere to the principle that **simpler is better**. Each phase should result in a net **reduction** of code.

- **Fewer Concepts**: Replace "Behaviors," "Strategies," "MemoryLocations," and "Aspect Composers" with just **Fragments** and **Processors**.
- **Better Re-use**: Processors (like `TimerProcessor`) should be written once and used by every Dialect that needs a clock.


## Phase 1: Fragment Unification (Foundation)

- **Goal**: Consolidate state into a single, understandable bucket.
- **Tasks**:
    - Update `TimerBehavior` to write to a `SpansFragment` instead of its own internal state.
    - Update `RoundBehavior` to write to a `CurrentRoundFragment`.
    - Modify `RuntimeBlock` to provide a unified `getFragments()` API, replacing `getMemoryByTag`.



## Phase 2: The Analytic Projector (Reactive Output)

- **Goal**: Eliminate hundreds of lines of manual "emit" logic across the runtime.
- **Tasks**:
    - Build a basic `AnalyticsEngine` that subscribes to stack events.
    - Implement the "Pop -> Segment" projection as a generic filter over fragments.
    - Remove manual `emitOutput` calls from behaviors, drastically simplifying their implementation.

## Phase 3: Processor Decoupling (The "God Class" Prevention)

- **Goal**: Move from 20+ Behavior classes to ~5 highly reusable Processors.
- **Tasks**:
    - Refactor `TimerBehavior` logic into a stateless `TimerProcessor`.
    - Create the `ProcessorRegistry` within the `Dialect`.
    - Update the `Runtime` execution loop to iterate over processors, removing the need for `BehaviorContext` complexity.

## Phase 4: Strategy & Builder Simplification (Cleanup)

- **Goal**: Flatten the compiler and remove the "Strategy" abstraction overhead.
- **Tasks**:
    - Replace `AmrapLogicStrategy` with a simple "Fragment Resolver" that tags blocks.
    - Deprecate `asTimer()` and `asRepeater()` in favor of direct fragment assignment in the compiler.
    - Perform a final purge of unused behavior and strategy classes.

## Success Criteria

1.  **Code Reduction**: Significant decrease in the number of classes in `src/runtime/behaviors`.
2.  **Identical Output**: Existing scripts (AMRAP, EMOM) produce the same analytics as before.
3.  **Extensibility**: Adding a new "Yoga" dialect requires zero changes to the core `Runtime` or `AnalyticsEngine`.
