# Building Blocks

> **Status**: Draft
> **Last Updated**: 2026-02-14
> **Category**: Architecture Documentation
> **arc42 Section**: 3

## Overview

This document describes the key building blocks (components, modules, subsystems) of the WOD Wiki system. Each building block is documented with its responsibilities, interfaces, and relationships.

## System Decomposition

```
┌────────────────────────────────────────────────────────────┐
│                      WOD Wiki System                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Parser     │───▶│   Compiler   │───▶│   Runtime    │ │
│  │  Subsystem   │    │  Subsystem   │    │  Subsystem   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         ▼                    ▼                    ▼         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Fragment   │    │   Strategy   │    │   Behavior   │ │
│  │   System     │    │   System     │    │   System     │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Editor     │    │    Memory    │    │      UI      │ │
│  │ Integration  │    │   System     │    │  Components  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

## Core Subsystems

### Parser Subsystem

**Location**: `src/parser/`

**Responsibility**: Transform workout script text into Abstract Syntax Tree (AST).

**Key Components**:
- `timer.tokens.ts` - Lexer token definitions
- `timer.parser.ts` - Chevrotain parser rules
- `timer.visitor.ts` - AST visitor for semantic analysis
- `WorkoutParser.ts` - High-level parser facade

**Dependencies**:
- Chevrotain 11.x (parser generator library)

**Exports**:
```typescript
// Main export
function parseWorkoutScript(script: string): ICodeStatement[]

// Types
interface ICodeStatement {
  id: string;
  type: string;
  fragments: ICodeFragment[];
  children?: ICodeStatement[];
}
```

**Example**:
```typescript
import { parseWorkoutScript } from '@/parser';

const script = '10:00 Run\n3 Rounds:\n  10 Pushups';
const statements = parseWorkoutScript(script);
// Returns: [TimerStatement, RoundsStatement]
```

**Design Notes**:
- Immutable AST: Parser output is read-only
- Error recovery: Parser continues after syntax errors
- Position tracking: Each statement has source location
- Grammar-first: Changes start with grammar modifications

### Compiler Subsystem

**Location**: `src/runtime/compiler/`

**Responsibility**: Transform AST into executable runtime blocks using JIT compilation.

**Key Components**:

#### JitCompiler

**File**: `src/runtime/compiler/JitCompiler.ts`

**Interface**:
```typescript
class JitCompiler {
  registerStrategy(strategy: IRuntimeBlockStrategy): void;
  compile(statements: ICodeStatement[], stack: IRuntimeStack): void;
}
```

**Responsibilities**:
- Strategy registration and management
- Statement-to-block transformation
- Fragment compilation
- Metric inheritance propagation

**Usage**:
```typescript
const compiler = new JitCompiler();
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RepStrategy());
compiler.compile(statements, runtime);
```

#### BlockBuilder

**File**: `src/runtime/compiler/BlockBuilder.ts`

**Interface**:
```typescript
class BlockBuilder {
  constructor(blockId: string);
  withState(state: Partial<IRuntimeBlockState>): this;
  withBehavior(behavior: IRuntimeBehavior): this;
  asTimer(direction: 'up' | 'down'): this;
  asRepeater(maxRounds: number): this;
  asContainer(): this;
  build(): IRuntimeBlock;
}
```

**Responsibilities**:
- Fluent API for block construction
- Aspect composers (timer, repeater, container)
- Behavior ordering enforcement
- Block validation

**Example**:
```typescript
const block = new BlockBuilder('workout-id')
  .withState({ rounds: 3 })
  .asTimer('up')
  .asRepeater(3)
  .asContainer()
  .build();
```

#### Strategies

**Location**: `src/runtime/compiler/strategies/`

**Interface**:
```typescript
interface IRuntimeBlockStrategy {
  canHandle(statement: ICodeStatement): boolean;
  compile(statement: ICodeStatement, ctx: ICompilerContext): IRuntimeBlock;
}
```

**Built-in Strategies**:
- **TimerStrategy**: Compiles timer blocks (10:00, 5:30)
- **RepStrategy**: Compiles rep-based blocks (10 Pushups)
- **RoundsStrategy**: Compiles round containers (3 Rounds)
- **ChildrenStrategy**: Adds child management to containers
- **GenericTimerStrategy**: Base for timer-based workouts
- **GenericLoopStrategy**: Base for loop-based workouts

**Strategy Pattern**:
```typescript
class TimerStrategy implements IRuntimeBlockStrategy {
  canHandle(stmt: ICodeStatement): boolean {
    return stmt.type === 'timer';
  }

