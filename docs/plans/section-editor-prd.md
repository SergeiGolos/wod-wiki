# Section-Based Editor — Product Requirements Document

> **Status**: Draft  
> **Created**: 2025-02-13  
> **Scope**: Plan Panel UI — Replace monolithic Monaco editor with section-aware inline editing

---

## 1. Executive Summary

### Problem Statement

The Plan Panel currently renders a full-screen Monaco Editor for the entire markdown document. This creates a gap between the **authoring experience** (a wall of raw text) and the **reading experience** (structured headers, paragraphs, and WOD blocks). Users cannot interact with individual sections independently — they must context-switch between "editing mode" (raw markdown) and "preview mode" (NotePreview) to understand document structure.

### Proposed Solution

Replace the monolithic editor with a **section-based document model** where each structural unit (heading, paragraph, WOD block) is an independent renderable component. Only the **actively focused section** renders as an editable text area; all other sections render as rich read-only display components. The document behaves like a single continuous editor through keyboard navigation that flows between sections.

### Success Criteria

| KPI | Target |
|-----|--------|
| Line numbers are continuous across all sections (edit + read-only) | 100% consistent |
| Click-to-edit latency (time from click to cursor placement) | < 100ms |
| Section transition via keyboard (Up/Down at boundary) | < 50ms perceived |
| No layout shift when switching between edit ↔ read-only modes | 0px vertical shift |
| All existing WOD block parsing/execution features remain functional | Zero regressions |

---

## 2. User Experience & Functionality

### User Personas

| Persona | Description |
|---------|-------------|
| **Author** | Creates and edits workout notes. Writes markdown with embedded WOD blocks. Expects a fluid writing experience similar to Notion or Typora. |
| **Athlete** | Reviews workout plans, occasionally edits, primarily reads. Wants clear visual structure without raw markdown noise. |

### User Stories

#### US-1: Section-Based Display
**As an** Author, **I want** each section of my document (headings, paragraphs, WOD blocks) to render as a styled display component when I'm not editing it, **so that** I can read my document without seeing raw markdown syntax.

**Acceptance Criteria:**
- Headings render at their appropriate visual level (h1–h6) without `#` prefix characters
- Paragraphs render as formatted text
- WOD blocks render their parsed/compiled display (existing block display component)
- Empty lines between sections are preserved visually as spacing

#### US-2: Click-to-Edit
**As an** Author, **I want to** click on any section to begin editing it, with the cursor placed at the exact position I clicked, **so that** I can make targeted edits without scrolling through the entire document.

**Acceptance Criteria:**
- Clicking a read-only section activates it for editing
- The cursor is placed at the line/column corresponding to the click position
- The previously active section transitions back to read-only display
- Only one section is editable at a time

#### US-3: Continuous Line Numbers
**As an** Author, **I want** line numbers displayed consistently across both read-only and editable sections, **so that** I can reference specific lines and understand my position in the document.

**Acceptance Criteria:**
- Line numbers are continuous from the first line of the document to the last
- Read-only sections display line numbers in a gutter matching the editor gutter width
- The active (editing) section's line numbers continue from the previous section's last line
- Line numbers update correctly when content is added or removed

#### US-4: Keyboard Navigation Between Sections
**As an** Author, **I want to** navigate between sections using keyboard shortcuts, **so that** I can edit fluidly without reaching for the mouse.

**Acceptance Criteria:**
- **Up arrow** on the first line of a section moves to the previous section (editing it, cursor on last line)
- **Down arrow** on the last line of a section moves to the next section (editing it, cursor on first line)
- **Ctrl+Up** jumps to the previous section boundary (activates it for editing)
- **Ctrl+Down** jumps to the next section boundary (activates it for editing)
- **Enter** on an empty last line of a section creates a new empty paragraph section after the current section

#### US-5: Section Type Renderers
**As an** Author, **I want** each section type to have a distinct visual renderer, **so that** I can quickly scan the document structure.

