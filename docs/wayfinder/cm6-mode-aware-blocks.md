# CodeMirror 6 patterns for mode-aware block widgets

Research for [#1032](https://github.com/SergeiGolos/wod-wiki/issues/1032), child of the
Wayfinder map [#1025](https://github.com/SergeiGolos/wod-wiki/issues/1025)
("Typed Notes, Segments & Mode-Aware Widgets").

Question: what CM6 mechanisms let the same fenced block render differently in edit vs
read-only documents, and what is the recommended seam for `widget-block-preview`?

## TL;DR recommendation

1. **Thread `readOnly` as an extension option** — follow the `query-block-preview`
   precedent. Do **not** read `EditorState.readOnly` inside the extension.
2. **Extend `WidgetProps`** with `readOnly: boolean` so registered widget components can
   hide their own interactive affordances, and gate the wrapper's `WidgetEditButton` on it.
3. **Ride the existing reconfigure flow** for mode propagation — `NoteEditor` already
   rebuilds `baseExtensions` and dispatches `StateEffect.reconfigure` when `readonly`
   changes; both extensions are re-instantiated, their decoration `StateField`s are
   re-created, and the widgets remount. No `Compartment` is required, and the
   `EditorView` instance survives.

## Local half: the two block-preview extensions

### Precedent — `query-block-preview.tsx` threads readOnly

- `QueryBlockPreviewOptions.readOnly?: boolean`
  (`packages/ui/src/extensions/query-block-preview.tsx:18`).
- `ReactQueryBlock` carries the whole options object
  (`query-block-preview.tsx:25-33`); both `toDOM` and `updateDOM` render
  `<QueryBlockView readOnly={this.options?.readOnly} …>`
  (`query-block-preview.tsx:64,88`).
- The view side gates the edit pencil on it:
  `canEdit = onSaveQuery !== undefined && !readOnly`
  (`packages/ui/src/blocks/QueryBlockView.tsx:159`), and `QueryBlockShell` renders the
  pencil only when `onEdit && !readOnly` (`QueryBlockView.tsx:316`).
- Factory `queryBlockPreview(options?)`
  (`query-block-preview.tsx:177`) closes over the options; its decoration
  `StateField` rebuilds only on `tr.docChanged || tr.selection`
  (`query-block-preview.tsx:183`). The option value is therefore **frozen at
  extension-construction time** — changing it means re-providing the extension.

Caveat found during research: **no call site passes `readOnly` today.**
`NoteEditor.tsx:468` calls `queryBlockPreview({ executor, onResultSaved })` and
`editorPreset.ts:123` likewise. `QueryBlockView`'s pencil currently disappears only
because `onSaveQuery` is omitted in some hosts, not because `readOnly` is set.

### Gap — `widget-block-preview.tsx` has no mode seam

- `WidgetProps = { config, rawContent, sectionId }`
  (`packages/ui/src/extensions/widget-block-preview.tsx:58-63`) — no mode information.
- `ReactWidgetBlock` takes only `widgetName, rawContent, sectionId, registry`
  (`widget-block-preview.tsx:602-608`); `eq` compares exactly those
  (`widget-block-preview.tsx:610-616`).
- `WidgetBlockPreviewWrapper` renders `WidgetEditButton` **unconditionally**
  (`widget-block-preview.tsx:506`); `buttonMode` derives purely from React edit state
  (`widget-block-preview.tsx:471`), never from document mode.
- Factory `widgetBlockPreview(registry)` takes only the registry
  (`widget-block-preview.tsx:814`); its `StateField` rebuilds on
  `tr.docChanged || hasToggle || selectionChanged`
  (`widget-block-preview.tsx:827`) — no mode hook.

### Why the pencil is a real leak, not just cosmetic

CM6's `EditorView.editable: false` only removes `contenteditable` from the DOM and
explicitly "doesn't affect API calls that change the editor content"
([ref, `EditorView.editable`](https://codemirror.net/docs/ref/#view.EditorView^editable)).
`EditorState.readOnly` is "consulted by commands and extensions that implement editing
functionality" ([ref, `EditorState.readOnly`](https://codemirror.net/docs/ref/#state.EditorState^readOnly))
— but `WidgetBlockPreviewWrapper`'s save path calls `view.dispatch({ changes })`
directly (`saveWidgetSource`, `widget-block-preview.tsx:442-463`), which is a programmatic
dispatch and bypasses both facets. A read-only document today gets a pencil that opens a
textarea and silently edits the doc.

### How the host already propagates mode

`NoteEditor.tsx` sets both facets from its `readonly` prop:

- `EditorState.readOnly.of(readonly)` + `EditorView.editable.of(!readonly)`
  (`apps/playground/src/components/organisms/editor/NoteEditor.tsx:502-503`) — the
  canonical pair per the docs (state-level "commands refuse" vs view-level
  "DOM not editable").
- `baseExtensions` is a `useMemo` keyed on `readonly` (`NoteEditor.tsx:460,468,502`);
  a companion effect dispatches
  `StateEffect.reconfigure.of([...baseExtensions, …])` when it changes
  (`NoteEditor.tsx:604`).
- Because both factories call `StateField.define` **inside** the factory function, every
  re-provision creates fresh field types → `create(state)` runs → decorations rebuild →
  new widget instances → React remounts. The `EditorView` is never destroyed
  (mount-only effect, `NoteEditor.tsx:514-573`).

## External half: CM6 mechanisms (primary docs)

| Mechanism | What the docs say | Relevance |
|---|---|---|
| [`EditorState.readOnly`](https://codemirror.net/docs/ref/#state.EditorState^readOnly) | Facet backing the `state.readOnly` getter, "consulted by commands and extensions that implement editing functionality to determine whether they should apply". | Part of editor *state*; the flag widgets conceptually mirror. Does **not** stop programmatic dispatches. |
| [`EditorView.editable`](https://codemirror.net/docs/ref/#view.EditorView^editable) | "controls whether the editor content DOM is editable… doesn't affect API calls that change the editor content". | Presentation-level; both facets are set together in `NoteEditor.tsx:502-503`. |
| [Facets](https://codemirror.net/docs/guide/#facets) | Extensions read `state.facet(...)`; values "recomputed when their declared inputs change"; identity-test cheap. | A private `modeFacet` would be the in-CM way to plumb a mode — but see recommendation: the option path is simpler here. |
| [`Compartment.reconfigure`](https://codemirror.net/docs/ref/#state.Compartment^reconfigure) / [`StateEffect.reconfigure`](https://codemirror.net/docs/ref/#state.StateEffect%5Ereconfigure) | Reconfigure one compartment or the root config; the root effect "will discard any extensions appended". | How mode switches propagate without recreating the `EditorView`. |
| [`Transaction.reconfigured`](https://codemirror.net/docs/ref/#state.Transaction^reconfigured) | "Indicates whether this transaction reconfigures the state (through a configuration compartment or with a top-level configuration effect." | The hook a `StateField` would need to rebuild decorations on mode change **if** the facet-reading route were chosen: `tr.reconfigured \|\| tr.startState.readOnly !== tr.state.readOnly`. Not needed under the option route (fresh fields re-`create`). |
| [`WidgetType.eq` / `updateDOM`](https://codemirror.net/docs/ref/#view.WidgetType) | `eq` "used to avoid redrawing widgets when they are replaced by a new decoration of the same type"; default `false` = always redrawn. `updateDOM` may return `false` to force a redraw. | Both current widgets update correctly on rebuild — `ReactWidgetBlock` defines no `updateDOM` (default `false` → redraw via `toDOM`), `ReactQueryBlock.updateDOM` re-renders with the *new* instance's options. Adding `readOnly` to both `eq` methods is still worthwhile: explicit, and it removes the reliance on redraw-by-default. |

Decorations work identically under read-only state — replace/block decorations and
widgets are mode-agnostic ([guide, decorations](https://codemirror.net/docs/guide/#decorations));
only the *affordances inside* them need gating.

## Recommendation

### 1. Thread `readOnly` as an option (do not read the facet internally)

```ts
export interface WidgetBlockPreviewOptions {
  registry: WidgetRegistry;
  readOnly?: boolean;   // same shape as QueryBlockPreviewOptions.readOnly
}
export function widgetBlockPreview(options: WidgetBlockPreviewOptions): Extension;
```

Why the option over the facet:

- **One convention, not two.** `query-block-preview` already established
  option-threading (`query-block-preview.tsx:18,64,88,177`); adding a facet-reading
  variant beside it creates a second seam to maintain.
- **Mode ≠ writability.** Reading `EditorState.readOnly` inside the extension couples
  widget UX to document writability permanently. A host may legitimately want widgets
  interactive in a locked doc (e.g. the results widgets' `onCapture` flow in
  `RowsResultsChrome.tsx:39` — capturing a workout result into a published log). The
  explicit option keeps that possible; the facet route forbids it.
- **Propagation is already wired.** `NoteEditor`'s reconfigure effect
  (`NoteEditor.tsx:604`) rebuilds everything when `readonly` changes; fresh
  `StateField`s re-`create`, widgets remount. Zero new update-cycle machinery, versus
  the `tr.reconfigured` watching the facet route would need.
- Cost: one more entry in `NoteEditor`'s `baseExtensions` construction —
  `widgetBlockPreview({ registry: widgetComponents, readOnly: readonly })` — and passing
  `readOnly: readonly` to `queryBlockPreview` (fixing the dormant option discovered
  above).

### 2. `WidgetProps` contract

```ts
export interface WidgetProps {
  config: WidgetConfig;
  rawContent: string;
  sectionId: string;
  readOnly: boolean;   // mirrors QueryBlockView's readOnly prop
}
```

- The wrapper gates `WidgetEditButton` on `!readOnly` (skip rendering entirely —
  `QueryBlockShell`'s `onEdit && !readOnly` is the precedent, `QueryBlockView.tsx:316`)
  and passes `readOnly` to each registered component so widgets can hide their own
  controls (`onCapture`, filter inputs, etc.).
- `readOnly` is added to `ReactWidgetBlock.eq` (and `ReactQueryBlock.eq`) so a mode flip
  forces a redraw even if the reconfigure path ever changes.
- Keep the name `readOnly`, not `mode: "view" | "edit"` — `readOnly` is already the
  vocabulary of `QueryBlockView`, `editorPreset`, and `NoteEditor`.

### 3. Mode switches without recreating the editor

Already satisfied: the `StateEffect.reconfigure` flow in `NoteEditor.tsx:599-613`
re-provisions extensions on `readonly` change while the `EditorView` survives. A
`readOnlyCompartment` (sibling of the existing `themeCompartment`/`languageCompartment`)
is the surgical upgrade path *if* full reconfiguration on mode flip ever becomes a
measured problem — not before.

## Sources

- `packages/ui/src/extensions/query-block-preview.tsx:18,25-33,64,88,177,183`
- `packages/ui/src/extensions/widget-block-preview.tsx:58-63,471,506,602-616,814,827`
- `packages/ui/src/blocks/QueryBlockView.tsx:159,316`
- `apps/playground/src/components/organisms/editor/NoteEditor.tsx:460,468,502-503,604`
- `packages/ui/src/extensions/editorPreset.ts:99,123`
- CM6 ref: [`EditorState.readOnly`](https://codemirror.net/docs/ref/#state.EditorState^readOnly),
  [`EditorView.editable`](https://codemirror.net/docs/ref/#view.EditorView^editable),
  [`Compartment`](https://codemirror.net/docs/ref/#state.Compartment),
  [`Transaction.reconfigured`](https://codemirror.net/docs/ref/#state.Transaction^reconfigured),
  [`WidgetType`](https://codemirror.net/docs/ref/#view.WidgetType)
- CM6 guide: [Facets](https://codemirror.net/docs/guide/#facets),
  [Configuration](https://codemirror.net/docs/guide/#configuration),
  [Decorations](https://codemirror.net/docs/guide/#decorations)
