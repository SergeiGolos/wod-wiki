# Monaco Editor Folding Analysis

This document analyzes the custom folding and content hiding mechanisms implemented in the Monaco Editor setup for the WodWiki project.

## Overview

The folding and hiding logic is centralized in `RichMarkdownManager.ts`. It uses two primary mechanisms from the Monaco Editor API:
1.  **`setHiddenAreas`**: Completely hides ranges of lines from the editor view.
2.  **`changeViewZones`**: Inserts custom DOM nodes (React components) into the editor layout, often used to replace the hidden areas.
3.  **`deltaDecorations`**: Used for inline hiding of syntax characters (like `#` in headings) by applying a CSS class with `display: none` (or similar).

## Folding Types Identified

### 1. Front Matter Folding

*   **Input Type:** YAML Front Matter block at the beginning of the file.
    *   Starts with `---` on the first line.
    *   Ends with `---`.
    *   Contains `key: value` pairs.
*   **Folded Content:** The entire block, including the start and end delimiters.
*   **Displayed Placeholder:** A `FrontMatterTable` React component that displays the properties in a formatted table.
*   **Implementation:**
    *   **Parsing:** `FrontMatterParser.parse(lines)` identifies the block range.
    *   **Hiding:** `setHiddenAreas` is called with the range of the block.
    *   **Display:** `changeViewZones` adds a zone with the `FrontMatterTable` component.
    *   **Interaction:** Clicking "Edit" in the table unhides the area and moves focus to it.

### 2. Media Folding

*   **Input Type:**
    *   **Images:** Markdown image syntax `![alt](url)` on a standalone line.
    *   **YouTube:** Standalone YouTube links (e.g., `https://youtube.com/watch?v=...`) on a standalone line.
*   **Folded Content:** The single line containing the markdown or link.
*   **Displayed Placeholder:** A `MediaWidget` React component.
    *   For images: Renders the image.
    *   For YouTube: Renders an iframe player.
*   **Implementation:**
    *   **Parsing:** `MediaParser.parse(lines)` identifies lines containing media.
    *   **Hiding:** `setHiddenAreas` hides the specific line.
    *   **Display:** `changeViewZones` adds a zone with the `MediaWidget`.
    *   **Interaction:** Clicking "Edit" (if implemented) or moving the cursor to the line (if not readonly) unhides it.

### 3. WOD Block Fence Hiding

*   **Input Type:** Lines containing WOD block fences: ` ```wod ` or ` ``` `.
*   **Folded Content:** The line containing the fence itself.
*   **Displayed Placeholder:** None. The line is simply collapsed. The content *inside* the block remains visible.
*   **Implementation:**
    *   **Parsing:** Iterates lines in `RichMarkdownManager` checking for `trimmed === '```wod'` or `trimmed === '```'`.
    *   **Hiding:** `setHiddenAreas` hides the fence lines.
    *   **Display:** No ViewZone is added.

### 4. Heading Syntax Hiding (Inline)

*   **Input Type:** Markdown headings (e.g., `# Heading`, `## Heading`).
*   **Folded Content:** The hash characters (`#`, `##`, etc.) and the leading space.
*   **Displayed Placeholder:** None. The characters are hidden, and the remaining text is styled.
*   **Implementation:**
    *   **Parsing:** Regex match `/^(\s*)(#{1,3})\s+(.*)/` in `RichMarkdownManager`.
    *   **Hiding:** `deltaDecorations` applies `inlineClassName: 'rich-md-hidden'` to the hashes.
    *   **Display:** The rest of the line gets a style class (e.g., `rich-md-heading-1`).

### 5. Blockquote Syntax Hiding (Inline)

*   **Input Type:** Markdown blockquotes (e.g., `> Quote`).
*   **Folded Content:** The greater-than sign and space (`> `).
*   **Displayed Placeholder:** None. The characters are hidden.
*   **Implementation:**
    *   **Parsing:** Regex match `/^>\s+(.*)/` in `RichMarkdownManager`.
    *   **Hiding:** `deltaDecorations` applies `inlineClassName: 'rich-md-hidden'` to the `> `.
    *   **Display:** The whole line gets `rich-md-blockquote` style.

## Summary of Similarities and Differences

| Feature | Scope | Hiding Mechanism | Placeholder | Interaction |
| :--- | :--- | :--- | :--- | :--- |
| **Front Matter** | Block (Multi-line) | `setHiddenAreas` | React Component (`FrontMatterTable`) | Click to Edit |
| **Media** | Line (Single) | `setHiddenAreas` | React Component (`MediaWidget`) | Cursor proximity / Click |
| **WOD Fences** | Line (Single) | `setHiddenAreas` | None (Collapse) | Cursor proximity |
| **Headings** | Inline (Chars) | CSS (`display: none`) | None | Cursor proximity |
| **Blockquotes** | Inline (Chars) | CSS (`display: none`) | None | Cursor proximity |

**Key Similarities:**
*   All logic is centralized in `RichMarkdownManager.updateDecorations`.
*   All features respect the `readOnly` state (hiding is often disabled or behavior changes when not read-only).
*   All features react to cursor position (unhiding when the cursor is near/on the content).

**Key Differences:**
*   **Hiding vs. Folding:** Front Matter and Media are true "folds" where content is replaced by a UI element. Headings and Blockquotes are "syntax hiding" where markers are invisible but the line remains.
*   **ViewZones:** Only Front Matter and Media use `ViewZones` to inject content.

## Proposed High-Level Abstraction

To support all identified cases and future ones, a `RichFeature` abstraction could be introduced.

```typescript
interface RichFeature {
  /**
   * unique identifier for the feature type
   */
  id: string;

  /**
   * Parse the model content and return ranges to be processed.
   */
  parse(model: editor.ITextModel): FeatureRange[];

  /**
   * Determine if the range should be "active" (hidden/folded) based on editor state.
   */
  shouldHide(range: FeatureRange, context: EditorContext): boolean;

  /**
   * Optional: Provide a React component to render in place of the hidden content.
   * If undefined, no ViewZone is created.
   */
  renderWidget?(range: FeatureRange, onEdit: () => void): React.ReactNode;

  /**
   * Optional: Provide decorations for the range (or parts of it).
   * Used for inline hiding or styling.
   */
  getDecorations?(range: FeatureRange): editor.IModelDeltaDecoration[];
}

interface FeatureRange {
  range: Range;
  metadata: any; // Feature-specific data (e.g., parsed properties, url)
}

interface EditorContext {
  isReadOnly: boolean;
  cursorPosition: Position;
}
```

### How it fits:

1.  **Front Matter:**
    *   `parse`: Returns block range.
    *   `shouldHide`: Returns true if cursor not inside.
    *   `renderWidget`: Returns `FrontMatterTable`.
    *   `getDecorations`: None (or maybe style the hidden text if needed).

2.  **Media:**
    *   `parse`: Returns line range.
    *   `shouldHide`: Returns true if cursor not on line.
    *   `renderWidget`: Returns `MediaWidget`.

3.  **Headings:**
    *   `parse`: Returns line range.
    *   `shouldHide`: Always false (we don't use setHiddenAreas).
    *   `getDecorations`: Returns decorations to hide `#` and style the rest.

This abstraction separates the *parsing* logic from the *rendering/interaction* logic, making it easier to add new features like "Table of Contents", "Math Blocks", or "Mermaid Diagrams" in the future.
