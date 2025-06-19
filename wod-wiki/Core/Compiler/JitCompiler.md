Just-In-Time Compiler for Runtime Blocks that compiles JitStatement nodes into executable IRuntimeBlock instances on demand. Serves as the central compilation engine coordinating fragment compilation, strategy management, and block creation in the Wod.Wiki runtime system.

## Original Location
`src/core/runtime/RuntimeJit.ts`

## Properties

### script: RuntimeScript
```typescript
public script: RuntimeScript
```
The runtime script containing the workout definition and statement hierarchy.

### strategyManager: RuntimeJitStrategies
```typescript
private strategyManager: RuntimeJitStrategies
```
Strategy manager for selecting appropriate block compilation strategies based on statement characteristics.

### fragmentCompiler: FragmentCompilationManager
```typescript
private fragmentCompiler: FragmentCompilationManager
```
Manager for compiling code fragments into runtime metrics before block creation.

### handlers: EventHandler[]
Array of event handlers for processing runtime events:
- **PushActionHandler** - Action queue management
- **RunHandler** - Block execution events
- **TickHandler** - Timer tick processing
- **NextStatementHandler** - Statement progression
- **StartHandler** - Runtime startup
- **StopHandler** - Runtime shutdown
- **ResetHandler** - Runtime reset
- **EndHandler** - Workout completion
- **SoundHandler** - Audio feedback
- **SkipHandler** - Skip functionality

## Methods

### constructor(script: RuntimeScript)
Initializes the JIT compiler with a runtime script and sets up strategy management and fragment compilation.

### idle(runtime: ITimerRuntime): IRuntimeBlock
Creates an idle runtime block for when the system is not actively executing.

**Returns:** New [[IdleRuntimeBlock]] instance

### end(runtime: ITimerRuntime): IRuntimeBlock
Creates a completion block for when workout execution is finished.

**Returns:** New [[DoneRuntimeBlock]] instance

### root(runtime: ITimerRuntime): IRuntimeBlock
Creates the root runtime block that serves as the top-level execution container.

**Returns:** New [[RootBlock]] instance with the script's root statements

### registerStrategy(strategy: IRuntimeBlockStrategy): void
Registers a custom block compilation strategy with the strategy manager.

**Parameters:**
- `strategy` - The runtime block strategy to register

### compile(node: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined
Compiles an array of JitStatement nodes into an executable runtime block using the two-phase compilation process.

**Parameters:**
- `node` - Array of JitStatement nodes to compile
- `runtime` - Timer runtime instance for context

**Returns:** Compiled runtime block or `undefined` if compilation fails

**Compilation Process:**
1. **Fragment Compilation**: Each statement's fragments are compiled into RuntimeMetric objects
2. **Context Creation**: Compilation context is created with runtime and block state
3. **Strategy Selection**: Strategy manager selects appropriate compilation strategy
4. **Block Creation**: Selected strategy creates the runtime block with compiled metrics

## Compilation Pipeline

### Phase 1: Fragment Compilation
```typescript
const metric = this.fragmentCompiler.compileStatementFragments(statement, context);
```
- Compiles each statement's fragments into structured metrics
- Provides rich compilation context with runtime and block state
- Merges fragment data into unified metric objects

### Phase 2: Block Creation
```typescript
return this.strategyManager.compile(compiledMetrics, node, runtime);
```
- Uses strategy pattern to select appropriate block type
- Passes pre-compiled metrics and legacy sources to strategy
- Creates executable runtime block with proper metric integration

## Compilation Context

The JIT provides rich context for compilation including:

```typescript
const context = {
  runtimeState: {
    isActive: false,
    isPaused: false,
    elapsedTime: 0,
    currentRep: 1,
    currentRound: 1
  },
  blockContext: {
    blockKey: new BlockKey(),
    childBlocks: [],
    isRepeating: false,
    iterationCount: 0
  },
  parentMetrics: [],
  executionDepth: 0,
  currentTime: 0,
  currentRound: 1
};
```

## Relationships

- Manages: [[RuntimeJitStrategies]] for strategy coordination
- Manages: [[FragmentCompilationManager]] for fragment processing
- Creates: [[../ICodeBlock]] implementations via strategies
- Processes: [[JitStatement]] arrays from parser
- Coordinates: Event handling through [[EventHandler]] array

## Usage Examples

```typescript
// Basic compilation
const jit = new RuntimeJit(script);
const block = jit.compile(statements, runtime);

// Custom strategy registration
jit.registerStrategy(new CustomStrategy());

// Special block creation
const idleBlock = jit.idle(runtime);
const rootBlock = jit.root(runtime);
```

## Migration Notes

**Phase 4**: Updated to support two-phase compilation where fragments are compiled into metrics before block creation, enabling separation of concerns and better testing while maintaining backward compatibility with legacy JitStatement sources.

## Architecture Benefits

1. **Separation of Concerns**: Fragment compilation separate from block creation
2. **Strategy Pattern**: Extensible block creation via pluggable strategies  
3. **Rich Context**: Comprehensive compilation context for informed decisions
4. **Event Integration**: Built-in event handler management
5. **Testability**: Each phase can be tested independently