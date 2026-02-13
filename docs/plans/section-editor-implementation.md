# Section-Based Editor — Implementation Plan

> **Status**: Draft  
> **Created**: 2025-02-13  
> **Parent**: [Section Editor PRD](section-editor-prd.md)  
> **Estimated Effort**: 4 phases, ~12-16 working sessions

---

## Dependency Map

```
Phase 1: Data Model & Read-Only Display
  ├── 1.1 Section types ──────────────────────┐
  ├── 1.2 Extended parseDocumentSections ──────┤
  ├── 1.3 useSectionDocument hook ─────────────┤
  ├── 1.4 SectionContainer + LineGutter ───────┤ ─── All display renderers need types
  ├── 1.5 HeadingDisplay ──────────────────────┤
  ├── 1.6 ParagraphDisplay ────────────────────┤
  ├── 1.7 WodBlockDisplay ────────────────────┤
  └── 1.8 SectionEditor (read-only shell) ─────┘

Phase 2: Inline Editing                        depends on Phase 1
  ├── 2.1 SectionEditView (textarea) ──────────┐
  ├── 2.2 Click-to-edit activation ────────────┤
  ├── 2.3 Content reconciliation ──────────────┤
  ├── 2.4 Section boundary mutation ───────────┤
  └── 2.5 WOD section Monaco editor ──────────┘

Phase 3: Keyboard Navigation                   depends on Phase 2
  ├── 3.1 Boundary detection ──────────────────┐
  ├── 3.2 Arrow key section transitions ───────┤
  ├── 3.3 Ctrl+Arrow section jumping ─────────┤
  └── 3.4 Enter-to-create section ─────────────┘

Phase 4: Integration & Polish                  depends on Phase 3
  ├── 4.1 PlanPanel swap ─────────────────────┐
  ├── 4.2 EventBus wiring ────────────────────┤
  ├── 4.3 WOD execution integration ──────────┤
  ├── 4.4 Undo/redo ──────────────────────────┤
  └── 4.5 Performance & edge cases ────────────┘
```

---

## Phase 1: Section Model & Read-Only Display

**Goal**: Parse a markdown document into sections and render each as a styled, non-editable component with continuous line numbers. This phase produces visible output without any editing capability.

**Exit criteria**: A `<SectionEditor>` component that renders any markdown document as a scrollable list of styled section cards with continuous line numbers, visually equivalent to the NotePreview but with full line-level fidelity.

---

### Step 1.1 — Define Section Types

**File**: `src/markdown-editor/types/section.ts` (new)

Define the core data model that all subsequent work depends on.

```typescript
// New types — extend the existing DocumentItemType concept

/** Section types the editor can parse and render */
export type SectionType = 'heading' | 'paragraph' | 'wod' | 'empty';

/** A single section in the document — atomic unit of editing */
export interface Section {
  /** Stable identifier (survives re-parse if structurally equivalent) */
  id: string;
  /** Structural type — determines renderer selection */
  type: SectionType;
  /** Raw markdown text including syntax (# for headings, ```wod fences, etc.) */
  rawContent: string;
  /** Display content (heading text without #, etc.) */
  displayContent: string;
  /** Start line in overall document (0-indexed) */
  startLine: number;
  /** End line in overall document (0-indexed, inclusive) */
  endLine: number;
  /** Computed line count: endLine - startLine + 1 */
  lineCount: number;
  /** Heading level 1-6 (only when type === 'heading') */
  level?: number;
  /** Associated WodBlock (only when type === 'wod') */
  wodBlock?: WodBlock;
}

/** The full document as an ordered section list */
export interface SectionDocument {
  sections: Section[];
  totalLines: number;
  activeSectionId: string | null;
}
```

**Dependencies**: Existing `WodBlock` type from `src/markdown-editor/types/index.ts`.

**Tests**: `src/markdown-editor/types/__tests__/section.test.ts` — type-only, minimal.

---

### Step 1.2 — Build `parseDocumentSections`

**File**: `src/markdown-editor/utils/sectionParser.ts` (new)

A new parser function that extends `parseDocumentStructure` logic to produce `Section[]` instead of `DocumentItem[]`. Key differences:

| Feature | `parseDocumentStructure` (existing) | `parseDocumentSections` (new) |
|---------|--------------------------------------|-------------------------------|
| Header content | Text only (`"My Workout"`) | Raw line (`"# My Workout"`) + display text |
| WOD content | Inner content only | Full fence lines (`\`\`\`wod` through `\`\`\``) |
| Empty lines | Skipped | Captured as trailing whitespace on the preceding section |
| Line count | Implicit (endLine - startLine) | Explicit `lineCount` property |
| IDs | Position-based (`header-5`) | Deterministic + stable (`section-{hash}`) |
| Return type | `DocumentItem[]` | `Section[]` |

