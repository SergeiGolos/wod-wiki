# Monaco Editor Rich Markdown Support - Requirements & Implementation Plan

## 1. Overview
The goal is to enhance the existing Monaco Editor integration in WOD Wiki to support "Rich Markdown" features. This involves dynamically hiding raw Markdown syntax when the cursor is not active on a line, rendering rich previews (headings, images, tables), and supporting drag-and-drop interactions for media.

## 2. Functional Requirements

### 2.1. Dynamic Syntax Hiding (The "Hybrid" View)
*   **Behavior**: Markdown syntax characters should be hidden or unobtrusive when the user's cursor is **not** on the line containing them. When the cursor enters the line, the raw syntax should be revealed for editing.
*   **Scope**:
    *   **Headings**: `#`, `##`, `###` markers should be hidden. The heading text should be rendered with increased font size and weight corresponding to the level (H1, H2, H3).
    *   **Blockquotes**: Lines starting with `>` should be displayed in a highlighted box style (e.g., distinct background, left border). The `>` character should be hidden or styled subtly.
    *   **WOD Blocks**: The opening ` ```wod ` and closing ` ``` ` fences should be visually hidden when not editing the block definition itself, reducing visual noise.

### 2.2. Front Matter (Metadata)
*   **Syntax**: Standard YAML-like front matter delimited by `---` at the start and end.
*   **Parsing**: Key-value pairs (format `Property: Value`).
*   **Visualization**:
    *   When the cursor is outside the front matter block, the raw text (including delimiters) should be hidden.
    *   A "Table" or "Properties" widget should be displayed in its place, listing the defined properties cleanly.
    *   Entering the block reveals the raw text for editing.

### 2.3. Image Support
*   **Drag & Drop**: Users must be able to drag image files directly into the editor.
*   **Storage**: Images should be encoded as Base64 data URIs.
*   **Display**:
    *   **In-line Text**: The editor text should display the file name (e.g., `![my-image.png]`), hiding the massive Base64 string "behind the scenes" (likely via text decoration/folding).
    *   **Preview**: When the cursor is not on the line, the image itself should be rendered (or a preview widget).
    *   **Interaction**: Support for expanding/collapsing the image view (dropdown or inline display).

### 2.4. YouTube Integration
*   **Detection**: Automatically detect YouTube URLs pasted or typed into the editor.
*   **Visualization**:
    *   Display a YouTube icon/indicator on the row.
    *   Provide an "Expandable" view (likely a View Zone or Widget) that loads the video player inline.
    *   The player should be hidden/collapsed by default or when moving away, but easily accessible.

## 3. Technical Architecture & Concepts

To implement these features in Monaco Editor, we will leverage several advanced APIs:

*   **Decorations (`deltaDecorations`)**:
    *   Used for styling lines (Headings, Blockquotes).
    *   Used for "hiding" text by setting `inlineClassName` with CSS that sets `font-size: 0` or `display: none` (note: Monaco handles `display: none` on inline text poorly, often `color: transparent` + `letter-spacing` tricks or `before`/`after` content are used, or `folding` ranges).
*   **View Zones**:
    *   Essential for inserting custom DOM elements *between* lines of code.
    *   Used for the YouTube Player, Image Previews, and the Front Matter Table.
*   **Content Widgets**:
    *   Alternative for overlays that float over text, but View Zones are better for "pushing" text down to make room for images/tables.
*   **Cursor Position Events (`onDidChangeCursorPosition`)**:
    *   The core trigger for toggling the "Edit Mode" vs "Preview Mode" for the current line.
*   **Paste/Drop Events**:
    *   Custom handlers to intercept file drops and convert them to Base64 strings.

## 4. Phased Implementation Plan

### Phase 1: Core Markdown Styling & Dynamic Visibility
**Goal**: Implement the infrastructure for "Active Line" detection and basic Markdown styling.

1.  **Heading Decorations**:
    *   Create a decoration provider that parses the document for `#`.
    *   Apply CSS classes for H1-H3 sizes.
    *   Implement logic to remove "Heading Style" and show raw `#` when cursor is on the line.
2.  **Quote Decorations**:
    *   Implement styling for `>` lines (background color, border).
3.  **WOD Block Hiding**:
    *   Detect ` ```wod ` blocks.
    *   Apply "ghost text" or hiding styles to the fence lines when cursor is not inside/on them.

### Phase 2: Front Matter Engine
**Goal**: Support metadata definition and visualization.

1.  **Parser**: Implement a simple parser for `---` blocks and `key: value` pairs.
2.  **Table View Zone**: Create a React component (rendered into a DOM node) that displays the properties table.
3.  **Integration**:
    *   When cursor leaves the Front Matter range, inject the View Zone and hide the original lines (using `folding` or line-height manipulation).
    *   When cursor enters, remove View Zone and unhide lines.

### Phase 3: Image Handling (Base64 & Drag-n-Drop)
**Goal**: Enable rich media insertion.

1.  **Drop Handler**: Register `editor.onDrop` (or DOM listener) to capture files.
2.  **Base64 Conversion**: Utility to read file -> Base64.
3.  **Text Insertion**: Insert Markdown image syntax. *Challenge*: Handling the massive Base64 string.
    *   *Strategy*: Insert `![filename](...base64...)`.
    *   *Decoration*: Collapse the `(...base64...)` part using Monaco's `inlineClassName` with `display: none` (or similar technique) so it looks like `![filename]`.
4.  **Image Preview**:
    *   Render the image in a View Zone below the line when not editing.

### Phase 4: YouTube Integration
**Goal**: External media embedding.

1.  **Link Matcher**: Regex to find YouTube URLs.
2.  **Icon Decoration**: Add a gutter icon or inline icon for video links.
3.  **Player View Zone**:
    *   Create a "Click to Load" or "Expand" interaction.
    *   Render an iframe with the YouTube embed in a View Zone.

## 5. Risks & Considerations
*   **Performance**: Large Base64 strings in the editor model can slow down tokenization and rendering. Consider limiting image size or using an external blob store if possible (though requirements say "internal").
*   **Monaco Limitations**: "Hiding" text inline is notoriously difficult in Monaco without affecting cursor movement. We may need to use `folding` APIs or `InjectedText` carefully.
*   **Undo/Redo Stack**: Complex text manipulations (like dropping images) need to preserve the undo stack correctly.
