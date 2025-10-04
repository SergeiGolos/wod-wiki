# Research: Enhanced JIT Compiler Demo Visualization

**Feature**: 003-update-jit-compiler  
**Date**: 2025-10-03

## Research Questions & Findings

### 1. Component Extraction Strategy

**Question**: How should `FragmentVisualizer` and `getFragmentColorClasses` be extracted from `Parser.tsx` into a shared module for reuse?

**Decision**: Create `src/components/fragments/` directory with:
- `FragmentVisualizer.tsx` - React component for rendering grouped fragments
- `fragmentColorMap.ts` - Color mapping utility for fragment types
- `index.ts` - Barrel export for clean imports

**Rationale**:
- Follows existing project structure patterns (`src/components/`, `src/clock/components/`)
- Separates presentation logic (component) from configuration (color map)
- Enables independent testing of visualization logic
- Both Parser and JitCompilerDemo stories can import from shared location

**Alternatives Considered**:
- **Utility in `src/fragments/`**: Rejected - that directory contains fragment types/interfaces, not UI components
- **Keep in stories/**: Rejected - stories should consume components, not define reusable ones
- **Monolithic component**: Rejected - separating color map from component improves testability

### 2. Controls Panel Implementation Pattern

**Question**: What's the best pattern for implementing toggleable panels with session persistence in Storybook?

**Decision**: Use React state with Storybook `args` for toggle controls, leverage browser sessionStorage for persistence

**Rationale**:
- Storybook Controls panel automatically generates UI from `args` definitions
- Boolean args render as toggle switches by default
- SessionStorage persists across story rerenders during session
- Pattern aligns with Storybook best practices for interactive demos

**Implementation Pattern**:
```typescript
// In story definition:
export const Default = {
  args: {
    showFragments: true,
    showRuntimeStack: true,
    showMemory: true,
  },
  // Component reads from args and persists to sessionStorage
}
```

**Alternatives Considered**:
- **Custom toggle UI in story**: Rejected - duplicates Storybook Controls functionality
- **LocalStorage**: Rejected - sessionStorage is more appropriate for temporary demo preferences
- **URL parameters**: Rejected - unnecessarily complex for this use case

### 3. Editor Update Event Handling

**Question**: How should the fragment visualization watch for Monaco Editor update events efficiently?

**Decision**: Use Monaco's `onDidChangeModelContent` listener with debouncing for parse operations

**Rationale**:
- `onDidChangeModelContent` is the canonical Monaco event for content changes
- Fires on every edit, providing real-time feedback
- Debouncing parsing (200-300ms) balances responsiveness with performance
- Existing WodWiki editor component likely already exposes this event

**Implementation Pattern**:
```typescript
editor.onDidChangeModelContent((e) => {
  clearTimeout(parseTimeout);
  parseTimeout = setTimeout(() => {
    const content = editor.getValue();
    parseAndUpdateFragments(content);
  }, 250);
});
```

**Alternatives Considered**:
- **Parse on every keystroke**: Rejected - unnecessary CPU usage, may cause lag
- **Manual refresh button**: Rejected - doesn't meet "real-time" requirement from spec
- **Fixed interval polling**: Rejected - wasteful and creates unpredictable latency

### 4. Highlight Interaction Performance

**Question**: How to achieve 50-100ms highlight transitions without flicker?

**Decision**: Use CSS transitions with React state updates, leverage `will-change` for optimization

**Rationale**:
- CSS transitions are GPU-accelerated and meet timing requirement
- React state ensures single source of truth for hover state
- `will-change` hint optimizes browser rendering pipeline
- Tailwind provides utility classes for transitions

**Implementation Pattern**:
```typescript
// In component:
const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

// In render:
<div 
  onMouseEnter={() => setHoveredBlockId(block.id)}
  className={`transition-colors duration-75 ${
    hoveredBlockId === block.id ? 'bg-blue-200' : ''
  }`}
/>
```

**Alternatives Considered**:
- **JavaScript animations**: Rejected - CSS transitions are more performant
- **Immediate no-transition**: Rejected - spec allows for smooth transitions
- **Longer transitions (200ms+)**: Rejected - exceeds 50-100ms requirement

### 5. Error State Display Strategy

**Question**: What information should be shown when parsing fails?

**Decision**: Display parse error message with line/column info (if available) and clear previous fragments

**Rationale**:
- Parser likely provides structured error information (line, column, message)
- Showing specific error location helps users debug their scripts
- Clearing stale fragments prevents confusion between valid and invalid state
- Aligns with spec requirement (FR-011)

**Display Pattern**:
- Error icon/indicator
- Error message text
- Line/column reference (if available)
- Empty state for fragment list
- Preserve runtime stack and memory views (they show last valid state)

**Alternatives Considered**:
- **Show partial fragments**: Rejected - spec explicitly requires clearing fragments
- **Only show error in console**: Rejected - not user-friendly for visual demo
- **Generic error message**: Rejected - specific errors are more helpful

## Technology Decisions Summary

| Aspect | Technology/Pattern | Why |
|--------|-------------------|-----|
| Component location | `src/components/fragments/` | Follows project structure, enables reuse |
| Toggle controls | Storybook args + sessionStorage | Native Storybook pattern, simple persistence |
| Editor events | `onDidChangeModelContent` | Monaco standard, real-time updates |
| Highlight performance | CSS transitions + React state | GPU-accelerated, meets timing requirement |
| Error display | Structured error message + clear | User-friendly, meets spec requirements |

## Dependencies Analysis

**Existing Dependencies** (no new packages needed):
- React - Component framework (already in use)
- Tailwind CSS - Styling utilities (already in use)
- Monaco Editor - Already integrated in WodWiki component
- Chevrotain - Parser (already in use)
- Storybook - Development environment (already in use)

**No New Dependencies Required** ✅

## Implementation Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Extract breaks existing Parser story | High | Write interaction test for Parser story first, ensure it passes after extraction |
| Highlight flicker on rapid hover | Medium | Implement debouncing on hover events, use CSS `transition-delay` strategically |
| Parse errors crash fragment panel | Medium | Wrap parser calls in try-catch, provide graceful error boundary |
| Session storage conflicts | Low | Use namespaced keys (`jit-demo-fragments`, etc.) |

## Testing Strategy

1. **Unit Tests** (Vitest):
   - `fragmentColorMap.ts` - Verify all fragment types have color mappings
   - Color mapping edge cases (unknown types)

2. **Component Tests** (Vitest + React Testing Library):
   - `FragmentVisualizer.tsx` - Renders fragments by type
   - Error state display
   - Empty state handling

3. **Interaction Tests** (Storybook):
   - Toggle controls enable/disable panels
   - Hover on runtime block highlights memory entries
   - Hover on memory entry highlights runtime block
   - Editor update triggers fragment re-parse
   - Parse error shows error state

4. **Visual Tests** (Manual in Storybook):
   - Vertical panel arrangement
   - Scroll behavior with long fragment lists
   - Highlight transitions within 100ms
   - Text truncation with ellipsis

## Open Questions

**None** - All clarifications resolved in specification clarification session.

## References

- Existing Parser story: `stories/parsing/Parser.tsx`
- Existing JIT Compiler Demo: `stories/compiler/JitCompilerDemo.tsx`
- Monaco Editor docs: https://microsoft.github.io/monaco-editor/
- Storybook args docs: https://storybook.js.org/docs/react/writing-stories/args
