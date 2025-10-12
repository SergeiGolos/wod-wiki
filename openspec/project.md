# Project Context

## Purpose
WOD Wiki is a React component library for parsing, displaying, and executing workout definitions using a specialized syntax. The project provides a comprehensive toolkit for workout management, including:

- **Monaco Editor Integration**: Custom syntax highlighting and intelligent suggestions for workout scripts
- **JIT Compiler System**: Just-in-time compilation of workout definitions into executable runtime blocks
- **Runtime Stack Engine**: Stack-based execution environment for workout blocks with performance-optimized operations
- **Visual Components**: React components for displaying and interacting with workout fragments
- **Development Tools**: Storybook-based component documentation and testing framework

The project enables developers to create workout applications that can parse complex workout syntax, execute timing and metric calculations, and provide rich editing experiences for workout creation.

## Tech Stack
- **TypeScript**: Primary language for type safety and development experience
- **React**: UI component library for the editor and visualization components
- **Storybook**: Component development, documentation, and testing environment
- **Vitest**: Unit testing framework with fast execution times
- **Monaco Editor**: Code editor integration with custom language services
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Chevrotain**: Parser generator library for creating the workout syntax parser
- **Playwright**: End-to-end testing framework for Storybook interactions
- **npm**: Package manager and build system

## Project Conventions

### Code Style
- **TypeScript Strict Mode**: All code must use strict TypeScript configuration
- **Interface-First Design**: Define interfaces before implementations, especially for fragment types and runtime strategies
- **Constructor-Based Initialization**: Runtime blocks initialize during construction, not when pushed to stack
- **Consumer-Managed Disposal**: When popping runtime blocks, consumers must call `dispose()` method
- **Performance-First**: All runtime operations must meet performance targets (push/pop < 1ms, current() < 0.1ms, dispose() < 50ms)
- **Tailwind CSS Usage**: Prefer existing Tailwind classes over custom CSS
- **Component Export Pattern**: No single main index.ts file - exports distributed across relevant modules

### Architecture Patterns

**Strategy Pattern (Runtime)**: Different workout block types implement `IRuntimeBlockStrategy` for specialized execution behavior.

**Parser-Visitor Pattern**: Chevrotain-generated parser uses visitor pattern to convert syntax into strongly-typed fragment objects.

**Fragment System**: Each parsed component (TimerFragment, RepFragment, EffortFragment, etc.) represents specific workout metrics or actions.

**JIT Compilation**: Scripts are compiled just-in-time into executable runtime blocks via the `JitCompiler.ts` system.

**Runtime Stack**: Stack-based execution environment with constructor initialization and consumer disposal patterns.

### Testing Strategy
- **Unit Tests**: Fast unit tests using Vitest (`npm run test:unit`) - ~2-3 seconds execution
- **Storybook Tests**: Component interaction tests defined in story `play` functions
- **Test Organization**: Test files placed alongside source files with `.test.ts` or `.spec.ts` suffix
- **Baseline Acceptance**: 4 known module failures and 1 integration test failure are accepted as baseline
- **Regression Testing**: Always run `npm run test:unit` after changes to ensure no new failures

### Git Workflow
- **Main Branch**: `main` branch serves as the primary development and release branch
- **Feature Development**: Direct commits to main branch with descriptive commit messages
- **Documentation Publishing**: Markdown files in `/docs` directory auto-published to GitHub Wiki on push to main
- **Change Management**: Use OpenSpec system for significant architectural changes or new features

## Domain Context

**Workout Syntax**: The project uses a specialized DSL (Domain-Specific Language) for defining workouts with components like:
- Timer definitions (e.g., "EMOM 10:00", "AMRAP 20:00")
- Repetition schemes (e.g., "5 rounds", "10 reps")
- Effort metrics (e.g., "moderate", "heavy")
- Movement patterns and exercises

**Runtime Block Types**: Different workout block types include:
- **Timer Blocks**: Time-based workout segments
- **Effort Blocks**: Intensity-based segments
- **Repetition Blocks**: Count-based workout segments
- **Rest Blocks**: Recovery periods

**Performance Targets**: Runtime stack operations are heavily optimized for performance:
- Block push/pop operations: < 1ms
- Current block access: < 0.1ms
- Block disposal: < 50ms

## Important Constraints

**Build Times**: NEVER cancel `npm run build-storybook` - may take up to 60 minutes to complete.

**TypeScript Errors**: 369 existing TypeScript errors are present - only fix errors related to changes being made.

**Playwright Limitations**: `npm run setup` may fail downloading Chromium browsers (expected behavior).

**No ESLint**: Code style is enforced through TypeScript configuration and manual review rather than automated linting.

**Resource Management**: Critical importance on proper disposal patterns for runtime blocks to prevent memory leaks.

**Performance Requirements**: All runtime operations must meet strict performance targets for real-time workout execution.

## External Dependencies

**Monaco Editor**: VS Code editor integration requiring proper language service configuration for syntax highlighting and suggestions.

**Chevrotain Parser Generator**: External dependency for generating the workout syntax parser from grammar definitions.

**Tailwind CSS**: Utility-first CSS framework requiring proper class usage conventions and build optimization.

**GitHub Wiki**: Documentation platform for auto-publishing project documentation from markdown files.
