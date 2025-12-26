# WOD Wiki API Documentation

## Overview

WOD Wiki is a React component library for parsing, displaying, and executing workout definitions using a specialized syntax. This documentation provides comprehensive coverage of the public API, core components, and runtime execution system.

## Documentation Structure

### Core Systems

- **[Runtime System](./runtime-system.md)** - JIT compiler, execution engine, and block lifecycle
- **[Parser System](./parser-system.md)** - Chevrotain-based workout script parser
- **[Fragment Types](./fragment-types.md)** - Parsed workout component types
- **[Editor Integration](./editor-integration.md)** - Monaco Editor integration and features
- **[Clock & Timer](./clock-timer.md)** - Timer components and clock utilities
- **[Services](./services.md)** - Shared services and utilities

## Quick Start

### Installation

```bash
bun install
```

### Basic Usage

```typescript
import { WodWiki } from '@/editor/WodWiki';
import { createDefaultRuntimeFactory } from '@/runtime/RuntimeFactory';

// Create runtime factory
const factory = createDefaultRuntimeFactory();

// Create editor component
<WodWiki 
  id="workout-editor"
  code="3 Rounds of: 10 Push-ups, 15 Squats"
  onValueChange={(script) => console.log(script)}
/>
```

## Architecture

### Core Components

1. **Parser** - Parses workout scripts into `CodeStatement` nodes
2. **JIT Compiler** - Compiles statements into executable `RuntimeBlock` instances
3. **Runtime Stack** - Stack-based execution environment
4. **Behaviors** - Composable behavior pattern for block functionality
5. **Memory** - Shared state management with typed references

### Data Flow

```
Workout Script → Parser → CodeStatements → JIT Compiler → RuntimeBlocks → Execution
                                        ↓
                                  Fragment Types
```

## Module Overview

| Module | Description | Files |
|---------|-------------|--------|
| Runtime | JIT compiler, execution engine, behaviors | 99 files |
| Editor | Monaco integration, syntax highlighting | 46 files |
| Components | React components and UI | 48 files |
| Core | Type definitions and models | 20 files |
| Fragments | Parsed statement fragment types | 10 files |
| Parser | Workout script parsing logic | 7 files |
| Services | Shared services and utilities | 9 files |
| Clock | Timer/clock components and hooks | 21 files |

## Key Concepts

### Runtime Blocks

Runtime blocks are the executable units of workout scripts. They implement the `IRuntimeBlock` interface and are composed of behaviors:

- **TimerBlock** - Countdown/count-up timers
- **RoundsBlock** - Fixed-round or rep-scheme workouts
- **EffortBlock** - Individual exercise tracking
- **AMRAPBlock** - Time-bound rounds (As Many Rounds As Possible)
- **EMOMBlock** - Interval training (Every Minute On the Minute)
- **RootBlock** - Top-level workout container

### Fragment Types

Fragments are the parsed components of workout statements:

- **TimerFragment** - Time duration (e.g., "5:00", "1:30:00")
- **RepFragment** - Repetition count (e.g., "10", "21-15-9")
- **EffortFragment** - Exercise effort level
- **DistanceFragment** - Distance measurement
- **ResistanceFragment** - Weight/resistance value
- **ActionFragment** - Action or instruction
- **RoundsFragment** - Round count
- **IncrementFragment** - Increment value
- **LapFragment** - Lap marker
- **TextFragment** - Text description

### Behaviors

Behaviors are composable units that add functionality to blocks:

- **TimerBehavior** - Time tracking with pause/resume
- **LoopCoordinatorBehavior** - Round and interval iteration
- **CompletionBehavior** - Completion detection and popping
- **HistoryBehavior** - Execution span tracking
- **SoundBehavior** - Audio cue playback
- **IdleBehavior** - Waiting state management
- **RootLifecycleBehavior** - Workout lifecycle orchestration

## Type Safety

The project uses strict TypeScript with comprehensive type definitions:

- All public APIs have interface definitions
- Props are typed with interfaces
- Memory references are typed with generics
- Fragment types extend `ICodeFragment` interface

## Testing

- **Unit Tests**: Located alongside source files with `.test.ts` suffix
- **Integration Tests**: `tests/` directory
- **Storybook Tests**: `stories/` directory with `play` functions

Run tests with:

```bash
bun run test              # All unit tests
bun run test:watch       # Watch mode
bun run test:storybook   # Storybook component tests
bun run test:e2e         # End-to-end tests
```

## Performance Targets

- **Stack push/pop**: < 1ms
- **Current block access**: < 0.1ms
- **Block disposal**: < 50ms
- **JIT compilation**: < 100ms for typical workouts

## See Also

- [AGENTS.md](../../AGENTS.md) - Development guidelines
- [Block Types Reference](../block-types-behaviors-reference.md) - Detailed block documentation
- [Runtime Lifecycle](../runtime-action-lifecycle.md) - Lifecycle patterns
- [README](../../README.md) - Project overview
