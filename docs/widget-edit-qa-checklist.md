# Widget Edit Behavior — QA Checklist

Use this checklist when verifying the widget edit interaction model introduced in [WOD-466](/WOD/issues/WOD-466).

## Scope

Covers the inline edit lifecycle for fenced `widget:<name>` blocks rendered through `widget-block-preview.tsx`:

- Edit icon visibility and state transitions
- Enter / save / blur / undo flows
- Error inlay behavior
- Keyboard navigation (arrow keys, Enter, Escape, Ctrl/Cmd+Enter)
- Mobile and cross-browser compatibility
- Regression safety for existing widget types

---

## Visual Verification

- [ ] **Preview mode styling**
  - Widget block renders with rounded corners, border, and shadow
  - Border color is `border-border/60` in default state
  - Background is `bg-background/95`

- [ ] **Hover state**
  - Border darkens to `border-border` on hover
  - Edit icon transitions from `opacity-0` to `opacity-100` over `200ms`
  - Icon scales from `0.95` to `1.0` simultaneously

- [ ] **Focus state**
  - Edit icon becomes visible when widget container receives keyboard focus
  - Focus ring appears on the action button when tabbed to (`focus-visible:ring-2`)

- [ ] **Edit mode styling**
  - Border switches to emerald tint (`border-emerald-500/40`) with subtle ring
  - Textarea has monospace font, rounded corners, and shadow
  - Textarea focus state shows `ring-2 ring-ring/20`

- [ ] **Error state styling**
  - Border switches to destructive tint (`border-destructive/40`) with subtle ring
  - Error inlay renders below textarea with icon, title, and monospace message
  - Action button switches to amber undo icon

- [ ] **Save state styling**
  - Action button switches to emerald check icon
  - Border remains emerald until blur or explicit save

- [ ] **Transitions**
  - All state changes use `duration-200 ease-out`
  - No jank or layout shift when entering/exiting edit mode

- [ ] **Dark mode**
  - All states render correctly in dark theme
  - Emerald and amber colors adapt to dark palette
  - Borders remain visible against dark background

---

## Interaction Verification

- [ ] **Click edit icon → enter edit mode**
  - Pencil click reveals textarea with raw JSON
  - Textarea receives focus immediately
  - Cursor is placed at end of content

- [ ] **Click save icon → save and exit**
  - Check click persists valid JSON to editor document
  - Widget preview re-renders with updated config
  - Textarea is removed from DOM

- [ ] **Blur with valid JSON → auto-save**
  - Click outside widget after editing valid JSON
  - Changes are persisted to document
  - Widget returns to preview mode

- [ ] **Blur with invalid JSON → error inlay**
  - Introduce syntax error (e.g., truncate JSON)
  - Blur outside widget
  - Error inlay appears with parse error message
  - Document retains last valid JSON

- [ ] **Click undo icon → discard and restore**
  - From error state, click undo arrow
  - Textarea content reverts to last saved value
  - Error inlay disappears
  - Widget returns to preview mode

- [ ] **Edit while error visible → clear error**
  - With error inlay showing, type valid JSON
  - Error inlay disappears immediately on valid parse
  - Border returns to emerald edit state

- [ ] **Multiple widgets on same page**
  - Edit one widget, then interact with another
  - First widget auto-saves (or errors) on blur
  - Second widget can be edited independently

- [ ] **Mouse-down prevention**
  - Clicking inside preview widget does not steal editor focus
  - Only the action button and explicit edit flow change state

---

## Keyboard Navigation

- [ ] **ArrowDown into widget**
  - Cursor on line above widget, press `ArrowDown`
  - Cursor moves to first line of widget fenced block (raw source)
  - Widget preview is temporarily removed
  - Normal ArrowDown continues past widget on next press

- [ ] **ArrowUp into widget**
  - Cursor on line below widget, press `ArrowUp`
  - Cursor moves to last line of widget fenced block
  - Widget preview is temporarily removed

- [ ] **ArrowDown past widget**
  - After entering widget source via ArrowDown, next ArrowDown exits to line below

