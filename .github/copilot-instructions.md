# WOD Wiki - GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Project Overview

WOD Wiki is a React component library for parsing, displaying, and executing workout definitions using a specialized syntax. It features a Monaco Editor integration for editing workout scripts, a runtime engine for execution, and components styled with Tailwind CSS.

**Tech Stack**: TypeScript, React, Storybook, Vitest, Monaco Editor, Tailwind CSS, Chevrotain parser
**Package Manager**: npm (CommonJS module system)

## Critical Architecture Knowledge

### Runtime Execution Model
WOD Wiki uses a **stack-based JIT compilation architecture** where workout scripts flow through these phases:

1. **Parsing** (`src/parser/`) - Chevrotain parser converts script text to `CodeStatement` AST nodes
2. **JIT Compilation** (`src/runtime/JitCompiler.ts`) - Strategy pattern matches statements to `IRuntimeBlock` implementations
3. **Stack Execution** (`src/runtime/RuntimeStack.ts`) - Blocks execute via push/pop with constructor-based initialization
4. **Memory Management** (`src/runtime/RuntimeMemory.ts`) - Linear memory allocation with reference-based access and subscription pattern

**Key principle**: Blocks initialize in constructors (not during push), and consumers must explicitly call `dispose()` after pop.

### Strategy Pattern & Precedence
Six compilation strategies in strict precedence order (see `src/runtime/strategies.ts`):
1. `TimeBoundRoundsStrategy` - AMRAP workouts (Timer + Rounds)
2. `IntervalStrategy` - EMOM workouts (Timer + Action="EMOM")  
3. `TimerStrategy` - Time-bound workouts (Timer fragments)
4. `RoundsStrategy` - Multi-round workouts (Rounds fragments)
5. `GroupStrategy` - Statement grouping (has children)
6. `EffortStrategy` - Fallback for simple efforts

Each strategy implements `match()` and `compile()` methods. First matching strategy wins.

### Fragment Compilation System
`FragmentCompilationManager` coordinates 10+ fragment compilers that transform parsed fragments into `MetricValue[]` arrays. Each compiler handles one fragment type (Timer, Rounds, Effort, etc.) and produces standardized metrics consumed by runtime blocks.

### Memory & Event System
- **Memory**: Reference-based allocation with type, ownerId, visibility. Supports search by criteria and reactive subscriptions
- **Events**: Unified handler registry in memory. All blocks register event handlers that return `IRuntimeAction[]` arrays
- **Actions**: Composable actions for state changes (PushAction, PopAction, EmitMetricAction, ErrorAction, etc.)

## Working Effectively

### Initial Setup
- `npm install` - Installs project dependencies (~15 seconds)
- `npm run setup` - Attempts to install Playwright browsers (may fail with download errors - this is expected and not critical)

### Development Workflow
- `npm run storybook` - Start Storybook development server on http://localhost:6006 (~2 seconds to start)
- `npm run build-storybook` - Build static Storybook for deployment (takes ~30 seconds. NEVER CANCEL. Set timeout to 60+ minutes)
- `npm run docs:check` - Validate documentation links (<1 second)

### Testing Strategy
Multi-project Vitest configuration with three test suites:

- `npm test` - Run all test projects (~2-3 seconds)
- `npm run test:unit` - Node.js unit tests (`src/**/*.{test,spec}.ts`)
- `npm run test:watch` - Unit tests in watch mode
- `npm run test:storybook` - Storybook component tests with Playwright (requires browsers)
- `npm run test:e2e` - End-to-end Playwright tests

**Test baseline**: Accept 4 module failures + 1 integration test failure as expected. Focus on preventing NEW failures.

### TypeScript Compilation
- `npx tsc --noEmit` - Type check without emitting files (has 369 known errors - this is expected)
- TypeScript compilation has many existing errors. Do not attempt to fix all TypeScript errors unless directly related to your changes.

## Validation Scenarios

