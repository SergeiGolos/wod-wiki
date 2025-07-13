---
title: "Implementation: ScriptRuntime Stack Visualization"
date: 2025-06-30
tags: [implementation, runtime, stack, visualization]
implements: ../Core/IScriptRuntime.md
related: ["../Core/Runtime/Stack.md", "../Core/Runtime/JitCompiler.md"]
status: complete
---

# Implementation: ScriptRuntime Stack Visualization

## Design Reference
This implementation follows the specifications in [IScriptRuntime](../Core/IScriptRuntime.md) and demonstrates the [Runtime Stack](../Core/Runtime/Stack.md) in action.

## Problem Solved
The JitCompilerDemo story was showing an empty runtime stack section instead of displaying the actual ScriptRuntime stack. This was caused by:

1. **Missing JitCompiler.root() Implementation**: The `root()` method was throwing an error instead of returning a valid `IRuntimeBlock`
2. **Mock vs Real Implementation**: The demo was using mock interfaces instead of the actual `ScriptRuntime` and `RuntimeStack` classes
3. **Type Mismatches**: BlockKey access was using `value` property instead of `blockId`
4. **Constructor Issues**: WodScript constructor requires both source text and statements

## Implementation Details

### Fixed JitCompiler Root Block
```typescript
root(): IRuntimeBlock {
  return {
    key: { blockId: 'root', traceId: 'root-trace', sourceIds: [] },
    metrics: [],
    spans: {},
    handlers: [],
    parent: undefined,
    next: () => [],
    onEnter: () => {},
    inherit: () => ({})
  };
}
```

### Updated Demo to Use Real ScriptRuntime
The demo now properly:
- Creates a `ScriptRuntime` instance with `WodScript`
- Displays the actual runtime stack from `scriptRuntime.stack.blocks`
- Shows real `BlockKey` information using `blockId` property
- Handles errors gracefully when compilation fails

### Runtime Stack Visualization Features
- **Stack Depth**: Shows all blocks in the runtime stack from bottom to top
- **Current Block Indicator**: Highlights the top block (current execution context)
- **Block Information**: Displays block ID, depth, and metrics count
- **Real-time Updates**: Stack updates when the script changes

## Stack Management Implementation

### Core Components
1. **RuntimeStack**: Manages the stack of `IRuntimeBlock` instances
2. **ScriptRuntime**: Contains the stack and JIT compiler
3. **JitCompiler**: Creates runtime blocks on demand

### Stack Operations
- `push(block)`: Adds a new block to the top of the stack
- `pop()`: Removes and returns the current block
- `current`: Returns the top block without removing it
- `blocks`: Read-only access to all blocks in the stack

## Validation Checklist
- [x] Complies with [IScriptRuntime](../Core/IScriptRuntime.md) specifications
- [x] Implements [RuntimeStack](../Core/Runtime/Stack.md) interface correctly
- [x] All interfaces match design document requirements
- [x] Workflow follows prescribed stack management patterns
- [x] JitCompiler creates proper root blocks
- [x] Error handling for compilation failures
- [x] Real-time visualization of stack state

## Files Modified
1. `src/runtime/JitCompiler.ts` - Implemented `root()` method
2. `stories/runtime/JitCompilerDemo.tsx` - Complete rewrite to use actual ScriptRuntime
3. `src/runtime/ScriptRuntime.ts` - Already correctly implemented

## Testing
The demo now properly displays:
- Runtime stack with root block when script loads
- Current block information (blockId: 'root')
- Stack depth and metrics
- Error messages if compilation fails
- Real-time updates when script changes

## Usage
Navigate to the Storybook story at `/story/runtime-jitcompiler--basic-compilation` to see the working runtime stack visualization next to the text editor.
