# Debug: CM6 Widget Block Decoration Not Rendering

## Problem Statement

In the wod-wiki playground (`https://localhost:5174/playground`), a CodeMirror 6 editor renders
markdown that contains a fenced `widget:` block:

```markdown
```widget:playground-run-tip
{}
```
```

This block should be **replaced** in the editor by a React component (`PlaygroundRunTipWidget`),
producing a styled callout box. Instead, the raw fenced markdown is visible as plain text.
Unit tests confirm the `StateField` produces decorations correctly — but the browser does not render them.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/Editor/extensions/widget-block-preview.tsx` | CM6 `StateField` extension — builds `Decoration.replace({ block: true })` for widget sections |
| `src/components/Editor/extensions/section-state.ts` | Parses widget fences into `type:"widget"` sections with `from`, `to`, `contentFrom`, `contentTo` |
| `src/components/Editor/NoteEditor.tsx` | Assembles extensions; passes `widgetComponents` to `widgetBlockPreview` |
| `playground/src/pages/PlaygroundNotePage.tsx` | Passes `widgetComponents={new Map([['playground-run-tip', PlaygroundRunTipWidget]])}` to `NoteEditor` |
| `playground/src/components/widgets/PlaygroundRunTipWidget.tsx` | The React component to render |
| `playground/src/templates/playground-home.md` | Template containing the `widget:playground-run-tip` block |
| `src/components/Editor/extensions/__tests__/widget-block-preview.test.ts` | 3 passing unit tests |

---

## Architecture

### Extension wiring in `NoteEditor.tsx` (`baseExtensions` useMemo)

```typescript
// sectionField is ALWAYS included (line 528)
sectionField,

// widgetBlockPreview is conditional (lines 569-573)
...(widgetComponents && widgetComponents.size > 0
  ? [widgetBlockPreview(widgetComponents)]
  : []),