**Algorithm** (pseudocode):
```
1. Split content into lines
2. Run detectWodBlocks(content) to get WodBlock[] with fence line positions
3. Walk lines sequentially:
   a. If line is start of a WodBlock → emit 'wod' section (startLine..endLine inclusive of fences)
   b. If line matches /^#{1,6}\s/ → emit 'heading' section (single line)
   c. If line is non-empty and not matched above → begin 'paragraph' section, extend until next empty/header/wod
   d. If line is empty → attach to previous section as trailing whitespace (increases its lineCount)
      - If no previous section exists, create an 'empty' section
4. For each section, compute lineCount = endLine - startLine + 1
5. Assign stable IDs: use `{type}-{startLine}-{contentHash.slice(0,8)}`
```

**Key design decision**: Empty lines are absorbed as trailing whitespace in the preceding section, not standalone sections. This keeps section count minimal and avoids cursor-in-empty-section UX issues. The `rawContent` of a paragraph section includes its trailing blank line(s) so that round-tripping `sections.map(s => s.rawContent).join('\n')` reconstructs the original document.

**Tests**: `src/markdown-editor/utils/__tests__/sectionParser.test.ts`
- Simple document: heading + paragraph + wod block
- Empty document → `[]`
- Document with only headings
- Document with consecutive empty lines
- WOD block at end of file (no closing fence)
- Round-trip test: `join(sections.rawContent) === originalContent`

---

### Step 1.3 — Build `useSectionDocument` Hook

**File**: `src/markdown-editor/hooks/useSectionDocument.ts` (new)

Central state management hook for the section editor.

```typescript
interface UseSectionDocumentOptions {
  /** Initial markdown content */
  initialContent: string;
  /** Controlled content (overrides internal state) */
  value?: string;
  /** Called when content changes */
  onContentChange?: (content: string) => void;
}

interface UseSectionDocumentReturn {
  /** Current section list */
  sections: Section[];
  /** Total line count */
  totalLines: number;
  /** Currently active (editing) section ID */
  activeSectionId: string | null;

  /** Activate a section for editing */
  activateSection: (sectionId: string, cursorPosition?: { line: number; column: number }) => void;
  /** Deactivate the current section (return to display mode) */
  deactivateSection: () => void;

  /** Update the content of the active section */
  updateSectionContent: (sectionId: string, newContent: string) => void;
  /** Insert a new section after the given section */
  insertSectionAfter: (afterSectionId: string, content: string) => void;
  /** Delete a section and merge with adjacent */
  deleteSection: (sectionId: string) => void;

  /** The full raw content (source of truth) */
  rawContent: string;

  /** WOD blocks extracted from sections */
  wodBlocks: WodBlock[];
}
```

**Internal state**:
- `rawContent: string` — the single source of truth
- `sections: Section[]` — derived via `parseDocumentSections(rawContent)`
- `activeSectionId: string | null`
- `pendingSectionContent: string | null` — local edits before debounced reconciliation

**Reconciliation flow**:
```
updateSectionContent(id, newContent)
  → replace section's line range in rawContent with newContent
  → debounce 300ms → re-parse → emit onContentChange
  → on deactivation: flush immediately (no debounce)
```

**Section identity preservation**: When re-parsing after content change, match old sections to new by `(type, startLine)` and `(type, contentHash)`. Preserve `id` for matched sections to avoid React key-thrashing.

**WOD block integration**: Extract `wodBlocks` from sections where `type === 'wod'` and pass to existing `useParseAllBlocks` for JIT compilation.

**Tests**: `src/markdown-editor/hooks/__tests__/useSectionDocument.test.ts`
- Parse initial content into sections
- Activate/deactivate section
- Update section content → rawContent updates
- Insert section after → sections list grows
- Round-trip: rawContent after edits matches expected
- WOD block detection works through sections

---

### Step 1.4 — Build `SectionContainer` Component

**File**: `src/markdown-editor/components/SectionContainer.tsx` (new)

Wrapper component providing the line number gutter and click target for each section.

```tsx
interface SectionContainerProps {
  section: Section;
  startLineNumber: number;  // 1-indexed for display
  gutterWidth: number;      // chars, computed from totalLines digit count
  isActive: boolean;
  onClick: (sectionId: string, clickPosition: { line: number; column: number }) => void;
  children: React.ReactNode;
}
```