### ALWAYS test these scenarios after making changes:

1. **Storybook Development Flow**:
   - Run `npm run storybook`
   - Verify Storybook loads on http://localhost:6006
   - Navigate to Clock > Default > Default story
   - Verify the workout clock component displays correctly with timer and workout details
   - Test component interactions in the Controls panel

2. **Build Validation**:
   - Run `npm run build-storybook` and wait for completion (~30 seconds)
   - Verify build completes without errors and creates `storybook-static/` directory

3. **Unit Test Regression**:
   - Run `npm run test:unit`
   - Ensure no NEW test failures are introduced
   - Accept existing 4 module failures and 1 integration test failure as baseline

## Build Times and Timeouts

- **NEVER CANCEL BUILDS OR TESTS** - Wait for completion
- `npm install`: ~15 seconds
- `npm run storybook`: ~2 seconds to start
- `npm run build-storybook`: ~30 seconds (NEVER CANCEL - set timeout to 60+ minutes)
- `npm run test:unit`: ~2-3 seconds
- `npm run setup`: ~30 seconds (may fail on Playwright download - expected)

## Project Structure

### Critical Directories
```
src/
├── parser/                    # Chevrotain parser (timer.parser.ts, timer.tokens.ts, timer.visitor.ts)
├── runtime/                   # Core execution engine
│   ├── JitCompiler.ts        # Central compilation coordinator
│   ├── strategies.ts         # 6 strategy implementations with precedence
│   ├── RuntimeStack.ts       # Stack-based execution with lifecycle management
│   ├── RuntimeMemory.ts      # Reference-based memory allocation
│   ├── ScriptRuntime.ts      # Main runtime orchestrator
│   ├── FragmentCompilationManager.ts  # Fragment → MetricValue compiler
│   ├── blocks/               # Concrete block implementations (TimerBlock, RoundsBlock, etc.)
│   └── behaviors/            # Composable behaviors (TimerBehavior, CompletionBehavior, etc.)
├── editor/                    # Monaco Editor integration
│   ├── WodWiki.tsx           # Main editor component
│   ├── ExerciseIndexManager.ts  # 873+ exercise search with LRU cache
│   ├── ExerciseSuggestionProvider.ts  # Typeahead with metadata (equipment, muscles, difficulty)
│   └── ExerciseHoverProvider.ts  # Rich hover documentation
├── fragments/                 # Fragment type definitions (TimerFragment, RoundsFragment, etc.)
├── clock/                     # Timer/clock UI components
└── components/fragments/      # Fragment visualization components

stories/                       # Storybook stories
├── runtime-test-bench/       # Interactive runtime debugger with keyboard shortcuts
├── compiler/                 # JIT compiler visualizations
├── runtime/                  # Runtime execution demos
└── workouts/                 # Complete workout examples

docs/                         # Project documentation (auto-published to GitHub Wiki)
tests/                        # Integration and e2e tests (jsdom environment)
public/exercises/             # 873+ exercise definitions with images
```

### Data Flow Architecture

**Parsing → Compilation → Execution:**
```typescript
// 1. Parse script text into AST
WodScript.parse(text) → CodeStatement[]

// 2. JIT compile statements to blocks (strategy pattern)
JitCompiler.compile(statements, runtime) → IRuntimeBlock

// 3. Execute via stack with memory-aware lifecycle
RuntimeStack.push(block)      // Constructor-based init
block.mount(runtime)          // Register handlers, return initial actions
block.next(runtime)           // Determine next block after child completes
RuntimeStack.pop()            // Returns block - consumer calls dispose()

// 4. Memory management with subscriptions
memory.allocate(type, ownerId, value) → TypedMemoryReference<T>
memory.get(ref) → T
memory.set(ref, value)        // Notifies subscribers
memory.search(criteria)       // Find refs by type/owner/visibility
```

### Core Component Interactions