```

`widgetComponents` is `useMemo(() => new Map([['playground-run-tip', PlaygroundRunTipWidget]]), [])` — size is always 1.

### `widgetBlockPreview` factory (full source)

```typescript
export function widgetBlockPreview(registry: WidgetRegistry): Extension {
  const widgetPreviewField = StateField.define<DecorationSet>({
    create(state) {
      return buildWidgetDecos(state, registry);
    },
    update(value, tr) {
      if (tr.docChanged || tr.selection) {
        return buildWidgetDecos(tr.state, registry);
      }
      return value;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
  return widgetPreviewField;
}
```

### `buildWidgetDecos` core logic

```typescript
function buildWidgetDecos(state: EditorState, registry: WidgetRegistry): DecorationSet {
  let sectionState;
  try {
    sectionState = state.field(sectionField);
  } catch (e) {
    console.warn("[widget-block-preview] sectionField not found in state", e);
    return Decoration.none;
  }
  const { sections } = sectionState;
  const decos: Range<Decoration>[] = [];
  const cursorHead = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "widget" || !section.widgetName) continue;
    const doc = state.doc;
    if (section.startLine > doc.lines || section.endLine > doc.lines) continue;
    // Don't replace when cursor is inside the widget range (allows editing)
    if (cursorHead >= section.from && cursorHead <= section.to) continue;

    const rawContent = section.contentFrom != null && section.contentTo != null
      ? doc.sliceString(section.contentFrom, section.contentTo).trim()
      : "";

    decos.push(
      Decoration.replace({
        widget: new ReactWidgetBlock(section.widgetName, rawContent, section.id, registry),
        block: true,
      }).range(section.from, section.to),
    );
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}
```

### Section `from` / `to` values

From `section-state.ts`, for a widget block:
```typescript
sections.push({
  type: "widget",
  widgetName,
  from: line.from,                   // position of first char of opening fence line
  to: doc.line(closeLine).to,        // position of last char of closing fence line
  startLine: openLine,
  endLine: closeLine,
  contentFrom: ...,
  contentTo: ...,
});
```

CM6 requires block-replace ranges to span **complete lines**: `from` must equal a `line.from` and
`to` must equal a `line.to`. The values above satisfy this: `line.from` is the line-start position
and `doc.line(n).to` is the position just before the newline terminator.

### `ReactWidgetBlock.toDOM()` (abbreviated)

```typescript
toDOM(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "cm-widget-block-preview";
  wrapper.style.cssText = "display:block; width:100%; min-height:1.5em; outline:none;";

  const Component = this.registry.get(this.widgetName) as React.ComponentType<WidgetProps> | undefined;
  if (!Component) {
    wrapper.textContent = `[widget:${this.widgetName} not registered]`;
    return wrapper;
  }

  let config: Record<string, unknown> = {};
  try { config = JSON.parse(this.rawContent || "{}"); } catch { /* ignore */ }

  this.root = createRoot(wrapper) as Root;
  // flushSync ensures synchronous render so CM6 can measure height immediately
  (flushSync as any)(() => {
    this.root!.render(React.createElement(Component, { config, rawContent: this.rawContent, sectionId: this.sectionId }));
  });

  return wrapper;
}
```

**Import note**: Both `createRoot` and `flushSync` have TypeScript resolution issues under
`moduleResolution: bundler` (baseline issue in the project). Suppressed with `@ts-expect-error`.

---

## Approaches That Did NOT Work

### Approach 1 — ViewPlugin
Tried building the decoration from a `ViewPlugin` instead of `StateField`.

**Result**: Runtime `RangeError: Block decorations may not be specified via plugins`

**Why it fails**: CM6 hard-codes this constraint — block decorations (`block: true`) can ONLY come
from a `StateField`. `ViewPlugin` is for inline decorations only.

---

### Approach 2 — flushSync for synchronous React render
Added `flushSync(() => this.root.render(...))` in `toDOM()` to prevent CM6 from measuring an empty
div (since `createRoot().render()` is async).

**Status**: Added but **unverified** in the browser. Potential issue: `toDOM()` can be called from
inside a React `useEffect` (when CM6 initializes inside `NoteEditor`'s mount effect). `flushSync`
throws when called during an active React render/effect cycle:
> "flushSync was called from inside a lifecycle method."

If `flushSync` throws and the error propagates out of `toDOM()`, CM6 may skip the widget entirely.

---

## What Has Been Confirmed Working

1. **`sectionField` parses widget blocks correctly** — 4 unit tests pass  
2. **`widgetBlockPreview` StateField builds decorations** — 3 unit tests pass  
3. **`sectionField` IS included in `baseExtensions`** — line 528, unconditionally  
4. **`widgetComponents` IS passed to `NoteEditor`** with `Map.size = 1`  
5. **`enablePreview = true`** (default) — all preview extensions active  
6. **Other `block: true` StateField decorations work** in this codebase: `frontmatterPreview`,
   `embed-preview.ts`, `wod-results-widget.ts` — these render fine  

---

## Hypotheses to Investigate (in priority order)

### H1 — `flushSync` throws inside `useEffect`, corrupts `toDOM()`
`NoteEditor` creates the `EditorView` inside a `useEffect`. During creation, CM6 calls `toDOM()`
for all visible widgets. At this point we're inside a React lifecycle — `flushSync` may throw.
This would prevent the wrapper from receiving content, but **more critically**, if the throw
propagates out of `toDOM()`, the decoration itself might not be applied.

**Test**: Wrap the `flushSync` call in a `try/catch` and fall back to async render on error.
Also add `console.log` to confirm `toDOM()` is actually being called.

### H2 — `StateField.define` called multiple times creates orphaned instances
`widgetBlockPreview(registry)` calls `StateField.define(...)` on every invocation. If this is
called more than once (React StrictMode double-invokes useMemo in dev), two StateField objects
are created. Only one is used in the final editor state, but the test's `ext as any` identity
check might pick the wrong one.

**More critically**: If `baseExtensions` useMemo re-runs after mount (deps change), a NEW
StateField is created and passed to `StateEffect.reconfigure`. The old field's decorations are
lost and the new field starts fresh. Check if any deps in `baseExtensions` change after mount.

**Test**: Add `console.log("widgetPreviewField created", widgetPreviewField.id)` inside the
factory to count how many times it's created.

### H3 — `section.to` is one position short for CM6 block decoration validity
CM6 may require the range to end at `line.to + 1` (i.e., AFTER the newline, not before it) for
a complete-line block decoration. If `doc.line(n).to` is the position before `\n`, the range
might not be treated as spanning full lines.

**Test**: Change `to: doc.line(closeLine).to` → `to: doc.line(closeLine).to + (closeLine < doc.lines ? 1 : 0)` in `section-state.ts` to include the newline terminator.

### H4 — `update` condition `tr.selection` is always truthy / always falsy
`tr.selection` is `EditorSelection | undefined`. In CM6, `tr.selection` is `undefined` when the
transaction does NOT explicitly change the selection. When it IS set, it's an `EditorSelection`
object (truthy). But there's a subtle issue: if `update` is never called with a doc-change
transaction (e.g., because content is loaded via `StateEffect.reconfigure` rather than
`changes`), the initial `create()` result is used. That should be fine. But verify by logging.

### H5 — `widgetComponents` is `undefined` at the time `baseExtensions` useMemo runs
If React renders `PlaygroundNotePage` and `widgetComponents` is somehow not yet initialized when
`NoteEditor`'s `baseExtensions` memo runs, the guard `widgetComponents && widgetComponents.size > 0`
would be false, excluding `widgetBlockPreview` entirely.

**Test**: Add `console.log("widgetComponents size", widgetComponents?.size)` in `NoteEditor`
right before the `baseExtensions` useMemo, or add a visible indicator in the UI.

---

## Debugging Steps

1. Add logging to `toDOM()` to confirm it's called:
   ```typescript
   toDOM(): HTMLElement {
     console.log("[ReactWidgetBlock] toDOM called for widget:", this.widgetName);
     // ...
   }
   ```

2. Add logging to `buildWidgetDecos` to confirm it finds sections:
   ```typescript
   console.log("[buildWidgetDecos] sections:", sections.filter(s => s.type === "widget").length);
   ```

3. Add logging to confirm `widgetPreviewField` is receiving updates:
   ```typescript
   update(value, tr) {
     if (tr.docChanged || tr.selection) {
       const result = buildWidgetDecos(tr.state, registry);
       console.log("[widgetPreviewField] rebuilt decorations, count:", /* count result */);
       return result;
     }
     return value;
   },
   ```

4. In browser DevTools console, after opening the playground, run:
   ```javascript
   // Check if the .cm-widget-block-preview element exists at all:
   document.querySelectorAll('.cm-widget-block-preview').length
   // Check if the raw widget fence text is visible:
   document.querySelector('.cm-editor').innerText.includes('widget:playground-run-tip')
   ```

5. Check browser console for any `flushSync` warnings or errors.

---

## Commands

```bash
bun run playground          # Start playground dev server on https://localhost:5174/
bun run test                # Run unit tests
bun x tsc --noEmit          # Type check (369 baseline errors — don't fix unrelated ones)
```

To run just the widget tests:
```bash
bun test src/components/Editor/extensions/__tests__/widget-block-preview.test.ts --preload ./tests/unit-setup.ts
```