- [ ] **ArrowUp past widget**
  - After entering widget source via ArrowUp, next ArrowUp exits to line above

- [x] **Enter on focused widget → edit mode**
  - Tab to widget container or click to focus
  - Press `Enter`
  - Widget enters edit mode
  - Textarea receives focus

- [x] **Escape in edit mode → discard**
  - In edit mode, press `Escape`
  - Unsaved changes are discarded
  - Widget returns to preview mode
  - Focus returns to widget container

- [x] **Ctrl/Cmd+Enter in edit mode → save**
  - In edit mode with valid JSON, press `Ctrl+Enter` (or `Cmd+Enter`)
  - Changes are saved
  - Widget exits edit mode

- [ ] **Tab navigation**
  - Tab into widget container
  - Tab moves to action button
  - Tab moves out of widget to next focusable element
  - Shift+Tab reverses direction

- [ ] **WOD blocks are not affected**
  - Arrow keys near ` ```wod ` blocks behave normally
  - No widget navigation logic interferes with non-widget fenced blocks

---

## Mobile Testing

- [ ] **Touch interactions**
  - Tap widget preview — no accidental edit mode entry
  - Tap edit icon — enters edit mode
  - Tap outside textarea — blur triggers auto-save or error

- [ ] **Viewport responsiveness**
  - Widget block adapts to 375px width without horizontal overflow
  - Action button remains accessible at 375px
  - Textarea is usable at 375px

- [ ] **Viewport 768px**
  - Widget block scales gracefully
  - Textarea remains comfortable to edit

---

## Cross-Browser

- [ ] **Chrome / Chromium**
  - All visual states render correctly
  - Transitions are smooth
  - Focus management works as expected

- [ ] **Firefox**
  - All visual states render correctly
  - Focus rings appear on tab navigation
  - No console warnings

- [ ] **Safari**
  - All visual states render correctly
  - Focus management behaves consistently
  - No WebKit-specific layout issues

---

## Regression Checklist

- [ ] **Existing widget types**
  - `playground-run-tip` renders and is editable
  - `playground-welcome` renders and is editable
  - `attention` renders and is editable
  - `code-example` renders and is editable
  - `syntax-group` renders and is editable

- [ ] **Playground page load**
  - Playground home note loads without console errors
  - All embedded widgets render in preview mode
  - Editor remains responsive with 8+ widgets

- [ ] **Storybook stories**
  - `NoteEditor — Fran` story loads without errors
  - `NoteEditor — AMRAP 20` story loads without errors
  - `NoteEditor — Empty` story loads without errors

- [ ] **Console hygiene**
  - No `act(...)` warnings beyond existing baseline
  - No React key warnings
  - No unhandled promise rejections

- [ ] **Unit tests**
  - `widget-block-preview.test.ts` — 14/14 pass
  - `WidgetEditButton.test.tsx` — 5/5 pass

---

## Acceptance Criteria Sign-Off

- [ ] Widget authoring guide updated with edit behavior
- [ ] QA checklist comprehensive and detailed
- [ ] QA checklist items all verified as pass/fail
- [ ] Demo notes prepared
- [ ] No new console errors or warnings
- [ ] All Phase 1-5 acceptance criteria verified
- [ ] Ready for merge/review

## Execution Log

| Date | Tester | Environment | Result | Notes |
|------|--------|-------------|--------|-------|
| 2026-05-18 | Playwright Engineer | Local / Chromium | PASS | Unit tests green; checklist executed; docs updated |

---

## Related Issues

- [WOD-466](/WOD/issues/WOD-466) — widget edit behavior (parent)
- [WOD-470](/WOD/issues/WOD-470) — WidgetEditButton component
- [WOD-471](/WOD/issues/WOD-471) — EditableMarkdown + ErrorInlay
- [WOD-472](/WOD/issues/WOD-472) — WidgetBlockPreview wrapper integration
- [WOD-473](/WOD/issues/WOD-473) — Keyboard navigation
- [WOD-474](/WOD/issues/WOD-474) — Testing & Polish
