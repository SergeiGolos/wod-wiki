# PRD: Unified Markdown & WodScript Experience

## 1. Overview
The `wod-wiki` editor experience is currently fragmented between a raw Markdown editor and a disjointed, split-view section editor. This document outlines the requirements for a unified, seamless "Wysiwyg-lite" experience where Markdown and WodScript blocks are rendered as previews when not actively focused, but transition instantly to edit mode when clicked.

## 2. Objectives
- **Eliminate Disjointedness**: Transition from a multi-component `SectionEditor` to a single, highly-extensible CodeMirror 6 instance.
- **Contextual Editing**: Automatically toggle between "Preview" and "Edit" modes at the block level (paragraphs, headers, and code blocks).
- **Deep WodScript Integration**: Provide rich, real-time feedback (errors, structural relationships) directly within the editor.
- **Fluid Authoring**: Introduce smart autocompletes and shortcuts for dialects and embedded components.

## 3. Functional Requirements

### 3.1. Block-Level Live Preview
- **Dynamic Rendering**: The editor must identify logical blocks (paragraphs, lists, code fences).
- **Preview Mode**: Blocks that do not contain the cursor (unfocused) should be replaced with a rendered preview widget.
- **Edit Mode**: The currently focused block must show its raw text for editing.
- **Seamless Interaction**: Clicking a preview widget must immediately place the cursor at the corresponding text position and reveal the raw source.

### 3.2. WodScript Syntax & Feedback
- **Inline Linting**: Errors in WodScript syntax must be highlighted with red squiggly underlines. Hovering over an underline should display the specific parse error.
- **Structural Visualization**:
    - Show indentation guides for nested groups/loops.
    - Visualize child relationships using indented brackets in the gutter or background.
- **Overlay Panel**:
    - A floating panel should appear near the active WodScript line.
    - It should offer quick actions: "Run Block", "Add to Plan", and buttons for metric adjustment (increment/decrement).

### 3.3. Smart Autocomplete & Shortcuts
- **Dialect Completion**: Typing ` ``` ` must trigger a dropdown of available dialects (e.g., `wod`, `log`, `plan`).
- **Component Embeds**: Typing `---` on a new line must trigger a dropdown of embeddable components (e.g., `youtube`, `strava`, `amazon`, `file`).
- **Auto-Wrapping Promotion**:
    - Selecting multiple lines and typing ` ``` ` (or a shortcut) must automatically wrap the selection in the chosen dialect fence.
    - If no lines are selected, it should insert a snippet with the cursor placed between the fences.
- **Frontmatter Edit Placement**: 
    - Selecting a component from the `---` autocomplete must insert the required YAML properties and automatically place the cursor at the first value field (e.g., after `url:` or `id:`).
    - If `---` is typed at the top of the file, it should manage the global document frontmatter; if typed within the body, it should create a block-level embed.
- **Promotion to Block**: A keyboard shortcut (e.g., `Cmd+B` or `Cmd+Shift+W`) to wrap the selected lines in a ` ```wod ` block.

### 3.4. Unified Data Management
- The single editor must remain synchronized with the underlying `WorkoutStore` and support existing `Section` data structures.
- Ensure full support for undo/redo and version control-friendly document tracking.

## 4. User Experience (UX)
- **Visual Consistency**: The transition between preview and edit modes must be visually stable (minimizing "jumping" or layout shifts).
- **Performance**: High-speed rendering for large documents with many interactive blocks.
- **Accessibility**: Support for screen readers and keyboard-only navigation across both modes.
