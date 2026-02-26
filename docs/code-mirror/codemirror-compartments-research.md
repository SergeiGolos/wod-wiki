 # CodeMirror 6 Compartments: Linked Documents & Segments

**Date:** 2026-02-18
**Type:** Feature Research
**Tags:** #codemirror #compartments #linked-documents #segments
**Sources:**
- Adobe Brackets Research: https://github.com/adobe/brackets/wiki/Research:-CodeMirror-document-linking
- CodeMirror 6 Docs: https://codemirror.net/docs/ref/#state.Compartment

---

## What Are Compartments?

**Compartment** is a CodeMirror 6 feature that enables **linked documents** - documents that can reference each other and share state.

### Key Characteristics

1. **Linked Documents** - Multiple documents can be linked together
2. **Subdocument Support** - Documents can be "subsets" of other documents
3. **State Preservation** - When reconfiguring extensions, compartments preserve their state
4. **Change Events** - Documents themselves don't raise change events (limitation)
5. **Undo/Redo Syncing** - Shared undo history across linked documents

### Use Cases

From Adobe Brackets implementation:
- **Inline Editors** - Edit specific portions of large files
- **Split Views** - Multiple editor views on same document
- **Code Editing** - Inline CSS/JS editors within Markdown
- **Partial Views** - Show only portion of document while editing full content

---

## Why This Matters for WOD Wiki Plugin

### Current Challenge

In wod-wiki/Obsidian plugin context, we'll have:
- Multiple code blocks in a single note (edit, track, data views)
- Each block needs to reference the same underlying workout data
- Changes in one block should reflect in others

### Compartments Solution

Using compartments, we can:
1. **Create a "master document"** containing the workout definition
2. **Link subdocuments** - Each view (edit/track/data) is a subdocument
3. **Sync changes** - Changes in one view automatically propagate to others
4. **Share state** - Undo/redo works across all linked views
5. **Performance boost** - Inline editors only render visible portion

---

## API Reference

### Creating a Compartment

```typescript
import { Compartment } from '@codemirror/state'

// Create a compartment for workout state
let workoutCompartment = new Compartment()
```

### Using Compartment in Editor State

```typescript
import { EditorState } from '@codemirror/state'

// Define a state field for workout data
const workoutState = StateField.define({
  create: () => ({ exercises: [], timer: null }),
  update: (value, tr) => {
    // Update workout state from transactions
    // Can be reconfigured in compartment
    return value
  }
})

// Create editor with compartment
let state = EditorState.create({
  doc: workoutDefinition,
  extensions: [
    // Wrap workout state in compartment
    workoutCompartment.of(workoutState),
    // Other extensions...
  ]
})
```

### Reconfiguring Compartments

```typescript
// Update workout state without losing other state
state = state.reconfigure({
  extensions: [
    workoutCompartment.of({ exercises: newExercises }),
    // Other extensions remain intact
  ]
})
```

### Linked Documents Pattern

```typescript
import { EditorView, EditorState } from '@codemirror/state'

// Master document (full workout)
const masterDoc = EditorState.create({
  doc: fullWodScript,
  extensions: [
    workoutCompartment.of(workoutState)
  ]
})

// Subdocument for edit view (portion of workout)
const editDoc = masterDoc.doc.slice(0, 100)

// Subdocument for track view (runtime state)
const trackDoc = masterDoc.doc.slice(0, masterDoc.doc.length)

// Create views
const masterView = new EditorView({ state: masterDoc, parent: '#master' })
const editView = new EditorView({ state: editDoc, parent: '#edit' })
const trackView = new EditorView({ state: trackDoc, parent: '#track' })

// Sync changes between views
// (See CodeMirror split view example)
```

---

## Comparison to Other Approaches

| Approach | Pros | Cons | Use Case |
|----------|------|-------|----------|
| **Compartment** | ✅ Built-in sync<br>✅ State preservation<br>✅ Undo/redo across views<br>✅ Incremental parsing | ❌ Documents don't raise change events<br>❌ Requires careful lifecycle management | Multiple linked views on same data |
| **Manual State Sync** | ✅ Full control<br>✅ Change events | ❌ Complex<br>❌ No built-in support | Simple two-view sync |
| **Single Document** | ✅ Simple<br>✅ Change events | ❌ No isolation<br>❌ Performance penalty | Single view only |

---

## Limitations

### From Adobe Brackets Research

1. **Change Events** - Documents themselves don't raise change events
   - Workaround: Track changes manually or use observer pattern
   - Impact: Can't react to document modifications directly

