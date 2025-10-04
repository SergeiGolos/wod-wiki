# Component Contracts: Enhanced JIT Compiler Demo

**Feature**: 003-update-jit-compiler  
**Date**: 2025-10-03

This document defines the public interfaces (contracts) for the shared components and utilities created by this feature.

---

## FragmentVisualizer Component

**Location**: `src/components/fragments/FragmentVisualizer.tsx`

### Props Interface

```typescript
interface FragmentVisualizerProps {
  /** Array of fragments to visualize, grouped by type */
  fragments: ICodeFragment[];
  
  /** Optional error state to display instead of fragments */
  error?: ParseError | null;
  
  /** Optional className for container styling */
  className?: string;
}
```

### Contract

**MUST**:
- Display fragments grouped by type (timer, rep, effort, etc.)
- Use color coding from `fragmentColorMap` for each type
- Show fragment type name as header for each group
- Display individual fragment values within groups
- Show error state when `error` prop is provided (clear fragments)
- Show empty state message when `fragments` array is empty and no error
- Handle unknown fragment types gracefully (use fallback color)

**MUST NOT**:
- Modify the `fragments` array
- Perform parsing (consume pre-parsed fragments only)
- Manage internal toggle state (controlled component)

**Performance**:
- Render efficiently for up to 100 fragments
- Support vertical scrolling for long fragment lists
- No re-render on every parent update (use React.memo or equivalent)

**Visual Hierarchy** (validates FR-010):
- Fragment groups should have 1rem vertical spacing between them
- Type headers should use font-semibold and uppercase text-transform
- Individual fragments within groups should have 0.5rem vertical spacing
- Nested structures (if present) should indent by 1rem per nesting level

**Accessibility** (validates FR-022):
- Highlight states MUST meet WCAG AA contrast ratio (4.5:1 for text, 3:1 for UI components)
- Focus indicators MUST be visible and distinct
- Color is not the only means of conveying information (use borders/icons)

### Example Usage

```typescript
import { FragmentVisualizer } from '@/components/fragments';

// Success case
<FragmentVisualizer 
  fragments={parsedFragments} 
  className="p-4"
/>

// Error case
<FragmentVisualizer 
  fragments={[]} 
  error={{ message: "Unexpected token at line 5" }}
/>

// Empty case
<FragmentVisualizer 
  fragments={[]} 
/>
```

---

## fragmentColorMap Utility

**Location**: `src/components/fragments/fragmentColorMap.ts`

### Type Definition

```typescript
export type FragmentType = 
  | 'timer' 
  | 'rep' 
  | 'effort' 
  | 'distance' 
  | 'rounds' 
  | 'action' 
  | 'increment' 
  | 'lap' 
  | 'text' 
  | 'resistance';

export type FragmentColorMap = {
  readonly [key in FragmentType]: string;
};
```

### Exported Constant

```typescript
export const fragmentColorMap: FragmentColorMap = {
  timer: 'bg-blue-100 border-blue-200 text-blue-800',
  rep: 'bg-green-100 border-green-200 text-green-800',
  effort: 'bg-yellow-100 border-yellow-200 text-yellow-800',
  distance: 'bg-teal-100 border-teal-200 text-teal-800',
  rounds: 'bg-purple-100 border-purple-200 text-purple-800',
  action: 'bg-pink-100 border-pink-200 text-pink-800',
  increment: 'bg-indigo-100 border-indigo-200 text-indigo-800',
  lap: 'bg-orange-100 border-orange-200 text-orange-800',
  text: 'bg-gray-100 border-gray-200 text-gray-800',
  resistance: 'bg-red-100 border-red-200 text-red-800',
};
```

### Exported Function

```typescript
export function getFragmentColorClasses(type: string): string;
```

**Contract**:

**MUST**:
- Return color class string for known fragment types
- Return fallback color for unknown types: `'bg-gray-200 border-gray-300 text-gray-800'`
- Be case-insensitive (normalize to lowercase)
- Return valid Tailwind CSS class strings

**MUST NOT**:
- Throw errors for unknown types
- Modify global state
- Perform side effects

**Performance**:
- O(1) lookup time
- No async operations

### Example Usage

```typescript
import { getFragmentColorClasses, fragmentColorMap } from '@/components/fragments';

// Direct map access
const timerClasses = fragmentColorMap.timer;

// Function for dynamic types
const classes = getFragmentColorClasses(fragment.type); // case-insensitive

// Unknown type handling
const unknownClasses = getFragmentColorClasses('unknown'); 
// Returns: 'bg-gray-200 border-gray-300 text-gray-800'
```

---

## ParseError Interface

**Location**: `src/components/fragments/types.ts` (or appropriate types file)

### Type Definition

```typescript
export interface ParseError {
  /** Human-readable error message */
  message: string;
  
  /** Optional line number where error occurred */
  line?: number;
  
  /** Optional column position where error occurred */
  column?: number;
  
  /** Optional code excerpt showing error context */
  excerpt?: string;
}
```

### Contract

**MUST**:
- Have non-empty `message` string
- Have positive integer for `line` if provided
- Have positive integer for `column` if provided
- Limit `excerpt` to reasonable length (≤100 characters recommended)

**Usage Context**:
- Created by parser error handling
- Consumed by FragmentVisualizer for error display
- Displayed to users for debugging script syntax

### Example

```typescript
const parseError: ParseError = {
  message: "Unexpected token: expected 'seconds' or 'minutes'",
  line: 12,
  column: 45,
  excerpt: "  10:00 for time"
};
```

---

