# FragmentDisplayState Memory

The `fragment:display` memory type stores display-ready fragments that have been resolved through precedence selection.

## Type Definition

```typescript
interface FragmentDisplayState {
    /** All raw fragments flattened from groups (before precedence) */
    readonly fragments: readonly ICodeFragment[];
    
    /** Precedence-resolved fragments ready for display */
    readonly resolved: readonly ICodeFragment[];
}
```

## Memory Key

- **Key**: `'fragment:display'`
- **Value Type**: `FragmentDisplayState`

## Purpose

While `FragmentState` stores raw fragment groups as-is from compilation,
`FragmentDisplayState` provides a display-ready view after applying per-type
precedence resolution (user > runtime > compiler > parser).

This separation allows:
- UI components to render directly from `resolved` without re-computing precedence
- Raw data to remain available for analytics or debugging via `fragments`
- Multiple display rows per block (multiple `fragment:display` memory locations)

## Precedence Resolution

When multiple fragments of the same `FragmentType` exist (e.g., a parser-origin
timer and a runtime-origin elapsed time), precedence determines which one displays:

| Rank | Origin | Description |
|------|--------|-------------|
| 1 | `user` | User-collected values (highest priority) |
| 2 | `runtime` | Runtime-generated values |
| 3 | `compiler` | Compiler-synthesized values |
| 4 | `parser` | Original parsed values (lowest priority) |

## Fragment Visibility

`fragment:display` tags belong to the **display** visibility tier:

| Tier | Tags | Visible To |
|------|------|------------|
| **display** | `fragment:display` | UI cards, main display |
| result | `fragment:result` | Block output on pop |
| promote | `fragment:promote` | Child blocks |
| private | `fragment:tracked`, `fragment:label` | Internal only |

## UI Integration

```typescript
// Read all display fragments for a block
const displayLocs = block.getFragmentMemoryByVisibility('display');

// Each location represents one "display row"
for (const loc of displayLocs) {
    const fragments = loc.fragments;
    // Render the fragments...
}
```

## Related Memory Types

- [`FragmentState`](FragmentState.md) - Raw fragment groups (before precedence)
- [`DisplayState`](DisplayState.md) - UI mode and labels (non-fragment state)

## Source Files

- `src/runtime/memory/MemoryTypes.ts`
- `src/runtime/memory/FragmentVisibility.ts`
