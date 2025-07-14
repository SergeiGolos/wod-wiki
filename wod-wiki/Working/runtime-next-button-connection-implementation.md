---
title: "Runtime Next Button Connection Implementation"
date: 2025-07-13
tags: [runtime, debugging, next-button, event-handling]
related:
  - ./scriptruntime-implementation-assessment.md
  - ./runtime-next-button-implementation-plan.md
  - ../src/runtime/ScriptRuntime.ts
  - ../stories/compiler/JitCompilerDemo.tsx
status: in-progress
---

# Runtime Next Button Connection Implementation

## Overview
This document tracks the implementation of connecting the "Next" button in the JitCompilerDemo to properly drive the ScriptRuntime forward, with comprehensive logging to track event flow through the system.

## Current Implementation Status

### ✅ Completed Changes

1. **Enhanced ScriptRuntime Logging**
   - Added comprehensive logging to `ScriptRuntime.handle()` method
   - Logs event processing, handler execution, and action execution
   - Uses unique emojis and indentation for clear tracking:
     - 🎯 ScriptRuntime operations
     - 🔍 Handler discovery
     - 🔧 Individual handler execution
     - ⚡ Action execution
     - 🏁 Completion markers

2. **Enhanced RuntimeStack Logging**
   - Added logging to `push()` and `pop()` methods
   - Tracks stack depth changes and current block updates
   - Uses 📚 emoji for stack operations

3. **Enhanced RootBlock Implementation**
   - Added comprehensive logging to constructor, tick(), and inherit()
   - Moved NextEvent handling to separate `RootNextHandler` class
   - Uses 🌱 emoji for root block operations

4. **Enhanced RootNextHandler Implementation**
   - Separated NextEvent handling logic into its own class file
   - Implements proper `EventHandler` interface
   - Added script statement tracking with `currentStatementIndex`
   - Accesses runtime context to get script statements
   - Filters for root-level statements (columnStart === 0)
   - Located at `src/runtime/handlers/RootNextHandler.ts`
   - Provides foundation for implementing script compilation logic

5. **Enhanced JitCompiler Root Block Creation**
   - Modified `root()` method to create root block with actual script statements
   - Filters script statements to find root-level ones (no indentation)
   - Passes statement IDs as children to RootBlock constructor
   - Added comprehensive logging for root block creation

6. **Enhanced ScriptRuntime Context Passing**
   - Updated event handler calls to pass runtime context
   - Allows handlers to access script, JIT compiler, and stack
   - Enables handlers to make informed decisions about compilation

4. **Enhanced JitCompilerDemo Initialization**
   - Automatically creates root block if runtime stack is empty
   - Added logging for runtime initialization process
   - Improved next button handler with detailed logging
   - Uses 🎮 emoji for UI operations

### 🔧 Current Event Flow

When the Next button is clicked:

1. **🎮 JitCompilerDemo.handleNextBlock()** - Button click handler
2. **🎯 ScriptRuntime.handle()** - Event processing entry point
3. **🔍 Handler Discovery** - Finds handlers from all stack blocks
4. **🌱 RootNextHandler.handleEvent()** - Dedicated handler for root-level NextEvent processing
5. **⚡ Action Execution** - Executes returned actions
6. **🔄 UI Re-render** - Updates visual state

### 📊 Logging Output Format

The logging uses a hierarchical structure with emojis and indentation:

```
🎮 JitCompilerDemo - Next Button Clicked
  📊 Current runtime state:
    🏗️ Stack depth: 1
    🎯 Current block: root
🎯 ScriptRuntime.handle() - Processing event: NextEvent
  📚 Stack depth: 1
  🎯 Current block: root
  🔍 Found 1 handlers across 1 blocks
    🔧 Handler 1/1: Root Next Handler (RootNextHandler)
🌱 RootNextHandler.handleEvent() - Processing event: NextEvent
  🎯 RootNextHandler handling NextEvent - current statement index: 0
  📚 Found 2 root-level statements
  📝 Next statement to compile: 1 (line 1)
  ⬆️ Incremented statement index to: 1
      ✅ Response - handled: true, shouldContinue: false, actions: 0
      📦 Added 0 actions to queue
      🛑 Handler requested stop - breaking execution chain
  🎬 Executing 0 actions:
🏁 ScriptRuntime.handle() completed for event: NextEvent
  📊 Final stack depth: 1
  🎯 Final current block: root
```

## Next Steps

### 🎯 Immediate Tasks (This Session)

1. **✅ COMPLETED - Enhanced Root Block Creation**
   - ✅ Modified JitCompiler.root() to use actual script statements  
   - ✅ Filters for root-level statements (columnStart === 0)
   - ✅ RootBlock now created with proper children array

2. **✅ COMPLETED - Enhanced Statement Processing**
   - ✅ Added currentStatementIndex tracking in RootNextHandler
   - ✅ Added runtime context passing from ScriptRuntime to handlers
   - ✅ Handler can now access script statements and track progress

3. **🔄 IN PROGRESS - Implement Actual Compilation Logic**
   - The RootNextHandler currently identifies the next statement to compile
   - Need to add logic to use `runtime.jit.compile([nextStatement], runtime)`
   - Need to create and return PushBlockAction to add new blocks to stack

### 🔮 Next Immediate Steps

1. **Create PushBlockAction Class**
   - Create action that compiles statements and pushes blocks to stack
   - Should use JitCompiler to create new runtime blocks
   - Return this action from RootNextHandler when statement needs compilation

2. **Test Full Compilation Flow**
   - Verify NextEvent triggers proper statement compilation
   - Ensure new blocks are pushed onto the stack correctly
   - Test multiple Next button clicks to advance through statements

### 🔮 Future Enhancements

1. **Enhanced Block Types**
   - Add handlers for different block types (Timer, Effort, Group)
   - Implement proper block-specific NextEvent handling
   - Add block completion and pop logic

2. **Script Integration**
   - Connect to actual workout script parsing
   - Implement proper statement-to-block compilation
   - Add support for complex workout structures

3. **Error Handling**
   - Add error handling for compilation failures
   - Implement graceful degradation for invalid scripts
   - Add user feedback for runtime errors

## Technical Notes

### Event Handler Pattern
The current implementation uses the correct `EventHandler` interface:
- `handleEvent(event, context?)` returns `HandlerResponse`
- `HandlerResponse` includes `handled`, `shouldContinue`, and `actions`
- ScriptRuntime properly processes the response chain

### Stack Management
The RuntimeStack properly manages block lifecycle:
- `push()` adds blocks and updates current pointer
- `pop()` removes blocks and updates current pointer
- Logging provides clear visibility into stack operations

### Initialization Pattern
The JitCompilerDemo now properly initializes the runtime:
- Creates root block if stack is empty
- Maintains proper runtime state across re-renders
- Provides comprehensive logging for debugging

## Files Modified

1. `src/runtime/ScriptRuntime.ts` - Enhanced event handling logging + context passing
2. `src/runtime/RuntimeStack.ts` - Added stack operation logging  
3. `src/runtime/blocks/RootBlock.ts` - Enhanced initialization and logging
4. `src/runtime/handlers/RootNextHandler.ts` - New dedicated NextEvent handler with statement tracking
5. `src/runtime/JitCompiler.ts` - Enhanced root() method to use actual script statements
6. `stories/compiler/JitCompilerDemo.tsx` - Enhanced initialization and button handling

## Validation

The logging system now provides complete visibility into:
- ✅ Event flow from UI to runtime blocks
- ✅ Handler discovery and execution
- ✅ Stack state changes
- ✅ Action processing
- ✅ Runtime initialization

Next phase will focus on implementing actual script compilation and block creation logic.