**Renders**:
```
┌──────────┬───────────────────────────────────┐
│ Gutter   │ Content (children)                │
│ (fixed)  │                                   │
│  1       │  # My Workout                     │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

**Gutter implementation**:
- Fixed-width column matching the computed `gutterWidth`
- For multi-line sections, render one number per line
- For single-line sections (headings), render one number
- Styled with `text-muted-foreground`, right-aligned, monospace font
- Active section gutter uses a slightly different background

**Click handling**:
- `onClick` on the content area → computes approximate `{ line, column }` from click coordinates
- Line: `Math.floor((e.clientY - containerTop) / lineHeight) + section.startLine`
- Column: approximate from `e.clientX` and character width (doesn't need pixel precision — the editor will handle fine positioning)

**Styling**:
- Tailwind: `border-l-2 border-transparent` default, `border-l-2 border-primary` when active
- Smooth transition between active/inactive states
- Consistent `line-height` across all sections (match editor's 22px)

**Tests**: Storybook story + snapshot test for gutter rendering.

---

### Step 1.5 — Build `HeadingDisplay` Component

**File**: `src/markdown-editor/components/section-renderers/HeadingDisplay.tsx` (new)

Read-only renderer for heading sections.

```tsx
interface HeadingDisplayProps {
  section: Section;          // guaranteed type === 'heading'
  lineHeight: number;        // pixels, must match editor
}
```

**Renders**: The heading text at appropriate visual weight without `#` characters.

| Level | Element | Tailwind |
|-------|---------|----------|
| 1 | `<h1>` | `text-3xl font-bold` |
| 2 | `<h2>` | `text-2xl font-semibold` |
| 3 | `<h3>` | `text-xl font-semibold` |
| 4 | `<h4>` | `text-lg font-medium` |
| 5 | `<h5>` | `text-base font-medium` |
| 6 | `<h6>` | `text-sm font-medium uppercase tracking-wider` |

**Critical constraint**: The rendered height must be exactly `lineCount * lineHeight` pixels. Headings are always single-line, so height = `lineHeight`. No extra padding or margin that would disrupt line number alignment.

**Tests**: Storybook story with all 6 heading levels.

---

### Step 1.6 — Build `ParagraphDisplay` Component

**File**: `src/markdown-editor/components/section-renderers/ParagraphDisplay.tsx` (new)

Read-only renderer for paragraph sections.

```tsx
interface ParagraphDisplayProps {
  section: Section;
  lineHeight: number;
}
```

**Renders**: The paragraph text as styled body copy. Each line of the paragraph occupies exactly `lineHeight` pixels.

**Text styling**: `text-sm text-foreground leading-[22px]` (matching editor line height exactly).

**Multi-line**: If the paragraph spans multiple lines, each line is rendered individually to maintain exact line-height alignment with the gutter.

**Trailing whitespace**: If the section's `rawContent` includes trailing empty lines, those render as blank space at the section's natural `lineHeight`.

---

### Step 1.7 — Build `WodBlockDisplay` Component

**File**: `src/markdown-editor/components/section-renderers/WodBlockDisplay.tsx` (new)

Read-only renderer for WOD block sections. This is the richest renderer.

```tsx
interface WodBlockDisplayProps {
  section: Section;          // guaranteed type === 'wod', has wodBlock
  lineHeight: number;
  onStartWorkout?: (wodBlock: WodBlock) => void;
}
```

**Renders**: Two sub-modes depending on WOD block parse state:

1. **Parsed (block.state === 'parsed')**: Render parsed statements using existing fragment display components. Show a "Play" button for workout execution.

2. **Unparsed/Error**: Render the raw WOD content as monospace preformatted text with error indicators.

**Height**: Must match `lineCount * lineHeight` exactly. The fenced `` ```wod `` and `` ``` `` lines count toward line numbers.

**Reusable pieces**: Can delegate to existing components in `src/components/fragments/` for statement rendering. The play button pattern from `NotePreview.tsx` is directly reusable.

**Integration**: The `wodBlock` on the section is the same object managed by `useWodBlocks` / `useParseAllBlocks`, so `statements`, `errors`, and `state` are already populated.

---

### Step 1.8 — Build `SectionEditor` Shell (Read-Only)

**File**: `src/markdown-editor/SectionEditor.tsx` (new)

Top-level component that composes everything from Phase 1 into a scrollable read-only document.

```tsx
interface SectionEditorProps {
  /** Initial markdown content */
  initialContent?: string;
  /** Controlled content */
  value?: string;
  /** Content change callback */
  onContentChange?: (content: string) => void;
  /** Block change callback (for workbench integration) */
  onBlocksChange?: (blocks: WodBlock[]) => void;
  /** Active block change callback */
  onActiveBlockChange?: (block: WodBlock | null) => void;
  /** Start workout callback */
  onStartWorkout?: (block: WodBlock) => void;
  /** Height */
  height?: string | number;
  /** Width */
  width?: string | number;
  /** CSS class */
  className?: string;
}
```

