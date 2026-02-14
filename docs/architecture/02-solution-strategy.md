# Solution Strategy

> **Status**: Draft
> **Last Updated**: 2026-02-14
> **Category**: Architecture Documentation
> **arc42 Section**: 2

## Overview

This document describes the key architectural decisions and solution strategies that shape the WOD Wiki system. Each decision is documented with its rationale, alternatives considered, and trade-offs.

## Strategic Decisions

### 1. Chevrotain Parser Generator

**Decision**: Use Chevrotain for parsing workout scripts instead of hand-written parsers.

**Rationale**:
- Grammar-first approach with better maintainability
- Built-in error recovery and reporting
- Type-safe parser with TypeScript support
- Proven performance for DSL parsing

**Alternatives Considered**:
- **Hand-written recursive descent parser**: More control but higher maintenance
- **PEG.js**: Less type-safe, JavaScript-focused
- **ANTLR**: More powerful but heavyweight for our use case

**Trade-offs**:
- ✅ Better error messages
- ✅ Easier to extend grammar
- ✅ Strong TypeScript integration
- ❌ Additional dependency
- ❌ Learning curve for contributors

**Related**: [ADR-001: Chevrotain Parser](../adr/001-chevrotain-parser.md)

### 2. Stack-Based Runtime Execution

**Decision**: Use a stack-based execution model for workout runtime.

**Rationale**:
- Natural representation of nested workout structures
- Efficient push/pop operations (target: < 1ms)
- Clear execution context (current block is top of stack)
- Enables pause/resume functionality

**Alternatives Considered**:
- **Tree-based execution**: More memory, harder to pause
- **Flat list with indices**: Lost nesting semantics
- **Virtual machine with bytecode**: Over-engineered for use case

**Trade-offs**:
- ✅ Fast block transitions
- ✅ Clear execution model
- ✅ Easy pause/resume
- ❌ Disposal complexity (consumer-managed)
- ❌ Stack depth limits (not an issue in practice)

**Related**: [ADR-002: Stack-Based Runtime](../adr/002-stack-based-runtime.md)

### 3. JIT Compilation with Strategy Pattern

**Decision**: Compile workout scripts to runtime blocks using a pluggable strategy pattern.

**Rationale**:
- Extensibility: New workout types via strategies
- Separation: Parser focuses on syntax, compiler on semantics
- Performance: Pre-compiled blocks ready for execution
- Testability: Strategies can be tested in isolation

**Key Patterns**:
```typescript
// Strategy interface
interface IRuntimeBlockStrategy {
  canHandle(statement: ICodeStatement): boolean;
  compile(statement: ICodeStatement, ctx: ICompilerContext): IRuntimeBlock;
}

// Compiler uses strategies
class JitCompiler {
  registerStrategy(strategy: IRuntimeBlockStrategy): void;
  compile(statements: ICodeStatement[], stack: IRuntimeStack): void;
}
```

**Benefits**:
- Open/Closed Principle: Extend without modifying core
- Single Responsibility: Each strategy handles one concern
- Strategy composition for complex blocks

