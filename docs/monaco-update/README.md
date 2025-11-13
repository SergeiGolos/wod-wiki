# Monaco Editor Enhancement - Planning Documentation

## Overview

This directory contains comprehensive research, architectural planning, and implementation guidelines for enhancing the WOD Wiki Monaco editor with a full-page markdown experience, contextual overlays, and inline workout execution.

## Document Index

### 0. [Executive Summary](./00-executive-summary.md) ⭐ **Start Here**
**Purpose:** High-level overview for decision makers and stakeholders.

**Contents:**
- Business value and expected returns
- Technical approach summary
- Risk assessment and mitigation
- Timeline and milestones (Gantt chart)
- Resource requirements
- Go/no-go criteria
- ROI analysis

**Audience:** Executives, product managers, stakeholders making decisions

### 1. [Monaco Widgets Research](./01-monaco-widgets-research.md)
**Purpose:** Technical research on Monaco Editor's widget and overlay capabilities.

**Contents:**
- IContentWidget, IOverlayWidget, and IViewZone APIs
- React integration patterns
- Monaco editor decorations and language features
- Event hooks and lifecycle management
- References and examples

**Audience:** Developers implementing Monaco widgets

### 2. [Architecture Overview](./02-architecture-overview.md)
**Purpose:** High-level system architecture and design decisions.

**Contents:**
- Current vs. proposed architecture diagrams
- Key architectural decisions and rationale
- Component hierarchy and data flow
- File organization structure
- Migration strategy
- Performance considerations

**Audience:** Architects, tech leads, and developers understanding the system design

### 3. [Implementation Plan](./03-implementation-plan.md)
**Purpose:** Phased implementation roadmap with testable increments.

**Contents:**
- 9 implementation phases (Foundation → Polish)
- Detailed task breakdowns with acceptance criteria
- Testing strategies per phase
- Risk mitigation plans
- Timeline estimates (3-4 weeks total)
- Success criteria for MVP and full feature set

**Audience:** Project managers, developers, and QA engineers

### 4. [Component Interfaces](./04-component-interfaces.md)
**Purpose:** TypeScript interface definitions and API contracts.

**Contents:**
- Core data structures (WodBlock, WorkoutResults, ParseError)
- Component props interfaces for all new components
- Hook interfaces and return types
- Context API definitions
- Utility function signatures
- Type exports and backward compatibility

**Audience:** Developers implementing components

### 5. [Integration Patterns](./05-integration-patterns.md)
**Purpose:** Practical patterns and best practices for integration.

**Contents:**
- 10 proven integration patterns with code examples
- Widget lifecycle management
- View zone with React content
- Debounced block detection
- Active block tracking
- Runtime state synchronization
- Content synchronization
- Multiple runtime management
- Performance optimization
- Testing patterns

**Audience:** Developers implementing features and writing tests

## Quick Start Guide

### For Executives and Stakeholders
1. Read [Executive Summary](./00-executive-summary.md) for business case and ROI
2. Review risk assessment and decision criteria
3. Understand resource requirements and timeline

### For Project Managers
1. Read [Executive Summary](./00-executive-summary.md) for overview
2. Read [Implementation Plan](./03-implementation-plan.md) for detailed timeline and milestones
3. Review success criteria and MVP definition
4. Understand risk mitigation strategies

### For Architects
1. Read [Architecture Overview](./02-architecture-overview.md) for system design
2. Review key architectural decisions
3. Understand component relationships and data flow

### For Developers
1. Start with [Monaco Widgets Research](./01-monaco-widgets-research.md) to understand Monaco capabilities
2. Review [Component Interfaces](./04-component-interfaces.md) for API contracts
3. Study [Integration Patterns](./05-integration-patterns.md) for implementation guidance
4. Follow [Implementation Plan](./03-implementation-plan.md) phase by phase

### For QA Engineers
1. Review [Implementation Plan](./03-implementation-plan.md) for acceptance criteria per phase
2. Study testing strategies and manual testing checklists
3. Understand success criteria for validation

## Key Design Principles

### 1. No Breaking Changes
- Existing `WodWiki.tsx` component remains unchanged
- Backward compatibility maintained
- New functionality in separate directory (`src/markdown-editor/`)

### 2. No Parser/Runtime Changes
- Uses existing `MdTimerRuntime` parser
- Uses existing `ScriptRuntime` execution engine
- No modifications to core logic

### 3. Incremental Delivery
- Each phase produces testable functionality
- Early phases can be deployed independently
- MVP defined at Phase 6 (Runtime Integration)

### 4. Component Reuse
- Leverages existing UI components (FragmentVisualizer, ClockAnchor, etc.)
- Consistent UX across tools
- Reduces code duplication

### 5. Test Coverage
- Unit tests for hooks and utilities
- Integration tests for workflows
- Storybook stories for visual components
- Manual testing checklists

