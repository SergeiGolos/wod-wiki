# Research: Children Groups for Workout Statement Hierarchy

## Overview
Research findings for implementing grouped children in ICodeStatement interface to support consecutive compose lap fragment grouping.

## Key Decisions

### Decision: Interface Structure Change
**Chosen**: Change `children: number[]` to `children: number[][]` in ICodeStatement
**Rationale**: 
- Minimal change that preserves existing functionality
- Allows grouping consecutive compose fragments while maintaining individual arrays for round/repeat
- Maintains sequential order of child groups
- Enables runtime to process logical units efficiently

**Alternatives considered**:
- Adding separate `childGroups` property - rejected due to redundancy
- Complex nested object structure - rejected due to over-engineering
- Flat array with group markers - rejected due to parsing complexity

### Decision: Grouping Logic Implementation
**Chosen**: Modify `MdTimerInterpreter.wodMarkdown()` to perform grouping after parent-child relationships are established
**Rationale**:
- Leverages existing lap fragment detection logic
- Maintains current parsing flow with minimal disruption
- Groups consecutive compose fragments in a single pass

**Alternatives considered**:
- Grouping during initial parsing - rejected due to complexity with parent-child establishment
- Post-processing step - rejected as grouping fits naturally in existing logic

### Decision: Backward Compatibility Strategy
**Chosen**: Update all consumers to handle `number[][]` instead of `number[]`
**Rationale**:
- Single-element arrays preserve existing behavior (e.g., `[child1]` instead of `child1`)
- Clear migration path for existing code
- Maintains type safety with TypeScript

**Alternatives considered**:
- Dual interface support - rejected due to maintenance burden
- Gradual migration - rejected as scope is limited and manageable

## Technical Patterns

### Grouping Algorithm Pattern
```typescript
// Consecutive compose fragments: + child3, + child4 → [3, 4]
// Individual fragments: - child1, child2, child5 → [1], [2], [5]
// Example result: [[1], [2], [3, 4], [5]]
```

### Consumer Update Pattern
```typescript
// Before: child: number
// After: childGroup: number[] (single element for individual children)
```

## Implementation Approach

### Phase 1: Interface and Type Updates
1. Update ICodeStatement interface in `CodeStatement.ts`
2. Update all TypeScript consumers to handle `number[][]`
3. Identify files that access `.children` property

### Phase 2: Parser Logic Modification
1. Modify `MdTimerInterpreter.wodMarkdown()` grouping logic
2. Implement consecutive compose fragment detection
3. Create grouped arrays while preserving order

### Phase 3: Testing and Validation
1. Unit tests for new grouping behavior
2. Storybook stories demonstrating grouping
3. Regression tests for existing functionality

## Dependencies and Constraints

### Dependencies
- Existing `LapFragment` types and logic
- Current parent-child relationship establishment in `wodMarkdown()`
- TypeScript compilation for type safety

### Constraints
- Preserve existing parsing behavior for non-compose fragments
- Maintain sequential order of child groups
- No changes to user-facing syntax
- Minimal performance impact on parsing

## Risk Assessment

### Low Risk
- Interface change is internal and well-defined
- Grouping logic is deterministic and testable
- No user-facing syntax changes

### Medium Risk
- Need to identify and update all consumers of `.children` property
- Ensure proper handling of edge cases (empty groups, single elements)

### Mitigation Strategies
- Comprehensive TypeScript compilation to catch consumer issues
- Unit tests covering all grouping scenarios
- Gradual implementation with tests-first approach

## Validation Criteria

### Success Metrics
1. All existing tests continue to pass
2. New grouping behavior works as specified in acceptance scenarios
3. TypeScript compilation succeeds with no new errors
4. Storybook stories demonstrate expected behavior

### Testing Strategy
1. Unit tests for `MdTimerInterpreter.wodMarkdown()` grouping logic
2. Integration tests with sample workout syntax
3. Regression tests ensuring existing functionality preserved
4. Edge case tests (empty children, mixed fragment types)