<!--
Sync Impact Report:
Version change: (unspecified) → 1.0.0
Modified principles: N/A (new constitution)
Added sections: All sections (new constitution)
Removed sections: N/A (new constitution)
Templates requiring updates: ✅ plan-template.md (aligned), ✅ spec-template.md (aligned), ✅ tasks-template.md (aligned)
Follow-up TODOs: N/A
-->

# WOD Wiki Constitution

## Core Principles

### I. Component-First Architecture
Every feature MUST be developed as reusable React components; Components must be self-contained, independently testable, and documented using Storybook; Clear purpose required - no organizational-only components. Components MUST follow the library-first approach where functionality is encapsulated and exposed through well-defined interfaces.

### II. Storybook-Driven Development
Every component MUST be developed and validated in Storybook first; Component state variations MUST be captured as distinct stories; Interactive controls MUST be provided for all configurable props; Visual regression tests MUST pass before integration. Storybook serves as the primary development environment and component catalog.

### III. Parser-First Domain Logic (NON-NEGOTIABLE)
All workout syntax features MUST start with parser implementation using Chevrotain; Token definitions MUST precede parser rules; Visitor patterns MUST transform parse trees to internal representations; Parser tests MUST fail before any runtime implementation. Red-Green-Refactor cycle strictly enforced for language features.

### IV. JIT Compiler Runtime
Workout execution MUST use Just-In-Time compilation; Runtime blocks MUST follow constructor-based initialization and consumer-managed disposal patterns; Performance targets MUST be met (push/pop < 1ms, dispose() < 50ms); Memory management MUST be explicit with proper disposal patterns. Runtime stack operations are performance-critical and MUST be optimized.

### V. Monaco Editor Integration
Workout editing MUST use Monaco Editor with custom syntax highlighting; Semantic tokens MUST provide real-time feedback; Auto-completion MUST align with parser grammar; Error diagnostics MUST match parser error messages. Editor experience MUST feel native to the workout domain.

## Technology Standards

### Development Stack
TypeScript is MANDATORY for all new code; React 18+ with functional components and hooks; Tailwind CSS for styling (no custom CSS unless absolutely necessary); Vitest for unit testing; Playwright for end-to-end testing; npm as package manager.

### Performance Requirements
All runtime operations MUST meet strict performance targets; JIT compilation MUST complete within milliseconds for typical workout scripts; Memory leaks MUST be prevented through proper disposal patterns; UI interactions MUST remain responsive (<100ms perceived latency).

### Code Quality
TypeScript strict mode MUST be enabled; All public APIs MUST have comprehensive TypeScript interfaces; Components MUST be fully typed including props and state; Error handling MUST be robust with meaningful error messages.

## Development Workflow

### Feature Development Process
1. Parser development first (tokens → rules → visitor)
2. Storybook component development with comprehensive stories
3. JIT compiler runtime implementation following performance patterns
4. Integration testing with real workout scenarios
5. Documentation updates in docs/ directory

### Quality Gates
All Storybook builds MUST complete successfully; Unit tests MUST pass with no regressions; Integration tests MUST validate end-to-end workout execution; Performance tests MUST verify runtime targets; Documentation MUST be updated and links validated.

### Code Review Requirements
All pull requests MUST review compliance with constitutional principles; TypeScript errors related to changes MUST be fixed; Performance-critical code MUST be validated against targets; Parser changes MUST include corresponding test updates; Component changes MUST include Storybook updates.

## Governance

This constitution supersedes all other development practices and guidelines. Amendments require documentation, approval, and migration plan. All development decisions MUST be traceable to constitutional principles. Templates and automation tools MUST be updated to reflect constitutional requirements.

**Compliance Review**: Every pull request and feature implementation MUST verify constitutional compliance. Complexity deviations MUST be explicitly justified in Complexity Tracking sections. Templates (.specify/templates/) MUST align with constitutional principles.

**Amendment Process**:
1. Proposal with clear rationale and impact analysis
2. Template consistency review and updates
3. Version increment following semantic versioning
4. Migration plan for existing code and documentation

**Version**: 1.0.0 | **Ratified**: 2025-10-03 | **Last Amended**: 2025-10-03