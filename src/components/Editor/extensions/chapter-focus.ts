/**
 * Chapter Focus Decorations
 *
 * Line-level highlight for the chapter tour window (#chapter-tour): the
 * active chapter's `focus` line spec (e.g. `2-4`) marks the specific lines
 * the chapter teaches. Unlike the home runway's element-ring (TourRing), this
 * is a line-scoped decoration — the home idioms use `Decoration.line` +
 * measured proxies for fenced blocks.
 *
 * Driven by a StateEffect (`setChapterFocus`) so the highlight updates
 * without reconfiguring the editor — important for the mount-once CodeMirror
 * churn workaround in the tour screens.
 */

import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { EditorState, RangeSetBuilder, StateEffect, StateField, Extension } from "@codemirror/state";

/** Set the focused 1-indexed lines (empty/null clears). */
export const setChapterFocusLines = StateEffect.define<number[] | null>();

const focusDeco = Decoration.line({
  attributes: { class: "cm-chapter-focus" },
});

function buildFocusDecorations(state: EditorState, lines: number[] | null): DecorationSet {
  if (!lines || lines.length === 0) return Decoration.none;
  const builder = new RangeSetBuilder<Decoration>();
  for (const ln of lines) {
    if (ln < 1 || ln > state.doc.lines) continue;
    const line = state.doc.line(ln);
    builder.add(line.from, line.from, focusDeco);
  }
  return builder.finish();
}

const chapterFocusField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setChapterFocusLines)) {
        return buildFocusDecorations(tr.state, e.value);
      }
    }
    return tr.docChanged ? value.map(tr.changes) : value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const chapterFocusTheme = EditorView.baseTheme({
  ".cm-chapter-focus": {
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderLeft: "2px solid rgba(139, 92, 246, 0.55)",
    borderRadius: "2px",
  },
});

/** Parse a focus line spec like `2-4` (range), `2,5` (list), or `3` (single) into 1-indexed line numbers. */
export function parseFocusSpec(spec: string | undefined): number[] | null {
  if (!spec) return null;
  const out: number[] = [];
  for (const part of spec.split(",")) {
    const p = part.trim();
    if (!p) continue;
    const range = /^(\d+)-(\d+)$/.exec(p);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
      continue;
    }
    const n = Number(p);
    if (Number.isInteger(n) && n > 0) out.push(n);
  }
  return out.length ? out : null;
}

/** Full extension: the focus decoration field + its base theme. */
export function chapterFocus(): Extension {
  return [chapterFocusField, chapterFocusTheme];
}

/** Apply a focus spec to a view (parses the spec and dispatches the effect). */
export function setChapterFocus(view: EditorView, spec: string | null | undefined): void {
  view.dispatch({ effects: setChapterFocusLines.of(parseFocusSpec(spec ?? undefined)) });
}
