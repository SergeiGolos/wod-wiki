# Phase 4: Migration, Validation & Cleanup

**Goal**: Full cutover from Monaco/Chevrotain to CodeMirror 6/Lezer across the entire codebase.

## 4.1 Feature Parity Validation

A final check to ensure all current WOD Wiki features are working as expected in the new editor.

### Feature Checklist:
- [ ] **Markdown Rendering**: Support for GitHub-flavored Markdown.
- [ ] **WodScript Highlighting**: Accurate colorization for exercises, reps, and timers.
- [ ] **Section Folding**: Ability to fold H1/H2 sections in the Markdown editor.
- [ ] **Smart Increment**: Increment/decrement reps and weights via keybinds.
- [ ] **Inlay Hints**: Displaying calculated workout metadata (total reps, time) inside the editor.
- [ ] **Context Overlays**: Highlighting the active workout block based on cursor position.
- [ ] **Command Palette**: Fully functional `Cmd/Ctrl + P` integration.

## 4.2 Cutover Execution

The "Big Switch" once all tests and feature checks pass.

### Execution Steps:
1.  **Replace Components**: Switch all instances of `MarkdownEditor` to use the new `CodeMirrorEditor`.
2.  **Update Global Stores**: Shift from Monaco models to CodeMirror states for text storage.
3.  **Refactor Hooks**: Update `useWodBlocks` and `useWodDecorations` to use CodeMirror extensions.

## 4.3 E2E Regression Testing

Using Playwright to automate common user workflows in the new editor.

### Test Scenarios:
- **Scenario 1**: Typing a workout script and verifying that "Start Workout" appears correctly.
- **Scenario 2**: Using `Cmd + Up` to increment a weight value from 32kg to 33kg.
- **Scenario 3**: Folding a large workout section and ensuring it stays collapsed during edits.
- **Scenario 4**: Real-time validation of syntax errors within a WOD block.

## 4.4 Deprecation & Removal

Removing the legacy stack to reduce bundle size and technical debt.

### Cleanup List:
- [ ] **Dependencies**: Uninstall `monaco-editor`, `@monaco-editor/react`, and `chevrotain`.
- [ ] **Parser Cleanup**: Delete `src/parser/timer.*`, `src/parser/md-timer.ts`, and related visitor files.
- [ ] **Editor Cleanup**: Remove Monaco-specific hooks and utility functions from `src/markdown-editor`.

## 4.5 Deliverables:
- Successful Playwright test run on the CodeMirror-powered app.
- Updated `package.json` with removed legacy dependencies.
- A clean, minimized codebase with only the new parser and editor stack.
