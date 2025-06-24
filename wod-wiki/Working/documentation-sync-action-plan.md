---
title: "Documentation Sync Action Plan"
date: 2025-06-19
tags: [action-plan, documentation, sync]
related: 
  - ./documentation-drift-analysis.md
  - ./proposed-iscript-documentation-update.md
  - ./icodefragment-evolution-analysis.md
status: action-plan
---

# Documentation Sync Action Plan

This document provides a prioritized action plan to address the documentation drift identified between the current implementation and Core design documents.

## Summary of Issues

Based on analysis in [Documentation Drift Analysis](./documentation-drift-analysis.md), the main areas requiring attention are:

1. **IScript Interface** - Typos, missing properties, unimplemented methods
2. **ICodeFragment Evolution** - Architectural changes not reflected in docs
3. **Implementation Gaps** - Critical `from()` method not implemented

## Priority 1: Critical Fixes (Immediate)

### 1.1 Fix IScript Documentation Errors
**Target**: [IScript Core Documentation](../Core/IScript.md)

**Actions**:
- [ ] Fix typo: "Soruce" → "source"
- [ ] Fix case: "Statements" → "statements"
- [ ] Add missing `errors?: any[]` property
- [ ] Add method parameter descriptions

**Expected Time**: 15 minutes

### 1.2 Document Implementation Status
**Target**: [IScript Core Documentation](../Core/IScript.md)

**Actions**:
- [ ] Mark `from()` method as "Not yet implemented"
- [ ] Add implementation priority note
- [ ] Document the impact on runtime execution

**Expected Time**: 10 minutes

## Priority 2: Architectural Documentation (This Week)

### 2.1 Update ICodeFragment Documentation
**Target**: [ICodeFragment Core Documentation](../Core/ICodeFragment.md)

**Actions**:
- [ ] Document "pure data interface" design decision
- [ ] Clarify `type` vs `fragmentType` migration
- [ ] Remove references to deprecated methods
- [ ] Add architectural design section

**Expected Time**: 30 minutes

**Reference**: See [ICodeFragment Evolution Analysis](./icodefragment-evolution-analysis.md)

### 2.2 Create Migration Documentation
**Target**: New document in Working directory

**Actions**:
- [ ] Document `type` → `fragmentType` migration timeline
- [ ] Create compatibility guidelines
- [ ] Provide code examples for the transition

**Expected Time**: 45 minutes

## Priority 3: Implementation Work (Next Sprint)

### 3.1 Implement Missing Methods
**Target**: `src/WodScript.ts`

**Actions**:
- [ ] Implement `from(ids: number[], index: number): ICodeStatement[]` method
- [ ] Add unit tests for the method
- [ ] Document the runtime block grouping logic

**Expected Time**: 2-4 hours

**Impact**: Critical for runtime execution pipeline

### 3.2 Complete Fragment Migration
**Target**: All fragment implementation files

**Actions**:
- [ ] Audit all fragment classes for method removal
- [ ] Ensure readonly pattern compliance
- [ ] Remove deprecated `type` property usage

**Expected Time**: 1-2 hours

## Priority 4: Documentation Enhancement (Ongoing)

### 4.1 Create Implementation Status Tracking
**Target**: New tracking document

**Actions**:
- [ ] List all interfaces and their implementation status
- [ ] Track which methods are implemented vs designed
- [ ] Monitor architectural evolution

### 4.2 Improve Cross-References
**Target**: All Core documentation

**Actions**:
- [ ] Verify all relative links work correctly
- [ ] Add bidirectional references between related interfaces
- [ ] Ensure Working documents properly reference Core designs

## Quick Wins (Can be done today)

### Immediate Text Fixes
These can be fixed in the next 30 minutes:

1. **IScript.md typos**:
   ```diff
   - Soruce : original pre-compiled script.
   + source : original pre-compiled script.
   
   - Statements : Array of [ICodeStatement](ICodeStatement.md)
   + statements : Array of [ICodeStatement](ICodeStatement.md)
   ```

2. **Add missing errors property**:
   ```markdown
   - `errors?: any[]` : Optional array of parsing or compilation errors
   ```

3. **Mark unimplemented method**:
   ```markdown
   - `from(ids: number[], index:number) : ICodeStatement[]` : **NOT YET IMPLEMENTED** - used by the runtime block next function...
   ```

## Implementation Dependencies

### Before Priority 3 Work
- [ ] Clarify runtime block composition requirements
- [ ] Define how `lap` fragments affect grouping
- [ ] Specify error handling for malformed ID arrays

### Before Fragment Migration Completion
- [ ] Set deprecation timeline for `type` property
- [ ] Ensure compilation pipeline handles new pattern
- [ ] Test backward compatibility during transition

## Success Criteria

### Documentation Sync Complete When:
- [ ] All Core documentation matches current implementation
- [ ] No unimplemented methods are undocumented
- [ ] Architectural decisions are clearly explained
- [ ] Migration paths are documented
- [ ] All relative links work correctly

### Implementation Gaps Closed When:
- [ ] `from()` method is implemented and tested
- [ ] All fragments follow pure data interface
- [ ] `type` property migration is complete
- [ ] Runtime pipeline works with new architecture

## Risk Mitigation

### Documentation Accuracy
- Review changes with implementation team before updating Core docs
- Test all relative links after updates
- Validate examples match current API

### Implementation Impact
- Create feature flags for `type` property deprecation
- Implement backward compatibility during transition
- Add comprehensive tests for new implementations

## Next Steps

1. **Today**: Fix Priority 1 documentation errors
2. **This Week**: Complete Priority 2 architectural documentation  
3. **Next Sprint**: Plan Priority 3 implementation work
4. **Ongoing**: Maintain documentation sync process

For detailed analysis and proposals, see:
- [Proposed IScript Documentation Update](./proposed-iscript-documentation-update.md)
- [ICodeFragment Evolution Analysis](./icodefragment-evolution-analysis.md)
