---
title: "ScriptRuntime Event Handling Redesign"
date: 2025-07-13
tags: [runtime, event-handling, design-options, refactoring]
related:
  - ./scriptruntime-implementation-assessment.md
  - ../../src/runtime/ScriptRuntime.ts
  - ../../src/runtime/EventHandler.ts
status: draft
---

# ScriptRuntime Event Handling Redesign

This document addresses the high-priority issue identified in the `ScriptRuntime.ts` file, where the event handling logic does not align with the `EventHandler` interface definition. It proposes several design options to correct the implementation.

## 1. Problem Statement

The `handle` method in `ScriptRuntime.ts` attempts to find a suitable event handler by calling a `canHandle` method and then a `handle` method. This is incorrect.

**Current Incorrect Implementation:**
```typescript
// In ScriptRuntime.ts
handle(event: IRuntimeEvent): void {                
    const handlres = this.stack.blocks.flatMap(block => block.handlers)
    const actions = handlres.find(handler => handler.canHandle(event))?.handle(event) ?? [];
    for (const action of actions) {
        console.log('Applying action:', action, 'from source:', event);
        action.do(this);
    }        
}
```

The `EventHandler` interface, defined in `src/runtime/EventHandler.ts`, does not have `canHandle` or `handle` methods. Instead, it specifies a single method, `handleEvent`, which returns a `HandlerResponse` object.

**Correct Interface Definition:**
```typescript
// In EventHandler.ts
export interface HandlerResponse {
  handled: boolean;
  shouldContinue: boolean;
  actions: IRuntimeAction[];
}

export interface EventHandler {
  handleEvent(event: IRuntimeEvent, context?: any): HandlerResponse;
}
```

## 2. Proposed Refactoring Options

The `handle` method in `ScriptRuntime.ts` needs to be refactored to correctly use the `EventHandler` interface. Below are several options for how to implement the new logic.

### Option A: Iterative Processing Loop

**Description:**
This approach involves iterating through all available handlers and calling `handleEvent` on each one. The loop would respect the `shouldContinue` flag in the `HandlerResponse` to determine whether to stop processing or continue to the next handler.

**Example Implementation:**
```typescript
// In ScriptRuntime.ts
handle(event: IRuntimeEvent): void {
    const allActions: IRuntimeAction[] = [];
    const handlers = this.stack.blocks.flatMap(block => block.handlers);

    for (const handler of handlers) {
        const response = handler.handleEvent(event);
        if (response.handled) {
            allActions.push(...response.actions);
        }
        if (!response.shouldContinue) {
            break; // Stop processing if a handler says so
        }
    }

    for (const action of allActions) {
        action.do(this);
    }
}
```

*   **Pros:**
    *   Simple and straightforward to implement.
    *   Directly uses the `HandlerResponse` contract as intended.
*   **Cons:**
    *   The order of handler execution depends on the order of blocks in the stack and handlers within each block, which might not be explicit.

### Option B: Chain of Responsibility Pattern

**Description:**
This option formalizes the event flow into a "chain of responsibility." The event is passed from one handler to the next until it is handled or the chain ends. This is a more structured version of Option A.

**Example Implementation:**
```typescript
// This would require a change in how handlers are structured, potentially linking them together.
class EventChain {
    private handlers: EventHandler[];

    constructor(handlers: EventHandler[]) {
        this.handlers = handlers;
    }

    process(event: IRuntimeEvent): IRuntimeAction[] {
        const allActions: IRuntimeAction[] = [];
        for (const handler of this.handlers) {
            const response = handler.handleEvent(event);
            if (response.handled) {
                allActions.push(...response.actions);
            }
            if (!response.shouldContinue) {
                break;
            }
        }
        return allActions;
    }
}

// In ScriptRuntime.ts
handle(event: IRuntimeEvent): void {
    const handlers = this.stack.blocks.flatMap(block => block.handlers);
    const chain = new EventChain(handlers);
    const actions = chain.process(event);
    
    for (const action of actions) {
        action.do(this);
    }
}
```

*   **Pros:**
    *   Formalizes the processing flow into a distinct pattern.
    *   Can be extended with more complex routing or filtering logic.
*   **Cons:**
    *   May be overly complex for the current need.
    *   Adds another layer of abstraction (`EventChain`).

### Option C: Prioritized Handler Execution

**Description:**
This approach introduces a `priority` property to the `EventHandler` interface. The `ScriptRuntime` would sort handlers by priority before executing them. This provides more control over the order of execution.

**Example Implementation (requires interface change):**
```typescript
// In EventHandler.ts (with modification)
export interface EventHandler {
    readonly priority: number; // e.g., higher number = higher priority
    handleEvent(event: IRuntimeEvent, context?: any): HandlerResponse;
}

// In ScriptRuntime.ts
handle(event: IRuntimeEvent): void {
    const handlers = this.stack.blocks
        .flatMap(block => block.handlers)
        .sort((a, b) => b.priority - a.priority); // Sort descending

    // ... rest of the logic from Option A or B
}
```

*   **Pros:**
    *   Provides explicit control over the order in which events are handled.
    *   Allows critical handlers to run before others.
*   **Cons:**
    *   Requires a modification to the `EventHandler` interface.
    *   Adds the complexity of managing priorities across different handlers.
