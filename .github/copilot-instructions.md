# Wod.Wiki Grounding Instructions

## Project Overview

Wod.Wiki is a specialized React component library for parsing, displaying, and executing workout definitions using a custom markdown-like syntax. It includes a Monaco Editor integration for workout script editing, a sophisticated runtime engine for execution, and components styled with Tailwind CSS.

## Tech Stack

- **Core Technologies**:
  - React 18 with TypeScript
  - RxJS for reactive event streams in the runtime system
  - Vite as the build system
  - Tailwind CSS for styling
  - Monaco Editor for code editing
  - Storybook for component development
  - Vitest for unit testing

## Architecture

### Core Components

1. **Editor** (Monaco-based)
   - Custom syntax highlighting via `WodWikiSyntaxInitializer` and `SemanticTokenEngine`
   - Context-aware suggestions via `SuggestionEngine`
   - Real-time validation and parsing

2. **Parser/Compiler Pipeline**
   - **Lexer**: Tokenizes workout text (`timer.tokens.ts`, using Chevrotain)
   - **Parser**: Creates AST from tokens (`timer.parser.ts`)
   - **Interpreter/Visitor**: Transforms AST into `PrecompiledNode` structures (`timer.visitor.ts`)
   - Outputs a `WodRuntimeScript` for execution

3. **Runtime Engine**
   - **Just-In-Time Compilation**: `RuntimeJit` dynamically compiles nodes into executable blocks
   - **Block-based Component Model**: Various `IRuntimeBlock` implementations for different workout constructs
   - **Event-Driven Architecture**: Processes events and generates actions
   - **Stack-based Execution**: `RuntimeStack` manages active blocks
   - Uses Strategy pattern for block compilation (`IRuntimeBlockStrategy` implementations)
   - Uses Template Method pattern in `RuntimeBlock` for lifecycle control

4. **Metrics System**
   - Collects, aggregates, and manages workout performance data
   - Uses `RuntimeMetric`, `ResultSpan`, and `MetricsContext` objects

5. **Chromecast Integration**
   - Sender components for the main application
   - Receiver components for display on Chromecast devices
   - Communication via custom events

## Code Style Guidelines

1. **TypeScript Best Practices**:
   - Use strict typing with interfaces and type definitions
   - Prefer interfaces for public APIs
   - Use discriminated unions for complex types
   - Keep code modular with small, focused files

2. **React Patterns**:
   - Prefer functional components with hooks
   - Use context for state that needs to be widely available
   - Implement custom hooks for reusable logic
   - Follow React's unidirectional data flow

3. **Project-Specific Patterns**:
   - Use RxJS Observables for event streams
   - Implement Strategy pattern for polymorphic behavior
   - Use Template Method pattern for common workflows with specialized hooks
   - Follow the Event-Action-State update pattern in the runtime engine

4. **File Structure**:
   - Group related components and functionality together
   - Use index files for clean exports
   - Place interfaces and types in dedicated files or alongside their implementations

## Core Abstractions

- `IRuntimeBlock`: Represents executable workout segments
- `IRuntimeAction`: Operations that modify runtime state or trigger side effects
- `RuntimeMetric`: Data structure for workout measurements
- `ResultSpan`: Results of workout execution with timing and metrics
- `BlockKey`: Hierarchical identifier for blocks in the execution tree

## Testing Approach

- Unit tests with Vitest
- Component testing with Storybook
- Focus on pure function testing for core logic
- Use snapshot tests for UI components

## Documentation Standards

- Use JSDoc-style comments for public APIs
- Document complex algorithms with implementation details
- Maintain dedicated markdown docs in the `docs` directory
- Include examples for non-trivial components

## Extension Points

When extending the system:

1. For new workout elements:
   - Add tokens to the lexer
   - Update the parser for new syntax
   - Create new `IRuntimeBlock` implementations if needed
   - Implement new `IRuntimeBlockStrategy` types
   - Add new actions if required

2. For metrics extensions:
   - Extend `RuntimeMetric` structure
   - Update reader functions and blocks

3. For UI enhancements:
   - Add new actions and handle them in the UI layer
   - Follow existing component patterns and styling

## Preferred Libraries and Tools

- RxJS for event streams and reactive programming
- Chevrotain for parsing
- Monaco Editor for code editing
- Tailwind CSS for styling
- Headless UI for accessible components
