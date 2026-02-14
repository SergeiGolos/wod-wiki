# Architecture Introduction

> **Status**: Draft
> **Last Updated**: 2026-02-14
> **Category**: Architecture Documentation
> **Framework**: arc42

## Purpose

This architecture documentation provides a comprehensive overview of the WOD Wiki system using the arc42 template. It serves as the primary architectural reference for developers, contributors, and technical stakeholders.

## Scope

This documentation covers:

- **Parser System**: Chevrotain-based workout script parsing
- **JIT Compiler**: Strategy pattern-based compilation system
- **Runtime Engine**: Stack-based execution environment
- **Fragment System**: Typed metric collection framework
- **Editor Integration**: Monaco Editor with custom language support

## Intended Audience

- **Developers**: Understanding system design and implementation patterns
- **Contributors**: Making architectural decisions and changes
- **Technical Leads**: Reviewing system architecture
- **AI Agents**: Navigating and understanding the codebase

## Architecture Documentation Structure

This documentation follows the arc42 template with the following sections:

1. **Introduction & Goals** (this document)
2. **[Context and Scope](./01-context-and-scope.md)** - System boundaries and external interfaces
3. **[Solution Strategy](./02-solution-strategy.md)** - Key design decisions and patterns
4. **[Building Blocks](./03-building-blocks.md)** - System decomposition and components
5. **[Runtime View](./04-runtime-view.md)** - Dynamic behavior and execution flows
6. **[Deployment View](./05-deployment-view.md)** - Infrastructure and deployment options

## Architecture Goals

### Primary Goals

1. **Extensibility**: Easy addition of new workout types, behaviors, and fragments
2. **Performance**: Sub-millisecond execution for runtime operations
3. **Type Safety**: Full TypeScript coverage with strict typing
4. **Testability**: Isolated testing of behaviors and runtime blocks
5. **Developer Experience**: Clear patterns and comprehensive tooling

### Quality Attributes

| Attribute | Priority | Target |
|-----------|----------|--------|
| Performance | High | Stack operations < 1ms, disposal < 50ms |
| Maintainability | High | Modular design with clear separation |
| Extensibility | High | Plugin-based strategy pattern |
| Reliability | Medium | Robust error handling and disposal |
| Usability | Medium | Clear APIs and developer tooling |

## Key Architecture Decisions

The following Architecture Decision Records (ADRs) document critical design choices:

- [ADR-001: Chevrotain Parser](../adr/001-chevrotain-parser.md) - Choice of parser generator
- [ADR-002: Stack-Based Runtime](../adr/002-stack-based-runtime.md) - Execution model
- [ADR-003: List-Based Memory](../adr/003-list-based-memory.md) - Memory management approach
- [ADR-004: Constructor Initialization](../adr/004-constructor-initialization.md) - Block lifecycle pattern
- [ADR-005: Consumer Disposal](../adr/005-consumer-disposal.md) - Resource cleanup strategy

## System Overview

WOD Wiki is a React component library that provides:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Editor    │────▶│    Parser    │────▶│  Compiler   │
│  (Monaco)   │     │ (Chevrotain) │     │   (JIT)     │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │   Runtime   │
                                          │   (Stack)   │
                                          └─────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │  Fragments  │
                                          │  (Metrics)  │
                                          └─────────────┘
```

### High-Level Flow

1. **Edit**: User writes workout script in Monaco Editor
2. **Parse**: Chevrotain parser converts text to AST (`CodeStatement[]`)
3. **Compile**: JIT Compiler transforms statements to runtime blocks
4. **Execute**: Runtime Stack manages block lifecycle and execution
5. **Collect**: Fragment System gathers metrics and display data

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Language | TypeScript 5.x | Type-safe development |
| Framework | React 18.x | UI components |
| Parser | Chevrotain 11.x | Workout script parsing |
| Editor | Monaco Editor | Code editing experience |
| Styling | Tailwind CSS | Component styling |
| Testing | Bun Test | Unit and integration tests |
| Build | Bun | Package management and build |
| Docs | Storybook | Component documentation |

## Architecture Principles

### 1. Separation of Concerns

- **Parser** handles syntax transformation only
- **Compiler** manages semantic analysis and code generation
- **Runtime** focuses on execution and state management
- **Components** handle UI rendering and user interaction

### 2. Behavior Composition

Runtime blocks use composable behaviors rather than inheritance:

```typescript
// Good: Composition with behaviors
new BlockBuilder('timer-block')
  .asTimer('up')
  .asContainer()
  .build()

// Avoid: Deep inheritance hierarchies
```

### 3. Strategy Pattern

The JIT Compiler uses pluggable strategies for extensibility:

```typescript
compiler.registerStrategy(new TimerStrategy());
compiler.registerStrategy(new RepStrategy());
compiler.registerStrategy(new ChildrenStrategy());
```

### 4. Constructor-Based Initialization

Blocks initialize during construction, not when pushed to the stack:

```typescript
// Block is fully initialized before push
const block = new RuntimeBlock(config);
stack.push(block); // Already initialized
```

### 5. Consumer-Managed Disposal

The consumer is responsible for calling `dispose()` on popped blocks:

```typescript
const block = stack.pop();
// Consumer must dispose
block?.dispose();
```

## Performance Targets

The runtime system must meet these performance requirements:

| Operation | Target | Rationale |
|-----------|--------|-----------|
| `stack.push()` | < 1ms | Minimal delay during compilation |
| `stack.pop()` | < 1ms | Fast block transitions |
| `stack.current()` | < 0.1ms | Frequent access during rendering |
| `block.dispose()` | < 50ms | Acceptable for cleanup |
| JIT Compilation | < 100ms | For typical workout scripts |

## Constraints

### Technical Constraints

- **Browser Only**: No server-side runtime execution
- **ES2020+**: Modern JavaScript features required
- **React 18+**: Hooks and concurrent features
- **No CSS Files**: Tailwind utility classes only

### Design Constraints

- **No Inheritance**: Favor composition over inheritance
- **Immutable AST**: Parser output is read-only
- **Strict Types**: All public APIs must be fully typed
- **No Side Effects**: Pure functions where possible

## Related Documentation

- [Building Blocks](./03-building-blocks.md) - Detailed component descriptions
- [Runtime View](./04-runtime-view.md) - Execution flow diagrams
- [Memory System Design](../guides/working-with-memory.md) - Memory architecture
- [Test Harness Guide](../how-to/use-test-harness.md) - Testing patterns

## Glossary

| Term | Definition |
|------|------------|
| **AST** | Abstract Syntax Tree - parsed representation of workout script |
| **Block** | Runtime execution unit implementing `IRuntimeBlock` |
| **Behavior** | Composable unit of functionality implementing `IRuntimeBehavior` |
| **Fragment** | Typed data structure for metrics and display (`ICodeFragment`) |
| **Strategy** | Compiler plugin implementing `IRuntimeBlockStrategy` |
| **Stack** | Execution environment managing block lifecycle |
| **JIT** | Just-In-Time compilation from AST to runtime blocks |

## Feedback and Updates

This documentation is a living document. To suggest improvements:

1. Open an issue with the `documentation` label
2. Submit a PR with proposed changes
3. Contact the documentation team

---

**Next**: [Context and Scope](./01-context-and-scope.md) →