  compile(stmt: ICodeStatement, ctx: ICompilerContext): IRuntimeBlock {
    return new BlockBuilder(stmt.id)
      .asTimer(stmt.direction)
      .build();
  }
}
```

### Runtime Subsystem

**Location**: `src/runtime/`

**Responsibility**: Execute compiled blocks with stack-based execution model.

#### RuntimeStack

**File**: `src/runtime/RuntimeStack.ts`

**Interface**:
```typescript
interface IRuntimeStack {
  push(block: IRuntimeBlock): void;
  pop(): IRuntimeBlock | undefined;
  current(): IRuntimeBlock | undefined;
  blocks: IRuntimeBlock[]; // Top-first (leaf-first) array
  depth: number;
}
```

**Responsibilities**:
- Block lifecycle management (push/pop)
- Current block tracking
- Stack depth monitoring

**Performance Targets**:
- `push()`: < 1ms
- `pop()`: < 1ms
- `current()`: < 0.1ms

**Design Notes**:
- Constructor-based initialization: Blocks initialize before push
- Consumer-managed disposal: Caller must dispose popped blocks
- Top-first ordering: `blocks[0]` is current, `blocks[n-1]` is root

#### RuntimeBlock

**File**: `src/runtime/blocks/RuntimeBlock.ts`

**Interface**:
```typescript
interface IRuntimeBlock {
  blockId: string;
  blockType: string;
  state: IRuntimeBlockState;
  behaviors: IRuntimeBehavior[];

  mount(): void;
  next(): void;
  unmount(): void;
  dispose(): void;

  getMemory(tag: MemoryTag): IMemoryLocation | undefined;
  pushMemory(tag: MemoryTag): IMemoryLocation;
}
```

**Responsibilities**:
- Behavior coordination
- State management
- Lifecycle execution (mount → next → unmount)
- Memory location management

**Lifecycle**:
```
constructor() → push() → mount() → next()* → unmount() → pop() → dispose()
     ↑                      ↑         ↑          ↑          ↑         ↑
   Compiler          Stack Push    Execute    Complete  Stack Pop  Consumer
```

### Behavior System

**Location**: `src/runtime/behaviors/`

**Responsibility**: Composable units of runtime functionality.

**Interface**:
```typescript
interface IRuntimeBehavior {
  onMount(ctx: IBehaviorContext): void;
  onNext(ctx: IBehaviorContext): void;
  onUnmount(ctx: IBehaviorContext): void;
}
```

**Built-in Behaviors**:

| Behavior | Purpose | Used By |
|----------|---------|---------|
| `TimerBehavior` | Track elapsed time | Timer blocks |
| `TimerInitBehavior` | Initialize timer memory | Timer blocks |
| `DisplayInitBehavior` | Initialize display fragments | All blocks |
| `ButtonBehavior` | Render control buttons | Interactive blocks |
| `ChildRunnerBehavior` | Execute child blocks | Container blocks |
| `ChildLoopBehavior` | Reset child index | Loop containers |
| `RestBlockBehavior` | Handle rest periods | Rest blocks |
| `RepCounterBehavior` | Track repetitions | Rep blocks |
| `RoundBehavior` | Track round progress | Round containers |

**Behavior Ordering**:

Critical ordering constraints:
1. `ChildLoopBehavior` before `ChildRunnerBehavior`
2. `RestBlockBehavior` before `ChildRunnerBehavior`
3. Init behaviors before display behaviors

**Example**:
```typescript
class TimerBehavior implements IRuntimeBehavior {
  private startTime: number | null = null;

  onMount(ctx: IBehaviorContext): void {
    this.startTime = ctx.clock.now().getTime();
  }

  onNext(ctx: IBehaviorContext): void {
    const elapsed = ctx.clock.now().getTime() - this.startTime!;
    // Update timer memory
  }

