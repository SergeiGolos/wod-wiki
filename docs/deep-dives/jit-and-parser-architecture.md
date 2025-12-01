# Deep Dive: JIT Compiler, Parser, and Metrics Architecture

## Overview

This document provides a high-level overview of the WOD Wiki runtime architecture. For detailed implementation plans, see the linked documents in the **Related Plans** section.

## 1. Architecture Overview: From Text to Execution

The WOD Wiki engine follows a multi-stage pipeline to transform workout text into executable runtime blocks.

**The Pipeline:**
1.  **Lexing & Parsing (Chevrotain):** Raw text is tokenized and parsed into a Concrete Syntax Tree (CST).
2.  **AST Generation (Visitor):** The CST is visited to produce an Abstract Syntax Tree (AST) of `ICodeStatement` objects, wrapped in a `WodScript`.
3.  **JIT Compilation (Strategies):** The `ScriptRuntime` uses a `JitCompiler` to iterate through a prioritized list of strategies. Each strategy inspects the AST (CodeStatement) and decides if it can handle it.
4.  **Runtime Block Creation:** The matching strategy creates a `RuntimeBlock` populated with specific `Behaviors` (e.g., `TimerBehavior`, `LoopCoordinatorBehavior`) and `Metrics`.
5.  **Execution & Tracking:** The block runs, updating `RuntimeMemory` and generating `ExecutionSpan` records (history).
6.  **Analytics & Output:** `ExecutionSpan` records are transformed into `Segment` objects and `AnalyticsGroup` for the UI.

## 2. JIT Strategies & Keyword Handling

The core logic for interpreting workout semantics lies in the JIT Strategies. These are **not** part of the parser grammar but are heuristic checks applied at runtime compilation.

### Strategy Precedence
The `JitCompiler` attempts to match a `CodeStatement` against strategies in this strict order:

1.  **`TimeBoundRoundsStrategy` (AMRAP)**
2.  **`IntervalStrategy` (EMOM)**
3.  **`TimerStrategy`**
4.  **`RoundsStrategy`**
5.  **`GroupStrategy`**
6.  **`EffortStrategy`** (Fallback)

### Deep Dive: Keyword Matching (The "Coded Up" Logic)

The user correctly identified that concepts like AMRAP are "coded up" into the system. This logic resides in the `match()` method of specific strategies.

#### AMRAP (TimeBoundRoundsStrategy)
*   **Trigger:** A statement containing a `Timer` fragment AND (`Rounds` fragment OR an `Action`/`Effort` text containing "AMRAP").
*   **Logic:**
    *   `fragments.some(f => f.value.includes('AMRAP'))`
*   **Generated Block:**
    *   A `RuntimeBlock` with `TimerBehavior` (countdown) and `LoopCoordinatorBehavior` (infinite loop).
    *   Tracks "Rounds" metrics.

#### EMOM (IntervalStrategy)
*   **Trigger:** A statement containing a `Timer` fragment AND an `Action`/`Effort` text containing "EMOM".
*   **Logic:**
    *   `fragments.some(f => f.value.includes('EMOM'))`
*   **Generated Block:**
    *   A `RuntimeBlock` with `TimerBehavior` (interval timer) and `LoopCoordinatorBehavior` (restarts timer `n` times).

### The Gap: Syntax vs. Semantics
Currently, the **syntax** (Parser) treats "AMRAP" just as a generic "Action" or "Effort" text. The **semantics** (JIT) re-reads that text to infer behavior. This coupling makes it hard to add new workout types without modifying the core strategies.

## 3. Deep Dive: Fragments to Metrics Transformation

The system uses a flexible pipeline to convert parsed `CodeFragments` (source) into `RuntimeMetrics` (runtime). This pipeline allows for dynamic metric swapping and subset reporting.

### The Fragment Compiler
The `FragmentCompilationManager` iterates over every fragment in a statement and delegates to specific compilers.

```typescript
// Conceptual Flow
function compileStatementFragments(stmt: CodeStatement) {
  const metricValues: MetricValue[] = [];

  for (const fragment of stmt.fragments) {
    // 1. Select Compiler based on fragment type
    const compiler = this.compilers.get(fragment.type);

    // 2. Compiler extracts data
    // e.g. WeightFragmentCompiler: { value: 135 } -> { type: 'resistance', value: 135, unit: 'lbs' }
    if (compiler) {
      metricValues.push(...compiler.compile(fragment));
    }
  }

  // 3. Aggregate into RuntimeMetric
  return new RuntimeMetric(metricValues);
}
```

### Swapping Metrics and Subset Reporting
A key requirement is the ability for a block to "swap" metrics or report on a subset of execution records. This is achieved through **Child Blocks** and **Behaviors**.

1.  **Metric Swapping:**
    *   A `RuntimeBlock` holds the *initial* compiled metrics.
    *   However, behaviors like `ResistanceBehavior` can *dynamically update* the active execution span.
    *   *Example:* A drop-set block starts with 135lbs. When the user clicks "Next", the behavior updates the `ExecutionTracker` to record 115lbs for the next span, effectively swapping the metric for the same block instance.

2.  **Subset Reporting (The "Interval" Pattern):**
    *   An "EMOM" block is a container. It has metrics like "10 minutes".
    *   It spawns **Child Blocks** for the exercises (e.g., "5 Pullups").
    *   The `ExecutionTracker` records separate spans for the Parent (Interval) and the Children (Pullups).
    *   **Result:** Analytics can filter (subset) the records. You can view the "Interval Pacing" (Parent spans) OR the "Pullup Volume" (Child spans). The hierarchy is preserved in the `parentSpanId` field.

