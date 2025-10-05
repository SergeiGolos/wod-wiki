# Feature Specification: JIT Compiler Strategy Implementation and Runtime Block Advancement

**Feature Branch**: `009-jit-compiler-strategy`  
**Created**: October 5, 2025  
**Status**: Draft  
**Input**: User description: "JIT Compiler Strategy Implementation and Runtime Block Advancement Analysis - Executive Summary and Introduction: The WOD Wiki runtime system implements a Just-In-Time (JIT) compilation architecture designed to transform parsed workout script statements into executable runtime blocks on-demand. The current implementation exhibits a critical deficiency: the demo interface displays only idle RuntimeBlock instances in the stack, failing to advance beyond the root block to compile and execute the first child statement from the parsed workout script."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature involves fixing JIT compiler demo behavior
2. Extract key concepts from description
   → Actors: Runtime system, JIT compiler, runtime blocks, strategies
   → Actions: compile statements, advance blocks, match patterns, display state
   → Data: workout scripts, code statements, fragments, runtime stack
   → Constraints: execution order, strategy precedence, type discrimination
3. For each unclear aspect:
   → Performance targets not specified
   → Backward compatibility requirements unclear
4. Fill User Scenarios & Testing section
   → User flow: Developer clicks "Next Block" to advance workout execution
5. Generate Functional Requirements
   → Requirements focused on compilation, matching, advancement
6. Identify Key Entities
   → Strategies, Blocks, Fragments, Behaviors
7. Run Review Checklist
   → WARN "Spec has uncertainties about performance and compatibility"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a **workout application developer** testing the WOD Wiki runtime system, I need to **observe the JIT compiler correctly transforming parsed workout statements into specialized runtime blocks** so that I can **verify the execution engine properly advances through different workout structures** (AMRAP, For Time, EMOM, Tabata, etc.) and **validate that each block type displays its correct state in the demo interface**.

### Acceptance Scenarios

1. **Given** a parsed workout script is loaded into the runtime demo, **When** the developer clicks the "Next Block" button, **Then** the runtime stack should display a second block with a type-specific name (not generic "Runtime (Idle)")

2. **Given** an AMRAP workout script (time-bound rounds), **When** the JIT compiler processes the root statement, **Then** a timer-based parent block should be created and pushed to the stack

3. **Given** a "For Time" workout script (bounded rounds without timer), **When** the JIT compiler processes the root statement, **Then** a rounds-based parent block should be created and pushed to the stack

4. **Given** a simple effort statement (single exercise with reps), **When** the JIT compiler processes the statement and no timer/rounds modifiers exist, **Then** an effort block should be created as the fallback block type

5. **Given** a parent block with multiple child statements, **When** the block advances to the next child, **Then** the child statement should be compiled and pushed onto the stack with appropriate behaviors for further advancement

6. **Given** multiple strategy types are registered in the compiler, **When** a statement is compiled, **Then** strategies should be evaluated in precedence order (most specific to most general) until a match is found

7. **Given** the runtime demo interface displays the current stack, **When** different block types are present, **Then** each block should display its specific type name and current state (not all showing as "Idle")

### Edge Cases

- What happens when a statement contains both timer AND rounds fragments? → Reject as ambiguous syntax requiring user clarification
- How does the system handle malformed statements that don't match any strategy? → Create generic error block with diagnostic information
- What happens when the stack reaches maximum depth or runs out of child statements? → Stack has no maximum depth limit; relies on memory constraints
- How should the system behave if a strategy's compile method fails or returns null?
- What happens when behaviors cannot be propagated to child blocks?

## Requirements

### Functional Requirements

