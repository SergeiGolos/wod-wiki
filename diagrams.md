# WOD Wiki Architecture Diagrams

## JIT Compiler and Runtime Architecture

```mermaid
graph TD
    subgraph "Input & Parsing"
        A[Workout Script] --> B[Parser]
    end

    subgraph "Compilation"
        B --> C{JIT Compiler}
        C --> D[Generates IRuntimeBlock[]]
    end

    subgraph "Execution"
        D --> E[Runtime Engine]
        E -->|Pushes blocks to| F[RuntimeStack]
        F -->|Manages| G[Active IRuntimeBlock]
        G -->|Interacts with| H[Memory/State]
        E -->|Updates| H
    end
```

## Runtime Stack Flow

```mermaid
graph TD
    subgraph "Input Script"
        WorkoutScript["-- AMRAP 10 --\n5 Pullups\n10 Pushups\n15 Squats"]
    end

    subgraph "Compilation"
        WorkoutScript --> JIT{JIT Compiler}
        JIT --> Blocks[IRuntimeBlock[]]
    end

    subgraph "Stack Management"
        Blocks -->|runtime.push(block)| Stack[RuntimeStack]
        Stack -->|Manages stack of blocks| StackViz
    end

    subgraph "RuntimeStack Visualization"
        direction LR
        StackViz -->|graph()| B1[Bottom: AmrapBlock]
        B1 --> B2[WorkoutBlock]
        B2 --> B3[Top: TimerBlock]
    end

    Stack -->|current()| B3
    Stack -->|block = runtime.pop()| Consumer
    Consumer -->|block.dispose()| Disposal[Disposal]
```
