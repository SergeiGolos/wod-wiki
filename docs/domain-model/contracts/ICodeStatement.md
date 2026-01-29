# ICodeStatement

> Parsed statement containing fragments and hierarchy

## Definition

```typescript
interface ICodeStatement {
  id: number;                 // Unique statement ID
  parent?: number;            // Parent statement ID
  children: number[][];       // Child groups
  fragments: ICodeFragment[]; // Parsed fragments
  isLeaf?: boolean;           // No children
  meta: CodeMetadata;         // Source location
  hints?: Set<string>;        // Semantic hints from dialects
}
```

## Methods

```typescript
// Find first fragment of type
findFragment<T>(type: FragmentType, predicate?): T | undefined

// Get all fragments of type  
filterFragments<T>(type: FragmentType): T[]

// Check if fragment exists
hasFragment(type: FragmentType): boolean
```

## Hierarchy Example

```
3 Rounds        ← id: 0, children: [[1, 2]]
  10 Push-ups   ← id: 1, parent: 0
  15 Squats     ← id: 2, parent: 0
```

## Child Groups

Children are organized in groups for multi-pass loops:

```typescript
// Single group (normal loop)
children: [[1, 2, 3]]

// Multiple groups (alternating rounds)
children: [[1, 2], [3, 4]]  // Group A: [1,2], Group B: [3,4]
```

## Related Files

- [[ICodeFragment]] (contained)
- [[../layers/01-parser-layer|Parser Layer]] (producer)
- [[../layers/02-compiler-layer|Compiler Layer]] (consumer)
