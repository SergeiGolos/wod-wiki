---
title: "JIT Compiler Rounds Loop Implementation"
date: 2025-07-31
tags: [implementation, jit, compiler, runtime]
parent: ../Core/Compiler/JitCompiler.md
implements: ../Core/Runtime/RepeatingBlock.md
---

# JIT Compiler Rounds Loop Implementation

## Overview

This document outlines the necessary changes to implement the rounds grouping loop in the JIT Compiler. The current implementation correctly identifies the rounds and their children but does not repeat the child blocks as required.

## Implementation Details

### 1. Update `RoundsStrategy`

The `RoundsStrategy` will be updated to create a `RepeatingBlock` instead of a `RoundsParentBlock`. The number of rounds will be passed to the `RepeatingBlock` to control the loop.

**File**: `src/runtime/strategies.ts`

```typescript
import { RepeatingBlock } from './blocks/RepeatingBlock';

// ...

export class RoundsStrategy implements IRuntimeBlockStrategy {
    // ...
    create(statement: CodeStatement, parent: IRuntimeBlock, metrics: RuntimeMetric[]): IRuntimeBlock {
        const rounds = metrics.find(m => m.type === 'rounds')?.value || 1;
        return new RepeatingBlock(statement.key, rounds, metrics);
    }
}
```

### 2. Enhance `RepeatingBlock`

The `RepeatingBlock` will be updated to manage the execution of its child blocks. The `tick` method will be implemented to check if there are more rounds to go. If so, it will reset the child blocks and start the next round.

**File**: `src/runtime/blocks/RepeatingBlock.ts`

```typescript
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent} from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";

export class RepeatingBlock implements IRuntimeBlock {
    public parent?: IRuntimeBlock;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];
    private remainingRounds: number;

    constructor(public readonly key: BlockKey, private readonly totalRounds: number, metrics: RuntimeMetric[]) {
        this.metrics = metrics;
        this.spans = {} as IResultSpanBuilder;
        this.handlers = [];
        this.remainingRounds = totalRounds;
    }

    public tick(runtime: IScriptRuntime): IRuntimeEvent[] {
        if (this.remainingRounds > 0) {
            // Assuming the children are managed by the runtime and we can check their status.
            const children = runtime.getChildren(this.key);
            const allChildrenDone = children.every(child => child.isDone()); // isDone would be a new property/method

            if (allChildrenDone) {
                this.remainingRounds--;
                if (this.remainingRounds > 0) {
                    // Reset children for the next round
                    children.forEach(child => child.reset()); // reset would be a new method
                }
            }
        }
        return [];
    }

    public inherit(): IMetricInheritance[] {
        return [];
    }
}
```

This change introduces the need for `isDone` and `reset` methods on the `IRuntimeBlock` interface, which will be part of the implementation.