**Acceptance Criteria:**
- **Heading sections**: Rendered at appropriate font size/weight for level (h1–h6), no `#` characters visible
- **Paragraph sections**: Rendered as styled body text
- **WOD block sections**: Rendered using existing parsed statement display (reuse existing WOD block rendering)
- **Results/records sections**: Placeholder renderer (expandable later)
- Heading resize affordances (drag handles etc.) are **not** present in the edit mode — they interfere with line heights

### Non-Goals (v1)

- **Drag-and-drop reordering** of sections (future enhancement)
- **Collaborative/real-time editing** (out of scope)
- **Inline formatting toolbar** (bold, italic, etc. — users write raw markdown)
- **Split-pane preview** (NotePreview panel — the section editor replaces this need)
- **Image/media embedding** (future section type)
- **Nested section hierarchy** (sections are a flat list; heading levels are visual only in v1)

---

## 3. Technical Specifications

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   SectionEditor                      │
│  (top-level component, replaces PlanPanel's editor)  │
│                                                      │
│  ┌─ State ─────────────────────────────────────────┐ │
│  │ sections: Section[]                             │ │
│  │ activeSectionId: string | null                  │ │
│  │ rawContent: string  (source of truth)           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Section[] ─────────────────────────────────────┐ │
│  │                                                 │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │ Section  │  │ Section  │  │ Section  │ ...  │ │
│  │  │ (header) │  │ (para)   │  │ (wod)    │      │ │
│  │  │ DISPLAY  │  │ EDIT ◄── │  │ DISPLAY  │      │ │
│  │  └──────────┘  └──────────┘  └──────────┘      │ │
│  │                                                 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Line Number Gutter ───────────────────────────┐ │
│  │ Continuous line count across all sections       │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 3.2 Data Model

#### Section (extends existing DocumentItem)

```typescript
/** Section types supported by the editor */
type SectionType = 'heading' | 'paragraph' | 'wod' | 'empty';

/** A single section in the document */
interface Section {
  /** Stable identifier for React keys and state tracking */
  id: string;
  
  /** The structural type — determines which renderer is used */
  type: SectionType;
  
  /** Raw markdown text of this section (including # for headings, ```wod fences, etc.) */
  rawContent: string;
  
  /** Start line in the overall document (0-indexed) */
  startLine: number;
  
  /** End line in the overall document (0-indexed, inclusive) */
  endLine: number;
  
  /** Line count in this section */
  lineCount: number;
  
  /** Heading level (1–6) when type === 'heading' */
  level?: number;
  
  /** Parsed WodBlock reference when type === 'wod' */
  wodBlock?: WodBlock;
}
```

#### SectionDocument (new top-level model)

```typescript
/** The full document as a list of sections */
interface SectionDocument {
  /** Ordered list of sections */
  sections: Section[];
  
  /** Total line count across all sections */
  totalLines: number;
  
  /** Currently active (editing) section id */
  activeSectionId: string | null;
}
```

### 3.3 Content Parsing Pipeline

Reuse and extend the existing `parseDocumentStructure` function:

```
rawContent (string)
    │
    ▼
detectWodBlocks(rawContent)  →  WodBlock[]      (existing)
    │
    ▼
parseDocumentStructure(rawContent, wodBlocks)    (existing, extended)
    │
    ▼
DocumentItem[]  →  map to Section[]              (new mapping layer)
    │
    ▼
SectionDocument                                   (new)
```

**Key changes to `parseDocumentStructure`:**
- Include raw markdown in content (headings keep their `#` prefix for editing)
- Preserve empty lines as `empty` type sections (or absorb them as trailing whitespace in the preceding section)
- Track `lineCount` per section for gutter rendering

### 3.4 Component Hierarchy

```
<SectionEditor>                          // New top-level
  <SectionList>                          // Scrollable container, manages focus
    {sections.map(section =>
      <SectionContainer                  // Wrapper: gutter + content area
        key={section.id}
        lineStart={section.startLine}
        lineCount={section.lineCount}
      >
        {isActive(section.id)
          ? <SectionEditView />          // Editable textarea/Monaco
          : <SectionDisplayView />       // Read-only rendered output
        }
      </SectionContainer>
    )}
  </SectionList>
</SectionEditor>
```

#### SectionContainer
- Renders the **line number gutter** for this section's line range
- Provides consistent left-margin alignment between edit and display modes
- Handles click events → dispatches `activateSection(sectionId, clickPosition)`