**Editor Integration:**
- `WodWiki.tsx` wraps Monaco Editor with custom language registration
- `ExerciseIndexManager` loads exercise-name-index.json (cached in localStorage)
- `ExerciseSuggestionProvider` provides typeahead with 150ms debounce + LRU cache (100 entries)
- `ExerciseHoverProvider` fetches exercise metadata on-demand with 500ms timeout

**Runtime Test Bench** (`stories/runtime-test-bench/`):
Interactive debugger with keyboard shortcuts (Ctrl+Enter=execute, Space=pause, F10=step, F5=reset)

## Troubleshooting

### Known Issues
1. **Playwright Browser Download**: `npm run setup` may fail downloading Chromium browsers. This is expected in some environments and does not affect core development.

2. **TypeScript Errors**: 369 TypeScript errors exist in the codebase. Do not attempt to fix unless directly related to your changes.

4. **ESLint**: No ESLint configuration is present. Code style is enforced through TypeScript and manual review.

### When Things Break
- If Storybook won't start, check for port conflicts on 6006
- If tests fail unexpectionally, compare against baseline (45 passed, 1 failed, 4 module errors)
- If builds hang, wait at least 60 minutes before considering alternatives
- If TypeScript errors increase significantly, focus only on errors in files you modified

## Development Guidelines

### Code Patterns & Conventions

**TypeScript:**
- Use strict TypeScript with interfaces (prefer `interface` over `type` for object shapes)
- Import order: external libraries → internal modules → relative imports
- Use `@/*` path alias for src imports (configured in tsconfig.json)
- Naming: PascalCase (components), camelCase (functions/vars), UPPER_SNAKE_CASE (constants)

**React Components:**
- Functional components with hooks only
- Use existing Tailwind CSS classes - avoid custom CSS
- Create Storybook stories for all public components in `stories/`
- Export from appropriate index files if part of public API

**Error Handling:**
- Use TypeScript union types for error states
- Return `Result<T, Error>` pattern or throw descriptive errors
- Runtime errors collected in `ScriptRuntime.errors[]` array

### Runtime Block Development

**Lifecycle Pattern (CRITICAL):**
```typescript
// ✅ CORRECT: Constructor-based initialization
class MyBlock implements IRuntimeBlock {
  constructor(runtime: IScriptRuntime, config: MyConfig) {
    this.context = new BlockContext(runtime, this.key.toString());
    
    // Allocate ALL memory in constructor
    this.timerRef = this.context.memory.allocate<number>('timer', this.key.toString(), 0);
    
    // Register event handlers
    this.context.registerHandler('tick', (event) => {
      // Handle event, return actions
      return [new EmitMetricAction(...)];
    });
  }
  
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Return initial actions only
    return [new PushAction(childBlock)];
  }
  
  dispose(): void {
    // Release ALL memory references
    this.context.memory.release(this.timerRef);
  }
}

// ❌ WRONG: Initializing during push/mount
mount(runtime: IScriptRuntime): IRuntimeAction[] {
  this.timerRef = runtime.memory.allocate(...); // Too late!
}
```

**Consumer Disposal (CRITICAL):**
```typescript
// ✅ CORRECT: Consumer calls dispose()
const block = stack.pop();
if (block) {
  block.dispose(); // Consumer responsibility
}

// ❌ WRONG: Assuming stack cleans up
stack.pop(); // Memory leak - block never disposed!
```

### Strategy Development

**Adding New Compilation Strategy:**
1. Implement `IRuntimeBlockStrategy` interface (`match` + `compile` methods)
2. Register in order of precedence (more specific strategies first)
3. `match()` examines `ICodeStatement[]` for fragment patterns (Timer, Rounds, Action, etc.)
4. `compile()` creates block with appropriate behaviors and memory allocations
5. Test precedence with `src/runtime/jit-compiler-precedence.test.ts` patterns