## VisualizationPanelState Type

**Location**: Story-specific (not exported from library)

### Type Definition

```typescript
interface VisualizationPanelState {
  showFragments: boolean;
  showRuntimeStack: boolean;
  showMemory: boolean;
}
```

### Contract

**Purpose**: Storybook args type for controlling panel visibility

**MUST**:
- All fields are boolean
- Default to `true` for all panels
- Persist to sessionStorage on change
- Restore from sessionStorage on mount

**Storage Key**: `'jit-compiler-demo-panel-state'`

**NOT EXPORTED**: This is internal to JitCompilerDemo story implementation

---

## Interaction Contracts

### Editor Update Event Flow

```typescript
// Monaco editor event handler signature
editor.onDidChangeModelContent((event: IModelContentChangedEvent) => {
  const content = editor.getValue();
  // Parse content and update fragments
});
```

**Contract**:
- Listen to Monaco's `onDidChangeModelContent` event
- Debounce parsing to avoid thrashing (250ms recommended)
- Update fragment visualization on successful parse
- Show error state on parse failure
- Clear error state on successful parse after previous error

### Hover Interaction Event Flow

```typescript
// Runtime block hover
<RuntimeBlock
  onMouseEnter={() => setHighlightedBlock(block.id)}
  onMouseLeave={() => setHighlightedBlock(null)}
/>

// Memory entry hover
<MemoryEntry
  onMouseEnter={() => setHighlightedMemory(entry.id)}
  onMouseLeave={() => setHighlightedMemory(null)}
/>
```

**Contract**:
- Hovering runtime block highlights associated memory entries
- Hovering memory entry highlights owning runtime block
- Hovering runtime block indicates corresponding source line in editor
- Mouse leave clears all highlights
- Highlight transitions complete within 50-100ms (CSS transitions)

---

## Testing Contracts

### Unit Test Coverage

**FragmentVisualizer Component**:
```typescript
describe('FragmentVisualizer', () => {
  it('should render fragments grouped by type');
  it('should apply correct color classes to each type');
  it('should display error state when error prop provided');
  it('should show empty state when fragments array is empty');
  it('should handle unknown fragment types with fallback color');
});
```

**fragmentColorMap Utility**:
```typescript
describe('getFragmentColorClasses', () => {
  it('should return correct classes for all known types');
  it('should return fallback classes for unknown types');
  it('should be case-insensitive');
  it('should handle empty string input');
});
```

### Integration Test Coverage (Storybook)

```typescript
// In JitCompilerDemo.stories.tsx
export const Default = {
  play: async ({ canvasElement }) => {
    // Test toggle controls
    await userEvent.click(fragmentsToggle);
    await expect(fragmentsPanel).not.toBeVisible();
    
    // Test editor updates
    await userEvent.type(editor, '10:00 for time');
    await waitFor(() => expect(fragmentsPanel).toContainText('timer'));
    
    // Test hover interactions
    await userEvent.hover(runtimeBlock);
    await waitFor(() => expect(memoryEntry).toHaveClass('highlighted'));
    
    // Test error handling
    await userEvent.clear(editor);
    await userEvent.type(editor, 'invalid syntax');
    await waitFor(() => expect(fragmentsPanel).toContainText('error'));
  }
};
```

---

## Backward Compatibility

### Parser.tsx Migration

**Breaking Changes**: None

**Changes Required**:
1. Update imports to use shared components:
   ```typescript
   // Before
   const getFragmentColorClasses = (type: string) => { ... }
   const FragmentVisualizer = ({ fragments }) => { ... }
   
   // After
   import { FragmentVisualizer, getFragmentColorClasses } from '@/components/fragments';
   ```

2. Remove local implementations
3. Verify existing Parser story still works

**Contract Guarantee**:
- Same props interface maintained
- Same visual output
- Same behavior for all existing use cases

### JitCompilerDemo.tsx Updates

**Breaking Changes**: Removal of debug harness features (intentional)

**Changes Required**:
1. Remove debug harness UI sections
2. Add Controls panel integration
3. Add FragmentVisualizer integration
4. Implement panel toggle state management
5. Wire editor update events

**Contract Guarantee**:
- Existing runtime stack visualization preserved
- Existing memory allocation visualization preserved
- Same story structure and layout (vertical panels)

---

## Versioning

This feature represents a **Minor** version change (additive, non-breaking):

**Added**:
- `FragmentVisualizer` component (new export)
- `fragmentColorMap` constant (new export)
- `getFragmentColorClasses` function (new export)
- `ParseError` interface (new export)

**Changed**:
- `Parser.tsx` story (internal refactoring, same behavior)
- `JitCompilerDemo.tsx` story (feature enhancement, removed debug harness)

**Removed**:
- Debug harness features from JitCompilerDemo (intentional, story-scoped)

**SemVer Impact**: `x.Y.z` → `x.(Y+1).0`

---

## Contract Validation Checklist

Before merging, verify:

- [ ] FragmentVisualizer exported from `src/components/fragments/index.ts`
- [ ] fragmentColorMap and getFragmentColorClasses exported
- [ ] ParseError interface exported from appropriate types file
- [ ] Parser.tsx imports shared components successfully
- [ ] Parser.tsx story renders identically before/after extraction
- [ ] JitCompilerDemo.tsx integrates all three panels
- [ ] All Storybook interaction tests pass
- [ ] Unit tests cover all exported utilities and components
- [ ] TypeScript compilation succeeds with no new errors
- [ ] Documentation updated in `src/index.ts` exports (if part of public API)