**Implementation**:
```tsx
export const SectionEditor: React.FC<SectionEditorProps> = (props) => {
  const {
    sections,
    totalLines,
    activeSectionId,
    activateSection,
    wodBlocks
  } = useSectionDocument({
    initialContent: props.initialContent ?? '',
    value: props.value,
    onContentChange: props.onContentChange
  });

  // JIT parse all WOD blocks (reuse existing hook)
  useParseAllBlocks(wodBlocks, updateBlock);

  const gutterWidth = String(totalLines).length;  // digit count
  const lineHeight = 22;                          // must stay consistent

  return (
    <div className="section-editor overflow-auto" style={{ height, width }}>
      {sections.map(section => (
        <SectionContainer
          key={section.id}
          section={section}
          startLineNumber={section.startLine + 1}
          gutterWidth={gutterWidth}
          isActive={section.id === activeSectionId}
          onClick={handleSectionClick}
        >
          <SectionRenderer section={section} lineHeight={lineHeight} />
        </SectionContainer>
      ))}
    </div>
  );
};

// Dispatcher component — selects renderer by section type
const SectionRenderer: React.FC<{ section: Section; lineHeight: number }> = ({ section, lineHeight }) => {
  switch (section.type) {
    case 'heading': return <HeadingDisplay section={section} lineHeight={lineHeight} />;
    case 'paragraph': return <ParagraphDisplay section={section} lineHeight={lineHeight} />;
    case 'wod': return <WodBlockDisplay section={section} lineHeight={lineHeight} />;
    case 'empty': return <div style={{ height: lineHeight }} />;
  }
};
```

**At end of Phase 1**: This component can be rendered alongside the existing `MarkdownEditorBase` as an alternative view. It does not yet support editing — clicking a section has no visible effect beyond highlighting.

**Storybook story**: `stories/section-editor/SectionEditor.stories.tsx` — render sample documents showing the section-based display.

---

## Phase 2: Inline Section Editing

**Goal**: Make sections editable. Clicking a section switches it to an inline editor. Content changes flow back to `rawContent`.

**Exit criteria**: User can click any section, edit its content, and see the document update. Switching away from a section saves its changes.

---

### Step 2.1 — Build `SectionEditView` Component

**File**: `src/markdown-editor/components/SectionEditView.tsx` (new)

The active editor for a single section. Uses a `<textarea>` for heading/paragraph sections.

```tsx
interface SectionEditViewProps {
  section: Section;
  lineHeight: number;
  lineNumberOffset: number;     // startLine (0-indexed) so gutter shows correct numbers
  initialCursorPosition?: { line: number; column: number };
  onChange: (newContent: string) => void;
  onCursorMove?: (position: { line: number; column: number }) => void;
  onBoundaryReached?: (boundary: 'top' | 'bottom', event: React.KeyboardEvent) => void;
  onNewSectionRequest?: () => void;
}
```

**Textarea implementation**:
```tsx
<textarea
  ref={textareaRef}
  value={section.rawContent}
  onChange={handleChange}
  onKeyDown={handleKeyDown}
  rows={section.lineCount}
  style={{
    lineHeight: `${lineHeight}px`,
    fontFamily: 'monospace',
    fontSize: '14px',
    resize: 'none',
    border: 'none',
    outline: 'none',
    width: '100%',
    overflow: 'hidden',
    padding: 0,
    background: 'transparent',
  }}
  spellCheck={false}
/>
```

**Critical behaviors**:
- Auto-focus on mount with cursor at `initialCursorPosition`
- Auto-resize height to match content (no scrollbar within the textarea)
- Report cursor position on every cursor move (for boundary detection)
- Call `onBoundaryReached('top')` when Up arrow pressed on line 1
- Call `onBoundaryReached('bottom')` when Down arrow pressed on last line
- Call `onNewSectionRequest()` when Enter pressed on an empty trailing line

**Height constraint**: Height = `lineCount * lineHeight` where lineCount is dynamically computed from the current content (may grow as user types new lines).

---

### Step 2.2 — Implement Click-to-Edit Activation

**Changes to**: `SectionContainer.tsx`, `SectionEditor.tsx`, `useSectionDocument.ts`

**Flow**:
```
User clicks section content area
  → SectionContainer.onClick(sectionId, { line, column })
    → useSectionDocument.activateSection(sectionId, { line, column })
      → sets activeSectionId = sectionId
      → stores cursorPosition for the SectionEditView
      → previous active section deactivates (flush pending edits)
```

**Cursor position mapping**:
The `SectionContainer` click handler computes the approximate line within the section:
```typescript
const relativeY = e.clientY - containerRef.current.getBoundingClientRect().top;
const lineWithinSection = Math.floor(relativeY / lineHeight);
const absoluteLine = section.startLine + lineWithinSection;
```
Column estimation uses character width approximation — exact positioning is handled by the textarea cursor.

**SectionEditor update** — the rendering conditionally swaps display ↔ edit:
```tsx
{isActive
  ? <SectionEditView
      section={section}
      lineHeight={lineHeight}
      initialCursorPosition={cursorPosition}
      onChange={(content) => updateSectionContent(section.id, content)}
      onBoundaryReached={handleBoundary}
      onNewSectionRequest={() => insertSectionAfter(section.id, '')}
    />
  : <SectionRenderer section={section} lineHeight={lineHeight} />
}
```

---

