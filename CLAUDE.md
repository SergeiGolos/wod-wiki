

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WOD Wiki is a React component library for parsing, displaying, and executing workout definitions using a specialized syntax. It features a Monaco Editor integration, JIT compiler for workout scripts, and components styled with Tailwind CSS.

**Tech Stack**: TypeScript, React, Storybook, Bun Test, Monaco Editor, Tailwind CSS, Chevrotain parser
**Package Manager**: bun (NOT npm/yarn)

## Essential Development Commands

### Environment Setup
```bash
bun install              # Install dependencies (~15 seconds)
bun run setup            # Install Playwright browsers (may fail - expected)
```

### Development Workflow
```bash
bun run storybook        # Start Storybook on http://localhost:6006 (~2s startup)
bun run build-storybook  # Build static Storybook (~30s - NEVER CANCEL)
bun run docs:check       # Validate documentation links (<1 second)
```

### Testing Commands
```bash
# Unit tests (src/**/*.test.ts)
bun run test                          # Run all unit tests (~2-3 seconds)
bun run test --watch                  # Watch mode

# Component/integration tests (tests/**/*.test.ts)
bun run test:components               # Run tests in tests/ directory
bun run test:all                      # Run both unit + component tests

# Specific test file
bun test src/path/to/file.test.ts --preload ./tests/unit-setup.ts

# Harness self-tests
bun test tests/harness --preload ./tests/unit-setup.ts

# Other test types
bun run test:storybook                # Storybook tests (requires Playwright)
bun run test:e2e                      # Playwright e2e tests
bun run test:perf                     # Performance benchmarks
bun run test:coverage                 # With coverage report
```

### Type Checking
```bash
bun x tsc --noEmit                    # Type check without emitting files
```

## Test Harness

The project provides a unified test harness under `tests/harness/` for consistent runtime testing. **Use this instead of inline mocks.**

### Test Harness Classes

| Class | Purpose | Use For |
|-------|---------|---------|
| `BehaviorTestHarness` | Lightweight harness with real memory/stack | Unit testing behaviors |
| `MockBlock` | Configurable IRuntimeBlock stub | Testing behaviors in isolation |
| `RuntimeTestBuilder` | Builder for full ScriptRuntime | Integration testing strategies |

### Example: Unit Testing Behaviors

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '../../../../tests/harness';
import { TimerBehavior } from '../TimerBehavior';

describe('TimerBehavior', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should start timer on mount', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    harness.push(block);
    harness.mount();
    expect(block.getBehavior(TimerBehavior)!.isRunning()).toBe(true);
  });

  it('should track elapsed time', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    harness.push(block);
    harness.mount();
    harness.advanceClock(5000);
    expect(block.getBehavior(TimerBehavior)!.getElapsedMs()).toBeGreaterThanOrEqual(5000);
  });
});
```

### Example: Integration Testing Strategies

```typescript
import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '../harness';
import { TimerStrategy } from '@/runtime/strategies/TimerStrategy';

describe('TimerStrategy', () => {
  it('should compile timer block', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 Run')
      .withStrategy(new TimerStrategy())
      .build();

    const block = harness.pushStatement(0);
    expect(block.blockType).toBe('Timer');
  });
});
```

### Key Harness APIs

```typescript
// BehaviorTestHarness
harness.withClock(date)              // Set mock clock
harness.withMemory(type, owner, val) // Pre-allocate memory
harness.push(block)                  // Push block to stack
harness.mount()                      // Mount current block
harness.next()                       // Call next() on block
harness.unmount()                    // Unmount and dispose
harness.advanceClock(ms)             // Advance time
harness.simulateEvent(name, data)    // Dispatch event
harness.wasEventEmitted(name)        // Assert event emitted
harness.stackDepth                   // Current stack size
harness.currentBlock                 // Top of stack

