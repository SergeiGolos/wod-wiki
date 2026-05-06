# ADR: Single-Instance Note Editor Architecture

**Status**: Proposed

## Context
The current editor architecture uses a fragmented approach: a single CodeMirror instance for basic Markdown editing and a complex, React-based `SectionEditor` for structured WhiteboardScript segments. This results in a disjointed user experience, inconsistent scrolling behavior, and high complexity when syncing cross-section state.

## Decision
1. **Unified CodeMirror Foundation**: Standardize the editor on a single CodeMirror 6 (CM6) instance for the entire document content.
2. **State-Field Managed Sections**: Implement a CM6 `StateField` to continuously parse and track document sections (Markdown vs. WhiteboardScript). This field will maintain mapping between document ranges and section IDs.
3. **Block-Level Preview via Decorations**: Utilize `ViewPlugin` to manage `Decoration.replace` for blocks not containing the primary cursor.
    - **MarkdownPreviewWidget**: Renders non-active Markdown sections as HTML using a lightweight parser.
    - **WodPreviewWidget**: Renders non-active WhiteboardScript sections using the existing `StatementDisplay` logic for structured visual feedback.
4. **Custom Linting Extension**: Develop a `LintSource` that runs the WhiteboardScript parser on content within code fences to show real-time syntax errors as inline underlines.
5. **Interactive Overlay Panel**: Implement a floating UI using CM6 `showTooltip` or a custom absolute-positioned layer that tracks the active line in a WhiteboardScript block.
6. **Autocomplete & Command Extensions**:
    - **Snippet Support**: Utilize CM6 `Snippet` for frontmatter component insertion, which handles cursor placement (e.g., `url: ${1:enter_url}`).
    - **Smart Wrapping Command**: Implement a custom editor command bound to ` ``` ` that wraps the current selection in ` ```${dialect}\n${selection}\n``` ` and shifts focus to the first line of content.
    - **Contextual Autocomplete**: Use `CompletionSource` to suggest dialects inside ` ``` ` and components after `---`.
7. **Coordinate Mapping Strategy**: Implement logic to accurately map mouse clicks on a preview widget back to the underlying text coordinates in the CM6 document.

## Rationale
CM6 is highly modular and designed for these exact use cases (decorations, tooltips, linting, etc.). Using a single editor instance ensures that standard editing features (find-replace, multi-cursor, undo/redo) work seamlessly across the entire document without the overhead of coordinating multiple independent editor components.

## Consequences
- **Pros**:
    - Significantly improved, cohesive editing experience.
    - Simplified state management (one source of truth for the entire doc).
    - Enhanced extensibility for future specialized syntax or UI elements.
- **Cons**:
    - Increased logic complexity for managing the transition between preview and edit modes.
    - Potential performance considerations for very large documents with dense preview widgets (requires efficient widget `eq` logic).
