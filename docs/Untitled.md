
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

```typescript
interface ICodeFragment {
  readonly image?: string;              // Original text representation
  readonly value?: unknown;             // Parsed value
  readonly type: string;                // Legacy type string (retained for compat)
  readonly fragmentType: FragmentType;  // Typed enum discriminator
  readonly behavior?: MetricBehavior;   // Behavioral grouping
  readonly origin?: FragmentOrigin;     // Where fragment came from
  readonly sourceBlockKey?: string;     // Block key that created this fragment
  readonly timestamp?: Date;            // When fragment was created (runtime)
}
```