  onUnmount(ctx: IBehaviorContext): void {
    this.startTime = null;
  }
}
```

### Memory System

**Location**: `src/runtime/memory/`

**Responsibility**: Type-safe fragment storage with subscription support.

**Key Components**:

#### MemoryLocation

**File**: `src/runtime/memory/MemoryLocation.ts`

**Interface**:
```typescript
interface IMemoryLocation {
  tag: MemoryTag;
  fragments: ICodeFragment[];
  subscribe(callback: MemorySubscriber): () => void;
  update(fragments: ICodeFragment[]): void;
  dispose(): void;
}
```

**MemoryTag Types**:
```typescript
type MemoryTag =
  | 'timer'         // Timer fragments
  | 'round'         // Round fragments
  | 'completion'    // Completion status
  | 'display'       // Display fragments
  | 'controls'      // Control buttons
  | `fragment:${string}`; // Custom fragments
```

**Responsibilities**:
- Fragment collection storage
- Change notification via subscriptions
- Lifecycle management (dispose notifies with `[]`)

**Usage**:
```typescript
const location = block.pushMemory('timer');
location.update([timerFragment]);

const unsubscribe = location.subscribe((fragments) => {
  console.log('Timer updated:', fragments);
});

// Cleanup
location.dispose(); // Subscribers notified with []
unsubscribe(); // Unsubscribe
```

#### IBehaviorContext

**File**: `src/runtime/contracts/IBehaviorContext.ts`

**Interface**:
```typescript
interface IBehaviorContext {
  // Block access
  block: IRuntimeBlock;
  stack: IRuntimeStack;

  // Memory (new list-based API)
  pushMemory(tag: MemoryTag): IMemoryLocation;
  updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void;

  // Memory (legacy Map-based API)
  setMemory(key: string, value: any): void;
  getMemory(key: string): any;

  // Events
  emit(event: IEvent): void;

  // Time
  clock: IClock;
}
```

### Fragment System

**Location**: `src/fragments/`

**Responsibility**: Type-safe data structures for workout metrics and display.

**Base Interface**:
```typescript
interface ICodeFragment {
  type: FragmentType;
  origin: FragmentOrigin;
  category: FragmentCategory;
}
```

**Fragment Types**:
- `FragmentType.Timer` - Time-based fragments
- `FragmentType.Rep` - Repetition fragments
- `FragmentType.Round` - Round progress
- `FragmentType.Completion` - Completion status
- `FragmentType.Text` - Display text
- `FragmentType.Action` - User actions (buttons)
- `FragmentType.Effort` - Effort zones
- `FragmentType.Load` - Weight/resistance
- `FragmentType.Distance` - Distance metrics

**Example Fragments**:
```typescript
interface TimerFragment extends ICodeFragment {
  type: FragmentType.Timer;
  elapsedMs: number;
  targetMs?: number;
  direction: 'up' | 'down';
}

interface RepFragment extends ICodeFragment {
  type: FragmentType.Rep;
  count: number;
  targetCount?: number;
}

interface TextFragment extends ICodeFragment {
  type: FragmentType.Text;
  mode: 'title' | 'subtitle' | 'label';
  value: string;
}
```

### Editor Integration

**Location**: `src/editor/`

**Responsibility**: Monaco Editor integration with custom language support.

**Key Components**:

#### WodWiki Component

**File**: `src/editor/WodWiki.tsx`

**Interface**:
```typescript
interface WodWikiProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onParse?: (statements: ICodeStatement[]) => void;
  height?: string;
}
```

**Features**:
- Syntax highlighting
- Autocomplete for exercises
- Error markers
- Semantic tokens

#### Suggestion Engine

**File**: `src/editor/features/SuggestionEngine.ts`

**Responsibilities**:
- Exercise autocomplete
- Context-aware suggestions
- Fuzzy matching

#### WodBlockParser

**File**: `src/editor/parsers/WodBlockParser.ts`

**Responsibilities**:
- Parse WOD blocks from markdown
- Extract fenced code blocks (```wod ... ```)
- Integrate with Monaco decorations

## Component Interactions

### Compilation Flow

```
User Input (Text)
      │
      ▼
[Parser: Chevrotain]
      │
      ▼
AST (ICodeStatement[])
      │
      ▼
[Compiler: JitCompiler]
  ┌───┴───┐
  │Strategy│ Pattern
  └───┬───┘
      │
      ▼