### Step 2.3 — Implement Content Reconciliation

**Changes to**: `useSectionDocument.ts`

When the user edits a section's content, the hook must:

1. **Update local section content immediately** (responsive UI)
2. **Rebuild `rawContent`** from all sections (debounced)
3. **Re-parse sections** from the new rawContent (detect boundary changes)
4. **Emit `onContentChange`** to the parent

```typescript
function updateSectionContent(sectionId: string, newContent: string): void {
  // 1. Immediate local update
  setSections(prev => prev.map(s =>
    s.id === sectionId ? { ...s, rawContent: newContent, lineCount: newContent.split('\n').length } : s
  ));

  // 2. Debounced full reconciliation
  debounceReconcile(() => {
    const newRawContent = buildRawContent(sections);  // join all section rawContent
    setRawContent(newRawContent);
    const newSections = parseDocumentSections(newRawContent);
    setSections(matchSectionIds(prevSections, newSections));
    onContentChange?.(newRawContent);
  }, 300);
}
```

**`buildRawContent`**: `sections.map(s => s.rawContent).join('\n')` — the rawContent of each section includes its trailing whitespace so joining produces the original document.

**Section ID stability**: `matchSectionIds(old, new)` walks both lists, matching by `(type, startLine)` first, then by content hash. Matched sections keep their old ID. Unmatched new sections get fresh IDs.

---

### Step 2.4 — Handle Section Boundary Mutations

**Changes to**: `useSectionDocument.ts` reconciliation logic

When editing changes section boundaries:

| User Action | Detection | Result |
|-------------|-----------|--------|
| Types `# ` at start of paragraph | Re-parse detects new heading | Section splits: heading + remaining paragraph |
| Types `` ```wod `` on a new line | Re-parse detects new WOD block start | Section splits at fence line |
| Deletes `#` from heading | Re-parse: no heading match | Section merges into paragraph |
| Backspace at start of section | Content becomes empty → on next re-parse, section may merge with previous | Adjacent sections merge |

This is handled naturally by re-parsing the full rawContent. The section identity matching ensures the active section ID is remapped to the most appropriate new section.

**Edge case**: If the active section is split by a boundary mutation, the cursor should remain in the section that contains the cursor's absolute line position.

---

### Step 2.5 — WOD Section Monaco Editor

**File**: `src/markdown-editor/components/WodSectionEditor.tsx` (new)

WOD blocks benefit from Monaco's syntax highlighting. This is a special `SectionEditView` variant for `type === 'wod'` sections.

```tsx
interface WodSectionEditorProps {
  section: Section;           // type === 'wod'
  lineHeight: number;
  lineNumberOffset: number;
  initialCursorPosition?: { line: number; column: number };
  onChange: (newContent: string) => void;
  onBoundaryReached?: (boundary: 'top' | 'bottom', event: KeyboardEvent) => void;
}
```

**Strategy**: Mount a Monaco `<Editor>` instance with:
- `language: 'wod'` (or custom language registration)
- `lineNumbers: (n) => String(n + lineNumberOffset)` for correct line numbers
- `height: lineCount * lineHeight` (auto-resize disabled)
- Minimal options: no minimap, no scrollbar, no folding
- The model contains only this section's WOD content (between fences, not including fences)

**Performance**: Since only one section is ever active, there's at most one Monaco instance at a time. Mount cost is acceptable (~100-200ms) because section switching is a user-initiated action.

**Alternative**: If Monaco mount latency is too high, defer to Step 2.1's textarea approach and add syntax highlighting later via a lightweight library. The section architecture supports swapping renderers without structural changes.

---

## Phase 3: Keyboard Navigation

**Goal**: Enable fluid keyboard-driven section transitions so the document feels like a continuous editor.

**Exit criteria**: User can arrow-key between sections, Ctrl+arrow jump between sections, and Enter-on-empty creates new sections, without ever reaching for the mouse.

---

### Step 3.1 — Boundary Detection in SectionEditView

**Changes to**: `SectionEditView.tsx`