// MockBlock
new MockBlock('id', [behaviors], { state: { isComplete: false } })
block.state.isComplete = true        // Mutable state for conditions
block.getBehavior(BehaviorType)      // Get behavior instance
```

## Project Architecture

### Core Components

**JIT Compiler System** (`src/runtime/JitCompiler.ts`)
- Just-In-Time compiler for workout scripts
- Uses strategy pattern with `IRuntimeBlockStrategy` implementations
- Coordinates fragment compilation, metric inheritance, and block creation

**Runtime Stack** (`src/runtime/RuntimeStack.ts`)
- Stack-based execution environment for workout blocks
- Constructor-based initialization pattern (blocks initialize during construction)
- Consumer-managed disposal pattern (consumer must call `dispose()` on popped blocks)
- Performance targets: push/pop < 1ms, current() < 0.1ms, dispose() < 50ms

**Parser System** (`src/parser/`)
- Chevrotain-based parser for workout syntax
- Files: `timer.parser.ts`, `timer.tokens.ts`, `timer.visitor.ts`
- Parses workout scripts into `CodeStatement` nodes

**Fragment System** (`src/fragments/`)
- Types for parsed workout components (TimerFragment, RepFragment, EffortFragment, etc.)
- Each fragment represents a specific workout metric or action

**Editor Integration** (`src/editor/`)
- Monaco Editor integration with custom syntax highlighting
- Suggestion engine and semantic token processing
- `WodWiki.tsx` is the main editor component

### Key Directories Structure
```
src/
├── clock/              # Timer/clock components and hooks
├── components/         # Shared React components
│   └── fragments/      # Fragment visualization components
├── editor/             # Monaco Editor integration
├── fragments/          # Parsed statement fragment types
├── parser/             # Workout script parsing logic
├── runtime/            # JIT compiler and execution engine
└── types/              # TypeScript type definitions

stories/                # Storybook stories
├── clock/             # Clock component demonstrations
├── compiler/          # JIT compiler visualization
├── parsing/           # Parser examples
└── runtime/           # Runtime execution demos
```

## Critical Development Patterns

### Runtime Block Lifecycle
1. **Constructor-based initialization**: Blocks initialize during construction, not when pushed to stack
2. **Consumer-managed disposal**: When popping blocks, consumer must call `dispose()`
3. **Resource cleanup**: Implement robust disposal patterns with multiple-call safety

### Parser Development
- Update token definitions in `src/parser/timer.tokens.ts`
- Modify parser rules in `src/parser/timer.parser.ts`
- Update visitor in `src/parser/timer.visitor.ts`
- Test with Parser stories in Storybook

### Component Development
- Use existing Tailwind CSS classes rather than custom CSS
- Follow TypeScript interfaces for props
- Create corresponding Storybook stories in `stories/` directory
- Export from appropriate index files if part of public API

## Validation Requirements

After making changes, always validate:

1. **Storybook Development Flow**:
   - Run `bun run storybook`
   - Verify Storybook loads on http://localhost:6006
   - Navigate to Clock > Default > Default story
   - Test component interactions in Controls panel

2. **Build Validation**:
   - Run `bun run build-storybook` and wait for completion (~30 seconds)
   - Verify build completes without errors and creates `storybook-static/` directory

3. **Unit Test Regression**:
   - Run `bun run test`
   - Ensure no NEW test failures are introduced
   - Accept existing 4 module failures and 1 integration test failure as baseline

## Known Issues and Constraints

- **Playwright Browser Download**: `bun run setup` may fail downloading Chromium browsers (expected)
- **TypeScript Errors**: 369 TypeScript errors exist in the codebase - only fix errors related to your changes
- **No ESLint**: Code style enforced through TypeScript and manual review
- **Build Times**: NEVER cancel builds - `bun run build-storybook` may take up to 60 minutes

## Testing Guidelines

### Unit Tests
- Use Vitest configuration files for different test types
- `vitest.unit.config.js` for unit tests
- `vitest.storybook.config.js` for Storybook component tests
- Place test files alongside source files with `.test.ts` or `.spec.ts` suffix

### Storybook Tests
- Interaction tests defined in story `play` functions
- Example: timer test in `src/stories/TimerTest.stories.tsx`
- Requires Storybook running and Playwright browsers installed

## File Organization

### Public API Exports
- Main library exports are handled through individual component exports
- Fragment visualization components exported from `src/components/fragments/index.ts`
- No single main index.ts file exists - exports are distributed across modules

### Documentation Files
- Save new Markdown documentation to `/docs` directory
- Documentation auto-published to GitHub Wiki when pushed to main branch
- API documentation in `docs/runtime-api.md` provides detailed runtime stack patterns

## Performance Considerations

- All runtime stack operations must meet performance targets (see Lifecycle section)
- JIT compilation should complete within milliseconds for typical workout scripts
- Monaco Editor performance depends on efficient syntax highlighting and suggestion systems
- Memory management is critical - always dispose of runtime blocks properly
