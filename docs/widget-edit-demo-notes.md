# Widget Edit Behavior — Demo & Review Notes

Prepared for the [WOD-466](/WOD/issues/WOD-466) review. Use this script to walk through the widget edit interaction model.

---

## Key Features to Demo

1. **Hover-to-edit affordance** — pencil icon reveals without entering edit mode
2. **One-click edit → save flow** — seamless transition between preview and source
3. **Auto-save on blur** — valid JSON persists without explicit save
4. **Error inlay with recovery** — invalid JSON blocks save and offers undo
5. **Keyboard navigation** — widget behaves as a single line with arrow keys
6. **Enter-to-edit, Escape-to-discard** — keyboard-only workflow
7. **Focus-aware icon states** — icon adapts to view / editing / error modes

---

## Demo Script

### Setup

Open the Storybook `NoteEditor — Fran` story or launch the playground with the default home note.

```bash
bun run storybook
# Navigate to catalog/pages/Planner → NoteEditor — Fran
```

### 1. Preview Mode (default)

- Show a widget block rendering in the editor
- Point out the rounded container, border, and shadow
- Hover over the widget — pencil icon fades in at top-right
- Move mouse away — icon fades out

### 2. Enter Edit Mode (mouse)

- Click the pencil icon
- Widget swaps to monospace textarea containing raw JSON
- Border turns emerald; check icon appears
- Textarea is focused with cursor at end

### 3. Save Valid Changes (mouse)

- Modify a value inside the JSON (e.g., change a title)
- Click the check icon
- Widget returns to preview mode
- Preview re-renders with updated config

### 4. Auto-Save on Blur

- Click the pencil icon again
- Change a value
- Click outside the widget (into editor text)
- Widget auto-saves and returns to preview

### 5. Error Path

- Enter edit mode
- Introduce a JSON syntax error (delete a closing brace)
- Click outside the widget
- Error inlay appears with parse message
- Action button switches to amber undo arrow
- Document retains last valid JSON

### 6. Undo / Recovery

- Click the undo arrow
- Textarea reverts to last valid JSON
- Error inlay disappears
- Click outside — widget returns to clean preview

### 7. Keyboard Navigation (arrow keys)

- Place editor cursor on line above a widget
- Press `ArrowDown` — cursor enters widget fenced source (preview removed)
- Press `ArrowDown` again — cursor moves to line below widget
- Reverse with `ArrowUp`

### 8. Keyboard Edit Flow

- Tab to a widget block (or click it to focus)
- Press `Enter` — enters edit mode
- Type a valid change
- Press `Ctrl+Enter` (or `Cmd+Enter`) — saves and exits
- Press `Enter` again — re-enters edit mode
- Press `Escape` — discards unsaved changes and exits

### 9. Multiple Widgets

- Scroll to a note with multiple widgets (e.g., playground home)
- Edit one widget
- Without saving, click into another widget
- First widget auto-saves on blur
- Second widget enters edit mode independently

### 10. Dark Mode

- Toggle Storybook or app to dark theme
- Repeat hover and edit flows
- Verify emerald/amber colors, borders, and contrast

---

## Known Limitations

1. **Mobile textarea sizing**: The textarea uses a fixed `min-h-[160px]`. Very short widget configs may show excess whitespace; very large configs may require scrolling inside the textarea.

2. **Focus restoration after Escape**: Focus returns to the widget container, but a subsequent `Enter` may require an extra tab cycle depending on the browser's focus sequence.

3. **Arrow-key navigation treats widget as single line**: This is intentional — authors navigate past widgets quickly. If future use cases require line-by-line navigation inside the fenced source, a modifier key (e.g., `Alt+Arrow`) could be added.

---

## Future Improvements (out of scope for WOD-466)

- **Inline JSON validation while typing**: Show a green check or red indicator in real time rather than only on blur.
- **Formatted JSON edit**: Use a lightweight JSON editor (e.g., CodeMirror instance) instead of a plain textarea for syntax highlighting and auto-indent.
- **Widget drag-to-reorder**: Allow authors to reorder widget blocks via drag handles.
- **Duplicate widget**: One-click clone of a widget block with identical config.
- **Inline widget creation**: Type `/widget` in the editor to insert a new fenced block from a picker.

---

## Review Checklist for Reviewer

- [ ] Demo script runs without console errors
- [ ] All icon states are visually clear
- [ ] Keyboard-only workflow is fully usable
- [ ] Error path is discoverable and recoverable
- [ ] Mobile touch interactions feel intentional
- [ ] Dark mode is polished

---

## Related Docs

- [Widget Authoring Guide](./widget-authoring-guide.md)
- [Widget Edit QA Checklist](./widget-edit-qa-checklist.md)
- [Widget Catalog](./widget-catalog.md)
- [deep-dives/widget-edit-wrapper](/wiki/deep-dives/widget-edit-wrapper)
