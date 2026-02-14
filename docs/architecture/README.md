# Architecture Documentation

> **Framework**: arc42
> **Status**: Phase 1 Complete
> **Last Updated**: 2026-02-14

## Overview

This directory contains the architectural documentation for the WOD Wiki system following the arc42 template. The documentation is structured to provide comprehensive coverage of system design, patterns, and decisions.

## Documentation Structure

### Core arc42 Sections

| Section | Document | Description |
|---------|----------|-------------|
| 0 | [Introduction](./00-introduction.md) | Overview, goals, and architecture principles |
| 1 | [Context and Scope](./01-context-and-scope.md) | System boundaries and external interfaces |
| 2 | [Solution Strategy](./02-solution-strategy.md) | Key design decisions and patterns |
| 3 | [Building Blocks](./03-building-blocks.md) | Component descriptions and interfaces |
| 4 | [Runtime View](./04-runtime-view.md) | Dynamic behavior and execution flows |
| 5 | [Deployment View](./05-deployment-view.md) | Infrastructure and deployment options |

### Additional Resources

- **[ADRs](../adr/)**: Architecture Decision Records for key decisions
- **[Diagrams](./diagrams/)**: C4 model diagrams (placeholders for Phase 1)
- **[Guides](../guides/)**: Implementation guides and best practices
- **[API Reference](../api/)**: Detailed API documentation (Phase 2)

## Quick Navigation

### By Audience

**New Developers**
1. Start with [Introduction](./00-introduction.md) for overview
2. Read [Context and Scope](./01-context-and-scope.md) for system boundaries
3. Review [Building Blocks](./03-building-blocks.md) for component details

**Contributors**
1. Read [Solution Strategy](./02-solution-strategy.md) for design patterns
2. Check [ADRs](../adr/) for architectural decisions
3. Review [Runtime View](./04-runtime-view.md) for execution flows

**Technical Leads**
1. Review all sections for comprehensive understanding
2. Focus on [Solution Strategy](./02-solution-strategy.md) for decision rationale
3. Check [Deployment View](./05-deployment-view.md) for infrastructure

### By Topic

**Parser System**
- [Building Blocks: Parser Subsystem](./03-building-blocks.md#parser-subsystem)
- [Solution Strategy: Chevrotain Parser](./02-solution-strategy.md#1-chevrotain-parser-generator)
- ADR-001: Chevrotain Parser (pending)

**Runtime Engine**
- [Building Blocks: Runtime Subsystem](./03-building-blocks.md#runtime-subsystem)
- [Runtime View: Block Lifecycle](./04-runtime-view.md#scenario-2-block-lifecycle-execution)
- [Solution Strategy: Stack-Based Runtime](./02-solution-strategy.md#2-stack-based-runtime-execution)
- ADR-002: Stack-Based Runtime (pending)

**JIT Compiler**
- [Building Blocks: Compiler Subsystem](./03-building-blocks.md#compiler-subsystem)
- [Runtime View: Parse and Compile](./04-runtime-view.md#scenario-1-parse-and-compile-workflow)
- [Solution Strategy: Strategy Pattern](./02-solution-strategy.md#3-jit-compilation-with-strategy-pattern)

**Memory System**
- [Building Blocks: Memory System](./03-building-blocks.md#memory-system)
- [Runtime View: Memory Subscription](./04-runtime-view.md#scenario-4-memory-subscription-flow)
- [Solution Strategy: List-Based Memory](./02-solution-strategy.md#5-list-based-memory-system)
- ADR-003: List-Based Memory (pending)

**Behavior System**
- [Building Blocks: Behavior System](./03-building-blocks.md#behavior-system)
- [Solution Strategy: Behavior Composition](./02-solution-strategy.md#4-behavior-composition-over-inheritance)
- [Runtime View: Child Block Execution](./04-runtime-view.md#scenario-3-child-block-execution)

## Architecture Principles

### Core Principles

1. **Separation of Concerns**: Clear boundaries between parser, compiler, and runtime
2. **Composition Over Inheritance**: Behaviors compose rather than inherit
3. **Strategy Pattern**: Pluggable compilation strategies
4. **Explicit Resource Management**: Consumer-managed disposal
5. **Type Safety**: Full TypeScript with strict mode

### Design Patterns

- **Strategy Pattern**: Compiler strategies for extensibility
- **Builder Pattern**: BlockBuilder for fluent construction
- **Observer Pattern**: Memory subscriptions for React integration
- **Composite Pattern**: Nested block structures

## Quality Attributes

| Attribute | Priority | Target | Status |
|-----------|----------|--------|--------|
| Performance | High | Stack ops < 1ms | ✅ Met |
| Type Safety | High | 100% TypeScript | ✅ Met |
| Extensibility | High | Plugin strategies | ✅ Met |
| Testability | High | Isolated testing | ✅ Met |
| Maintainability | Medium | Clear patterns | ✅ Met |

## Technology Stack

- **Language**: TypeScript 5.x
- **Framework**: React 18.x
- **Parser**: Chevrotain 11.x
- **Editor**: Monaco Editor
- **Styling**: Tailwind CSS
- **Testing**: Bun Test
- **Build**: Bun

## Roadmap

### Phase 1: Foundation ✅ (Complete)

- [x] arc42 section templates
- [x] Architecture overview
- [x] System context and scope
- [x] Solution strategy
- [x] Building blocks
- [x] Runtime view
- [x] Deployment view
- [x] Directory structure
- [ ] C4 diagrams (placeholders)
- [ ] ADR templates (Phase 1.2)

### Phase 2: API Reference (Next)

- [ ] Core API documentation
- [ ] JSDoc comments
- [ ] Fragment system docs
- [ ] Memory system deep dive

### Phase 3: Tutorials & Guides

- [ ] Getting started tutorial
- [ ] Developer tutorials
- [ ] How-to guides
- [ ] VSCode CodeTours

## Contributing

To improve this documentation:

1. **Small Updates**: Edit files directly and submit PR
2. **New Sections**: Follow arc42 template structure
3. **Diagrams**: Add to `diagrams/` directory
4. **ADRs**: Create in `../adr/` directory

See [Documentation Standards](../contributing/documentation-standards.md) (Phase 7)

## Related Documentation

- **[AGENTS.md](../../AGENTS.md)**: Project overview for AI agents
- **[CLAUDE.md](../../CLAUDE.md)**: Claude-specific guidance
- **[README.md](../../README.md)**: Project introduction
- **[DOCUMENTATION-REBUILD-PLAN.md](../DOCUMENTATION-REBUILD-PLAN.md)**: Documentation strategy

## Feedback

For questions or suggestions:

1. Open an issue with `documentation` label
2. Join discussion in GitHub Discussions
3. Submit PR with improvements

---

**Status**: Phase 1 of 7 complete (Foundation & Architecture)
**Next**: Phase 2 - API Reference & Domain Documentation
