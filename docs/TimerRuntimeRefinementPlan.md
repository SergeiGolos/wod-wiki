# Wod.Wiki TimerRuntime Analysis and Refinement Plan

## 1. Core Concepts and Analogies to Programming Language Implementations

The Wod.Wiki `TimerRuntime` system shares several conceptual similarities with programming language runtimes and compilers:

*   **Source Code to Executable Form:**
    *   **Wod.Wiki:** Workout definition (custom markdown-like syntax) -> `StatementNode`s (AST-like) -> `JitStatement`s -> `IRuntimeBlock`s (executable units).
    *   **Programming Languages:** Source code (e.g., Python, Java) -> Lexing/Parsing (Tokens, AST) -> Intermediate Representation (e.g., bytecode) -> Machine Code / Interpreted Execution.
*   **Lexer/Parser:**
    *   **Wod.Wiki:** `Lexer` (Chevrotain-based) tokenizes input; `MdTimerParse` creates a Concrete Syntax Tree (CST); `MdTimerInterpreter` (Visitor) transforms CST to `ICodeStatement[]`. This is analogous to the front-end of a compiler.
    *   **Programming Languages:** Lexers (Scanners) and Parsers (e.g., ANTLR, YACC/Bison) perform similar roles.
*   **Intermediate Representation (IR) / Abstract Syntax Tree (AST):**
    *   **Wod.Wiki:** `ICodeStatement` and `JitStatement` (with `CodeFragment`s) serve as a form of IR, describing the structure and properties of workout elements before they become executable blocks.
    *   **Programming Languages:** ASTs are a direct parallel, and various IRs (e.g., LLVM IR, Java Bytecode) are used for optimization and platform-independent representation.
*   **Just-In-Time (JIT) Compilation:**
    *   **Wod.Wiki:** `RuntimeJit` and `RuntimeJitStrategies` dynamically create `IRuntimeBlock` instances from `JitStatement`s as needed during runtime. This is a direct application of the JIT compilation concept.
    *   **Programming Languages:** JIT compilers (e.g., in Java HotSpot VM, .NET CLR, modern JavaScript engines) compile bytecode or IR to native machine code at runtime for performance benefits.