Add cursor position tracking to detect when the user is at a section boundary:

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  const textarea = textareaRef.current!;
  const { selectionStart } = textarea;
  const lines = textarea.value.split('\n');

  // Compute current line number within this section
  const textBeforeCursor = textarea.value.substring(0, selectionStart);
  const currentLine = textBeforeCursor.split('\n').length;  // 1-indexed within section
  const totalLines = lines.length;

  if (e.key === 'ArrowUp' && currentLine === 1 && !e.ctrlKey) {
    onBoundaryReached?.('top', e);
  }
  if (e.key === 'ArrowDown' && currentLine === totalLines && !e.ctrlKey) {
    onBoundaryReached?.('bottom', e);
  }

  // Ctrl+Arrow: always trigger boundary (jump between sections)
  if (e.key === 'ArrowUp' && e.ctrlKey) {
    e.preventDefault();
    onBoundaryReached?.('top', e);
  }
  if (e.key === 'ArrowDown' && e.ctrlKey) {
    e.preventDefault();
    onBoundaryReached?.('bottom', e);
  }

  // Enter on empty last line → new section
  if (e.key === 'Enter' && currentLine === totalLines && lines[totalLines - 1].trim() === '') {
    e.preventDefault();
    onNewSectionRequest?.();
  }
};
```

---

### Step 3.2 — Arrow Key Section Transitions

**Changes to**: `SectionEditor.tsx`

Handle `onBoundaryReached` from the active section:

```typescript
const handleBoundary = (boundary: 'top' | 'bottom', event: React.KeyboardEvent) => {
  event.preventDefault();
  const currentIndex = sections.findIndex(s => s.id === activeSectionId);

  if (boundary === 'top' && currentIndex > 0) {
    const prevSection = sections[currentIndex - 1];
    activateSection(prevSection.id, {
      line: prevSection.lineCount - 1,  // last line
      column: 0
    });
  }

  if (boundary === 'bottom' && currentIndex < sections.length - 1) {
    const nextSection = sections[currentIndex + 1];
    activateSection(nextSection.id, {
      line: 0,  // first line
      column: 0
    });
  }
};
```

**Cursor placement**:
- Transition UP → cursor on **last line** of previous section
- Transition DOWN → cursor on **first line** of next section
- Column preserved if possible (matched to previous cursor column)

---

### Step 3.3 — Ctrl+Arrow Section Jumping

Same handler as 3.2, but triggered by `Ctrl+ArrowUp` / `Ctrl+ArrowDown` regardless of cursor position within the section. The boundary detection in 3.1 handles this by checking for `e.ctrlKey` independently of line position.

**Cursor placement**: Always first line of the target section (since the user is "jumping" rather than "flowing").

---

### Step 3.4 — Enter-to-Create New Section

**Changes to**: `useSectionDocument.ts`, `SectionEditor.tsx`

When `onNewSectionRequest` fires:

```typescript
function insertSectionAfter(afterSectionId: string, content: string): void {
  // 1. Remove trailing empty line from current section
  const currentSection = sections.find(s => s.id === afterSectionId);
  const trimmedContent = currentSection.rawContent.replace(/\n$/, '');
  updateSectionContent(afterSectionId, trimmedContent);

  // 2. Create new empty paragraph section
  const newSection: Section = {
    id: generateSectionId(),
    type: 'paragraph',
    rawContent: '',
    displayContent: '',
    startLine: currentSection.endLine + 1,
    endLine: currentSection.endLine + 1,
    lineCount: 1,
  };

  // 3. Insert after current, recalculate line numbers
  setSections(prev => {
    const idx = prev.findIndex(s => s.id === afterSectionId);
    const newSections = [...prev];
    newSections.splice(idx + 1, 0, newSection);
    return recalculateLineNumbers(newSections);
  });

  // 4. Activate the new section
  activateSection(newSection.id, { line: 0, column: 0 });
}
```

---

## Phase 4: Integration & Polish

**Goal**: Replace the existing `MarkdownEditorBase` in PlanPanel with the new `SectionEditor`. Wire up all workbench integrations. Handle edge cases.

**Exit criteria**: The Plan view uses the section editor for all editing. WOD execution, save, event bus communication, and keyboard shortcuts all work. No regressions.

---

### Step 4.1 — Replace PlanPanel Editor

**Changes to**: `src/components/workbench/PlanPanel.tsx`

**Before**:
```tsx
<MarkdownEditorBase
  initialContent={initialContent}
  onActiveBlockChange={handleActiveBlockChange}
  onBlocksChange={setBlocks}
  onContentChange={setContent}
  ...
/>
```

**After**:
```tsx
<SectionEditor
  initialContent={initialContent}
  value={content}
  onContentChange={setContent}
  onBlocksChange={setBlocks}
  onActiveBlockChange={handleActiveBlockChange}
  onStartWorkout={onStartWorkout}
  height="100%"