**Strategy Matching and Compilation**
- **FR-001**: System MUST evaluate registered strategies in a defined precedence order (most specific patterns before generic patterns); first matching strategy compiles the statement, subsequent strategies are not evaluated
- **FR-002**: System MUST match strategies based on the presence or absence of specific fragment types in code statements (timer fragments, rounds fragments, effort fragments)
- **FR-003**: Strategies MUST NOT match statements they are not designed to handle (e.g., effort strategy must match only when !hasTimer && !hasRounds; timer strategy must match only when hasTimer; rounds strategy must match only when hasRounds)
- **FR-004**: System MUST compile matching statements into specialized block types that reflect the workout structure
- **FR-005**: System MUST use a fallback strategy that matches any statement when no specific strategy matches

**Runtime Block Advancement**
- **FR-006**: System MUST advance the current block's child index when a "next" event is triggered
- **FR-007**: System MUST compile the next child statement using the JIT compiler when advancing
- **FR-008**: System MUST push newly compiled child blocks onto the runtime stack
- **FR-009**: Compiled child blocks MUST receive appropriate behaviors to enable further compilation if they have children
- **FR-010**: System MUST prevent advancement beyond the last child statement in a block

**Block Type Differentiation**
- **FR-011**: Runtime blocks MUST be identifiable by type (timer blocks, rounds blocks, effort blocks, generic blocks)
- **FR-012**: Block type information MUST be accessible to the demo interface for display purposes
- **FR-013**: Each block type MUST display a meaningful name (not generic "Runtime" for all types)
- **FR-014**: Block type values MUST use PascalCase format matching fragment type names: "Timer" for timer strategies, "Rounds" for rounds strategies, "Effort" for effort strategies (e.g., `new RuntimeBlock(..., "Timer")` not "timer-block" or "TimerBlock")

**Fragment-Based Pattern Recognition**
- **FR-015**: System MUST correctly identify timer fragments in parsed statements
- **FR-016**: System MUST correctly identify rounds fragments in parsed statements
- **FR-017**: System MUST correctly identify effort fragments (exercise definitions) in parsed statements
- **FR-018**: Fragment identification MUST be based on fragment type properties, not runtime metrics

**Behavior Propagation**
- **FR-019**: Compiled blocks with child statements MUST receive child advancement behavior (via constructor injection: pass ChildAdvancementBehavior instance to RuntimeBlock constructor)
- **FR-020**: Compiled blocks with child statements MUST receive lazy compilation behavior (via constructor injection: pass LazyCompilationBehavior instance to RuntimeBlock constructor)
- **FR-021**: Behavior composition MUST enable recursive compilation of nested workout structures
- **FR-022**: System MUST maintain behavior state across multiple advancement operations

**Demo Interface Display**
- **FR-023**: Demo interface MUST display all blocks currently on the runtime stack
- **FR-024**: Each displayed block MUST show its type-specific name
- **FR-025**: Each displayed block MUST show its current state (idle, executing, completed, etc.)
- **FR-026**: Demo interface MUST update the stack display when blocks are pushed or popped
- **FR-027**: Demo interface MUST provide a "Next Block" button to trigger advancement events

### Non-Functional Requirements

- **NFR-001**: Strategy matching MUST complete with no specific performance targets required (demo-only validation)
- **NFR-002**: Maintainability MUST follow existing patterns: strategy pattern with interface-based contracts, constructor-based initialization for runtime blocks, behavior composition using passed instances (no inheritance), TDD with contract tests before implementation
- **NFR-003**: Block compilation MUST NOT cause memory leaks (stack has no maximum depth limit, relies on memory constraints)

### Key Entities

- **Strategy**: A pattern-matching and compilation rule that identifies specific workout structure types (timer-based, rounds-based, effort-based) and produces corresponding specialized runtime blocks
  - Evaluates code statements to determine if they match its pattern
  - Has a defined precedence in the evaluation order
  - Produces typed blocks when matched

- **Runtime Block**: An executable unit representing a portion of a workout script, containing source statement information, execution behaviors, and child management capabilities
  - Has a specific type (timer, rounds, effort, generic)
  - Contains zero or more child statements to be compiled
  - Maintains current execution state (idle, executing, completed)
  - Can advance to next child and trigger compilation

