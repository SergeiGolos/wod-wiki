# Quick Start: Next Button Integration

**Feature**: Next Button Integration for Workout Script Execution
**Target**: Developers implementing the Next button functionality
**Time**: 15-30 minutes

## Prerequisites

- Node.js and npm installed
- WOD Wiki repository cloned
- Basic understanding of React and TypeScript
- Familiarity with the existing runtime system

## Quick Implementation Guide

### Step 1: Create NextEvent Class
Create `src/runtime/NextEvent.ts`:

```typescript
import { IEvent } from './IEvent';

export class NextEvent implements IEvent {
  readonly name = 'next';
  readonly timestamp = new Date();
  readonly data?: any;

  constructor(data?: any) {
    this.data = data;
  }
}
```

### Step 2: Create NextEventHandler Class
Create `src/runtime/NextEventHandler.ts`:

```typescript
import { IEventHandler, EventHandlerResponse } from './IEventHandler';
import { IScriptRuntime } from './IScriptRuntime';
import { NextAction } from './NextAction';

export class NextEventHandler implements IEventHandler {
  readonly id: string;
  readonly name: string;

  constructor(id: string) {
    this.id = id;
    this.name = 'next-handler';
  }

  handler(event: any, runtime: IScriptRuntime): EventHandlerResponse {
    if (event.name !== 'next') {
      return { handled: false, abort: false, actions: [] };
    }

    const currentBlock = runtime.stack.current;
    if (!currentBlock) {
      return { handled: true, abort: false, actions: [] };
    }

    const action = new NextAction();
    return {
      handled: true,
      abort: false,
      actions: [action]
    };
  }
}
```

### Step 3: Create NextAction Class
Create `src/runtime/NextAction.ts`:

```typescript
import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';

export class NextAction implements IRuntimeAction {
  readonly type = 'next';

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) {
      console.log('NextAction: No current block to advance from');
      return;
    }

    const nextActions = currentBlock.next();
    for (const action of nextActions) {
      action.do(runtime);
    }
  }
}
```

### Step 4: Update JitCompilerDemo
Update `stories/compiler/JitCompilerDemo.tsx`:

```typescript
import { NextEvent } from '../../src/runtime/NextEvent';

// In the component:
const handleNextBlock = () => {
  runtime.handle(new NextEvent());
  setStepVersion(v => v + 1);
};
```

### Step 5: Register Handlers
In your runtime block constructors, add:

```typescript
// Register next event handler
this.memory.allocate('handler', this.key.toString(), {
  name: 'next-handler',
  handler: this.handleNext.bind(this)
});
```

### Step 6: Add Handler Method
Add to your runtime block classes:

```typescript
private handleNext(event: any, runtime: IScriptRuntime) {
  if (event.name !== 'next') {
    return { handled: false, abort: false, actions: [] };
  }

  // Your custom next logic here
  return { handled: true, abort: false, actions: [] };
}
```

## Testing Your Implementation

### Run Storybook
```bash
npm run storybook
```

Navigate to Compiler → JitCompilerDemo → Default story

### Test the Next Button
1. Load a workout script in the demo
2. Click the "Next Block" button
3. Verify execution advances by one step
4. Check UI updates reflect new state
5. Test edge cases (end of script, errors)

### Run Unit Tests
```bash
npm run test:unit
```

Verify all new tests pass:
- NextEvent creation and properties
- NextEventHandler event processing
- NextAction execution

## Common Issues and Solutions

### Button Not Working
**Problem**: Clicking Next button doesn't advance execution
**Solution**: Ensure NextEvent is properly imported and handleNextBlock is correctly implemented

### Handler Not Found
**Problem**: Event handler not processing events
**Solution**: Verify handler registration in runtime block constructors

### UI Not Updating
**Problem**: Execution advances but UI doesn't update
**Solution**: Ensure setStepVersion is called after event handling

### Memory Leaks
**Problem**: Memory usage increases with each click
**Solution**: Follow proper disposal patterns in runtime blocks

## Performance Tips

1. **Minimize Handler Creation**: Create handlers once during block construction
2. **Optimize Event Data**: Keep event data minimal for performance
3. **Batch UI Updates**: Use React's batching for state updates
4. **Memory Management**: Ensure proper disposal of old blocks

## Next Steps

- Add comprehensive unit tests
- Implement error handling and recovery
- Add performance monitoring
- Create integration tests with real workout scripts
- Add visual feedback for different states

## Getting Help

- Check the research document (`research.md`) for detailed analysis
- Review the data model (`data-model.md`) for architectural details
- Refer to interface contracts in `contracts/` directory
- Look at existing runtime implementations for patterns