/>
```

**What changes in PlanPanel**:
- Remove `editorRef` (Monaco reference) — no single editor instance anymore
- Remove `onEditorMount` callback — not needed
- Keep save state indicator overlay (positioned absolutely, works on any child)
- Keep workbenchEventBus subscription (re-wire to section scrolling)

**What changes in Workbench.tsx**:
- Remove `editorInstance` state and ref
- Remove `handleEditorMount` callback
- Remove scroll-to-block logic that relies on `editorInstance.revealLineInCenter()`
- Add section-based scroll logic: `workbenchEventBus.onScrollToBlock(blockId)` → find section with matching wodBlock, scroll container to section element

---

### Step 4.2 — Wire WorkbenchEventBus

**Changes to**: `SectionEditor.tsx`, `src/services/WorkbenchEventBus.ts`

**Scroll to block**: When the track view or review view emits `SCROLL_TO_BLOCK`, the section editor finds the section containing that block and scrolls it into view.

```typescript
useEffect(() => {
  const cleanup = workbenchEventBus.onScrollToBlock((blockId) => {
    const section = sections.find(s => s.wodBlock?.id === blockId);
    if (section) {
      document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth' });
    }
  });
  return cleanup;
}, [sections]);
```

**Highlight block**: When hovering over a block in another panel, highlight the corresponding section.

**New events** (optional, for future use):
```typescript
// Add to WorkbenchEventBus
emitSectionFocus(sectionId: string, source: string): void
onSectionFocus(handler: (sectionId: string, source: string) => void): () => void
```

---

### Step 4.3 — WOD Execution Integration

**Changes to**: `SectionEditor.tsx`, `WodBlockDisplay.tsx`

The "Start Workout" flow:

```
User clicks ▶ Play on WodBlockDisplay
  → onStartWorkout(section.wodBlock)
    → PlanPanel.onStartWorkout(block)
      → Workbench.handleStartWorkoutAction(block)
        → runtime.load(block.statements)
        → viewMode switches to 'track'
```

This is identical to the current flow. The only change is where the play button lives — in `WodBlockDisplay` instead of `ContextOverlay` or `NotePreview`.

**WOD block state updates**: `useParseAllBlocks` mutates the `WodBlock` objects (populating `statements`, `errors`, `state`). Since sections hold references to the same `WodBlock` objects, the `WodBlockDisplay` renderer automatically gets updated data via React re-renders triggered by the state changes.

---

### Step 4.4 — Document-Level Undo/Redo

**File**: `src/markdown-editor/hooks/useSectionUndoRedo.ts` (new)

Since sections use a textarea (not Monaco with built-in undo), we need document-level undo/redo:

```typescript
interface UndoRedoState {
  history: string[];     // rawContent snapshots
  position: number;      // current position in history
}

function useSectionUndoRedo(rawContent: string, setRawContent: (content: string) => void) {
  // Push to history on every content change (debounced, deduplicated)
  // Ctrl+Z → undo: position--, apply history[position]
  // Ctrl+Shift+Z / Ctrl+Y → redo: position++, apply history[position]
}
```

**History granularity**: Snapshot on section deactivation (user finished editing a section), not on every keystroke. This gives meaningful undo points.

**Integration**: Bind `Ctrl+Z` / `Ctrl+Shift+Z` at the `SectionEditor` level (not per-section textarea).

---

### Step 4.5 — Performance & Edge Cases

**Virtualization** (deferred, measure first):
- For documents with 50+ sections, use windowed rendering (e.g., `react-window` or manual scroll-position-based rendering)
- Only render sections within the visible viewport + buffer
- Measure first — most workout documents are 5-20 sections

**Edge cases to handle**:
- **Empty document**: Show a single empty paragraph section with cursor
- **Single-section document**: No boundary navigation (arrows work normally)
- **Rapid section switching**: Debounce section activation to prevent flicker
- **Paste multi-line content**: Content may create new section boundaries → re-parse immediately
- **Cut/delete entire section content**: If section becomes empty and user presses Backspace, merge with previous section
- **WOD block with runtime state**: Switching away from a running WOD block section should NOT stop the workout
- **Browser focus loss**: Deactivate section and flush pending edits
- **Very long paragraphs** (100+ lines): Textarea should still perform well; if not, consider chunking

---

## File Inventory

### New Files

| File | Phase | Description |
|------|-------|-------------|
| `src/markdown-editor/types/section.ts` | 1.1 | Section type definitions |
| `src/markdown-editor/utils/sectionParser.ts` | 1.2 | Document → Section[] parser |
| `src/markdown-editor/utils/__tests__/sectionParser.test.ts` | 1.2 | Parser tests |
| `src/markdown-editor/hooks/useSectionDocument.ts` | 1.3 | Section state management hook |
| `src/markdown-editor/hooks/__tests__/useSectionDocument.test.ts` | 1.3 | Hook tests |
| `src/markdown-editor/components/SectionContainer.tsx` | 1.4 | Gutter + wrapper component |
| `src/markdown-editor/components/section-renderers/HeadingDisplay.tsx` | 1.5 | Heading renderer |
| `src/markdown-editor/components/section-renderers/ParagraphDisplay.tsx` | 1.6 | Paragraph renderer |
| `src/markdown-editor/components/section-renderers/WodBlockDisplay.tsx` | 1.7 | WOD block renderer |
| `src/markdown-editor/components/section-renderers/index.ts` | 1.7 | Barrel export |
| `src/markdown-editor/SectionEditor.tsx` | 1.8 | Top-level section editor |
| `src/markdown-editor/components/SectionEditView.tsx` | 2.1 | Textarea editor for active section |
| `src/markdown-editor/components/WodSectionEditor.tsx` | 2.5 | Monaco editor for WOD sections |
| `src/markdown-editor/hooks/useSectionUndoRedo.ts` | 4.4 | Undo/redo stack |
| `stories/section-editor/SectionEditor.stories.tsx` | 1.8 | Storybook stories |

### Modified Files

| File | Phase | Changes |
|------|-------|---------|
| `src/components/workbench/PlanPanel.tsx` | 4.1 | Replace `MarkdownEditorBase` with `SectionEditor` |
| `src/components/layout/Workbench.tsx` | 4.1 | Remove Monaco editor ref, update state wiring |
| `src/services/WorkbenchEventBus.ts` | 4.2 | Optional: add section-level events |
| `src/markdown-editor/index.ts` | 1.8 | Export `SectionEditor` |

### Files Becoming Dead Code (remove after Phase 4 validation)

| File | Reason |
|------|--------|
| `src/markdown-editor/hooks/useMarkdownEditorSetup.ts` | 100% Monaco setup — replaced by section architecture |
| `src/markdown-editor/hooks/useContextOverlay.ts` | Monaco overlay widget — replaced by inline section UI |
| `src/markdown-editor/hooks/useWodDecorations.ts` | Monaco decorations — replaced by React component styling |
| `src/markdown-editor/hooks/useSmartIncrement.ts` | Monaco keybinding — reimplemented in section editor if needed |
| `src/markdown-editor/components/WodBlockManager.tsx` | Monaco decorations bridge — replaced by section renderers |
| `src/markdown-editor/widgets/ContextOverlay.tsx` | Monaco overlay widget — removed |
| `src/markdown-editor/widgets/ReactMonacoWidget.ts` | Monaco widget utility — removed |

### Files Retained As-Is

| File | Reason |
|------|--------|
| `src/markdown-editor/utils/blockDetection.ts` | Pure function, used by sectionParser |
| `src/markdown-editor/utils/documentStructure.ts` | May still be used by NotePreview |
| `src/markdown-editor/hooks/useParseAllBlocks.ts` | Zero Monaco dependency, reused directly |
| `src/markdown-editor/hooks/useBlockEditor.ts` | Interface preserved, implementation replaced |
| `src/markdown-editor/hooks/useWodBlocks.ts` | Detection logic reused; cursor tracking refactored |
| `src/markdown-editor/types/index.ts` | WodBlock is the foundation type — unchanged |
| `src/services/WorkbenchEventBus.ts` | Fully reusable |

---

## Testing Strategy

### Unit Tests (per phase)

| Phase | Tests | Runner |
|-------|-------|--------|
| 1.2 | `sectionParser.test.ts` — round-trip, edge cases, heading levels, WOD fences | `bun test` |
| 1.3 | `useSectionDocument.test.ts` — state management, activation, content updates | `bun test` |
| 2.3 | Content reconciliation — rawContent rebuilt correctly after section edits | `bun test` |
| 2.4 | Boundary mutation — typing `#` splits paragraph into heading | `bun test` |
| 3.1 | Boundary detection — cursor position tracking within textarea | `bun test` |

