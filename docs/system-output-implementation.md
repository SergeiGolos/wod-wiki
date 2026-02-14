# System Output Implementation Guide

## Overview

This document describes how to add a new **`'system'` output type** to the WOD Wiki runtime. System outputs are timestamped `IOutputStatement` records emitted automatically on block **push**, **next**, and **pop** lifecycle events, and when event handlers produce actions. They use the existing output pipeline (`runtime.addOutput()`) and encode their data as `ICodeFragment[]` — no interface changes required.

### Why?

The runtime already has a well-wired output pipeline: behaviors create `OutputStatement` objects, call `runtime.addOutput()`, and subscribers (debug panels, execution logs, analytics) receive them. System output piggybacks on this pipeline to provide lifecycle tracing without adding new pub/sub infrastructure.

### What You'll Build

| Artifact | Type | Purpose |
|----------|------|---------|
| `'system'` output type value | Type widening | New discriminator for system output |
| `FragmentType.System` enum value | Enum addition | Fragment type for system data |
| `EmitSystemOutputAction` | New class | Action that creates & emits system output |
| Push/Pop/Next instrumentation | Small edits | Inject `EmitSystemOutputAction` into lifecycle |
| Event→action tracing | Small edit | Trace events that produce actions |
| Unit tests | New file | Verify all system output scenarios |
| Index re-export | Small edit | Export new action from barrel file |

### No Interface Changes

