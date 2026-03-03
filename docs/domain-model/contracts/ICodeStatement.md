# ICodeStatement

> Parsed statement containing fragments and hierarchy

## Definition

```typescript
interface ICodeStatement {
  id: number;                                    // Unique statement ID
  parent?: number;                               // Parent statement ID
  children: number[][];                          // Child groups
  fragments: ICodeFragment[];                    // Parsed fragments
  isLeaf?: boolean;                              // No children
  meta: CodeMetadata;                            // Source location
  fragmentMeta: Map<ICodeFragment, CodeMetadata>; // Per-fragment source locations
  hints?: Set<string>;                           // Semantic hints from dialects
}
```

## Methods (via CodeStatement base class)

```typescript
// Check if fragment of type exists
hasFragment(type: FragmentType): boolean

// Get precedence-resolved display fragments
getDisplayFragments(filter?: FragmentFilter): ICodeFragment[]

// Get first fragment of type (highest precedence)
getFragment(type: FragmentType): ICodeFragment | undefined

// Get all fragments of type, sorted by origin precedence
getAllFragmentsByType(type: FragmentType): ICodeFragment[]

// Get raw fragment array (no precedence resolution)
get rawFragments(): ICodeFragment[]
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

## Fragment Precedence

When multiple fragments of the same type exist (e.g., parser + runtime),
`getAllFragmentsByType()` sorts by origin precedence (highest first):

| Rank | Origin | Description |
|------|--------|-------------|
| 1 | `user` | User-collected values |
| 2 | `runtime` | Runtime-generated values |
| 3 | `compiler` | Compiler-synthesized |
| 4 | `parser` | Original parsed values |

## Related Files

- [[ICodeFragment]] (contained)
- [[01-parser-layer|Parser Layer]] (producer)
- [[02-compiler-layer|Compiler Layer]] (consumer)