#### SectionDisplayView (per type)
- **HeadingDisplay**: Renders heading at appropriate h1–h6 size, no `#` characters
- **ParagraphDisplay**: Renders plain text or lightly formatted markdown
- **WodBlockDisplay**: Reuses existing WOD block rendering (parsed statements, play button)
- **EmptyDisplay**: Renders as blank vertical space (consistent height)

#### SectionEditView
- Minimal text editor for the active section
- Options (to be decided — see Section 3.6):
  - **Plain `<textarea>`**: Simplest, no syntax highlighting, fastest transitions
  - **Lightweight Monaco instance**: Syntax highlighting for WOD blocks, but heavier
  - **CodeMirror 6**: Lightweight alternative with extension support
- Must support:
  - Cursor placement at specific line/column on activation
  - Reporting cursor position for boundary detection (first line, last line)
  - Content change callbacks
  - Consistent line height with display views

### 3.5 Line Number System

```
┌─────┬──────────────────────────────┐
│  1  │ # My Workout          ← h1 display (read-only)
├─────┼──────────────────────────────┤
│  2  │                        ← empty
├─────┼──────────────────────────────┤
│  3  │ Today we're doing a    ← paragraph (EDITING)
│  4  │ quick benchmark WOD.   ← paragraph (EDITING)
├─────┼──────────────────────────────┤
│  5  │                        ← empty
├─────┼──────────────────────────────┤
│  6  │ ```wod                       │
│  7  │ 21-15-9               ← wod display (read-only)
│  8  │ Thrusters 95#                │
│  9  │ Pull-ups                     │
│ 10  │ ```                          │
├─────┼──────────────────────────────┤
│ 11  │                        ← empty
├─────┼──────────────────────────────┤
│ 12  │ ## Notes               ← h2 display (read-only)
└─────┴──────────────────────────────┘
```

**Implementation approach:**
- Each `SectionContainer` receives `startLine` from the cumulative line count
- Read-only sections render line numbers in a fixed-width gutter `<div>` styled to match editor gutter
- Edit section uses native line numbers (if Monaco) offset by `startLine` or a custom gutter overlay
- Gutter width is uniform across all sections (computed from `totalLines` digit count)

### 3.6 Editor Strategy for Active Section

| Option | Pros | Cons |
|--------|------|------|
| **Plain `<textarea>`** | Instant mount, zero bundle cost, perfect line height control | No syntax highlighting, no WOD-specific features |
| **Single Monaco instance (hidden + revealed)** | Full feature parity, syntax highlighting | Heavy mount/unmount, potential flicker |
| **Monaco with `setModel()` swap** | Single instance, model-per-section, fast swap | Complex lifecycle, only one section edits at a time (fits our model) |
| **CodeMirror 6** | Lightweight, extensible, fast mount | New dependency, migration effort |

**Recommended: Monaco with `setModel()` swap**

Rationale: The project already depends on Monaco. Instead of mounting/unmounting, maintain a single floating Monaco instance that gets repositioned into the active section's container and swaps its `ITextModel`. This gives:
- Fast transitions (~10ms model swap vs ~200ms mount)
- Full syntax highlighting for WOD content
- Line number offset support via `editor.updateOptions({ lineNumbers: (n) => n + offset })`
- Familiar keybinding infrastructure for boundary navigation

### 3.7 Keyboard Navigation

```typescript
/** Section boundary navigation logic */

// In the Monaco instance's keydown handler:

onKeyDown(e) {
  const pos = editor.getPosition();
  const model = editor.getModel();
  
  // UP at first line → activate previous section
  if (e.key === 'ArrowUp' && pos.lineNumber === 1) {
    e.preventDefault();
    activatePreviousSection({ cursorPlacement: 'last-line' });
  }
  
  // DOWN at last line → activate next section
  if (e.key === 'ArrowDown' && pos.lineNumber === model.getLineCount()) {
    e.preventDefault();
    activateNextSection({ cursorPlacement: 'first-line' });
  }
  
  // ENTER on empty last line → create new section after current
  if (e.key === 'Enter' && isLastLineEmpty(model)) {
    e.preventDefault();
    // Remove the trailing empty line from current section
    // Insert a new empty paragraph section after current
    insertSectionAfter(activeSectionId, { type: 'paragraph', rawContent: '' });
  }
  
  // Ctrl+Up → jump to previous section
  if (e.key === 'ArrowUp' && e.ctrlKey) {
    e.preventDefault();
    activatePreviousSection({ cursorPlacement: 'first-line' });
  }
  
  // Ctrl+Down → jump to next section  
  if (e.key === 'ArrowDown' && e.ctrlKey) {
    e.preventDefault();
    activateNextSection({ cursorPlacement: 'first-line' });
  }
}
```

