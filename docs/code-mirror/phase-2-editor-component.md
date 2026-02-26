# Phase 2: CodeMirror Editor Integration & Feature Parity

**Goal**: Replace the Monaco editor with a modern, modular CodeMirror 6 implementation while maintaining all current features (highlighting, folding, smart increment, WOD block detection).

## 2.1 CodeMirror React Component (`src/components/Editor/CodeMirrorEditor.tsx`)

The new component will replace `MarkdownEditorBase`.

### Core Requirements:
- **Ref-based EditorView**: Manage a direct reference to the `EditorView`.
- **State Management**: Use `EditorState.create()` and `view.dispatch()` for updates.
- **Props**: Support `value`, `onChange`, `onCursorPositionChange`, `theme`, and `readonly`.
- **Theme Sync**: Implement a custom extension to sync project-wide Tailwind themes to CodeMirror.

## 2.2 Feature Porting (Extensions)

Each Monaco feature will be ported as a modular CodeMirror extension.

### 2.2.1 Markdown + WodScript Language
- **Mixed Language**: Configure `@codemirror/lang-markdown` to use our custom `wodscript` parser for ` ```wod ` blocks.
- **Auto-Formatting**: Implement indentation and list-completion extensions.

### 2.2.2 Smart Increment
- **Extension**: A keymap extension that listens for `Cmd/Ctrl + Up/Down` and uses regex to increment/decrement numbers at the cursor.
- **Metadata Support**: Ensure it handles time formats (e.g., `:29` -> `:30`, `:59` -> `1:00`).

### 2.2.3 WOD Block Decorations
- **Widgets**: Use `Decoration.widget()` to render "Start Workout" buttons and inlay hints (e.g., total volume, estimated duration) directly in the editor gutter or inline.
- **Underline/Highlight**: Use `Decoration.mark()` for active block highlighting.

## 2.3 Command Palette Integration
- **Extension**: Port the existing command registration logic to CodeMirror commands.
- **Keybindings**: Register `Cmd/Ctrl + P` to trigger the `CommandPalette` context.

## 2.4 Performance Optimization
- **Minimal Re-renders**: Ensure the editor only re-renders when necessary (using `memo` and careful prop management).
- **Incremental Parsing**: Leverage Lezer's performance for fast updates on large Markdown files.

## 2.5 Deliverables:
- `src/components/Editor/CodeMirrorEditor.tsx`
- `src/components/Editor/extensions/*.ts` (Smart increment, decorations, theme sync)
- Integration with existing `CommandPalette` and `useMonacoTheme` (renamed to `useEditorTheme`).
