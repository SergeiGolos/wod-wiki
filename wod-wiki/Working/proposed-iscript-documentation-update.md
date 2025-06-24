---
title: "Proposed IScript Documentation Update"
date: 2025-06-19
tags: [proposal, update, iscript]
implements: ../Core/IScript.md
status: proposal
---

# Proposed IScript Documentation Update

This document proposes corrections to the [IScript Core Documentation](../Core/IScript.md) to align with the current implementation in `src/WodScript.ts`.

## Current Documentation Issues

Referencing [IScript Core Documentation](../Core/IScript.md), the following issues need to be addressed:

1. **Typo**: "Soruce" should be "source"
2. **Case inconsistency**: "Statements" should be "statements" 
3. **Missing property**: `errors` property is not documented
4. **Implementation status**: `from()` method is documented but not implemented

## Proposed Updated Documentation

```markdown
## Properties

- `source`: string - Original pre-compiled script source
- `statements`: ICodeStatement[] - Array of [ICodeStatement](ICodeStatement.md) representing the parsed script structure
- `errors?`: any[] | undefined - Optional array of parsing or compilation errors encountered during script processing

## Methods

### from(ids: number[], index: number): ICodeStatement[]
Used by the runtime block next function to identify the grouping of `ICodeStatement` blocks that will generate the next `IRuntimeBlock`. This is where special `lap` fragments would impact how a `IRuntimeBlock` is composed.

**Status**: Not yet implemented - currently throws "Method not implemented."

**Purpose**: 
- Groups statements for runtime execution
- Handles special fragment logic (especially `lap` fragments)
- Enables complex workout structure execution

### getId(id: number): ICodeStatement | undefined
Retrieves a statement by its unique identifier.

**Parameters**:
- `id`: The unique identifier of the statement to retrieve

**Returns**: The statement with the matching ID, or `undefined` if not found

### getAt(index: number): ICodeStatement | undefined  
Retrieves a statement by its position in the statements array.

**Parameters**:
- `index`: The zero-based index position in the statements array

**Returns**: The statement at the specified index, or `undefined` if index is out of bounds
```

## Implementation Notes

### Critical Implementation Gap
The `from()` method is central to the runtime execution model but is not yet implemented. This method should:

1. **Group statements** based on the provided IDs
2. **Handle lap fragments** that affect runtime block composition  
3. **Support complex workout structures** like rounds, sets, and nested timing

### Error Handling
The `errors` property allows the script to maintain parsing and compilation errors, enabling:
- Graceful degradation when parts of a script can't be parsed
- Developer feedback about script issues
- Partial execution of valid script portions

## Relationship to Other Components

This updated documentation maintains consistency with:
- [ICodeStatement](../Core/ICodeStatement.md) - Referenced in the statements array
- [FragmentCompilationManager](../Core/Compiler/FragmentCompilationManager.md) - Consumer of the script structure
- [JitCompiler](../Core/Compiler/JitCompiler.md) - Uses the script interface for compilation

## Migration Impact

These documentation changes are primarily clarifications and don't represent breaking changes to the interface design. The main implementation work needed is completing the `from()` method.
