Abstract base class and interface for statements in the workout script AST. Statements represent hierarchical logical units of workout instructions that contain collections of fragments. They form the structural backbone of the parsed workout script.

## Original Location
`src/ICodeStatement.ts`

## Abstract Class: CodeStatement

### Properties
- `id: number` — Unique identifier for the statement
- `parent?: number` — ID of parent statement (optional for root statements)
- `children: number[]` — Array of child statement IDs
- `meta: CodeMetadata` — Metadata including source position and parsing info
- `fragments: CodeFragment[]` — Array of fragments that make up this statement
- `isLeaf?: boolean` — Whether this statement has no children

## Interface: ICodeStatement

Defines the contract that all statement implementations must follow:

```typescript
interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[];  
  fragments: CodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
}
```

## Key Concepts

**Hierarchy**: Statements form a tree structure where parent statements contain child statements, enabling complex workout structures like groups, rounds, and nested timing.

**Fragments**: Each statement contains an array of `CodeFragment` objects that represent the actual workout data (times, reps, efforts, etc.).

**Relationships**:
- Contains: [ICodeFragment](./ICodeFragment.md) instances
- Uses: `CodeMetadata` for source tracking
- Part of: [JitStatement](Runtime/JitCompiler.md) compilation pipeline
- Consumed by: Runtime compilation strategies
