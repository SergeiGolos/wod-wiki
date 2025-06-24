---
title: "Documentation Drift Analysis"
date: 2025-06-19
tags: [analysis, documentation, drift]
implements: ../Core/IScript.md
related: 
  - ../Core/ICodeStatement.md
  - ../Core/ICodeFragment.md
---

# Documentation Drift Analysis

This document identifies inconsistencies between the current implementation and the design documentation, along with recommended updates.

## Overview

The analysis reveals several areas where the implementation has evolved beyond what's documented in the Core design documents. The main areas of drift are in the `IScript` interface, `ICodeStatement` structure, and `ICodeFragment` implementation details.

## Identified Drift Areas

### 1. IScript Interface Inconsistencies

**File**: [IScript Core Documentation](../Core/IScript.md) vs `src/WodScript.ts`

#### Issues Found:
- **Typo in Documentation**: Core docs show "Soruce" instead of "source"
- **Missing Property**: Documentation doesn't mention the `errors` property that exists in implementation
- **Method Implementation**: The `from()` method is documented but not implemented (throws error)

#### Current Implementation:
```typescript
export interface IScript {
  source: string;
  statements: ICodeStatement[];
  errors?: any[] | undefined;
  from(ids: number[], index:number) : ICodeStatement[];
  getId(id: number): ICodeStatement | undefined;
  getAt(index: number): ICodeStatement | undefined;
}
```

#### Documentation Shows:
- `Statements` (should be `statements`)
- `Soruce` (should be `source`) 
- Missing `errors` property
- Methods are correctly documented

### 2. ICodeFragment Evolution

**File**: [ICodeFragment Core Documentation](../Core/ICodeFragment.md) vs `src/CodeFragment.ts`

#### Issues Found:
- **Interface Simplification**: Implementation has been simplified to pure data interface
- **Comment Added**: "Pure data interface - no metric methods" suggests previous methods were removed
- **Type Property**: Both `type` and `fragmentType` exist, with comment indicating `type` will be replaced

#### Current Implementation:
```typescript
export interface ICodeFragment {
  readonly image?: string;
  readonly value?: any;
  readonly type: string; // Retained for now, will be replaced by fragmentType
  readonly meta?: CodeMetadata;
  readonly fragmentType: FragmentType;
  // Pure data interface - no metric methods
}
```

### 3. CodeStatement Structure

**File**: [ICodeStatement Core Documentation](../Core/ICodeStatement.md) vs `src/CodeStatement.ts`

#### Status: ALIGNED
The implementation matches the documentation well. Both show:
- `id: number`
- `parent?: number`
- `children: number[]`
- `fragments: ICodeFragment[]`
- `isLeaf?: boolean`
- `meta: CodeMetadata`

## Recommended Updates

### 1. Update IScript Core Documentation

The [IScript documentation](../Core/IScript.md) needs these corrections:

```markdown
## Properties

- `source`: string - Original pre-compiled script source
- `statements`: ICodeStatement[] - Array of [ICodeStatement](ICodeStatement.md)
- `errors?`: any[] | undefined - Optional array of parsing or compilation errors

## Methods

- `from(ids: number[], index:number): ICodeStatement[]` - Used by the runtime block next function to identify the grouping of `ICodeStatement` blocks that will generate the next `IRuntimeBlock` (this is where the special `lap` fragments would impact how a `IRuntimeBlock` is composed.)
- `getId(id: number): ICodeStatement | undefined` - Retrieve a statement by its unique ID
- `getAt(index: number): ICodeStatement | undefined` - Retrieve a statement by its array index
```

### 2. Create Implementation Status Document

Since the `from()` method is not implemented, we need to document this:

**Recommendation**: Create an implementation status document that tracks which design methods are pending implementation.

### 3. Update ICodeFragment Documentation

The [ICodeFragment documentation](../Core/ICodeFragment.md) should be updated to:

1. **Clarify the transition**: Document that `type` is deprecated in favor of `fragmentType`
2. **Remove method references**: Since it's now a "pure data interface", remove any references to methods that were previously planned
3. **Update interface definition**: Show the current simplified interface

### 4. Document the Migration Strategy

Create documentation about:
- The transition from `type` to `fragmentType`
- The removal of metric methods from fragments
- How this affects the compilation pipeline

## Implementation Gaps

### Critical Gap: `from()` Method
The `from()` method in `WodScript` currently throws "Method not implemented." This method is critical for:
- Runtime block composition
- Handling special `lap` fragments
- Grouping statements for execution

**Recommendation**: Prioritize implementing this method or update the design if it's no longer needed.

## Next Steps

1. **Fix IScript Documentation**: Correct typos and add missing `errors` property
2. **Implement or Remove `from()` Method**: Either implement the method or update the design to remove it
3. **Clarify Fragment Interface**: Update documentation to reflect the simplified "pure data" approach
4. **Create Migration Guide**: Document the transition strategy for `type` → `fragmentType`

## Validation Checklist

- [ ] IScript documentation matches implementation
- [ ] All documented methods are either implemented or marked as pending
- [ ] Fragment interface documentation reflects current simplified approach
- [ ] Migration strategy is documented for breaking changes
- [ ] All property names and types are consistent between docs and code