*   **Virtual Machine / Execution Engine:**
    *   **Wod.Wiki:** `TimerRuntime` orchestrates the execution of `IRuntimeBlock`s, manages state (`RuntimeStack`, metrics), and handles events (RxJS-based). This is akin to a specialized virtual machine for workouts.
    *   **Programming Languages:** VMs (e.g., JVM, Python's PVM) execute bytecode or manage the interpretation of code.
*   **Instruction Set / Executable Units:**
    *   **Wod.Wiki:** `IRuntimeBlock` implementations (e.g., `EffortBlock`, `TimerBlock`, `TimedGroupBlock`) are like the "instructions" or "opcodes" that the `TimerRuntime` understands and executes. Each block type defines specific behavior.
    *   **Programming Languages:** Bytecode instructions or machine code opcodes define the fundamental operations a CPU or VM can perform.
*   **Stack-Based Execution:**
    *   **Wod.Wiki:** `RuntimeStack` manages the hierarchy and active state of `IRuntimeBlock`s. This is similar to how call stacks manage function calls in many programming languages.
    *   **Programming Languages:** Call stacks are fundamental for tracking function calls, local variables, and return addresses.
*   **Event-Driven Architecture:**
    *   **Wod.Wiki:** Uses RxJS for managing `IRuntimeEvent`s and `IRuntimeAction`s, enabling a reactive flow of control. This is common in UI frameworks and asynchronous systems.
    *   **Programming Languages/Frameworks:** Event loops (e.g., Node.js, browser JavaScript) and reactive programming libraries (e.g., RxJava, RxPy) implement similar patterns.

## 2. Identifying Unnecessary Complexity and Areas for Simplification

Based on the provided context and common software design principles:

*   **Clarity of `StatementNode` vs. `JitStatement`:**
    *   **Observation:** The distinction and transformation from `ICodeStatement` (parser output) to `JitStatement` (input for `RuntimeJit`) might introduce an extra layer. While `JitStatement` might hold more runtime-specific pre-processed data, ensure this step is truly necessary and well-documented.
    *   **Potential Simplification:** If the differences are minor, consider if the parser's output (`ICodeStatement`) can be directly consumed by the `RuntimeJit` or if `ICodeStatement` can be enriched to serve the JIT's needs, possibly reducing one transformation step.
*   **`RuntimeBlock` Base Class and Lifecycle Methods:**
    *   **Observation:** The `RuntimeBlock` abstract class has several lifecycle methods (`onEnter`, `onNext`, `onLeave`, `onBlockStart`, `onBlockStop`). The distinction between `onEnter`/`onLeave` and `onBlockStart`/`onBlockStop` needs to be very clear. The `next` method's role in advancing state or pushing new blocks could potentially be complex if not consistently implemented.
    *   **Potential Simplification:**
        *   Ensure JSDoc comments clearly define the exact purpose and invocation timing of each lifecycle method.
        *   Consider if `onBlockStart` and `onBlockStop` can be merged into `onEnter` and `onLeave` respectively, or if their distinct purposes (e.g., `onEnter` for setup, `onBlockStart` for when the timer *actually* begins counting) are critical and clearly communicated.
        *   The `next` method's responsibility should be narrowly defined. Is it for internal state progression within the *current* block, or for determining the *subsequent* block? If the latter, the `RuntimeStack` and `TimerRuntime` might be better suited to manage transitions between blocks based on the current block's completion or emitted actions.
*   **Event Handling in `RuntimeBlock`:**
    *   **Observation:** `RuntimeBlock.handle()` combines system-level and block-specific handlers. This is flexible but can become complex to trace if many handlers are involved.
    *   **Potential Simplification:**
        *   Maintain a clear separation of concerns. System-wide events (like a global pause) might be better handled directly by `TimerRuntime` or dedicated system event handlers, while block-specific events (like a lap within a repeating block) are handled by the block itself.
        *   Ensure that the order of handler execution (system vs. block-specific) is predictable and well-documented.
*   **`IRuntimeAction` Proliferation:**
    *   **Observation:** A large number of specific `IRuntimeAction` types can lead to many small classes, which is good for SRP, but also requires careful management and understanding of how they interact.
    *   **Potential Simplification:**
        *   Group related actions if their `apply` logic is very similar, perhaps using parameters to differentiate behavior.
        *   Ensure actions are truly "actions" (commands that change state or cause side effects) rather than just data carriers.
*   **Metrics Collection (`RuntimeBlockMetrics`, `ResultSpanBuilder`):**
    *   **Observation:** `RuntimeBlockMetrics` and `ResultSpanBuilder` seem to have overlapping responsibilities in creating and managing workout results. The static `RuntimeBlockMetrics.buildMetrics` method taking `ITimerRuntime` and `JitStatement[]` might indicate that metric building could be more tightly integrated or simplified.
    *   **Potential Simplification:**
        *   Clarify the distinct roles: Is `ResultSpanBuilder` a more general tool for time spans, while `RuntimeBlockMetrics` is specific to `RuntimeBlock` outputs?
        *   Consider having `IRuntimeBlock` instances be solely responsible for generating their own `RuntimeMetric`s upon completion or specific events, possibly using a helper service if the logic is complex but common. This would colocate metric generation with the block that produces the data.
        *   The `getSpanBuilder()` on `IRuntimeBlock` suggests blocks manage their own spans, which is good. Ensure this is consistently used.
*   **`RuntimeJitStrategies`:**
    *   **Observation:** The Strategy pattern here is appropriate. The order of adding strategies (`unshift` for higher priority) is a key detail.
    *   **Potential Simplification:** Ensure that the criteria for each strategy (`canHandle`) are mutually exclusive or that the priority order correctly resolves any overlaps. Clear documentation for each strategy's conditions is vital.
*   **`TimerRuntime` Responsibilities:**
    *   **Observation:** `TimerRuntime` is a central orchestrator. It handles event subscriptions, applies actions, manages the `RuntimeStack`, and interacts with `RuntimeJit`. This is a lot of responsibility.
    *   **Potential Simplification:**
        *   Ensure its methods are cohesive. For example, `apply(actions, source)` is good.
        *   The `init()` method pushing a `RootBlock` (unless in a test environment) is a specific initialization concern.
        *   The main event subscription loop is complex. Breaking down the event handling logic into smaller, testable functions or helper classes could improve readability if it becomes too large.

## 3. Plan for Refinement: Focusing on Interfaces and Reusable Classes

### Phase 1: Interface Review and Refinement

*   **`IRuntimeBlock`:**
    *   **Goal:** Define the absolute essential contract for an executable workout segment.
    *   **Actions:**
        *   Review all properties and methods. Are `duration`, `leaf`, `parent` always necessary, or can some be optional or derived?
        *   Clarify the exact contract of `enter`, `next`, `leave`, `onStart`, `onStop`. When is each called? What are their precise responsibilities? What state changes are they expected to make? What actions should they typically return?
        *   `handle(runtime, event, systemHandlers)`: Is passing `systemHandlers` to every block necessary, or can `TimerRuntime` manage the orchestration of system vs. block-specific handling? Consider if blocks should only receive events they are concerned with.
        *   `metrics(runtime)`: Is this the best place? Or should metrics be an outcome of `leave` or a specific "complete" event? Perhaps a block exposes its raw data, and a separate `MetricsCollector` service processes it.
        *   `getSpanBuilder()`: This seems good for encapsulating span management.
        *   `selectMany<T>(fn: (node: JitStatement) => T[])`: What is the purpose of this generic utility? Ensure it's broadly applicable or specific to a clear need.
*   **`ICodeStatement` / `JitStatement`:**
    *   **Goal:** Ensure these interfaces clearly represent the parsed workout structure and provide all necessary information for the `RuntimeJit` without unnecessary redundancy.
    *   **Actions:**
        *   Analyze the data flow: `inputText` -> `tokens` -> `cst` -> `ICodeStatement[]` (in `MdTimerRuntime.read`) -> `JitStatement[]` (used by `RuntimeJit`).
        *   Can `ICodeStatement` be evolved to include any pre-processing currently done to create `JitStatement`?
        *   Define the role of `CodeFragment` clearly. How do they contribute to block creation and behavior?
*   **`IRuntimeAction`:**
    *   **Goal:** A clear, concise contract for operations that modify runtime state or UI.
    *   **Actions:**
        *   `apply(runtime, input$, output$)`: This is a powerful signature. Ensure all actions truly need access to all these. Some actions might only need `runtime`, others might only interact with `output$`.
        *   Categorize actions (e.g., StateChangeAction, UIUpdateAction, TimerControlAction) to better understand their impact.
*   **`ITimerRuntime` / `ITimerRuntimeIo`:**
    *   **Goal:** Define the core services provided by the runtime to blocks and other components. `ITimerRuntimeIo` seems to be the public interface.
    *   **Actions:**
        *   Review methods like `push`, `pop`, `reset`. Are their semantics universally understood and consistently used by `IRuntimeBlock`s?
        *   `apply(actions, source)`: Good.
        *   Properties like `code`, `jit`, `trace`, `history`, `script`, `registry`: Ensure these are all essential on the public interface for blocks. Blocks should ideally have minimal knowledge of the runtime's internals.
*   **`IRuntimeBlockStrategy`:**
    *   **Goal:** A clear contract for how `JitStatement`s are converted to `IRuntimeBlock`s.
    *   **Actions:**
        *   `canHandle(nodes: JitStatement[], runtime: ITimerRuntime)`: Should it take `runtime`? Or just the nodes?
        *   `compile(nodes: JitStatement[], runtime: ITimerRuntime)`: This seems correct.
*   **`IRuntimeEvent`:**
    *   **Goal:** Standardize the structure of events flowing through the system.
    *   **Actions:** Ensure a base structure (e.g., `name`, `timestamp`, `payload?`) and that specific event types extend this consistently.

### Phase 2: Class Responsibilities and Decomposition

*   **`RuntimeBlock` (Abstract Base Class):**
    *   **Goal:** Provide genuinely common functionality and enforce the `IRuntimeBlock` contract. Avoid becoming a "god class" with too much conditional logic.
    *   **Actions:**
        *   Move any logic that varies significantly between concrete block types into the derived classes or into strategy objects used by the blocks.
        *   The Template Method pattern (as suggested by `AbstractBlockLifecycle` in docs) is good for `enter`/`next`/`leave` if there's a common outer sequence with customizable inner steps (`onEnter`, `onNext`, `onLeave`).
        *   Ensure `blockId` and `blockKey` are managed consistently.
*   **Concrete `RuntimeBlock` Implementations (e.g., `EffortBlock`, `TimerBlock`, `RepeatingBlock`, `TimedGroupBlock`):**
    *   **Goal:** Each class should have a single, well-defined responsibility corresponding to a specific type of workout element.
    *   **Actions:**
        *   Focus each block on its unique behavior.
        *   If a block type handles multiple complex variations, consider if it should be split or use internal strategies. For example, a `RepeatingBlock` might handle "X rounds" vs. "AMRAP Y minutes" differently; these could be internal states or strategies.
        *   Delegate complex, reusable logic (e.g., specific metric calculations, complex UI updates) to helper services/classes rather than duplicating it in multiple blocks.
*   **`TimerRuntime`:**
    *   **Goal:** Orchestrate the overall flow, manage the primary state (stack, current time), and dispatch events/actions.
    *   **Actions:**
        *   Offload JIT compilation entirely to `RuntimeJit`.
        *   Offload stack management details to `RuntimeStack`.
        *   Consider if event-to-action mapping for *system-level* events could be handled by dedicated event handler services, configured within `TimerRuntime`, rather than a large `if/else` or `switch` in the main event loop.
*   **`RuntimeJit` and `RuntimeJitStrategies`:**
    *   **Goal:** Solely responsible for compiling `JitStatement`s into `IRuntimeBlock`s using the strategy pattern.
    *   **Actions:** Keep this focused. `RuntimeJit` should not be involved in block execution, only creation.
*   **`RuntimeStack`:**
    *   **Goal:** Manage the stack of active `IRuntimeBlock`s.
    *   **Actions:** Provide clear `push`, `pop`, `current`, `parent` operations. Handle stack-empty or invalid operations gracefully.
*   **Metrics-Related Classes (`RuntimeBlockMetrics`, `ResultSpanBuilder`, `RuntimeMetric`):**
    *   **Goal:** Clear separation for collecting, structuring, and building metric data.
    *   **Actions:**
        *   `RuntimeMetric`: Ensure this is a well-defined data structure.
        *   `ResultSpanBuilder`: Focus on building `ResultSpan` objects, which seem to be about timing and event logging for a block's execution.
        *   `RuntimeBlockMetrics`: If this class is responsible for *interpreting* `JitStatement` fragments to *define* what metrics *should* be collected for a block, that's a distinct role. The actual collection might happen via `ResultSpan`s or by the block itself reporting values.
        *   **Proposal:**
            1.  `IRuntimeBlock.leave()` or a dedicated `IRuntimeBlock.finalizeMetrics(runtime)` method could be responsible for producing its `RuntimeMetric[]`.
            2.  It can use `this.getSpanBuilder().Spans()` to get timing data.
            3.  It can use its `sources` (`JitStatement[]`) to understand what metrics were expected.
            4.  A `MetricFactory` or helper service could be injected or available to blocks to help construct `RuntimeMetric` objects from raw data + span information.

### Phase 3: Implementation and Refactoring Steps

1.  **Backup and Branch:** Create a new Git branch for these refactoring efforts.
2.  **Iterate on Interfaces:**
    *   Start with `IRuntimeBlock`. Discuss and agree on the refined interface.
    *   Update all implementing classes to conform. This will likely reveal areas where responsibilities need to shift.
    *   Repeat for other key interfaces (`IRuntimeAction`, `ITimerRuntime`, etc.).
3.  **Refactor `RuntimeBlock` Implementations:**
    *   Apply the "many small reusable classes" principle. If a block does too much, decompose it.
    *   Extract common logic into protected methods within the `RuntimeBlock` base class (if truly common to *all* or most blocks) or into separate helper services/classes that can be injected or instantiated by blocks that need them.
    *   Example: If multiple blocks need to format duration strings, a `DurationFormatter` service is better than each block having its own formatting logic.
4.  **Refine `TimerRuntime`:**
    *   Ensure it delegates appropriately to `RuntimeJit` and `RuntimeStack`.
    *   Simplify its main event loop if possible, perhaps by using more targeted RxJS operators or delegating event handling logic.
5.  **Address Metrics Collection:**
    *   Implement the chosen strategy for how blocks report metrics.
    *   Ensure `ResultSpanBuilder` and `RuntimeBlockMetrics` (if it remains) have clear, non-overlapping roles.
6.  **Testing:**
    *   Write/update unit tests for all refactored classes, especially focusing on:
        *   Interface contracts.
        *   Individual class responsibilities.
        *   Interaction between classes (e.g., `TimerRuntime` correctly using `RuntimeJit`).
    *   Use Vitest for unit tests.
7.  **Documentation:**
    *   Update all JSDoc comments for modified interfaces and classes.
    *   Update relevant markdown documents in `/docs` to reflect the changes in architecture or class responsibilities.

### Key Focus: Small, Reusable Classes and Clear Interfaces

*   **Single Responsibility Principle (SRP):** Each class should do one thing well.
    *   `EffortBlock` handles effort-based timing.
    *   `TimerBlock` handles pure duration timing.
    *   `StartTimerAction` initiates a timer.
    *   `RuntimeJit` creates blocks.
*   **Interface Segregation Principle (ISP):** Clients should not be forced to depend on interfaces they do not use.
    *   If an `IRuntimeAction` only updates the UI, its `apply` method might not need the `input$` (event stream for runtime).
*   **Dependency Inversion Principle (DIP):** Depend on abstractions, not concretions.
    *   `TimerRuntime` depends on `IRuntimeBlock`, `IRuntimeAction`, `IRuntimeBlockStrategy`.
    *   Blocks depend on `ITimerRuntime`.