The following interfaces are **NOT** modified:
- `IOutputStatement` — already has `outputType`, `fragments`, `timeSpan`, `stackLevel`, `sourceBlockKey`
- `ICodeFragment` — already has `fragmentType`, `type`, `image`, `value`, `origin`, `timestamp`
- `IBehaviorContext` — system output bypasses behaviors entirely
- `IRuntimeStack` — untouched
- `IScriptRuntime.addOutput()` — already generic, accepts any `IOutputStatement`
- `ExecutionLogService` — automatically persists system outputs (they're `IOutputStatement[]`)
- `OutputTracingHarness` — already supports `.byType('system')` once the type exists

---

## Prerequisites

Before starting, make sure you can:

```bash
bun install                    # Install dependencies
bun run test                   # Run unit tests (should pass with known baseline failures)
bun x tsc --noEmit             # Type check
```

Read and understand these files (you'll need to reference them throughout):

| File | What It Does |
|------|-------------|
| `src/core/models/OutputStatement.ts` | Defines `OutputStatementType`, `IOutputStatement`, `OutputStatement` class |
| `src/core/models/CodeFragment.ts` | Defines `FragmentType` enum and `ICodeFragment` interface |
| `src/runtime/actions/stack/PushBlockAction.ts` | Action that pushes a block onto the stack |
| `src/runtime/actions/stack/PopBlockAction.ts` | Action that pops a block from the stack |
| `src/runtime/actions/stack/NextAction.ts` | Action that calls `next()` on the current block |
| `src/runtime/ExecutionContext.ts` | Processes actions in LIFO order, handles events |
| `src/runtime/contracts/IRuntimeAction.ts` | Interface all actions implement |
| `src/runtime/models/TimeSpan.ts` | Time span model used by `OutputStatement` |

---

## Task 1: Add `'system'` to `OutputStatementType`

**File:** `src/core/models/OutputStatement.ts`  
**Line:** 16  
**Estimated time:** 5 minutes

### What to do

Add `'system'` to the `OutputStatementType` union type.

### Current code (line 16)

```typescript
export type OutputStatementType = 'segment' | 'completion' | 'milestone' | 'label' | 'metric';
```

### Target code

```typescript
export type OutputStatementType = 'segment' | 'completion' | 'milestone' | 'label' | 'metric' | 'system';
```

### Update the JSDoc

The doc comment above this type (lines 7–15) describes each value. Add a new entry:

```typescript
 * - 'system': Debug/diagnostic output from lifecycle events (push, pop, next, event-action)
```

### Validation

```bash
bun x tsc --noEmit   # No new type errors
```

---

## Task 2: Add `FragmentType.System` enum value

**File:** `src/core/models/CodeFragment.ts`  
**Line:** ~70 (after `Sound = 'sound'`)  
**Estimated time:** 5 minutes

### What to do

Add a `System` entry to the `FragmentType` enum.

### Current code (lines 59–72)

```typescript
export enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Group = 'group',
  Text = 'text',
  Resistance = 'resistance',
  Sound = 'sound'
}
```

### Target code

```typescript
export enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Group = 'group',
  Text = 'text',
  Resistance = 'resistance',
  Sound = 'sound',
  System = 'system'
}
```

### Validation

```bash
bun x tsc --noEmit   # No new type errors
```

---

## Task 3: Create `EmitSystemOutputAction`

**File:** `src/runtime/actions/stack/EmitSystemOutputAction.ts` *(new file)*  
**Estimated time:** 30 minutes

### What to do

Create a new `IRuntimeAction` that, when executed by the `ExecutionContext`, creates an `OutputStatement` with `outputType: 'system'` and calls `runtime.addOutput()`.

### Key design decisions

1. **It's an action, not a direct call.** This means it participates in the same frozen-clock turn as the push/pop/next it describes. All system outputs in a single `ExecutionContext.execute()` call share the same timestamp.
2. **Fragments encode the data.** Each system output carries a single `ICodeFragment` of type `FragmentType.System`. The fragment's `image` is a human-readable message; the fragment's `value` is structured data.
3. **Uses `TimeSpan` with zero duration.** System outputs are point-in-time events, so both `started` and `ended` are the same timestamp.

### System output fragment schema

Each system output contains a single fragment with these fields:

| Fragment Field | Value |
|----------------|-------|
| `fragmentType` | `FragmentType.System` |
| `type` | `'lifecycle'` for push/pop/next, `'event-action'` for event→action traces |
| `image` | Human-readable message, e.g. `"push: 5×Burpees [abc12345]"` |
| `value` | `SystemOutputValue` object (see below) |
| `origin` | `'runtime'` |
| `timestamp` | `Date` — from `runtime.clock.now` |

#### `SystemOutputValue` type

Define this as a simple interface (not exported from the module — it's internal):

```typescript
interface SystemOutputValue {
  event: 'push' | 'pop' | 'next' | 'event-action';
  blockKey: string;
  blockLabel?: string;
  [key: string]: unknown;  // extensible for extra data like completionReason, eventType, etc.
}
```

### Full implementation

```typescript
import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';
import { OutputStatement } from '../../../core/models/OutputStatement';
import { TimeSpan } from '../../models/TimeSpan';

/**
 * Structured data carried by system output fragments.
 */
interface SystemOutputValue {
  /** The lifecycle event that triggered this output */
  event: 'push' | 'pop' | 'next' | 'event-action';
  /** The block key involved */
  blockKey: string;
  /** Human-readable block label (if available) */
  blockLabel?: string;
  /** Additional event-specific data */
  [key: string]: unknown;
}

/**
 * Action that emits a system-level output statement for lifecycle tracing.
 *
 * System outputs are diagnostic records emitted on block push/pop/next
 * and when event handlers produce actions. They flow through the normal
 * output pipeline (runtime.addOutput) and appear alongside segment/completion
 * outputs in the output log.
 *
 * Consumers that don't want system output can filter:
 *   outputs.filter(o => o.outputType !== 'system')
 *
 * ## Fragment Encoding
 *
 * Each system output carries a single fragment:
 * - fragmentType: FragmentType.System
 * - type: 'lifecycle' | 'event-action'
 * - image: human-readable message
 * - value: SystemOutputValue with structured data
 * - origin: 'runtime'
 */
export class EmitSystemOutputAction implements IRuntimeAction {
  readonly type = 'emit-system-output';

  /**
   * @param message Human-readable description (becomes fragment.image)
   * @param event   Which lifecycle event triggered this output
   * @param blockKey The block key involved
   * @param blockLabel Optional human-readable block label
   * @param stackLevel Stack depth at time of emission
   * @param extra Additional key-value data to include in the fragment value
   */
  constructor(
    private readonly message: string,
    private readonly event: 'push' | 'pop' | 'next' | 'event-action',
    private readonly blockKey: string,
    private readonly blockLabel?: string,
    private readonly stackLevel?: number,
    private readonly extra?: Record<string, unknown>
  ) {}

  do(runtime: IScriptRuntime): IRuntimeAction[] {
    const now = runtime.clock.now;

    const value: SystemOutputValue = {
      event: this.event,
      blockKey: this.blockKey,
      blockLabel: this.blockLabel,
      ...this.extra
    };

    const fragment: ICodeFragment = {
      fragmentType: FragmentType.System,
      type: this.event === 'event-action' ? 'event-action' : 'lifecycle',
      image: this.message,
      value,
      origin: 'runtime',
      timestamp: now,
    };

    const output = new OutputStatement({
      outputType: 'system',
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
      sourceBlockKey: this.blockKey,
      stackLevel: this.stackLevel ?? runtime.stack.count,
      fragments: [fragment],
    });

    runtime.addOutput(output);
    return [];
  }
}
```

### Validation

```bash
bun x tsc --noEmit   # No new type errors
```

---

## Task 4: Export `EmitSystemOutputAction` from barrel file

**File:** `src/runtime/actions/stack/index.ts`  
**Estimated time:** 2 minutes

### What to do

Add a re-export for the new action class.

### Current code (line 8)

```typescript
export { CompileAndPushBlockAction } from './CompileAndPushBlockAction';
```

### Target code

Add after the `CompileAndPushBlockAction` export:

```typescript
export { CompileAndPushBlockAction } from './CompileAndPushBlockAction';
export { EmitSystemOutputAction } from './EmitSystemOutputAction';
```

### Validation

```bash
bun x tsc --noEmit   # No new type errors
```

---

## Task 5: Instrument `PushBlockAction`

**File:** `src/runtime/actions/stack/PushBlockAction.ts`  
**Estimated time:** 15 minutes

### What to do

After the block is pushed and mounted, prepend an `EmitSystemOutputAction` to the returned actions array so a system output is emitted for every push.

### Add import

At the top of the file, add:

```typescript
import { EmitSystemOutputAction } from './EmitSystemOutputAction';
```

### Modify the `do()` method

Find this section (around lines 55–65):

```typescript
            // Push the block onto the stack
            runtime.stack.push(this.block);

            // Mount the block with lifecycle options - returns actions to be executed
            const mountActions = this.block.mount(runtime, lifecycle);

            // Log the push with behaviors
            const parentKey = runtime.stack.blocks.length > 1
                ? runtime.stack.blocks[1]?.key.toString()
                : undefined;
            RuntimeLogger.logPush(this.block, parentKey);

            return mountActions;
```

Change the return statement to prepend a system output action:

```typescript
            // Push the block onto the stack
            runtime.stack.push(this.block);

            // Mount the block with lifecycle options - returns actions to be executed
            const mountActions = this.block.mount(runtime, lifecycle);

            // Log the push with behaviors
            const parentKey = runtime.stack.blocks.length > 1
                ? runtime.stack.blocks[1]?.key.toString()
                : undefined;
            RuntimeLogger.logPush(this.block, parentKey);

            // Emit system output for push lifecycle event
            const systemOutput = new EmitSystemOutputAction(
                `push: ${this.block.label ?? this.block.blockType ?? 'Block'} [${this.block.key.toString().slice(0, 8)}]`,
                'push',
                this.block.key.toString(),
                this.block.label,
                runtime.stack.count,
                { parentKey }
            );

            return [systemOutput, ...mountActions];
```

### Key detail

The system output action is placed **first** in the returned array. In the `ExecutionContext` LIFO stack, returned arrays are reverse-pushed so the first element executes first. This means the system output is emitted **before** any mount actions run — it marks the moment the push happened.

### Validation

```bash
bun run test          # No new test failures
bun x tsc --noEmit    # No new type errors
```

---

## Task 6: Instrument `PopBlockAction`

**File:** `src/runtime/actions/stack/PopBlockAction.ts`  
**Estimated time:** 15 minutes

### What to do

Before returning the unmount actions (and optional `NextAction`), prepend an `EmitSystemOutputAction`.

### Add import

At the top of the file, add:

```typescript
import { EmitSystemOutputAction } from './EmitSystemOutputAction';
```

### Modify the `do()` method

Find this section at the end of the method (around lines 72–84):

```typescript
        // If a parent block exists, queue a NextAction to notify it of child completion.
        // This decouples the pop and next steps into separate actions, ensuring each
        // lifecycle phase (unmount → next → push) is a distinct action in the ExecutionContext.
        const parent = runtime.stack.current;

        // Return unmount actions first, then a NextAction for the parent (if any).
        // ExecutionContext reverse-pushes returned arrays so first element executes first:
        // unmount effects run before parent advancement.
        return parent
            ? [...unmountActions, new NextAction(lifecycleOptions)]
            : unmountActions;
```

Change to:

```typescript
        // If a parent block exists, queue a NextAction to notify it of child completion.
        // This decouples the pop and next steps into separate actions, ensuring each
        // lifecycle phase (unmount → next → push) is a distinct action in the ExecutionContext.
        const parent = runtime.stack.current;

        // Emit system output for pop lifecycle event
        const completionReason = (popped as any).completionReason ?? 'normal';
        const systemOutput = new EmitSystemOutputAction(
            `pop: ${popped.label ?? popped.blockType ?? 'Block'} [${popped.key.toString().slice(0, 8)}] reason=${completionReason}`,
            'pop',
            popped.key.toString(),
            popped.label,
            runtime.stack.count,
            { completionReason }
        );

        // Return system output first, then unmount actions, then NextAction for parent.
        // ExecutionContext processes first element first (reverse-push LIFO).
        return parent
            ? [systemOutput, ...unmountActions, new NextAction(lifecycleOptions)]
            : [systemOutput, ...unmountActions];
```

### Key detail

We use `popped` (the block that was already removed from the stack) rather than `current` (which is now the parent). The `stackLevel` is `runtime.stack.count` — the depth *after* the pop, which is correct since the popped block is no longer on the stack.

### Validation

```bash
bun run test          # No new test failures
bun x tsc --noEmit    # No new type errors
```

---

## Task 7: Instrument `NextAction`

**File:** `src/runtime/actions/stack/NextAction.ts`  
**Estimated time:** 15 minutes

### What to do

Before returning the result of `currentBlock.next()`, prepend an `EmitSystemOutputAction`.

### Add import

At the top of the file, add:

```typescript
import { EmitSystemOutputAction } from './EmitSystemOutputAction';
```

### Modify the `do()` method

Find this section (around lines 34–39):

```typescript
      // Execute block's next logic with the lifecycle options
      return currentBlock.next(runtime, lifecycleOptions);
```

Change to:

```typescript
      // Execute block's next logic with the lifecycle options
      const nextActions = currentBlock.next(runtime, lifecycleOptions);

      // Emit system output for next lifecycle event
      const systemOutput = new EmitSystemOutputAction(
          `next: ${currentBlock.label ?? currentBlock.blockType ?? 'Block'} [${currentBlock.key.toString().slice(0, 8)}]`,
          'next',
          currentBlock.key.toString(),
          currentBlock.label,
          runtime.stack.count
      );

      return [systemOutput, ...nextActions];
```

### Validation

```bash
bun run test          # No new test failures
bun x tsc --noEmit    # No new type errors
```

---

## Task 8: Instrument `ExecutionContext.handle()` for event→action tracing

**File:** `src/runtime/ExecutionContext.ts`  
**Lines:** 108–110  
**Estimated time:** 15 minutes

### What to do

When an event is dispatched and produces one or more actions, inject a system output action to trace the event→action transition.

### Add import

At the top of the file, add:

```typescript
import { EmitSystemOutputAction } from './actions/stack/EmitSystemOutputAction';
```

### Modify the `handle()` method

Find this section (lines 107–110):

```typescript
    handle(event: IEvent): void {
        const actions = this.eventBus.dispatch(event, this);
        this.doAll(actions);
    }
```

Change to:

```typescript
    handle(event: IEvent): void {
        const actions = this.eventBus.dispatch(event, this);
        if (actions.length > 0) {
            const systemOutput = new EmitSystemOutputAction(
                `event: ${event.name} → ${actions.length} action(s)`,
                'event-action',
                (event as any).source ?? 'event-bus',
                undefined,
                this.stack.count,
                { eventName: event.name, actionTypes: actions.map(a => a.type) }
            );
            this.doAll([systemOutput, ...actions]);
        } else {
            this.doAll(actions);
        }
    }
```

### Key detail

We only emit a system output when the event **actually produces actions**. Events that are dispatched but matched by no handlers generate no noise. The fragment's `value.actionTypes` field lists the types of actions produced (e.g., `['pop-block', 'push-block']`), which is useful for debugging event-driven workflows.

### Validation

```bash
bun run test          # No new test failures
bun x tsc --noEmit    # No new type errors
```

---

## Task 9: Write unit tests

**File:** `src/runtime/actions/stack/__tests__/EmitSystemOutputAction.test.ts` *(new file)*  
**Estimated time:** 45 minutes

### What to test

1. `EmitSystemOutputAction` creates an `OutputStatement` with `outputType: 'system'`
2. The output has a single fragment with `fragmentType: FragmentType.System`
3. The fragment's `image` matches the message passed to the constructor
4. The fragment's `value` contains the structured event data
5. The `timeSpan` has equal `started` and `ended` (point-in-time)
6. The action calls `runtime.addOutput()` exactly once
7. The action returns an empty array (no child actions)

### Test skeleton

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmitSystemOutputAction } from '../EmitSystemOutputAction';
import { FragmentType } from '../../../../core/models/CodeFragment';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';

function createMockRuntime(): IScriptRuntime {
    const now = new Date('2024-01-15T12:00:00Z');
    return {
        clock: { now, isRunning: true },
        stack: { count: 2 },
        addOutput: vi.fn(),
        // Add other required IScriptRuntime fields as vi.fn() stubs
    } as unknown as IScriptRuntime;
}

describe('EmitSystemOutputAction', () => {
    let runtime: IScriptRuntime;

    beforeEach(() => {
        runtime = createMockRuntime();
    });

    it('should have type "emit-system-output"', () => {
        const action = new EmitSystemOutputAction('test message', 'push', 'block-1');
        expect(action.type).toBe('emit-system-output');
    });

    it('should emit a system output statement', () => {
        const action = new EmitSystemOutputAction('push: Burpees [abc12345]', 'push', 'block-1', 'Burpees', 2);
        const result = action.do(runtime);

        expect(result).toEqual([]);
        expect(runtime.addOutput).toHaveBeenCalledTimes(1);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        expect(output.outputType).toBe('system');
        expect(output.sourceBlockKey).toBe('block-1');
        expect(output.stackLevel).toBe(2);
    });

    it('should create a System fragment with lifecycle type', () => {
        const action = new EmitSystemOutputAction('push: Test', 'push', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        expect(output.fragments).toHaveLength(1);

        const fragment = output.fragments[0];
        expect(fragment.fragmentType).toBe(FragmentType.System);
        expect(fragment.type).toBe('lifecycle');
        expect(fragment.image).toBe('push: Test');
        expect(fragment.origin).toBe('runtime');
        expect(fragment.value.event).toBe('push');
        expect(fragment.value.blockKey).toBe('block-1');
    });

    it('should use event-action type for event-action events', () => {
        const action = new EmitSystemOutputAction('event: timer-expired', 'event-action', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        const fragment = output.fragments[0];
        expect(fragment.type).toBe('event-action');
    });

    it('should include extra data in fragment value', () => {
        const action = new EmitSystemOutputAction(
            'pop: Test', 'pop', 'block-1', 'Test', 1,
            { completionReason: 'timer-expired' }
        );
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        const fragment = output.fragments[0];
        expect(fragment.value.completionReason).toBe('timer-expired');
    });

    it('should create a point-in-time TimeSpan', () => {
        const action = new EmitSystemOutputAction('next: Test', 'next', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        expect(output.timeSpan.started).toBe(output.timeSpan.ended);
    });

    it('should fall back to runtime stack count when stackLevel not provided', () => {
        const action = new EmitSystemOutputAction('push: Test', 'push', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        expect(output.stackLevel).toBe(2); // from mock runtime.stack.count
    });
});
```

### Running the tests

```bash
bun test src/runtime/actions/stack/__tests__/EmitSystemOutputAction.test.ts --preload ./tests/unit-setup.ts
```

---

## Task 10: Integration sanity check

**Estimated time:** 15 minutes

After all changes are made, run the full validation suite:

```bash
# 1. Type check — no NEW errors (369 baseline errors exist, don't fix those)
bun x tsc --noEmit

# 2. Unit tests — no new failures
bun run test

# 3. Component tests — no new failures
bun run test:components

# 4. Storybook — loads and renders (visual check)
bun run storybook
```

### What to look for

- **No new type errors** from the 2 type/enum additions
- **No new test failures** — existing tests that count output statements may now see additional `'system'` outputs. If any test asserts an exact count of outputs, it may need updating to filter out system outputs:
  ```typescript
  const nonSystemOutputs = outputs.filter(o => o.outputType !== 'system');
  ```
- **Storybook renders normally** — system outputs flow through the output pipeline but the `RuntimeDebugPanel` and `AnalyticsTransformer` should ignore types they don't recognize

---

## Architecture Reference

### Data flow after this change

```
PushBlockAction.do()
  ├── runtime.stack.push(block)
  ├── block.mount() → mountActions
  └── return [EmitSystemOutputAction('push:...'), ...mountActions]
        │
        ▼
ExecutionContext processes LIFO:
  1. EmitSystemOutputAction.do() → runtime.addOutput(systemOutput)
  2. mountActions... (behaviors run, may emit 'segment' output)

PopBlockAction.do()
  ├── block.unmount() → unmountActions
  ├── runtime.stack.pop()
  └── return [EmitSystemOutputAction('pop:...'), ...unmountActions, NextAction]
        │
        ▼
ExecutionContext processes LIFO:
  1. EmitSystemOutputAction.do() → runtime.addOutput(systemOutput)
  2. unmountActions... (SegmentOutputBehavior emits 'completion')
  3. NextAction → parent.next()

NextAction.do()
  ├── currentBlock.next() → nextActions
  └── return [EmitSystemOutputAction('next:...'), ...nextActions]

ExecutionContext.handle(event)
  ├── eventBus.dispatch() → actions
  └── doAll([EmitSystemOutputAction('event:...'), ...actions])
```

### Output subscriber pipeline

System outputs flow through all existing subscribers:

```
runtime.addOutput(systemOutput)
  ├── ScriptRuntime._outputStatements[]     → in-memory storage
  ├── ExecutionLogService                    → WodResult.logs → LocalStorage
  ├── OutputTracingHarness                   → TracedOutput[] (tests)
  ├── RuntimeDebugPanel                      → UI re-render
  └── AnalyticsTransformer                   → filtered out (not 'segment'/'completion')
```

### Fragment structure example

```json
{
  "fragmentType": "system",
  "type": "lifecycle",
  "image": "push: 5×Burpees [abc12345]",
  "value": {
    "event": "push",
    "blockKey": "abc12345-6789-...",
    "blockLabel": "5×Burpees",
    "parentKey": "root-block-key"
  },
  "origin": "runtime",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## File Checklist

Use this checklist to track your progress:

- [ ] **Task 1** — `src/core/models/OutputStatement.ts` — Add `'system'` to `OutputStatementType`
- [ ] **Task 2** — `src/core/models/CodeFragment.ts` — Add `FragmentType.System`
- [ ] **Task 3** — `src/runtime/actions/stack/EmitSystemOutputAction.ts` — Create the action class *(new file)*
- [ ] **Task 4** — `src/runtime/actions/stack/index.ts` — Re-export `EmitSystemOutputAction`
- [ ] **Task 5** — `src/runtime/actions/stack/PushBlockAction.ts` — Inject system output on push
- [ ] **Task 6** — `src/runtime/actions/stack/PopBlockAction.ts` — Inject system output on pop
- [ ] **Task 7** — `src/runtime/actions/stack/NextAction.ts` — Inject system output on next
- [ ] **Task 8** — `src/runtime/ExecutionContext.ts` — Inject system output on event→action
- [ ] **Task 9** — `src/runtime/actions/stack/__tests__/EmitSystemOutputAction.test.ts` — Unit tests *(new file)*
- [ ] **Task 10** — Full validation pass (tsc, tests, Storybook)

---

## Estimated Total Time

| Task | Time |
|------|------|
| Tasks 1–2 (type additions) | 10 min |
| Task 3 (new action class) | 30 min |
| Task 4 (barrel export) | 2 min |
| Tasks 5–8 (instrumentation) | 60 min |
| Task 9 (unit tests) | 45 min |
| Task 10 (validation) | 15 min |
| **Total** | **~2.5 hours** |
