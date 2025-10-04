# WOD Wiki Architecture Diagrams

This document contains Mermaid diagrams illustrating the architecture of the WOD Wiki runtime.

## High-Level Architecture

This diagram shows the overall flow from a workout script to execution.

```mermaid
graph TD
    subgraph "Input & Parsing"
        A[Workout Script] --> B(Parser);
    end

    subgraph "Compilation"
        B --> C{JIT Compiler};
        C --> D[Generates IRuntimeBlock[]];
    end

    subgraph "Execution"
        D --> E(Runtime Engine);
        E -- Pushes blocks to --> F(RuntimeStack);
        F -- Manages --> G[Active IRuntimeBlock];
        G -- Interacts with --> H(Memory/State);
        E -- Updates --> H;
    end
```

## RuntimeStack and IRuntimeBlock Management

This diagram illustrates how a workout script is compiled into `IRuntimeBlock`s, which are then managed by the `RuntimeStack`.

```mermaid
graph TD
    subgraph "Input Script"
        WorkoutScript[/"
        -- AMRAP 10 --
        5 Pullups
        10 Pushups
        15 Squats
        "/]
    end

    subgraph "Compilation"
        WorkoutScript --> JIT{JIT Compiler};
        JIT --> Blocks((IRuntimeBlock[]));
    end

    subgraph "Stack Management"
        Blocks --> |runtime.push(block)| Stack(RuntimeStack);
        Stack -- "Manages stack of blocks" --> StackViz;

        subgraph "RuntimeStack Visualization"
            direction LR
            StackViz -- "graph()" --> B1[Bottom: AmrapBlock];
            B1 --> B2[WorkoutBlock];
            B2 --> B3[Top: TimerBlock];
        end

        Stack -- "current()" --> B3;
        Stack --> |block = runtime.pop()| Consumer;
        Consumer -- "block.dispose()" --> Disposal((Disposal));
    end
```