### 3.8 Content Synchronization

The `rawContent` string remains the **single source of truth**. Sections are derived from it, and section edits are reconciled back:

```
User edits section
    │
    ▼
onSectionContentChange(sectionId, newSectionContent)
    │
    ├──► Rebuild rawContent by joining all sections in order
    │    (replace section's line range with new content)
    │
    ├──► Re-parse sections from new rawContent
    │    (detect if section boundaries changed — e.g., user typed ```wod)
    │
    └──► Emit onContentChange(newRawContent) to parent
         (triggers save, WOD block re-detection, etc.)
```

**Debouncing strategy:**
- Section content changes are debounced (300ms) before triggering full re-parse
- During active editing, only the current section's content is updated locally
- Full document re-parse occurs on debounce or on section deactivation

### 3.9 Section Boundary Mutation

Users can change section boundaries by editing:
- Typing `# ` at the start of a paragraph line → splits into heading + remaining paragraph
- Typing ```` ```wod ```` → begins a new WOD block section
- Deleting a heading's `#` prefix → merges into preceding paragraph
- Backspace at the start of a section → merges with previous section

These mutations are detected during the re-parse step and handled by diffing the old section list against the new one, preserving stable IDs where sections remain structurally equivalent.

### 3.10 Integration Points

| System | Integration |
|--------|-------------|
| **PlanPanel** | `SectionEditor` replaces `MarkdownEditorBase` as the child component |
| **WorkbenchEventBus** | `scrollToBlock` / `highlightBlock` events target sections by WOD block ID |
| **WOD Block Detection** | Existing `detectWodBlocks` feeds into section parsing |
| **WOD Block Parsing** | `useParseAllBlocks` continues to parse WOD section content |
| **Save System** | `rawContent` output is identical format — no migration needed |
| **NotePreview** | Can be simplified or removed — the section editor IS the preview |
| **Workbench** | `content`, `blocks`, `cursorLine`, `activeBlockId` state connections preserved |

---

## 4. Risks & Roadmap

### Phased Rollout

#### Phase 1: Section Model Foundation
- Extend `parseDocumentStructure` to produce `Section[]` with raw content
- Build `SectionContainer` with line number gutter
- Build `SectionDisplayView` renderers (heading, paragraph, wod, empty)
- Render document as read-only section list (no editing)
- **Deliverable**: Read-only section-rendered document replacing NotePreview

#### Phase 2: Inline Section Editing
- Implement Monaco single-instance with model swap strategy
- Build `SectionEditView` with cursor placement
- Implement click-to-edit activation with cursor position mapping
- Wire content change → rawContent reconciliation → re-parse loop
- **Deliverable**: Click any section to edit it inline

#### Phase 3: Keyboard Navigation
- Implement boundary detection (first/last line)
- Add Up/Down arrow section transitions
- Add Ctrl+Up/Down section jumping
- Add Enter-on-empty-line section creation
- **Deliverable**: Full keyboard-driven editing flow

