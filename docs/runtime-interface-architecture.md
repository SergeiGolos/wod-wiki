# Runtime Interface Architecture Summary

## Executive Summary

The WOD Wiki runtime system is a sophisticated, behavior-based architecture that provides just-in-time compilation, stack-based execution, and memory management for workout scripts. The system follows a pattern of constructor-based initialization and consumer-managed resource disposal, providing high performance and explicit lifecycle management.

## Core Runtime Interfaces

### 1. IRuntimeBlock - Central Execution Unit

**Location**: `src/runtime/IRuntimeBlock.ts`

The primary interface for all executable blocks in the runtime system. Implements a two-phase lifecycle pattern:

- **Constructor-Based Initialization**: Blocks are fully initialized during construction, not when pushed to the stack
- **Consumer-Managed Disposal**: When blocks are popped, consumers must explicitly call `dispose()` for resource cleanup

**Key Methods**:
- `push(): IRuntimeAction[]` - Called when block is added to runtime stack
- `next(): IRuntimeAction[]` - Called when child blocks complete execution
- `pop(): IRuntimeAction[]` - Called when block is removed from stack
- `dispose(): void` - Critical cleanup method (consumer responsibility)

**Performance Requirements**: All lifecycle methods must complete within 50ms for optimal performance.

### 2. RuntimeStack - Execution Context Manager

**Location**: `src/runtime/RuntimeStack.ts`

Manages the hierarchical execution context using a stack-based approach:

- **Simple Operations**: Push/pop operations avoid lifecycle method calls for performance
- **Multiple Views**: Provides both top-first and bottom-first stack perspectives
- **Validation**: Integrated stack validation for push/pop operations
- **Performance Targets**: <1ms for push/pop, <0.1ms for current() access

**Key Properties**:
- `blocks: readonly IRuntimeBlock[]` - Stack from top to bottom
- `current: IRuntimeBlock | undefined` - Currently executing block
- `blocksBottomFirst: readonly IRuntimeBlock[]` - Stack from root to current

### 3. IScriptRuntime - Central Runtime Interface

**Location**: `src/runtime/IScriptRuntime.ts`

The main runtime context that provides access to all runtime subsystems:

```typescript
export interface IScriptRuntime {
    readonly script: WodScript;           // Source workout script
    readonly memory: IRuntimeMemory;      // Memory management system
    readonly stack: RuntimeStack;         // Execution stack
    readonly jit: JitCompiler;           // Just-in-time compiler

    handle(event: IEvent): void;         // Event handling
}
```

## JIT Compiler Architecture

### 1. JitCompiler - Strategy-Based Compilation Engine

**Location**: `src/runtime/JitCompiler.ts`

Implements the Strategy pattern for flexible block compilation:

- **Strategy Registration**: Multiple compilation strategies can be registered
- **Pattern Matching**: Each strategy determines if it can handle specific statement patterns
- **Delegation**: Compilation is delegated to the first matching strategy

**Core Methods**:
- `registerStrategy(strategy: IRuntimeBlockStrategy): void` - Add compilation strategy
- `compile(nodes: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined` - Compile statements to executable block

### 2. IRuntimeBlockStrategy - Compilation Strategy Interface

**Location**: `src/runtime/IRuntimeBlockStrategy.ts`

Defines the contract for block compilation strategies:

```typescript
export interface IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean;
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock;
}
```

**Available Strategies** (from `src/runtime/strategies.ts`):
- **EffortStrategy**: Default strategy for repetition-based workouts
- **TimerStrategy**: Simple timer-based workouts (time > 0, no rounds)
- **RoundsStrategy**: Pure rounds without timer components
- **TimeBoundedRoundsStrategy**: Timed rounds (rounds > 1 AND time > 0)
- **CountdownRoundsStrategy**: Countdown-based rounds (rounds > 1 AND time < 0)

## Memory Management System

### 1. IRuntimeMemory - Memory Allocation Interface

**Location**: `src/runtime/IRuntimeMemory.ts`

Provides type-safe memory management independent of the execution stack:

```typescript
export interface IRuntimeMemory {
    allocate<T>(type: string, ownerId: string, initialValue?: T, visibility?: 'public' | 'private'): TypedMemoryReference<T>;
    get<T>(reference: TypedMemoryReference<T>): T | undefined;
    set<T>(reference: TypedMemoryReference<T>, value: T): void;
    search(criteria: Nullable<IMemoryReference>): IMemoryReference[];
    release(reference: IMemoryReference): void;
}
```

**Features**:
- **Typed References**: Type-safe memory access via `TypedMemoryReference<T>`
- **Automatic Cleanup**: Memory automatically released when associated stack items are removed
- **Visibility Control**: Public/private memory access levels
- **Search Capability**: Find memory references by criteria

### 2. IMemoryReference - Memory Reference Interface

**Location**: `src/runtime/IMemoryReference.ts`

Provides indirect access to memory locations without direct coupling:

```typescript
export interface IMemoryReference {
    readonly id: string;
    readonly ownerId: string;
    readonly type: string;
    readonly visibility: 'public' | 'private';
}
```

