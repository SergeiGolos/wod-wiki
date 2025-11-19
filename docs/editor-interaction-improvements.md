# Editor Interaction & Context Overlay Improvement Plan

## Executive Summary
This document outlines a plan to address critical issues in the interaction between the Monaco Editor and the Context Overlay (Visual Editor). Currently, the system fails to correctly synchronize edits (add/delete/update) with the source code, breaks indentation, and lacks helpful auto-complete features in the visual interface.

## Problem Diagnosis

### 1. Incorrect Line Synchronization
**Issue:** The `useBlockEditor` hook assumes a simplistic 1:1 mapping between the statement index and the line number relative to the block start (`block.startLine + 1 + index`).
**Impact:**
- Deleting a statement often deletes the wrong line if there are empty lines or comments.
- Editing a statement targets the wrong line.
- Adding a statement blindly appends to the end of the block without context.

**Root Cause:** The code ignores the rich `CodeMetadata` (line numbers, offsets) already present in the parsed `ICodeStatement` objects.

### 2. Broken Indentation
**Issue:** When adding or editing statements via the visual editor, the system does not detect or preserve the existing indentation level of the code.
**Impact:**
- New statements are inserted with zero indentation, breaking the visual structure and potentially the parsing logic (if indentation is significant).
- Edited statements lose their original indentation.

### 3. Unhelpful Visual Editor
**Issue:** The `EditableStatementList` component uses standard HTML `<input>` elements.
**Impact:**
- No auto-complete or suggestions for exercises.
- No validation of syntax before committing to the editor.
- Users must type perfect WOD syntax manually, defeating the purpose of a "visual" editor.

## Proposed Solution

### Phase 1: Robust Editor Logic (Backend)
Refactor `useBlockEditor.ts` to be metadata-aware and indentation-smart.

#### Key Changes:
1.  **Use Metadata for Targeting:** Instead of calculating line numbers, use `statement.meta.line` from the parsed AST.
2.  **Preserve Indentation:**
    - **Edit:** Read the existing line, extract the leading whitespace, and prepend it to the new text.
    - **Add:** Detect the indentation of the previous line (or parent statement) and apply it to the new line.
3.  **Smart Insertion:** Allow inserting statements *after* a specific statement ID, rather than just at the end of the block.

### Phase 2: Smart Visual Editor (Frontend)
Upgrade the `ContextPanel` UI to provide a modern editing experience.

#### Key Changes:
1.  **`SmartStatementInput` Component:** Create a new component that replaces the simple `<input>`.
2.  **Auto-Complete Integration:** Connect this input to the `ExerciseSuggestionProvider` (already used by Monaco) to offer exercise suggestions.
3.  **Syntax Highlighting (Optional):** Use a mini-Monaco instance or a styled input to show syntax highlighting within the visual editor.

## Detailed Implementation Plan

### Step 1: Fix `useBlockEditor.ts`

**Current (Broken) Logic:**
```typescript
const deleteStatement = (index) => {
  const statementLine = block.startLine + 1 + index; // ❌ Assumption
  // ... delete line
}
```

**New (Correct) Logic:**
```typescript
const deleteStatement = (index) => {
  const statement = block.statements[index];
  if (!statement) return;
  
  const line = statement.meta.line; // ✅ Source of truth
  // ... delete line
}
```

**Indentation Logic:**
```typescript
const editStatement = (index, newText) => {
  const statement = block.statements[index];
  const currentLineContent = model.getLineContent(statement.meta.line);
  const indentation = currentLineContent.match(/^\s*/)[0]; // ✅ Capture indent
  
  const textWithIndent = indentation + newText;
  // ... replace line
}
```

### Step 2: Create `SmartStatementInput`

Create `src/markdown-editor/components/SmartStatementInput.tsx`.

**Features:**
- **Props:** `value`, `onChange`, `onCommit`, `placeholder`.
- **Suggestions:** Use a popover/datalist powered by `ExerciseIndexManager`.
- **Validation:** Basic regex check to ensure the input looks like a valid WOD statement (e.g., starts with a number or known keyword).

### Step 3: Integrate and Test

1.  Update `EditableStatementList` to use `SmartStatementInput`.
2.  Update `ContextPanel` to pass the correct `ICodeStatement` objects to the editor hook (not just indices).
3.  **Verification:**
    - Open a WOD with comments and empty lines.
    - Delete a specific line via the visual editor -> Verify correct line is removed.
    - Add a nested statement -> Verify indentation matches the parent/sibling.
    - Type "Thr" in the visual editor -> Verify "Thruster" suggestion appears.

## Action Items
- [x] Refactor `useBlockEditor.ts` to use `ICodeStatement` metadata.
- [x] Implement indentation preservation in `useBlockEditor.ts`.
- [x] Create `SmartStatementInput` with auto-complete.
- [x] Replace inputs in `EditableStatementList` with `SmartStatementInput`.
- [x] Fix React `act(...)` warnings by optimizing `useWodBlocks` hook to prevent unnecessary re-renders.

## Implementation Status

### Completed (2025-11-18)

1. **`useBlockEditor.ts` Refactored** ✅
   - Now uses `statement.meta.line` for accurate line targeting
   - Preserves indentation when editing and adding statements
   - Handles edge cases (missing statements array, out-of-range indices)

2. **`SmartStatementInput.tsx` Created** ✅
   - Integrates with `ExerciseIndexManager` for auto-complete suggestions
   - Supports keyboard navigation (Arrow keys, Enter, Escape)
   - 150ms debounce for search queries
   - Auto-closes on outside click

3. **`EditableStatementList.tsx` Updated** ✅
   - All input fields replaced with `SmartStatementInput`
   - Applies to edit, add line, add to group, and add at level actions

4. **`useWodBlocks.ts` Optimized** ✅
   - Fixed React `act(...)` warning by preventing unnecessary state updates
   - Added deep equality check for `blocks` state (compares IDs, content, line numbers)
   - Used functional update form for both `blocks` and `activeBlock`
   - Removed `blocks` dependency from `detectBlocks` callback
   - Tests added to verify optimization (`useWodBlocks.test.ts`)

## Verification

All changes tested and verified:
- ✅ Line deletion targets correct line (uses metadata, not index)
- ✅ Indentation preserved on edit and add operations
- ✅ Exercise auto-complete works in visual editor
- ✅ No React `act(...)` warnings in console
- ✅ No "Forced reflow" performance warnings
