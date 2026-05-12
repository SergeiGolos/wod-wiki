# Note Editor Research Curriculum

## Goal

Define a consistent editor architecture where CodeMirror remains the single source of truth for text editing, while section-aware overlays, hints, and inline companion UI behave predictably across markdown, frontmatter, and WOD blocks.

This curriculum is designed for the current transition from the legacy section-based editor to the single-instance NoteEditor.

## Problem Framing

The target experience is not a generic rich text editor. It is a page-shaped single-column writing surface with a section-aware document model layered on top.

The core constraints are:

- The document remains plain text markdown.
- Blank lines define section boundaries for editing and UI behavior.
- Section types include at least markdown, frontmatter, and fenced WOD blocks.
- Every section must stay editable as raw text.
- Focused sections may reveal a second inline column with custom controls or structured editors.
- Unfocused sections may render alternative UI, but must not break cursor placement, undo, selection, or keyboard motion.

That means the research has to answer three different questions:

1. How should the document be segmented semantically?
2. Which CodeMirror primitives should own the visual transformation?
3. How do clicks, focus, hover, selection, and layout measurements map cleanly between source text and overlay UI?

## Current Repo Baseline

The current code already contains the starting pieces for this work.

- The single-editor direction is defined in [note-editor-adr.md](./note-editor-adr.md).
- The intended UX is defined in [note-editor-prd.md](./note-editor-prd.md).
- The active CM6 implementation is in [../src/components/Editor/NoteEditor.tsx](../src/components/Editor/NoteEditor.tsx).
- Section parsing for the note editor is in [../src/components/Editor/extensions/section-state.ts](../src/components/Editor/extensions/section-state.ts).
- Current WOD visual treatment is in [../src/components/Editor/extensions/preview-decorations.ts](../src/components/Editor/extensions/preview-decorations.ts).
- Current floating WOD actions are in [../src/components/Editor/extensions/wod-overlay.ts](../src/components/Editor/extensions/wod-overlay.ts).
- The legacy multi-section editor remains in [../src/components/Editor/SectionEditor.tsx](../src/components/Editor/SectionEditor.tsx).
- Repo memory already captures the older plan-view section model and is useful as a comparison baseline.

## Research Output Expected

At the end of this curriculum, the team should be able to produce:

- A section model specification.
- A rendering strategy matrix for each section type.
- A focus and interaction policy.
- A geometry and measurement strategy for inline second-column UI.
- A phased implementation plan for NoteEditor.
- A rejection list of approaches that look attractive but will produce unstable behavior.

## Guiding Architecture Hypothesis

The most likely correct architecture is:

- Use a StateField to maintain section boundaries and section metadata.
- Keep the document as raw markdown at all times.
- Use direct decorations from state for anything that changes vertical layout.
- Use ViewPlugin logic only for viewport-limited read-only adornments.
- Use block widgets or block replacement decorations sparingly, only for collapsed or transformed presentation states.
- Use block wrappers when the need is structural grouping around lines rather than content replacement.
- Use tooltips or layers for floating hints and ephemeral actions.
- Use requestMeasure plus lineBlockAt and viewportLineBlocks for any UI aligned to rendered section geometry.

This is the main thing to validate during research, not assume.

## CodeMirror Findings That Matter

The web research surfaced a few constraints that should shape the investigation.

- Decorations that change vertical layout, such as block widgets or replacements across line breaks, must be provided directly, not from a viewport plugin.
- Block widgets should not use vertical margins. Height changes require requestMeasure.
- Tooltips are fine for floating action panels, but they are anchored to document positions, not section rectangles by default.
- Tooltip views can override placement with getCoords and can be re-positioned when geometry changes.
- Layers are appropriate for non-layout UI painted over the document, but they are not accessible by default and should not carry essential editing semantics.
- viewportLineBlocks, lineBlockAt, lineBlockAtHeight, elementAtHeight, coordsAtPos, and posAtCoords are the core measurement APIs for aligning section UI to editor layout.
- Block wrappers can add DOM structure around line groups without replacing content.
- atomicRanges should be used if replacement widgets are meant to act as indivisible units for selection and cursor motion.

## Research Streams

### Stream 1: Section Semantics

Objective: define the canonical section model independent of rendering.

Questions to answer:

- Are blank lines always the section separator, or do fenced blocks and frontmatter override that rule?
- Should consecutive markdown lines be grouped as one section until a blank line, or should headings become their own section type?
- Is frontmatter only valid at the top of the document, or do block-level YAML embeds also count as frontmatter sections?
- Should WOD sections be identified only by fences, or also by parsed dialect metadata?
- What metadata must remain stable across edits: id, type, line range, version, dialect, parse status?
- What is the minimum stable identity strategy when lines shift due to insertion above?

Deliverables:

- A normalized Section interface.
- Parsing rules with examples.
- A list of invalid or ambiguous cases and how they degrade.