The `TypedMemoryReference<T>` class provides type-safe getter/setter methods for memory values.

## Event System

### 1. IEvent - Base Event Interface

**Location**: `src/runtime/IEvent.ts`

Simple event structure with type, timestamp, and optional data:

```typescript
export interface IEvent {
    name: string;
    timestamp: Date;
    data?: any;
}
```

### 2. IEventHandler - Event Handler Interface

**Location**: `src/runtime/IEventHandler.ts`

Defines contract for event processing:

```typescript
export interface IEventHandler {
    readonly id: string;
    readonly name: string;
    handler(event: IEvent, runtime: IScriptRuntime): EventHandlerResponse;
}
```

**Response Pattern**: Returns `EventHandlerResponse` indicating handling state, continuation, and actions to perform.

## Action System

### IRuntimeAction - Executable Actions Interface

**Location**: `src/runtime/IRuntimeAction.ts`

Defines executable actions returned by runtime lifecycle methods:

```typescript
export interface IRuntimeAction {
    type: string;
    target?: string;
    payload?: unknown;
    do(runtime: IScriptRuntime): void;
}
```

**Usage**: Actions are returned by `push()`, `next()`, and `pop()` methods to define subsequent execution steps.

## Behavior System

### IRuntimeBehavior - Composable Behaviors Interface

**Location**: `src/runtime/IRuntimeBehavior.ts`

Provides composable, optional behavior hooks for runtime blocks:

```typescript
export interface IRuntimeBehavior {
    onPush?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
    onNext?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
    onPop?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[];
}
```

**Available Behaviors**:
- **ChildAdvancementBehavior**: Manages child block execution sequencing
- **LazyCompilationBehavior**: Compiles child blocks on-demand
- **CompletionTrackingBehavior**: Tracks block completion state
- **ParentContextBehavior**: Maintains parent-child relationships

## Fragment System

### Code Fragment Types

**Location**: `src/fragments/`

Parsed components that represent specific workout metrics:

- **TimerFragment**: Time durations with days/hours/minutes/seconds decomposition
- **RepFragment**: Repetition counts
- **EffortFragment**: Effort level descriptors
- **DistanceFragment**: Distance measurements
- **ResistanceFragment**: Resistance levels
- **RoundsFragment**: Round counts
- **IncrementFragment**: Increment values
- **LapFragment**: Lap markers
- **ActionFragment**: Action commands
- **TextFragment**: Text annotations

All fragments implement `ICodeFragment` with:
- `value`: Numeric or string value
- `type`: Fragment type identifier
- `fragmentType`: Enum for fragment categorization

## RuntimeBlock Implementation

### Concrete Block Class

**Location**: `src/runtime/RuntimeBlock.ts`

The main concrete implementation of `IRuntimeBlock`:

- **Behavior Composition**: Combines multiple `IRuntimeBehavior` instances
- **Memory Management**: Provides `allocate<T>()` method for type-safe memory allocation
- **Factory Methods**: `withAdvancedBehaviors()` creates blocks with full behavior stack
- **Resource Cleanup**: Automatic cleanup of allocated memory and behavior disposal

**Architecture Pattern**: Uses composition over inheritance, applying behaviors as mixins to extend functionality.

## Interface Relationships and Data Flow

### Compilation Flow
1. **Script Runtime** receives `CodeStatement[]` from parser
2. **JitCompiler** iterates through registered strategies
3. **Strategy** matches and compiles statements to `IRuntimeBlock`
4. **RuntimeBlock** created with appropriate behaviors
5. **RuntimeStack.push()** adds block to execution context

### Execution Flow
1. **RuntimeStack.push()** → `IRuntimeBlock.push()` → Behavior `onPush()` hooks
2. **Runtime execution** → `IRuntimeBlock.next()` → Behavior `onNext()` hooks
3. **Completion handling** → `IRuntimeBlock.pop()` → Behavior `onPop()` hooks
4. **Consumer responsibility** → `IRuntimeBlock.dispose()` → Memory cleanup

### Memory Flow
1. **RuntimeBlock.allocate()** → `IRuntimeMemory.allocate()` → `TypedMemoryReference<T>`
2. **Memory access** → `TypedMemoryReference.get()/set()` → Type-safe value operations
3. **Automatic cleanup** → Stack pop → Memory release

## Key Design Patterns

- **Strategy Pattern**: JitCompiler uses strategies for flexible compilation
- **Composition Pattern**: RuntimeBlock combines behaviors for modularity
- **Observer Pattern**: Event handlers respond to runtime events
- **Command Pattern**: IRuntimeAction encapsulates executable operations
- **Factory Pattern**: RuntimeBlock.withAdvancedBehaviors() for complex object creation

## Performance Characteristics

- **Stack Operations**: <1ms for push/pop operations
- **Current Access**: <0.1ms for current block retrieval
- **Lifecycle Methods**: <50ms completion requirement
- **Memory Management**: Automatic cleanup with manual disposal option
- **Compilation**: Just-in-time compilation with strategy selection

This architecture provides a flexible, performant, and maintainable system for executing workout scripts with clear separation of concerns and explicit lifecycle management.