**Strategy precedence order matters:**
```typescript
// Example: TimeBoundRoundsStrategy must come BEFORE TimerStrategy
// because Timer+Rounds is more specific than Timer alone
compiler.registerStrategy(new TimeBoundRoundsStrategy()); // Matches Timer + Rounds
compiler.registerStrategy(new IntervalStrategy());        // Matches Timer + EMOM
compiler.registerStrategy(new TimerStrategy());           // Matches Timer only
```

### Parser Development
- Chevrotain-based parser in `src/parser/`
- Modify tokens (`timer.tokens.ts`), rules (`timer.parser.ts`), visitor (`timer.visitor.ts`) together
- Test parser changes with Parser stories in Storybook

### Monaco Editor Integration
- Exercise typeahead uses localStorage-cached index (public/exercise-name-index.json)
- LRU cache (100 entries) + debounce (150ms) for performance
- Add new suggestion providers to `WodWiki.tsx` via `monaco.languages.registerCompletionItemProvider()`

## Common Tasks

### Adding a New Runtime Block
1. Create block class in `src/runtime/blocks/` implementing `IRuntimeBlock`
2. Allocate ALL memory in constructor using `BlockContext`
3. Register event handlers in constructor
4. Implement `mount()` to return initial actions
5. Implement `next()` to determine child execution flow
6. Implement `dispose()` to release all memory references
7. Add unit tests verifying lifecycle (push → mount → next → pop → dispose)
8. Create Runtime story demonstrating block behavior

### Adding a New Compilation Strategy
1. Create strategy class in `src/runtime/strategies.ts` implementing `IRuntimeBlockStrategy`
2. Implement `match(statements, runtime)` checking for fragment patterns
3. Implement `compile(statements, runtime)` creating appropriate block instance
4. Register strategy with `JitCompiler` in correct precedence order
5. Add precedence test in `src/runtime/jit-compiler-precedence.test.ts`
6. Create Compiler story showing strategy selection

### Adding a New Fragment Type
1. Define fragment interface in `src/fragments/` (e.g., `MyFragment.ts`)
2. Update parser to emit new fragment type (`src/parser/timer.parser.ts`)
3. Create fragment compiler in `src/runtime/FragmentCompilers.ts`
4. Register compiler with `FragmentCompilationManager`
5. Update `FragmentType` enum in `src/CodeFragment.ts`
6. Add visualization in `src/components/fragments/`
7. Test parsing and compilation with unit tests

### Adding Exercise Typeahead Feature
1. Enhance `ExerciseSuggestionProvider.ts` with new metadata field
2. Update `exercise-name-index.json` generation script if needed
3. Add metadata display to suggestion UI (icons, tooltips)
4. Test with LRU cache behavior (<100 entries, 150ms debounce)
5. Create Storybook story demonstrating feature

### Debugging Runtime Execution
1. Open Runtime Test Bench in Storybook (`stories/runtime-test-bench/`)
2. Enter workout script in Monaco Editor (auto-parses in 500ms)
3. Press **F11** to compile (view strategy selection + block creation)
4. Press **Ctrl+Enter** to start execution
5. Press **Space** to pause, **F10** to single-step
6. Inspect runtime stack, memory allocations, and event flow
7. Check console for detailed logs (`🧠 ScriptRuntime`, `📊 Strategy`, etc.)

## File Organization

### Test Files
- Unit tests: `src/**/*.{test,spec}.ts` (Node.js environment)
- Integration tests: `tests/**/*.test.ts` (jsdom environment with React Testing Library)
- E2E tests: `tests/e2e/**/*.spec.ts` (Playwright browser tests)
- Story files: `stories/**/*.stories.tsx`

### Documentation
- Save new docs to `/docs` directory (auto-published to GitHub Wiki on push)
- Use Markdown with Mermaid diagrams where helpful
- Link to specific implementation files for reference
- See `docs/runtime-interfaces-deep-dive.md` for architecture documentation pattern