2. **Tokenization in Subdocuments** - May be broken in some versions
   - Impact: Code hints don't work correctly in subdocuments
   - Status: Check current CodeMirror version for fixes

3. **Undo/Redo in Subdocuments** - Can cause corruption
   - Issue: Undoing in subdocument can duplicate lines in main document
   - Status: Need isolation and testing

---

## Best Practices

### When to Use Compartments

✅ **Multiple views on same data** - Edit/Track/Data all reference same workout
✅ **State isolation** - Different aspects of state in separate compartments
✅ **Dynamic reconfiguration** - Swap state without losing other compartments
✅ **Undo/redo sharing** - Single undo stack across all views

### When to Avoid Compartments

❌ **Simple single-editor** - If only one view, compartments add complexity
❌ **Unrelated documents** - If views don't share data, use separate states
❌ **Frequent reconfig** - Full state rebuild is expensive

---

## Implementation Pattern for WOD Wiki

### Recommended Architecture

```
┌─────────────────────────────────────────┐
│  Master Document (Full WodScript)    │
│  ├── Compartment: Workout State    │
│  └──> Extensions: Highlighting, etc. │
└─────────────────────────────────────────┘
           │
           │
    ┌──────▼─────────┐  ┌──────────▼─────────┐  ┌──────────▼─────────┐
    │ Edit View       │  │ Track View        │  │ Data View          │
    │ (Subdocument)  │  │ (Subdocument)   │  │ (Subdocument)      │
    │                 │  │                 │  │                    │
    │ Compartment:     │  │ Compartment:      │  │ Compartment:         │
    │ Edit State       │  │ Track State       │  │ Data State          │
    │ Shared with     │  │ Shared with       │  │ Shared with          │
    │ Master           │  │ Master            │  │ Master              │
    └───────────────┘  └─────────────────┘  └────────────────────┘
```

### Code Example

```typescript
import { EditorView, EditorState, StateField, Compartment } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

// Workout state compartment
const workoutCompartment = new Compartment()

// State field definitions
const editState = StateField.define({
  create: () => ({ mode: 'edit', selectedExercise: 0 }),
  update: (value, tr) => {
    // Handle mode changes, exercise selection
    return value
  }
})

const trackState = StateField.define({
  create: () => ({
    mode: 'track',
    timer: 0,
    currentExercise: 0,
    elapsed: 0
  }),
  update: (value, tr) => {
    // Handle timer updates, exercise completion
    return value
  }
})

const dataState = StateField.define({
  create: () => ({
    mode: 'data',
    sessions: [],
    selectedSession: null
  }),
  update: (value, tr) => {
    // Handle session selection, filtering
    return value
  }
})

// Master document contains full WodScript
const masterDoc = EditorState.create({
  doc: wodScript,
  extensions: [
    workoutCompartment.of(trackState), // All views share this state
    syntaxHighlighting,
    autocompletion
  ]
})

// Edit view subdocument (lines 0-50 for editing)
const editDoc = EditorState.create({
  doc: masterDoc.doc.sliceString(0, 50),
  extensions: [
    workoutCompartment.of(editState),
    editModeExtensions // Cursor, selection specific to editing
  ]
})

// Track view subdocument (same doc, different state)
const trackDoc = editDoc.reconfigure({
  extensions: [
    workoutCompartment.of(trackState),
    trackModeExtensions // Timer controls, progress indicators
  ]
})

// Create views
const masterView = new EditorView({ state: masterDoc, parent: '#master' })
const editView = new EditorView({ state: editDoc, parent: '#edit' })
const trackView = new EditorView({ state: trackDoc, parent: '#track' })

// Changes in editState update master state (shared compartment)
// Changes in trackState also update master state
// Undo/redo works across all views
```

---

## Summary

**Compartments** provide a built-in way to:
- ✅ Link multiple documents/subdocuments together
- ✅ Share state across linked views
- ✅ Preserve state during reconfiguration
- ✅ Sync undo/redo across all views
- ✅ Enable incremental parsing with partial views

**For WOD Wiki:**
- Master document = Full WodScript
- Edit view = Edit subdocument (lines 0-N)
- Track view = Track subdocument (with timer state)
- Data view = Data subdocument (with session state)
- All share workout state compartment

**Next Steps:**
1. Create CodeMirror branch for experimentation
2. Test compartment-based linking
3. Validate undo/redo across views
4. Check change event limitations
5. Update plan if compartments prove useful

---

**Status:** ✅ Research Complete
**Ready for Testing:** Yes
**Priority:** High - Investigate compartments for WOD Wiki linked views