- **Fragment**: A parsed token from a workout script statement representing a specific workout element (timer duration, round count, exercise definition)
  - Has a type identifier (timer, rounds, effort, etc.)
  - Contains parsed values (durations, counts, names)
  - Used by strategies for pattern matching

- **Behavior**: A reusable execution capability attached to runtime blocks that implements specific advancement or compilation logic
  - Child Advancement Behavior: tracks position in child array, increments index
  - Lazy Compilation Behavior: retrieves current child, invokes JIT compiler, returns compiled block
  - Can be composed to create complex block capabilities

- **Runtime Stack**: An ordered collection of runtime blocks representing the current execution path through a workout script
  - Contains root block and all active child blocks
  - Grows when child blocks are compiled and pushed
  - Shrinks when blocks complete and are popped
  - Current block is at top of stack

### Success Criteria

- **SC-001**: Developer can click "Next Block" in demo and observe a second block added to the stack display
- **SC-002**: AMRAP workout examples compile into timer-based parent blocks with effort children
- **SC-003**: "For Time" workout examples compile into rounds-based parent blocks with effort children
- **SC-004**: Simple effort statements compile into effort blocks when no timer/rounds modifiers present
- **SC-005**: Demo interface displays distinct block type names (not all showing "Runtime (Idle)")
- **SC-006**: Console logs show strategy matching occurring with correct precedence order
- **SC-007**: Compiled child blocks can be further advanced if they contain children
- **SC-008**: All existing workout examples in stories compile correctly with new strategy system

### Dependencies and Assumptions

**Dependencies**
- Parsed workout scripts must be available as ICodeStatement instances with populated fragments arrays
- Demo interface must be capable of displaying runtime stack state
- Event system must properly propagate Next events to current block
- Action system must correctly execute push operations on runtime stack

**Assumptions**
- Fragment type system is complete and stable
- The demo interface provides a mechanism for triggering block advancement events
- Stack visualization components exist and can display block information
- RuntimeBlock remains a single concrete class; block type differentiation uses blockType string parameter (no subclass hierarchy needed)
- Block compilation occurs on-demand through behavior composition
- Strategy evaluation order can be controlled through registration sequence
- Behavior instances can be safely reused across multiple block instances
- Demo is for development validation, not production use (no specific performance targets required)
- Runtime stack has no maximum depth limit (relies on memory constraints)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (6 clarifications identified)
- [x] User scenarios defined
- [x] Requirements generated (27 functional, 3 non-functional)
- [x] Entities identified (5 key entities)
- [x] Review checklist passed

---

## Clarifications

### Session 2025-10-05

- Q: Strategy Precedence for Conflicting Modifiers: When a workout statement contains both timer AND rounds fragments, which modifier should take precedence? → A: Reject as ambiguous syntax requiring user clarification
- Q: Error Handling for Unmatchable Statements: When a parsed statement doesn't match any registered strategy (including the fallback), how should the system handle this error? → A: Create generic error block with diagnostic information
- Q: Performance Targets: What are the acceptable performance thresholds for JIT compilation operations? → A: No specific performance targets required for demo
- Q: Fragment Schema Stability: Is the current fragment type system considered complete and stable? → A: Schema is finalized - no changes expected
- Q: Maximum Stack Depth: What should be the maximum allowed depth for the runtime stack? → A: No limit (rely on memory constraints)

## Resolved Questions

- Q: Block Class Hierarchy Design → A: RuntimeBlock remains a single concrete class with `blockType: string` constructor parameter. No subclass hierarchy required (simpler implementation, aligns with existing patterns, sufficient type discrimination for UI display)
- Q: Backward Compatibility → A: Strategy system maintains full compatibility with existing parsed scripts (uses existing ICodeStatement and FragmentType structures without modification)

---