#### Phase 4: Polish & Integration
- Replace PlanPanel's `MarkdownEditorBase` with `SectionEditor`
- Wire WorkbenchEventBus scroll/highlight events
- Ensure WOD block execution (start workout) works from section display
- Handle edge cases (empty documents, single-section documents, rapid section switching)
- Performance optimization (virtualize off-screen sections for large documents)
- **Deliverable**: Production-ready section editor in Plan view

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Line height mismatch** between edit and display modes causing layout shift | High | Use CSS `line-height` / fixed row height system; test with pixel-comparison snapshots |
| **Monaco model swap performance** with large WOD blocks | Medium | Profile and optimize; fallback to textarea for non-WOD sections |
| **Section boundary mutation** creating invalid states (e.g., orphaned ``` fence) | Medium | Validate section structure on every re-parse; auto-heal malformed boundaries |
| **WOD block state loss** during re-parse (runtime, results) | High | Preserve WodBlock identity through section re-parse using existing `useWodBlocks` state matching |
| **Accessibility regression** from custom keyboard handling | Medium | Test with screen readers; ensure ARIA roles on sections; preserve tab order |
| **Undo/Redo across sections** | Medium | Maintain document-level undo stack (Monaco's built-in won't span sections) |

---

## 5. Open Questions

1. **Should the editor for non-WOD sections use a plain textarea or Monaco?** Textarea is simpler and lighter, but loses syntax highlighting if the user writes markdown formatting. Recommendation: textarea for headings/paragraphs, Monaco for WOD blocks.

2. **How should empty lines between sections be represented?** Options: (a) as their own `empty` section type, (b) as trailing whitespace in the preceding section, (c) as leading whitespace in the following section. Recommendation: trailing whitespace in the preceding section to keep section count minimal.

3. **Should section virtualization be in scope for v1?** Large documents (50+ sections) may benefit from windowed rendering. Recommendation: defer to Phase 4, measure first.

4. **How does this interact with the existing Index View / fold-all feature?** The section display view naturally replaces the "folded" state. Index View could become "collapse all sections to header-only display." Recommendation: replace fold mechanism entirely with section display.

---

## 6. Appendix: Current vs. Proposed Architecture

### Current (Monolithic Editor)

```
PlanPanel
  └── MarkdownEditorBase
        └── Monaco Editor (full document)
              ├── WodBlockManager (decorations)
              ├── HeadingSectionFoldingManager (folding ranges)
              ├── RichMarkdownManager (inline cards)
              ├── HiddenAreasCoordinator
              └── ContextOverlay (active block widget)
```

**State**: Single Monaco `ITextModel` with the entire document. Structure is overlaid via decorations, folding, and widgets.

### Proposed (Section Editor)

```
PlanPanel
  └── SectionEditor
        ├── SectionContainer[0]  (heading)  → HeadingDisplay
        ├── SectionContainer[1]  (paragraph) → ParagraphDisplay
        ├── SectionContainer[2]  (wod)      → WodBlockDisplay
        ├── SectionContainer[3]  (paragraph) → SectionEditView ← active
        │                                       └── Monaco (single instance, model swap)
        └── SectionContainer[4]  (heading)  → HeadingDisplay
```

**State**: `Section[]` derived from `rawContent`. One floating Monaco instance moves between sections. Display components render rich output without decorations/folding hackery.

### What Gets Removed

| Component | Reason |
|-----------|--------|
| `HeadingSectionFoldingManager` | Sections replace folding — each section is naturally "unfolded" in display mode |
| `HiddenAreasCoordinator` | No hidden areas — sections are independently rendered |
| `RichMarkdownManager` / `RowBasedCardManager` | Inline cards replaced by section display renderers |
| `ContextOverlay` | Active section editing replaces the need for an overlay widget |
| `WodBlockManager` (decorations) | WOD blocks are rendered by `WodBlockDisplay`, not decorated inline |
| Index View toolbar toggle | Section display IS the default view; no folding toggle needed |

### What Gets Preserved

| Component/System | How |
|------------------|-----|
| `detectWodBlocks` | Feeds section parsing pipeline — unchanged |
| `useWodBlocks` (state tracking) | Continues to manage WodBlock lifecycle (parse, run, results) |
| `useParseAllBlocks` | Continues to JIT-compile WOD block content |
| `WodBlock` type & state machine | Unchanged — sections reference WodBlocks |
| `WorkbenchEventBus` | Scroll/highlight events target sections instead of Monaco lines |
| `parseDocumentStructure` | Extended (not replaced) with raw content and line count |
| Monaco themes / WOD syntax highlighting | Used in the single Monaco instance for WOD section editing |
