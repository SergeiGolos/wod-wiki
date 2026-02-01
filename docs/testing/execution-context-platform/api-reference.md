# API Reference: ExecutionContext Testing Platform

Complete API documentation for all testing platform components.

## Table of Contents

- [ExecutionContextTestHarness](#executioncontexttestharness)
- [ExecutionContextTestBuilder](#executioncontexttestbuilder)
- [MockJitCompiler](#mockjitcompiler)
- [Factory Methods](#factory-methods)
- [Types](#types)

---

## ExecutionContextTestHarness

Main test harness with action/event recording and clock control.

### Constructor

```typescript
constructor(config?: HarnessConfig)
```

**Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config.clockTime` | `Date` | `new Date()` | Initial clock time |
| `config.maxDepth` | `number` | `20` | Max ExecutionContext iterations |
| `config.strategies` | `IRuntimeBlockStrategy[]` | `[]` | JIT strategies to register |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `runtime` | `ScriptRuntime` | The ScriptRuntime instance being tested |
| `mockJit` | `MockJitCompiler` | Mock JIT compiler for configuration |
| `clock` | `MockClock` | Controllable test clock with `advance()` and `setTime()` |
| `stack` | `RuntimeStack` | Runtime stack instance |
| `eventBus` | `EventBus` | Event bus instance |
| `actionExecutions` | `readonly ActionExecution[]` | All recorded action executions |
| `eventDispatches` | `readonly EventDispatch[]` | All recorded event dispatches |

### Execution Methods

#### `executeAction(action: IRuntimeAction): void`

Execute an action through the runtime and record execution details.

```typescript
harness.executeAction({
  type: 'test-action',
  do: (runtime) => { /* action logic */ }
});
```

#### `dispatchEvent(event: IEvent): void`

Dispatch an event through the event bus.

```typescript
harness.dispatchEvent({
  name: 'timer:complete',
  timestamp: new Date(),
  data: { blockId: 'timer-1' }
});
```

### Query Methods

#### `getActionsByType(type: string): ActionExecution[]`

Get all action executions of a specific type.

```typescript
const timerActions = harness.getActionsByType('timer:start');
```

#### `wasActionExecuted(type: string): boolean`

Check if an action of the given type was executed.

```typescript
expect(harness.wasActionExecuted('mount')).toBe(true);
```

#### `getActionsByTurn(turnId: number): ActionExecution[]`

Get all action executions from a specific turn.

```typescript
const turn1Actions = harness.getActionsByTurn(1);
```

#### `getEventsByName(name: string): EventDispatch[]`

Get all event dispatches with a specific name.

```typescript
const nextEvents = harness.getEventsByName('next');
```

#### `wasEventDispatched(name: string): boolean`

Check if an event with the given name was dispatched.

```typescript
expect(harness.wasEventDispatched('timer:complete')).toBe(true);
```

### Time Control Methods

#### `advanceClock(ms: number): this`

Advance the mock clock by the specified milliseconds.

```typescript
harness.advanceClock(5000); // Advance 5 seconds
```

#### `setClock(time: Date): this`

Set the mock clock to a specific time.

```typescript
harness.setClock(new Date('2024-01-01T12:05:00Z'));
```

### Convenience Methods

#### `pushAndMount(block: IRuntimeBlock): this`

Push block to stack and mount it in one call.

```typescript
harness.pushAndMount(new MockBlock('timer', [behavior]));
```

#### `executeAndAdvance(action: IRuntimeAction, ms: number): this`

Execute action and advance clock in one call.

```typescript
harness.executeAndAdvance({ type: 'tick', do: () => {} }, 1000);
```

#### `dispatchAndGetActions(event: IEvent): IRuntimeAction[]`

Dispatch event and return resulting actions.

```typescript
const actions = harness.dispatchAndGetActions(new NextEvent());
```

#### `expectActionCount(type: string, count: number): void`

Assert action was executed exactly N times. Throws if mismatch.

```typescript
harness.expectActionCount('tick', 5);
```

#### `expectActionAtIteration(type: string, iteration: number): void`

Assert action was executed at specific iteration. Throws if not found.

```typescript
harness.expectActionAtIteration('mount', 1);
```

#### `getLastAction(type: string): ActionExecution | undefined`

Get most recent action execution of a specific type.

```typescript
const lastTick = harness.getLastAction('tick');
```

#### `nextTurn(): this`

Force a new turn boundary by executing a no-op action.

```typescript
harness.nextTurn();
```

### Cleanup Methods

#### `clearRecordings(): void`

Clear all recordings and reset counters.

```typescript
beforeEach(() => harness.clearRecordings());
```

#### `dispose(): void`

Dispose of the runtime and clean up resources.

```typescript
afterEach(() => harness.dispose());
```

#### `isComplete(): boolean`

Check if the runtime stack is empty.

```typescript
expect(harness.isComplete()).toBe(true);
```

---

## ExecutionContextTestBuilder

Fluent builder for creating configured test harnesses.

### Methods

All methods return `this` for method chaining.

#### `withClock(time: Date): this`

Set initial clock time.

```typescript
builder.withClock(new Date('2024-01-01T12:00:00Z'))
```

#### `withMaxDepth(depth: number): this`

Set max ExecutionContext iterations.

```typescript
builder.withMaxDepth(50)
```

#### `withStrategies(...strategies: IRuntimeBlockStrategy[]): this`

Register JIT compilation strategies.

```typescript
builder.withStrategies(new TimerStrategy(), new LoopStrategy())
```

#### `whenCompiling(predicate, blockOrFactory, priority?): this`

Add custom compilation matcher.

```typescript
builder.whenCompiling(
  (stmts) => stmts.some(s => s.hasFragment('timer')),
  new MockBlock('timer', []),
  10 // optional priority
)
```

#### `whenTextContains(text, blockOrFactory, priority?): this`

Add text-based compilation matcher.

```typescript
builder.whenTextContains('10:00', timerBlock)
```

#### `whenStatementIds(ids, blockOrFactory, priority?): this`

Add ID-based compilation matcher.

```typescript
builder.whenStatementIds([1, 2, 3], containerBlock)
```

#### `withDefaultBlock(block: IRuntimeBlock): this`

Set default block for unmatched compilations.

```typescript
builder.withDefaultBlock(fallbackBlock)
```

#### `withBlocks(...blocks: IRuntimeBlock[]): this`

Push blocks to stack on build.

```typescript
builder.withBlocks(parentBlock, childBlock)
```

#### `onEvent(eventName, handler, ownerId?): this`

Register event handler with global scope.

```typescript
builder.onEvent('next', nextHandler, 'test-owner')
```

#### `build(): ExecutionContextTestHarness`

Build the configured harness.

```typescript
const harness = builder.build();
```

---

## MockJitCompiler

Mock JIT compiler extending real JitCompiler with recording and matching.

### Configuration Methods

#### `whenMatches(predicate, blockOrFactory, priority?): this`

Register a predicate-based matcher.

```typescript
mockJit.whenMatches(
  (stmts, runtime) => stmts.length > 0,
  new MockBlock('matched', []),
  10
)
```

#### `whenTextContains(text, blockOrFactory, priority?): this`

Register a text-based matcher.

```typescript
mockJit.whenTextContains('timer', timerBlock)
```

#### `withDefaultBlock(block: IRuntimeBlock): this`

Set default block for unmatched compilations.

```typescript
mockJit.withDefaultBlock(fallbackBlock)
```

### Recording Access

#### `compileCalls: readonly CompileCall[]`

All recorded compile() calls.

#### `lastCompileCall: CompileCall | undefined`

Most recent compile() call.

### Query Methods

#### `wasCompiled(predicate: (call: CompileCall) => boolean): boolean`

Check if any compilation matches predicate.

```typescript
mockJit.wasCompiled(c => c.statements.some(s => s.id === 1))
```

#### `getCompiledStatementIds(): number[]`

Get all statement IDs that were compiled.

```typescript
const ids = mockJit.getCompiledStatementIds();
```

#### `clearCalls(): void`

Clear all recorded calls.

```typescript
mockJit.clearCalls();
```

---

## Factory Methods

### `createTimerTestHarness(config?): ExecutionContextTestHarness`

Create harness for timer behavior testing.

```typescript
const harness = createTimerTestHarness({
  clockTime: new Date('2024-01-01T12:00:00Z'),
  maxDepth: 20
});
```

### `createBehaviorTestHarness(behavior, config?): ExecutionContextTestHarness`

Create harness with behavior pre-mounted.

```typescript
const harness = createBehaviorTestHarness(new TimerBehavior('up'), {
  clockTime: new Date(),
  blockId: 'test-timer'
});
```

### `createCompilationTestHarness(strategies, config?): ExecutionContextTestHarness`

Create harness for JIT compilation testing.

```typescript
const harness = createCompilationTestHarness([new TimerStrategy()]);
```

### `createBasicTestHarness(config?): ExecutionContextTestHarness`

Create minimal harness with optional blocks.

```typescript
const harness = createBasicTestHarness({
  withTimerBlock: true,
  withLoopBlock: true
});
```

### `createEventTestHarness(handlers, config?): ExecutionContextTestHarness`

Create harness with event handlers.

```typescript
const harness = createEventTestHarness({
  'next': { id: 'h1', name: 'H1', handler: () => [] }
});
```

---

## Types

### ActionExecution

```typescript
interface ActionExecution {
  action: IRuntimeAction;
  timestamp: Date;
  iteration: number;
  turnId: number;
}
```

### EventDispatch

```typescript
interface EventDispatch {
  event: IEvent;
  timestamp: Date;
  resultingActions: IRuntimeAction[];
  turnId: number;
}
```

### HarnessConfig

```typescript
interface HarnessConfig {
  clockTime?: Date;
  maxDepth?: number;
  strategies?: IRuntimeBlockStrategy[];
}
```

### CompileCall

```typescript
interface CompileCall {
  statements: CodeStatement[];
  runtime: IScriptRuntime;
  timestamp: Date;
  result: IRuntimeBlock | undefined;
}
```

### BlockMatcher

```typescript
interface BlockMatcher {
  predicate: (statements: CodeStatement[], runtime: IScriptRuntime) => boolean;
  blockOrFactory: IRuntimeBlock | ((statements, runtime) => IRuntimeBlock);
  priority: number;
}
```