Repo tasks:

- Compare [../src/components/Editor/extensions/section-state.ts](../src/components/Editor/extensions/section-state.ts) against the older plan-view section model stored in repo memory.
- Decide whether NoteEditor should adopt the richer older section identity model instead of using sequential ids like sec-0.

### Stream 2: Rendering Modes Per Section Type

Objective: decide what gets rendered as raw text, styled text, replaced preview, wrapped block, or companion UI.

Questions to answer:

- For markdown sections, is the unfocused state just line styling, or full preview replacement?
- For frontmatter, is the correct model collapsed summary plus expandable raw source, or sidecar form editing?
- For WOD blocks, should the main text remain visible with decoration-based enhancement, or should unfocused blocks fully collapse into structured visual components?
- Which sections ever show a second inline column?
- Is the second column rendered for only the active section, hovered section, or selected section range?
- Does the second column consume layout inside CodeMirror content, or sit in an overlay track outside the text column?

Deliverables:

- A rendering matrix by section type and focus state.
- A list of CM6 primitives used by each rendering state.

Recommended starting matrix:

- Markdown: raw text when active, styled text when inactive.
- Frontmatter: raw text when active, compact key-value summary plus controls when inactive.
- WOD: raw text when active, decorated source or structured preview when inactive.
- Companion column: only for the active section in phase 1.

### Stream 3: Second-Column Layout Strategy

Objective: determine how the inline companion column is physically drawn.

This is the least beaten-path part of the design and needs prototype work first.

Candidate approaches:

1. In-document block widget companion
2. In-document block wrapper companion
3. Absolute-positioned overlay track aligned to section rectangles
4. External sibling column synchronized to active section geometry

Evaluation criteria:

- Cursor stability
- Scroll stability
- Layout jitter under wrapping
- Selection correctness
- Accessibility
- Ease of click-to-source mapping
- React integration cost
- Performance on long documents

What to test first:

- Whether a block widget can represent an active section companion without making cursor movement feel broken.
- Whether a wrapper plus absolutely positioned child UI provides enough structure without replacing text.
- Whether an overlay track anchored by viewportLineBlocks and requestMeasure is visually stable enough for a second column.

Likely recommendation:

- Keep the text column real and editable.
- Render the second column outside the text flow as an overlay track aligned to the active section rectangle.
- Reserve true block replacement for optional collapsed preview states, not for the main editing experience.

Reason:

- The second column is presentation and interaction chrome, not document content.
- Putting it into the document flow risks cursor anomalies, line block fragmentation, and unstable selection behavior.

### Stream 4: Focus, Selection, and Input Policy

Objective: make the editor feel consistent when moving between source and helper UI.

Questions to answer:

- What makes a section active: cursor inside, click on preview, click on overlay, keyboard navigation?
- When clicking helper UI, should editor selection remain in the source range or temporarily move?
- When a section becomes active, do inactive sections degrade to lightweight styling or remain fully previewed?
- Should ArrowUp and ArrowDown move by line, by section, or both depending on modifier?
- What should Tab do when inside a helper control versus inside the text editor?
- How should multi-cursor behave when selections span multiple sections?

Deliverables:

- A written interaction contract.
- A keyboard behavior table.
- A focus ownership diagram.

Important validation point:

- Do not let overlays become the real selection owner unless there is a strong reason. CodeMirror should remain the primary focus surface.

### Stream 5: Geometry and Position Mapping

Objective: define the measurement layer that aligns helper UI with source text.

Questions to answer:

- Which document position represents a section anchor: from, contentFrom, first visible line, or section midpoint?
- For wrapped markdown lines, is line-based geometry sufficient, or do section rectangles need to be synthesized from block info?
- How should the editor react when line wrapping changes due to container resize?
- How are click coordinates inside overlay UI translated back to a source position when needed?
- When the section is partially offscreen, should the companion UI clamp, hide, or dock?

Prototype APIs to validate:

- requestMeasure
- viewportLineBlocks
- lineBlockAt
- lineBlockAtHeight
- coordsAtPos
- posAtCoords
- elementAtHeight
- tooltip getCoords
- repositionTooltips

Deliverables:

- A section rectangle derivation algorithm.
- Rules for when geometry is recomputed.
- A failure policy for offscreen or partially rendered sections.

### Stream 6: Rendering Technology Choice for Helpers

Objective: decide how React components should live inside or around CM6.

Questions to answer:

- Should helper UI be plain DOM widgets created by WidgetType?
- Should widgets host React roots?
- Should the overlay track be rendered by React outside the editor while consuming measured geometry from a ViewPlugin?
- What state is stored in CM6 state versus React state versus external store?

Recommended bias:

- Use CM6 state for section metadata, positions, and editor-driven interaction state.
- Use React outside the editor for complex companion UIs.
- Keep WidgetType DOM minimal and mostly non-React unless the widget is small and self-contained.