## 4. Output & Execution Spans (The Source of Truth)

The `executionLog` (a runtime property containing an array of `ExecutionSpan` objects) is designed to be the single source of truth. However, currently, there are side channels that need to be consolidated.

> **Detailed Plan:** See [jit-01-execution-span-consolidation.md](../plans/jit-01-execution-span-consolidation.md)

### The Goal: Single Source of Truth
All visualization, analytics, and storage should derive purely from the `executionLog`.

### Current State vs. Gap
1.  **`executionLog` (Primary):** A runtime property containing an array of completed `ExecutionSpan` objects.
    *   *Status:* **Canonical.** Used for analytics graphs.
2.  **Real-time Events (Side Channel):** The UI currently listens to `timer:tick` events directly for countdowns.
    *   *Gap:* This is acceptable for *display* (latency), but not for *record keeping*.
3.  **Console Logs (Side Channel):** Debug information is logged to console.
    *   *Action:* Redirect all debug logs to a `DebugMetadata` field within `ExecutionSpan`.
4.  **Local Storage (Persistence):** Currently saves `WodResult`.
    *   *Action:* Ensure `WodResult` is strictly a serialization of `executionLog`.

### Consolidation Plan
To ensure the `ExecutionSpan` is the *only* pathway:
1.  **Unified Transformation:** The `AnalyticsTransformer` must be the *only* component reading raw logs. The UI should consume `Segment` objects produced by the transformer, never raw spans.
2.  **Rich Metadata:** All "context" (e.g., "This was an AMRAP round") must be stamped onto the `ExecutionSpan` via `tags` or `metadata` at the moment of creation, not inferred later.

## 5. Proposal: Dialect-Based Post-Parser (JIT Hints)

To address the "hardcoded" nature of AMRAP/EMOM logic, we propose a **Post-Parser Hinting System**. This system decouples string parsing from execution strategy and introduces a sophisticated inheritance model.

> **Detailed Plan:** See [jit-02-dialect-registry.md](../plans/jit-02-dialect-registry.md)

### Concept: Generic Behavioral Hints
Instead of hints mapping 1:1 to strategies (e.g., `strategy.amrap`), hints should describe **Generic Behaviors**. This allows multiple different source dialects to map to the same underlying runtime mechanics.

*   `behavior.time_bound` (AMRAP, For Time)
*   `behavior.repeating_interval` (EMOM, E2MOM)
*   `behavior.auto_complete_children`

### Concept: Dialect Registry
The system will feature a **Dialect Registry** that allows different parsing rules (Dialects) to be loaded dynamically. A "CrossFit" dialect might parse "AMRAP", while a "Running" dialect parses "Fartlek", but both emit `behavior.time_bound`.

### Concept: Hints on CodeStatement
Add a `hints?: Set<string>` field directly to `CodeStatement` for semantic hints. The `CodeMetadata` interface remains unchanged as it is for positional information only (line, offset, column).

### Concept: Advanced Inheritance Protocol
Parent blocks often need to enforce or modify the context for their children. The proposal introduces explicit inheritance modes:

1.  **Clear:** The child starts fresh, ignoring any value from the parent.
2.  **Modify:** The child inherits the parent's value but can modify it (e.g., add to a cumulative total).
3.  **Ensure:** The parent enforces a value on the child (e.g., an EMOM parent ensuring all children have a 1-minute timer).

## 6. Strategy Refactoring Summary

> **Detailed Plan:** See [jit-03-strategy-refactoring.md](../plans/jit-03-strategy-refactoring.md)

| Strategy | Current Detection | Proposed Detection |
|----------|------------------|-------------------|
| TimeBoundRoundsStrategy | Timer + "AMRAP" text | Timer + `behavior.time_bound` hint |
| IntervalStrategy | Timer + "EMOM" text | Timer + `behavior.repeating_interval` hint |
| TimerStrategy | Timer fragment | Timer fragment OR `behavior.timer` hint |
| RoundsStrategy | Rounds fragment (no Timer) | `behavior.fixed_rounds` hint OR Rounds fragment |
| GroupStrategy | Has children | `behavior.group` hint OR has children |
| EffortStrategy | No Timer, no Rounds | `behavior.effort` hint OR fallback |

## 7. Dialect Registry Overview

> **Detailed Plan:** See [jit-02-dialect-registry.md](../plans/jit-02-dialect-registry.md)

```mermaid
sequenceDiagram
    participant Text
    participant Parser
    participant DialectRegistry
    participant JIT
    participant Strategy
    participant Block

    Text->>Parser: "20:00 AMRAP"
    Parser->>DialectRegistry: CodeStatement (AST)
    DialectRegistry->>DialectRegistry: Run Loaded Dialects
    DialectRegistry->>DialectRegistry: Add Hint: 'behavior.time_bound'
    DialectRegistry->>JIT: CodeStatement + Hints
    JIT->>Strategy: match(Statement)
    Strategy->>Strategy: Check hints.has('behavior.time_bound')
    Strategy-->>JIT: true
    JIT->>Strategy: compile(Statement)
    Strategy->>Block: Create RuntimeBlock
```

## Related Plans

The following plan documents provide detailed implementation guidance:

1. **[jit-01-execution-span-consolidation.md](../plans/jit-01-execution-span-consolidation.md)** - ExecutionSpan as single source of truth
2. **[jit-02-dialect-registry.md](../plans/jit-02-dialect-registry.md)** - Dialect Registry for semantic hints  
3. **[jit-03-strategy-refactoring.md](../plans/jit-03-strategy-refactoring.md)** - Detailed before/after for all 6 strategies
