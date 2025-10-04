# Data Model: Enhanced JIT Compiler Demo Visualization

**Feature**: 003-update-jit-compiler  
**Date**: 2025-10-03

## Overview

This document defines the data structures and state management for the enhanced JIT Compiler Demo visualization. The feature focuses on UI component state rather than persistent data models.

## Core Entities

### 1. VisualizationPanelState

**Purpose**: Manages visibility state for each visualization panel

**Structure**:
```typescript
interface VisualizationPanelState {
  showFragments: boolean;
  showRuntimeStack: boolean;
  showMemory: boolean;
}
```

**Attributes**:
- `showFragments`: Controls fragment visualization panel visibility (default: true)
- `showRuntimeStack`: Controls runtime stack panel visibility (default: true)
- `showMemory`: Controls memory allocation panel visibility (default: true)

**Validation Rules**:
- All fields must be boolean
- At least one panel should be visible for meaningful demo (soft recommendation, not enforced)

**State Management**:
- Stored in React component state
- Persisted to sessionStorage on change
- Restored from sessionStorage on component mount
- Storage key: `jit-compiler-demo-panel-state`

**Lifecycle**:
- Created: On story load (from sessionStorage or defaults)
- Updated: On toggle switch change
- Persisted: After each update
- Destroyed: On browser tab close (sessionStorage cleared)

---

### 2. FragmentVisualizationData

**Purpose**: Represents parsed fragments for display

**Structure**:
```typescript
interface FragmentVisualizationData {
  fragments: ICodeFragment[];
  parseError: ParseError | null;
  lastValidFragments: ICodeFragment[] | null;
}
```

**Attributes**:
- `fragments`: Current parsed fragments from editor content
- `parseError`: Error information if parsing failed, null if successful
- `lastValidFragments`: Previous successful parse result (for reference, not displayed per spec)

**Validation Rules**:
- If `parseError` is not null, `fragments` must be empty array
- `fragments` array items must conform to `ICodeFragment` interface (from existing codebase)
- Fragment types must be one of: timer, rep, effort, distance, rounds, action, increment, lap, text, resistance

**State Management**:
- Computed from editor content on every update event
- Stored in React component state
- Not persisted (regenerated from editor content)

**Lifecycle**:
- Created: On editor content change
- Updated: On successful parse or parse error
- Destroyed: On component unmount

---

### 3. ParseError

**Purpose**: Structured error information for display

**Structure**:
```typescript
interface ParseError {
  message: string;
  line?: number;
  column?: number;
  excerpt?: string;
}
```

**Attributes**:
- `message`: Human-readable error description
- `line`: Line number where error occurred (optional)
- `column`: Column position where error occurred (optional)
- `excerpt`: Code excerpt around error location (optional)

**Validation Rules**:
- `message` is required and must be non-empty string
- `line` and `column` must be positive integers if provided
- `excerpt` should be ≤100 characters for display purposes

---

### 4. HighlightState

**Purpose**: Manages cross-panel highlighting interactions

**Structure**:
```typescript
interface HighlightState {
  hoveredRuntimeBlockId: string | null;
  hoveredMemoryEntryId: string | null;
  highlightedSourceLine: number | null;
}
```

**Attributes**:
- `hoveredRuntimeBlockId`: ID of currently hovered runtime block
- `hoveredMemoryEntryId`: ID of currently hovered memory allocation
- `highlightedSourceLine`: Line number to highlight in editor

**Validation Rules**:
- Only one block and one memory entry can be hovered at a time
- IDs must reference valid entities in runtime stack/memory
- Source line must be positive integer if set

**State Management**:
- Stored in React component state
- Updated on mouse enter/leave events
- Cleared on mouse leave
- Not persisted

**State Transitions**:
```
[No hover] → [Hover runtime block] → [Highlight memory + source line]
[No hover] → [Hover memory entry] → [Highlight owning runtime block]
[Any hover state] → [Mouse leave] → [Clear all highlights]
```

**Performance Constraint**: State transitions must trigger visual updates within 50-100ms (enforced via CSS transition duration)

**Lifecycle**:
- Created: On component mount (initialized to null values)
- Updated: On hover interactions
- Destroyed: On component unmount

---

### 5. FragmentColorMap

**Purpose**: Configuration mapping fragment types to Tailwind color classes

**Structure**:
```typescript
type FragmentColorMap = {
  [key in FragmentType]: string;
}

type FragmentType = 
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
```