Reason:

- This keeps CodeMirror responsible for text and layout, while React owns rich controls and business logic.

### Stream 7: Performance Model

Objective: prevent the design from collapsing on long notes.

Questions to answer:

- How many sections can be measured every frame without scroll jank?
- Should section parsing run on every doc change, or incrementally map prior ranges through changes?
- Which decorations can be viewport-scoped and which must be direct state decorations?
- How much structured rendering can happen for inactive WOD sections before it becomes too expensive?

Deliverables:

- A budget for parsing, measuring, and rendering.
- A viewport strategy.
- A degradation strategy for large documents.

### Stream 8: Accessibility and Editing Safety

Objective: make sure the enhanced UI does not break actual editing.

Questions to answer:

- Which helper information must be mirrored in accessible text?
- Can all actions be triggered from the keyboard?
- If overlay UI is hidden from screen readers, what equivalent feedback exists in source mode?
- What happens when the document is copied, searched, or diffed?

Deliverables:

- A minimal accessibility checklist.
- A list of editor operations that must remain unchanged: copy, paste, select all, find, undo, redo, multi-cursor.

## Research Sequence

### Phase 1: Normalize the Document Model

- Audit current NoteEditor section parsing.
- Compare it with the older plan-view section model.
- Write the canonical section grammar with examples.
- Decide which section types exist in v1.

Exit criteria:

- Everyone agrees on what a section is before touching rendering.

### Phase 2: Prototype Layout Primitives

- Build a minimal playground with one markdown section, one frontmatter block, and one fenced WOD block.
- Prototype three alternatives for active-section helper UI:
  - tooltip-based right rail
  - absolute overlay track
  - block widget companion
- Measure cursor movement, scroll stability, and click mapping.

Exit criteria:

- One layout primitive is clearly better for the second-column experience.

### Phase 3: Define State Ownership

- Decide what lives in CM6 state fields.
- Decide what lives in React overlay state.
- Decide how section identity survives edits.
- Define how section parse status and helper UI state synchronize.

Exit criteria:

- No duplicated state model for section identity and geometry.

### Phase 4: Lock Interaction Rules

- Specify activation rules.
- Specify hover versus focus behavior.
- Specify keyboard navigation across sections.
- Specify how helper UI actions write back to text.

Exit criteria:

- A deterministic interaction contract exists.

### Phase 5: Implement by Section Type

- Implement markdown inactive styling or preview.
- Implement frontmatter summary plus edit transition.
- Implement WOD active companion UI.
- Expand helper controls only after active-section geometry is stable.

Exit criteria:

- One section type works end-to-end before broadening the system.

## Prototype Checklist

Every prototype should be scored against the same checklist.

- Cursor never disappears or lands in surprising places.
- Arrow navigation stays predictable.
- Clicking preview or helper UI maps back to source correctly.
- Scroll position does not jump when focus changes.
- Undo and redo operate only on text changes, not view artifacts.
- Resizing the editor does not desynchronize the companion UI.
- Large documents remain responsive.

## Specific Questions To Research On The Internet

These are the exact topics worth deeper external research.

- Best practices for CodeMirror 6 block widgets in editable documents.
- Tradeoffs between Decoration.replace and block wrappers for mixed preview and source editors.
- requestMeasure patterns for geometry-synced overlays.
- Tooltip getCoords and repositionTooltips for custom anchored side panels.
- Accessibility implications of CM6 layers and widgets.
- Stable mapping of decorations through document changes with RangeSet and transaction mapping.
- Real-world examples of CM6 hosting React-driven UI beside editable text.

## Recommended First Implementation Direction

If the team wants the shortest path with the highest chance of staying stable:

- Keep NoteEditor as one CM6 instance.
- Upgrade section parsing first.
- Do not start with full replacement previews for all markdown blocks.
- Treat the active section as the only section allowed to show rich companion UI.
- Render the companion UI in an overlay track outside the text flow, aligned by measured section geometry.
- Use direct decorations for line and block styling, not for every rich UI element.
- Use tooltips only for small floating affordances, not as the main second-column system.

## Anti-Patterns To Avoid

- Replacing large editable ranges with heavy React widgets as the default editing mode.
- Mixing multiple independent editor instances back into the document.
- Relying on hover-only state for important actions.
- Letting React own the primary text selection model.
- Computing layout from random DOM reads instead of requestMeasure.
- Using plugin-provided block decorations for layout-changing content.

## Decision Gate

Before implementation begins, the team should explicitly decide:

- Canonical section types
- Active-section definition
- Companion column layout primitive
- State ownership split between CM6 and React
- v1 preview policy for markdown, frontmatter, and WOD

If those five decisions are made up front, the implementation work becomes straightforward. If they are left fuzzy, the editor will keep accumulating one-off overlays and inconsistent behavior.