# Interface Contract: IEventHandler

**File**: `src/runtime/IEventHandler.ts`
**Purpose**: Defines the standard interface for event handlers

## Interface Definition

```typescript
export interface IEventHandler {
  id: string;
  name: string;
  handler(event: any, runtime: IScriptRuntime): EventHandlerResponse;
}

export interface EventHandlerResponse {
  handled: boolean;
  abort: boolean;
  actions: IRuntimeAction[];
}
```

## Implementation Requirements

### NextEventHandler Implementation
```typescript
export class NextEventHandler implements IEventHandler {
  readonly id: string;
  readonly name: string;

  constructor(id: string) {
    this.id = id;
    this.name = 'next-handler';
  }

  handler(event: any, runtime: IScriptRuntime): EventHandlerResponse {
    // Event filtering
    if (event.name !== 'next') {
      return { handled: false, abort: false, actions: [] };
    }

    // Runtime state validation
    if (!this.isValidRuntimeState(runtime)) {
      return { handled: true, abort: true, actions: [] };
    }

    // Generate next action
    const action = new NextAction();
    return {
      handled: true,
      abort: false,
      actions: [action]
    };
  }

  private isValidRuntimeState(runtime: IScriptRuntime): boolean {
    // Check for valid runtime conditions
    return runtime.stack.current !== null &&
           !runtime.hasErrors() &&
           runtime.memory.state !== 'corrupted';
  }
}
```

## Contract Constraints

### Required Properties
- `id`: Must be unique string identifier
- `name`: Must be 'next-handler' for NextEventHandler instances
- `handler`: Must accept IEvent and IScriptRuntime, return EventHandlerResponse

### Handler Behavior Requirements
- Must filter events by name ('next' only)
- Must validate runtime state before processing
- Must return appropriate response structure
- Must handle all error conditions gracefully

### Response Structure Requirements
- `handled`: Boolean indicating if event was processed
- `abort`: Boolean indicating if execution should stop
- `actions`: Array of IRuntimeAction instances

### Performance Requirements
- Handler execution must complete in <10ms
- Memory allocation must be minimal
- No blocking operations allowed

## Usage Pattern

```typescript
// Handler creation
const handler = new NextEventHandler('next-handler-001');

// Handler registration
runtime.memory.allocate('handler', handler.id, {
  name: handler.name,
  handler: handler.handler.bind(handler)
});

// Handler execution (automatic via runtime)
runtime.handle(new NextEvent());
```

## Testing Requirements

### Unit Tests
- Test event filtering (next vs other events)
- Test runtime state validation
- Test action generation
- Test error handling scenarios
- Test response structure compliance

### Integration Tests
- Test handler registration and discovery
- Test handler execution through runtime
- Test multiple handler scenarios
- Test error propagation