[Builder: BlockBuilder]
      │
      ▼
Runtime Blocks (IRuntimeBlock[])
      │
      ▼
[Runtime: Stack]
```

### Execution Flow

```
[RuntimeStack]
      │
      ├─ push(block)
      ├─ current() ──▶ [RuntimeBlock]
      │                      │
      │                      ├─ mount() ──▶ [Behaviors]
      │                      │                   │
      │                      │                   ├─ onMount(ctx)
      │                      │                   ├─ Memory: pushMemory('timer')
      │                      │                   └─ Events: emit(...)
      │                      │
      │                      ├─ next() ──▶ [Behaviors]
      │                      │                   │
      │                      │                   └─ onNext(ctx)
      │                      │
      │                      └─ unmount() ──▶ [Behaviors]
      │                                          │
      │                                          └─ onUnmount(ctx)
      │
      └─ pop() ──▶ Consumer: dispose()
```

### Memory Flow

```
[Behavior]
    │
    ├─ ctx.pushMemory('timer') ──▶ [MemoryLocation]
    │                                     │
    │                                     ├─ fragments: []
    │                                     ├─ subscribers: []
    │                                     │
[UI Component] ─── subscribe() ──────────┘
    │                                     │
    │                                     ▼
    │                            update(fragments)
    │                                     │
    └─────────── callback(fragments) ────┘
```

## Cross-Cutting Concerns

### Error Handling

**Strategy**: Fail-fast with descriptive errors

**Parser Errors**:
- Syntax errors with line/column information
- Error recovery to continue parsing
- Multiple errors collected and reported

**Compiler Errors**:
- Unknown statement types throw errors
- Missing fragments cause compilation failure
- Strategy conflicts detected early

**Runtime Errors**:
- Behavior exceptions logged but don't crash
- Disposal errors caught and logged
- Stack underflow prevented

### Logging

**Approach**: Console-based logging with levels

**Levels**:
- `console.error()` - Critical errors
- `console.warn()` - Warnings and deprecations
- `console.log()` - Informational messages
- `console.debug()` - Verbose debugging

### Testing

**Test Harness**: `tests/harness/`

**Tools**:
1. **BehaviorTestHarness** - Unit test behaviors
2. **MockBlock** - Stub runtime blocks
3. **RuntimeTestBuilder** - Integration tests

**Example**:
```typescript
const harness = new BehaviorTestHarness()
  .withClock(new Date('2024-01-01'))
  .withMemory('timer', 'test-id', []);

const block = new MockBlock('test', [new TimerBehavior('up')]);
harness.push(block);
harness.mount();
```

## Dependencies

### External Dependencies

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| React | 18.x | UI framework | MIT |
| Monaco Editor | 4.x | Code editor | MIT |
| Chevrotain | 11.x | Parser generator | Apache 2.0 |
| Tailwind CSS | 3.x | Styling | MIT |

### Internal Dependencies

```
Parser ───────────▶ Fragments
                        ▲
                        │
Compiler ──────────────┼────────▶ Runtime
   │                   │             │
   └──▶ Strategies ────┘             │
                                     │
Editor ───────────────────────────────┘
   │
   └──▶ Monaco
```

## Performance Characteristics

| Component | Operation | Target | Notes |
|-----------|-----------|--------|-------|
| Parser | Parse 100 lines | < 50ms | Chevrotain overhead |
| Compiler | Compile 50 blocks | < 100ms | Strategy pattern |
| RuntimeStack | push/pop | < 1ms | Array operations |
| RuntimeStack | current() | < 0.1ms | Simple array access |
| RuntimeBlock | dispose() | < 50ms | Behavior cleanup |
| Memory | subscribe() | < 1ms | Callback registration |
| Memory | update() | < 5ms | Notify all subscribers |

## Related Documentation

- [Runtime View](./04-runtime-view.md) - Execution sequences
- [Solution Strategy](./02-solution-strategy.md) - Design decisions
- [API Reference](../api/) - Detailed API docs
- [How-To Guides](../how-to/) - Implementation guides

---

**Previous**: [← Solution Strategy](./02-solution-strategy.md) | **Next**: [Runtime View →](./04-runtime-view.md)