**Values** (from existing Parser.tsx):
```typescript
const fragmentColorMap: FragmentColorMap = {
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

**Validation Rules**:
- All fragment types must have corresponding color class strings
- Color classes must be valid Tailwind utilities
- Fallback color for unknown types: `'bg-gray-200 border-gray-300 text-gray-800'`

**State Management**:
- Static constant exported from shared module
- No runtime modification
- Immutable configuration

---

## Existing Entities (from codebase)

These entities are consumed by the feature but not modified:

### ICodeFragment
- Defined in `src/CodeFragment.ts`
- Represents parsed workout script fragments
- Properties: type, value, image, metadata

### ICodeStatement
- Defined in `src/CodeStatement.ts`
- Container for multiple fragments
- Used by parser but not directly displayed in this feature

### RuntimeBlock (Mock)
- Currently mock type in JitCompilerDemo
- Properties: id, type, depth, metrics, sourceLine
- Will be replaced with real runtime types in future

### MemoryEntry (Mock)
- Currently mock type in JitCompilerDemo
- Properties: id, owner, type, value, validation
- Will be replaced with real memory types in future

---

## State Management Architecture

```
┌─────────────────────────────────────────┐
│  JitCompilerDemo (Story Component)      │
│  ┌───────────────────────────────────┐  │
│  │ VisualizationPanelState           │  │
│  │ (from Storybook args + session)   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ FragmentVisualizationData         │  │
│  │ (derived from editor content)     │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ HighlightState                    │  │
│  │ (ephemeral hover interactions)    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │
         ├─→ Controls Panel (toggles)
         ├─→ FragmentVisualizer (shared component)
         ├─→ RuntimeStack (existing)
         └─→ MemoryAllocations (existing)
```

**Data Flow**:
1. User edits script → Editor fires update event
2. Parse script → Update FragmentVisualizationData
3. User toggles panel → Update VisualizationPanelState → Persist to sessionStorage
4. User hovers block/memory → Update HighlightState → Trigger CSS transitions

---

## Validation & Error Handling

### Fragment Parsing
- **Success**: Update `fragments` array, clear `parseError`
- **Failure**: Clear `fragments` array, set `parseError` with details
- **Edge case**: Empty script → Show empty state message

### Panel Toggles
- **No validation needed**: Boolean toggles are inherently valid
- **Edge case**: All panels hidden → Allow (user may want minimal view)

### Hover Interactions
- **Invalid block ID**: Silently ignore (no highlight)
- **Invalid memory ID**: Silently ignore (no highlight)
- **Rapid hover changes**: Debounce state updates if needed for performance

### Session Storage
- **Parse failure**: Fall back to defaults (all panels visible)
- **Corrupted data**: Catch exception, use defaults
- **Storage quota exceeded**: Silently fail, continue without persistence

---

## Performance Considerations

### Fragment Parsing
- **Concern**: Large scripts may cause parse delays
- **Mitigation**: Parser already optimized; defer to existing implementation
- **Monitoring**: Not required for this feature (demo context)

### Highlight Transitions
- **Requirement**: Complete within 50-100ms
- **Implementation**: CSS `transition-duration: 75ms` on highlight classes
- **Verification**: Manual testing in Storybook, validate with browser DevTools performance panel

### State Updates
- **Concern**: Frequent editor updates could thrash state
- **Mitigation**: Debounce parsing (250ms) to batch rapid keystrokes
- **Trade-off**: Slight delay acceptable per clarifications (not "immediate")

---

## Testing Requirements

### Unit Tests
- FragmentColorMap: All types mapped, fallback for unknown types
- ParseError construction: Required fields validated

### Component Tests
- FragmentVisualizer: Renders grouped fragments correctly
- Error state: Displays parse errors with message
- Empty state: Shows helpful message for empty fragments

### Integration Tests (Storybook)
- Toggle panel visibility: State persists across rerenders
- Editor updates: Fragments refresh on content change
- Hover highlights: Cross-panel highlighting works bidirectionally
- Performance: Highlight transitions complete smoothly

---

## Migration Notes

### From Parser.tsx
- Extract `getFragmentColorClasses` → `fragmentColorMap.ts`
- Extract `FragmentVisualizer` component → `FragmentVisualizer.tsx`
- Update Parser.tsx imports to use shared components
- Verify existing Parser story still works after extraction

### From JitCompilerDemo.tsx
- Remove debug harness UI sections
- Add Controls panel integration (Storybook args)
- Integrate FragmentVisualizer component
- Wire editor update events to fragment parsing
- Implement highlight state management

---

## Future Considerations

### Real Runtime Integration
When mock RuntimeBlock/MemoryEntry are replaced with real types:
- Update type imports in JitCompilerDemo
- May need to adjust ID extraction logic for highlighting
- Source line references should come from actual compilation metadata

### Additional Fragment Types
If new fragment types added to parser:
- Add color mappings to `fragmentColorMap`
- No component changes needed (type-agnostic rendering)

### Persistent Preferences
If panel state should persist across sessions:
- Change sessionStorage → localStorage
- Add settings UI to reset preferences
- Consider user preference API if multiple demos need shared settings
