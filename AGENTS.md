# WOD Wiki - Development Guidelines

This document provides core development guidelines for AI assistants working on the WOD Wiki project.

## Project Overview

WOD Wiki is a React component library for parsing, displaying, and executing workout definitions using a specialized syntax. It features a Monaco Editor integration, JIT compiler for workout scripts, and components styled with Tailwind CSS.

**Tech Stack**: TypeScript, React, Storybook, Vitest, Monaco Editor, Tailwind CSS, Chevrotain parser
**Package Manager**: npm

## Essential Development Commands

### Environment Setup
- `npm install` - Install dependencies (~15 seconds)
- `npm run setup` - Install Playwright browsers (may fail with download errors - this is expected)

### Development Workflow
- `npm run storybook` - Start Storybook development server on http://localhost:6006 (~2 seconds startup)
- `npm run build-storybook` - Build static Storybook (~30 seconds - NEVER CANCEL, set timeout to 60+ minutes)
- `npm run docs:check` - Validate documentation links (<1 second)

## Build/Lint/Test Commands

- `npm test` - Run all tests using Vitest (~2-3 seconds)
- `npm run test:unit` - Run unit tests only (~2-3 seconds)
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:storybook` - Run Storybook component tests (requires Playwright)
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npx vitest run src/path/to/test.test.ts` - Run single test file
- `npx tsc --noEmit` - Type check without emitting files
- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build static Storybook

## Code Style Guidelines

### TypeScript & Imports
- Use strict TypeScript with interfaces for all props and return types
- Import order: external libraries, internal modules, relative imports
- Use `@/*` path alias for src imports (configured in tsconfig.json)
- Prefer `interface` over `type` for object shapes

### Naming Conventions
- Components: PascalCase (e.g., `WorkoutTimer`)
- Functions/variables: camelCase (e.g., `parseWorkoutScript`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)
- Files: PascalCase for components, camelCase for utilities

### Error Handling
- Use TypeScript union types for error states
- Return `Result<T, Error>` pattern or throw descriptive errors
- Validate inputs at API boundaries

### React & Components
- Use functional components with hooks
- Follow existing Tailwind CSS patterns, avoid custom CSS
- Create Storybook stories for all public components
- Export components from `src/index.ts` if part of public API

### Testing
- Unit tests: `src/**/*.test.ts` or `src/**/*.spec.ts`
- Integration tests: `tests/**/*.test.ts`
- Story files: `stories/**/*.stories.tsx`
- Test files should be co-located with source files when possible

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
   - Run `npm run storybook`
   - Verify Storybook loads on http://localhost:6006
   - Navigate to Clock > Default > Default story
   - Test component interactions in Controls panel

2. **Build Validation**:
   - Run `npm run build-storybook` and wait for completion (~30 seconds)
   - Verify build completes without errors and creates `storybook-static/` directory

3. **Unit Test Regression**:
   - Run `npm run test:unit`
   - Ensure no NEW test failures are introduced
   - Accept existing 4 module failures and 1 integration test failure as baseline

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

## Known Issues and Constraints

- **Playwright Browser Download**: `npm run setup` may fail downloading Chromium browsers (expected)
- **TypeScript Errors**: 369 TypeScript errors exist in the codebase - only fix errors related to your changes
- **No ESLint**: Code style enforced through TypeScript and manual review
- **Build Times**: NEVER cancel builds - `npm run build-storybook` may take up to 60 minutes