## Technology Stack

- **Editor:** Monaco Editor (already integrated via `@monaco-editor/react`)
- **UI Framework:** React 18 with hooks
- **Styling:** Tailwind CSS (existing)
- **Parser:** Chevrotain (existing `MdTimerRuntime`)
- **Runtime:** Existing `ScriptRuntime` and `JitCompiler`
- **Testing:** Vitest + Storybook

## Key Features (After Full Implementation)

### Full-Page Markdown Editor
- Monaco editor in markdown mode
- Free-form content with multiple WOD blocks
- Title line extraction for file naming
- Basic markdown styling support

### Context Overlay (Right Panel)
- Appears when cursor is in WOD block
- Displays parsed fragments (color-coded)
- Fragment editor (add/edit/delete statements)
- Workout controls (start/stop/pause/resume)
- Takes up ~50% of editor width

### Inline View Zones
- Clock display rendered after WOD block end
- Real-time timer updates during workout
- Results table displayed after workout completion
- Multiple zones for multiple blocks

### Multiple WOD Blocks
- Independent parser instances per block
- Independent runtime instances when started
- Each block has its own overlay and zones
- Proper state isolation and memory management

## Architecture Diagrams

### Current State
```
[WodWiki Component] → [Monaco Editor]
       ↓
[RuntimeTestBench] (Separate Tool)
       ↓
[Parser] → [Runtime] → [Clock Display]
```

### Proposed State
```
[MarkdownEditor] → [Monaco Editor (Markdown)]
       ↓
[WodBlockManager] → Detects ```wod blocks
       ↓
Per Block:
  [Parser Instance] → [Overlay Widget] → [Fragment Editor]
                                      ↓
  [Runtime Instance] → [Clock ViewZone]
                    → [Results ViewZone]
```

## Timeline Overview

| Week | Phases | Deliverables |
|------|--------|--------------|
| 1 | Phases 1-3 | Foundation, parser integration, context overlay |
| 2 | Phases 4-5 | Fragment editor, clock view zone |
| 3 | Phases 6-7 | Runtime integration, results display |
| 4 | Phases 8-9 | Multi-block support, polish, documentation |

**Total: 3-4 weeks** of focused development

## Success Metrics

### MVP Success (After Phase 6)
- ✅ Can create markdown documents with WOD blocks
- ✅ Context panel displays parsed workout
- ✅ Can start workouts and view live timer
- ✅ No existing functionality broken
- ✅ All tests passing

### Full Success (After Phase 9)
- ✅ All MVP features
- ✅ Can edit workouts through context panel
- ✅ Results displayed after completion
- ✅ Multiple simultaneous workouts supported
- ✅ Professional polish and documentation
- ✅ Performance meets benchmarks

## Risk Management

### Identified Risks
1. **Monaco widget complexity** → Mitigated by base classes and patterns
2. **State synchronization issues** → Mitigated by thorough testing
3. **Performance with many blocks** → Mitigated by lazy loading
4. **Breaking existing functionality** → Mitigated by parallel implementation

### Mitigation Strategies
- Start simple, iterate incrementally
- Comprehensive test coverage
- Profiling and optimization phase
- No changes to existing components

## Future Considerations

These features are identified but **out of scope** for this plan:

- File persistence and save/load
- Workout library/catalog
- Advanced editing (drag-and-drop)
- Export formats (PDF, print)
- Real-time collaboration
- Mobile native app
- Analytics and progress tracking
- Social features

## Getting Started

### For Contributors
1. Read this README completely
2. Review architecture overview to understand the system
3. Read the implementation plan for your assigned phase
4. Check component interfaces for API contracts
5. Study integration patterns before coding
6. Write tests first, then implementation
7. Create Storybook stories for visual components

### For Reviewers
1. Understand the architecture and design decisions
2. Check that no existing functionality is modified
3. Verify test coverage for new code
4. Ensure TypeScript types are complete
5. Check that Storybook stories demonstrate features
6. Validate performance (no noticeable lag)

## Questions or Feedback

For questions about this plan:
1. Review the specific document related to your question
2. Check the integration patterns for practical examples
3. Refer to the architecture overview for design rationale
4. Consult the implementation plan for phase-specific details

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-13 | Initial comprehensive planning documentation |

## Related Documentation

- [WOD Wiki Runtime Architecture](../runtime-architecture-diagram.md)
- [Syntax and Parser Overview](../syntax-and-parser-overview.md)
- [Runtime Execution Overview](../runtime-execution-overview.md)
- [Vision and Missing Elements](../vision-and-missing-elements.md)

## Maintained By

This planning documentation was created as part of the Monaco Editor enhancement initiative and should be updated as the implementation progresses and design decisions evolve.