### Storybook Stories (visual testing)

| Phase | Story | Validates |
|-------|-------|-----------|
| 1.8 | `SectionEditor.stories.tsx` — Default | All renderers display correctly |
| 1.8 | `SectionEditor.stories.tsx` — Empty Document | Empty state handling |
| 1.8 | `SectionEditor.stories.tsx` — Complex Document | Multiple headings, paragraphs, WOD blocks |
| 2.2 | `SectionEditor.stories.tsx` — Click to Edit | Section activation works |
| 3.2 | `SectionEditor.stories.tsx` — Keyboard Navigation | Arrow key transitions |

### Integration Tests (Phase 4)

| Test | Scope |
|------|-------|
| PlanPanel renders SectionEditor correctly | Component mount |
| WOD block play button triggers workout | End-to-end flow |
| Content changes persist through save cycle | Data flow |
| EventBus scroll-to-block scrolls to correct section | Cross-panel |

---

## Risk Mitigations

| Risk | Mitigation | Phase |
|------|-----------|-------|
| Line height mismatch → layout shift | Enforce `lineHeight: 22px` on all section renderers via shared constant; visual regression tests in Storybook | 1 |
| Re-parse on every edit is expensive | Debounce 300ms; only re-parse when section boundaries might have changed (detect `#` or `` ``` `` in edit content) | 2 |
| Textarea lacks WOD syntax highlighting | Accept for v1; WodSectionEditor (Step 2.5) adds Monaco for WOD blocks specifically | 2 |
| Undo/redo feels wrong without Monaco | Document-level undo stack with meaningful checkpoints (section deactivation) | 4 |
| Existing tests break | Keep `MarkdownEditorBase` functional throughout development; swap in PlanPanel only in Phase 4 after SectionEditor is validated | 4 |
| Document-wide find/replace doesn't work | Defer to Phase 5 (not in scope); currently Monaco handles this | — |