**Related**: See [Building Blocks](./03-building-blocks.md#jit-compiler)

### 4. Behavior Composition Over Inheritance

**Decision**: Use composable behaviors instead of class inheritance for runtime blocks.

**Rationale**:
- Avoid deep inheritance hierarchies
- Mix and match behaviors as needed
- Better testability with isolated behaviors
- Align with composition over inheritance principle

**Pattern**:
```typescript
// Behaviors are composed, not inherited
const block = new BlockBuilder('timer-workout')
  .asTimer('up')           // Adds TimerBehavior
  .asContainer()           // Adds ChildRunnerBehavior, ChildLoopBehavior
  .withBehavior(new CustomBehavior())
  .build();
```

**Alternatives Considered**:
- **Class inheritance**: `TimerBlock extends BaseBlock`
  - ❌ Rigid hierarchy
  - ❌ Diamond problem with multiple inheritance
- **Mixins**: TypeScript limitations
- **Decorator pattern**: More boilerplate

**Trade-offs**:
- ✅ Flexible composition
- ✅ Better testability
- ✅ No inheritance coupling
- ❌ More objects to manage
- ❌ Behavior ordering matters

**Related**: See [Behavior Patterns](./03-building-blocks.md#behaviors)

### 5. List-Based Memory System

**Decision**: Use list-based memory with tagged locations instead of Map-based memory.

**Rationale**:
- Type-safe fragment collections
- Subscription-based updates for React integration
- Avoid key collision issues
- Better performance for list operations

**Architecture**:
```typescript
interface IMemoryLocation {
  tag: MemoryTag;
  fragments: ICodeFragment[];
  subscribe(callback: MemorySubscriber): () => void;
  update(fragments: ICodeFragment[]): void;
  dispose(): void;
}

type MemoryTag =
  | 'timer'
  | 'round'
  | 'completion'
  | 'display'
  | 'controls'
  | `fragment:${string}`;
```

**Migration Strategy**:
- Dual-write during transition: both Map and List APIs
- Gradual behavior migration
- Eventually remove Map-based API

**Trade-offs**:
- ✅ Type-safe collections
- ✅ No key collisions
- ✅ Subscription pattern for React
- ❌ Migration complexity
- ❌ Dual-write overhead during transition

**Related**: [ADR-003: List-Based Memory](../adr/003-list-based-memory.md)

### 6. Constructor-Based Block Initialization

**Decision**: Initialize runtime blocks in the constructor, not when pushed to stack.

**Rationale**:
- Fail-fast: Errors occur during compilation, not execution
- No half-initialized state
- Stack operations are fast (no initialization overhead)
- Clear separation: compiler initializes, runtime executes

**Pattern**:
```typescript
class RuntimeBlock implements IRuntimeBlock {
  constructor(config: BlockConfig) {
    // All initialization happens here
    this.behaviors = config.behaviors.map(b => new b());
    this.state = { isComplete: false };
    // Block is ready to use
  }
}

// Usage
const block = new RuntimeBlock(config); // Fully initialized
stack.push(block); // Fast, no additional setup
```

**Alternatives Considered**:
- **Lazy initialization on push**: More complex, slower stack operations
- **Two-phase construction**: Awkward API, error-prone

**Trade-offs**:
- ✅ Fail-fast error detection
- ✅ Fast stack operations
- ✅ No partial state
- ❌ Constructor must have all dependencies
- ❌ Cannot defer expensive initialization

**Related**: [ADR-004: Constructor Initialization](../adr/004-constructor-initialization.md)

### 7. Consumer-Managed Disposal

**Decision**: Consumer must explicitly call `dispose()` on popped blocks.

**Rationale**:
- Explicit resource management
- Avoid premature disposal (block might be reused)
- Consumer controls when cleanup happens
- No hidden behavior in stack operations

**Pattern**:
```typescript
// Consumer responsibility
const block = stack.pop();
if (block) {
  // Consumer decides when to dispose
  block.dispose();
}
```

**Alternatives Considered**:
- **Automatic disposal on pop**: Prevents block reuse
- **Reference counting**: Complex, overhead
- **Finalizers**: Not reliable in JavaScript

**Trade-offs**:
- ✅ Explicit control
- ✅ Allows block reuse
- ✅ No hidden behavior
- ❌ Easy to forget
- ❌ Potential memory leaks if not done

**Related**: [ADR-005: Consumer Disposal](../adr/005-consumer-disposal.md)

## Design Patterns

### Strategy Pattern

**Usage**: JIT Compiler with pluggable strategies

**Benefits**:
- Add new workout types without modifying compiler
- Test strategies in isolation
- Compose strategies for complex behaviors

**Example**:
```typescript
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RepStrategy());
compiler.registerStrategy(new ChildrenStrategy());
```

### Builder Pattern

**Usage**: BlockBuilder for fluent block construction

**Benefits**:
- Readable block configuration
- Type-safe builder chain
- Hide complex construction logic

**Example**:
```typescript
new BlockBuilder('workout')
  .withState({ rounds: 3 })
  .asTimer('up')
  .asRepeater(3)
  .asContainer()
  .build();
```

### Observer Pattern

**Usage**: Memory subscription for React updates

**Benefits**:
- Decoupled runtime and UI
- React components subscribe to memory changes
- Automatic cleanup on unmount

**Example**:
```typescript
const location = block.getMemory('timer');
const unsubscribe = location?.subscribe((fragments) => {
  setState(fragments);
});
return unsubscribe; // Cleanup
```

### Composite Pattern

**Usage**: Blocks with children (container blocks)

**Benefits**:
- Uniform treatment of single and composite blocks
- Recursive structure matches workout nesting
- Simplifies tree traversal

## Technology Choices

### React + TypeScript

**Rationale**:
- Type-safe component development
- Large ecosystem and community
- Excellent developer tooling
- Hooks for state management

**Key Features Used**:
- Functional components with hooks
- Context API for global state
- Strict mode for development checks
- Concurrent features for future optimization

### Tailwind CSS

**Rationale**:
- Utility-first approach
- No custom CSS files to maintain
- Consistent design system
- Good tree-shaking for production

**Constraints**:
- No custom CSS allowed
- Must use Tailwind utilities
- Custom components use Tailwind classes

### Bun for Build & Test

**Rationale**:
- Fast package installation
- Built-in test runner
- TypeScript support out of the box
- Single tool for multiple tasks

**Usage**:
- Package management: `bun install`
- Testing: `bun test`
- Script execution: `bun run`

### Storybook

**Rationale**:
- Component documentation
- Isolated development
- Interaction testing
- Visual regression testing

**Usage**:
- Development: `bun run storybook`
- Build: `bun run build-storybook`
- Tests: `bun run test:storybook`

## Performance Strategy

### Performance Goals

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Stack Push | < 1ms | ~0.5ms | ✅ Met |
| Stack Pop | < 1ms | ~0.5ms | ✅ Met |
| Current Block | < 0.1ms | ~0.05ms | ✅ Met |
| Disposal | < 50ms | ~30ms | ✅ Met |
| JIT Compile | < 100ms | ~50ms | ✅ Met |

### Optimization Techniques

**1. Constructor Initialization**
- Avoid lazy initialization overhead
- Fail-fast error detection

**2. Memory Location Pooling**
- Reuse memory location objects
- Reduce GC pressure

**3. Fragment Immutability**
- Fragments are immutable after creation
- Enables React optimizations (memo, shallow compare)

**4. Behavior Ordering**
- Critical behaviors run first (ChildLoopBehavior before ChildRunnerBehavior)
- Minimize wasted work

**5. Disposal Safety**
- Multiple calls to `dispose()` are safe
- Early exit if already disposed

## Extensibility Strategy

### Adding New Workout Types

1. **Create Strategy**: Implement `IRuntimeBlockStrategy`
2. **Define Fragment**: Create typed fragment interface
3. **Build Block**: Use `BlockBuilder` with appropriate behaviors
4. **Register**: Add strategy to compiler
5. **Test**: Use `RuntimeTestBuilder` for integration tests

**Example**:
```typescript
// 1. Strategy
class CustomWorkoutStrategy implements IRuntimeBlockStrategy {
  canHandle(stmt: ICodeStatement): boolean {
    return stmt.type === 'CustomWorkout';
  }

  compile(stmt: ICodeStatement, ctx: ICompilerContext): IRuntimeBlock {
    return new BlockBuilder('custom')
      .withBehavior(new CustomBehavior())
      .build();
  }
}

// 2. Fragment
interface CustomFragment extends ICodeFragment {
  type: FragmentType.Custom;
  data: { /* custom fields */ };
}

// 3. Register
compiler.registerStrategy(new CustomWorkoutStrategy());
```

### Adding New Behaviors

1. **Implement Interface**: Extend `IRuntimeBehavior`
2. **Lifecycle Methods**: Implement `onMount`, `onNext`, `onUnmount`
3. **Use Context**: Access `IBehaviorContext` for runtime operations
4. **Test**: Use `BehaviorTestHarness` for unit tests

**Example**:
```typescript
class CustomBehavior implements IRuntimeBehavior {
  onMount(ctx: IBehaviorContext): void {
    // Initialize
  }

  onNext(ctx: IBehaviorContext): void {
    // Execute
  }

  onUnmount(ctx: IBehaviorContext): void {
    // Cleanup
  }
}
```

## Quality Assurance Strategy

### Testing Approach

**Unit Tests**
- Location: `src/**/*.test.ts`
- Focus: Isolated behaviors, strategies
- Tool: Bun Test with mock harness

**Integration Tests**
- Location: `tests/**/*.test.ts`
- Focus: End-to-end compilation and execution
- Tool: `RuntimeTestBuilder`

**Component Tests**
- Location: `stories/**/*.stories.tsx`
- Focus: React component behavior
- Tool: Storybook with interaction tests

### Test Harness

Provides three test utilities:

1. **BehaviorTestHarness**: Lightweight behavior testing
2. **MockBlock**: Configurable block stub
3. **RuntimeTestBuilder**: Full runtime integration tests

**Example**:
```typescript
const harness = new BehaviorTestHarness()
  .withClock(new Date('2024-01-01'))
  .withMemory('timer', 'test-id', []);

const block = new MockBlock('test', [new TimerBehavior('up')]);
harness.push(block);
harness.mount();
expect(block.getBehavior(TimerBehavior)!.isRunning()).toBe(true);
```

## Security Considerations

### Client-Side Only

- ✅ No server-side attack surface
- ✅ No authentication required
- ✅ No sensitive data stored
- ⚠️ LocalStorage is accessible to scripts

### Data Sanitization

- ✅ Parser validates all input
- ✅ TypeScript prevents type confusion
- ⚠️ No XSS protection needed (no HTML rendering from user input)

### Third-Party Dependencies

- ✅ Minimal dependencies
- ✅ Well-maintained libraries (React, Monaco, Chevrotain)
- ⚠️ Regular dependency updates needed

## Migration Strategy

### Current Migration: Map → List Memory

**Status**: In Progress

**Approach**:
1. Dual-write: Both APIs available
2. Migrate behaviors one-by-one
3. Test after each migration
4. Remove Map-based API when complete

**Progress**:
- ✅ Memory system infrastructure
- ✅ 6 behaviors migrated (Phase 2)
- ⏳ Remaining behaviors pending
- ⏳ Map API removal

## Related Documentation

- [Building Blocks](./03-building-blocks.md) - Component details
- [Runtime View](./04-runtime-view.md) - Execution flows
- [ADRs](../adr/) - Detailed decision records
- [How-To Guides](../how-to/) - Implementation guides

## Summary

The WOD Wiki architecture is built on:

1. **Chevrotain Parser**: Type-safe grammar-first parsing
2. **Stack-Based Runtime**: Efficient execution model
3. **Strategy Pattern**: Extensible compilation
4. **Behavior Composition**: Flexible block construction
5. **List-Based Memory**: Type-safe fragment collections
6. **Constructor Initialization**: Fail-fast error detection
7. **Consumer Disposal**: Explicit resource management

These decisions prioritize:
- **Extensibility**: Easy to add new features
- **Performance**: Sub-millisecond operations
- **Type Safety**: Strict TypeScript everywhere
- **Testability**: Isolated, composable components

---

**Previous**: [← Context and Scope](./01-context-and-scope.md) | **Next**: [Building Blocks →](./03-building-blocks.md)
