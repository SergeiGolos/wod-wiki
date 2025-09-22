# WOD Wiki - GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Project Overview

WOD Wiki is a React component library for parsing, displaying, and executing workout definitions using a specialized syntax. It features a Monaco Editor integration for editing workout scripts, a runtime engine for execution, and components styled with Tailwind CSS.

**Tech Stack**: TypeScript, React, Storybook, Vitest, Monaco Editor, Tailwind CSS, Chevrotain parser
**Package Manager**: npm

## Working Effectively

### Initial Setup
- `npm install` - Installs project dependencies (~15 seconds)
- `npm run setup` - Attempts to install Playwright browsers (may fail with download errors - this is expected and not critical)

### Development Workflow
- `npm run storybook` - Start Storybook development server on http://localhost:6006 (~2 seconds to start)
- `npm run build-storybook` - Build static Storybook for deployment (takes ~30 seconds. NEVER CANCEL. Set timeout to 60+ minutes)
- `npm run docs:check` - Validate documentation links (<1 second)

### Testing
- `npm test` - Run all tests using Vitest (~2-3 seconds)
- `npm run test:unit` - Run unit tests only (~2-3 seconds)
- `npm run test:storybook` - Run Storybook component tests (requires Playwright browsers)
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:e2e` - Run end-to-end tests with Playwright

**EXPECTED TEST STATUS**: Some tests have known failures (4 failed modules with missing RuntimeBlockWithMemoryBase, 1 integration test failure). This is expected in the current development state. Focus on not introducing NEW test failures.

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

### Key Directories
```
src/
├── clock/              # Timer/clock components and logic
├── editor/             # Monaco Editor integration and syntax highlighting
├── parser/             # Workout script parsing logic (Chevrotain-based)
├── runtime/            # Workout execution runtime and JIT compiler
├── fragments/          # Parsed statement fragment types
└── index.ts           # Library entry point

stories/                # Storybook stories for all components
├── clock/             # Clock component stories
├── compiler/          # JIT compiler demonstrations
├── parsing/           # Parser example stories
├── runtime/           # Runtime execution stories
└── workouts/          # Complete workout examples

docs/                  # Project documentation (auto-published to GitHub Wiki)
.github/               # GitHub workflows and templates
.storybook/            # Storybook configuration
```

### Core Components
- **WodWiki Editor**: Monaco Editor with custom workout syntax highlighting
- **Clock Components**: Timer displays and workout progress tracking
- **Parser**: Chevrotain-based parser for workout syntax
- **Runtime**: JIT compiler and execution engine for workout scripts
- **Metric System**: Inheritance and composition system for workout metrics

## Troubleshooting

### Known Issues
1. **Playwright Browser Download**: `npm run setup` may fail downloading Chromium browsers. This is expected in some environments and does not affect core development.

2. **TypeScript Errors**: 369 TypeScript errors exist in the codebase. Do not attempt to fix unless directly related to your changes.

3. **Test Failures**: 4 test modules fail due to missing `RuntimeBlockWithMemoryBase` file, and 1 integration test fails. These are baseline failures.

4. **ESLint**: No ESLint configuration is present. Code style is enforced through TypeScript and manual review.

### When Things Break
- If Storybook won't start, check for port conflicts on 6006
- If tests fail unexpectionally, compare against baseline (45 passed, 1 failed, 4 module errors)
- If builds hang, wait at least 60 minutes before considering alternatives
- If TypeScript errors increase significantly, focus only on errors in files you modified

## Development Guidelines

### Making Changes
- Always test changes in Storybook before committing
- Run unit tests to ensure no new failures
- Build Storybook to verify production builds work
- Focus on React component development and TypeScript interfaces
- Use existing Tailwind CSS classes rather than custom CSS

### Parser Development
- Workout syntax uses Chevrotain parser in `src/parser/`
- Timer syntax files: `timer.parser.ts`, `timer.tokens.ts`, `timer.visitor.ts`
- Test parser changes with Parser stories in Storybook

### Runtime Development
- JIT compiler logic in `src/runtime/JitCompiler.ts`
- Runtime execution in `src/runtime/ScriptRuntime.ts`
- Test runtime changes with Runtime stories and unit tests
- Metric inheritance system in `src/runtime/MetricInheritance.ts`

### Adding New Components
- Create component in appropriate `src/` subdirectory
- Add Storybook story in corresponding `stories/` directory
- Export from `src/index.ts` if part of public API
- Use TypeScript interfaces for props
- Follow existing naming conventions (PascalCase for components)

## Common Tasks

### Creating a New Workout Component
1. Create component file in `src/` with TypeScript
2. Create corresponding story in `stories/`
3. Test in Storybook with `npm run storybook`
4. Add to exports in `src/index.ts` if public API
5. Run `npm run test:unit` to ensure no regressions

### Modifying Parser Syntax
1. Update token definitions in `src/parser/timer.tokens.ts`
2. Modify parser rules in `src/parser/timer.parser.ts`
3. Update visitor in `src/parser/timer.visitor.ts`
4. Test with Parser stories in Storybook
5. Run full test suite to ensure compatibility

### Adding Runtime Features
1. Implement in `src/runtime/` directory
2. Add unit tests following existing patterns
3. Create demonstration in Runtime stories
4. Test integration with JIT compiler
5. Validate with complete workout scenarios

## File Output Guidelines
- New Markdown documentation: Save to `/docs` directory
- Component exports: Add to `src/index.ts`
- Test files: Use `.test.ts` or `.spec.ts` suffix
- Story files: Use `.stories.tsx` suffix in `stories/`