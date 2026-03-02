# Vision & Principles: Fragment-Centric Architecture

## The Core Shift

We are moving from a **Behavior-Based** system to a **Fragment-Centric** system. 

In the current system, "Behaviors" are the primary actors that manage hidden state and manually "emit" analytics. In the new system, **Fragments are the State**, and the Runtime is simply a set of **Processors** that update those fragments.

### Core Principles

1. **Fragments as Source of Truth**: Every piece of data—whether planned (script), recorded (runtime), or analyzed (results)—is stored as a `Fragment` within a Block's collection.
2. **Declarative Composition**: Building a block means assembling a "Bucket of Fragments" rather than a tree of behaviors. This drastically reduces boilerplate code.
3. **Reactive Analytics (Projection)**: Analytics (OutputStatements) are not "emitted" via method calls; they are **projected** snapshots of the current fragment state. This eliminates complex mapping logic.
4. **Dialect-Driven Logic**: Logic is decoupled into small, stateless **Processors** (Handlers) that can be re-used across many sports. This avoids a monolithic "God Engine" and promotes code sharing.
5. **Radical Simplicity**: The primary goal is **fewer lines of code** and a **clear mental model**. A developer should be able to understand how a "Record" is formed just by looking at the "Plan."

## The "Code -> Block -> Record" Lifecycle

| Phase          | Responsibility     | Input          | Output                           |
| :------------- | :----------------- | :------------- | :------------------------------- |
| **Parsing**    | Identify Intent    | Script Text    | **Plan Fragments** (Defined)     |
| **Compiling**  | Initialize Context | Plan Fragments | **Runtime Block** (Bucket)       |
| **Execution**  | Update State       | Block + Event  | **Record Fragments** (Recorded)  |
| **Projection** | Generate Analytics | Block State    | **Output Statements** (Analysis) |

## Why This Simplifies the System

- **No Manual Mapping**: We no longer map `ParserFragment` -> `BehaviorConfig` -> `MemoryLocation` -> `AnalyticsFragment`. The fragment *is* the config, the state, and the result.
- **Traceability**: To debug a block, you just inspect its fragment bucket. There is no hidden behavior state.
- **Flexibility**: Supporting a new sport (e.g., Yoga) just means defining a new `PoseFragment` and a `PoseProcessor`. The Analytics Engine automatically "sees" the new data.

## Related Documents

| Document | Purpose |
| :--- | :--- |
| [01 — Fragment State Model](01-fragment-state-model.md) | Plan, Record, and Analysis fragment lifecycle |
| [02 — Processor Registry](02-processor-registry.md) | Stateless processors replacing behaviors for cross-cutting concerns |
| [03 — Analytics Projection](03-analytics-projection.md) | Reactive output generation from fragment state |
| [04 — Implementation Roadmap](04-implementation-roadmap.md) | Phased migration plan with behavior-by-behavior migration map |
| [05 — UI Impact & Rendering](05-ui-impact-and-rendering.md) | Fragment-driven UI rendering |
| [06 — Current Implementation Analysis](06-current-implementation-analysis.md) | Complete inventory of 18 behaviors, 7 execution archetypes, and 12 gaps |
| [07 — Approach Comparison](07-approach-comparison.md) | Three architectures compared: Behavior Composition, Fragment Processors, Typed Blocks |
