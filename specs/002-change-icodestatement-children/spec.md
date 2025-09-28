# Feature Specification: Children Groups for Workout Statement Hierarchy

**Feature Branch**: `002-change-icodestatement-children`  
**Created**: September 28, 2025  
**Status**: Draft  
**Input**: User description: "Change ICodeStatement children property from number[] to number[][] to support children groups, where consecutive compose lap fragments are grouped together in arrays"

## Execution Flow (main)
```
1. Parse user description from Input
   → User wants to modify ICodeStatement interface children property structure
2. Extract key concepts from description
   → Actors: Parser system, workout statement hierarchy
   → Actions: Group consecutive compose lap fragments, maintain existing round/repeat grouping
   → Data: ICodeStatement interface, LapFragment parsing logic
   → Constraints: Preserve existing functionality while enabling grouping
3. No unclear aspects identified - technical specification is clear
4. Fill User Scenarios & Testing section
   → Parser processes workout syntax with mixed lap fragment types
5. Generate Functional Requirements
   → All requirements are testable against parser output
6. Identify Key Entities
   → ICodeStatement, LapFragment, timer.visitor parsing logic
7. Run Review Checklist
   → Specification is technically focused but clear in requirements
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT the parser needs to produce and WHY grouping is beneficial
- ❌ Avoid implementation details beyond interface structure changes
- 👥 Written for developers working with the workout parsing system

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a workout parser system, I need to group consecutive compose lap fragments together while keeping other fragment types as individual references, so that related workout components can be processed as logical units in the execution runtime.

### Acceptance Scenarios
1. **Given** a workout with mixed lap fragment types like "- child1, child2, + child3, + child4, child5, + child6", **When** the parser processes the parent-child relationships, **Then** children should be grouped as [[1], [2], [3,4], [5], [6]]
2. **Given** a workout with only round/repeat fragments (- or no prefix), **When** the parser processes relationships, **Then** each child should remain in its own array group
3. **Given** a workout with only compose fragments (+), **When** the parser processes relationships, **Then** all consecutive compose fragments should be grouped into a single array

### Edge Cases
- What happens when a single compose fragment is surrounded by round fragments?
- How does the system handle empty children arrays?
- What occurs when there are no lap fragments at all?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST change ICodeStatement.children from number[] to number[][] to support grouped child references
- **FR-002**: Parser MUST group consecutive compose lap fragments ("+") into single arrays within children
- **FR-003**: Parser MUST place round lap fragments ("-") and repeat fragments (no prefix) as individual arrays with single elements
- **FR-004**: System MUST maintain existing parent-child relationship logic while implementing new grouping behavior
- **FR-005**: Parser MUST preserve the sequential order of child groups as they appear in the source

### Key Entities *(include if feature involves data)*
- **ICodeStatement**: Core statement interface with id, parent, children (now number[][]), fragments, isLeaf, and meta properties
- **LapFragment**: Fragment representing lap type ('compose', 'round', 'repeat') with associated symbol and metadata
- **MdTimerInterpreter**: Visitor class responsible for parsing workout syntax and building statement hierarchy

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details beyond interface structure
- [x] Focused on parser behavior and data structure needs
- [x] Written for developers working with the system
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable against parser output
- [x] Success criteria are measurable through test cases
- [x] Scope is clearly bounded to interface and parsing changes
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
