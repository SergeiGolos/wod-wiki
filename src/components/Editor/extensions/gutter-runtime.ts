/**
 * gutter-runtime.ts
 *
 * CM6 gutter decoration extension that highlights source lines currently
 * executing in the live runtime.
 *
 * Usage:
 *   1. Include `gutterRuntimeHighlights` in your baseExtensions.
 *   2. Call `dispatchGutterHighlights(view, lineNumbers)` to set active lines.
 *   3. Call `dispatchGutterHighlights(view, [])` to clear.
 *
 * Line numbers are 1-based document line numbers.
 *
 * Source ID → document line mapping (from src/parser/lezer-mapper.ts):
 *   statement.id = statement.meta.line   (1-based within content block)
 *   document line = section.startLine + sourceId
 *   (section.startLine is the 1-based fence/opening line)
 *   Equivalently: document line = wodBlock.startLine + 1 + sourceId
 */

import { StateEffect, StateField, RangeSetBuilder } from "@codemirror/state";
import { GutterMarker, gutter, EditorView } from "@codemirror/view";

// ── Effect ──────────────────────────────────────────────────────────────

/** Set (replace) the full set of active document line numbers (1-based). */
export const setGutterHighlights = StateEffect.define<Set<number>>();

// ── StateField ──────────────────────────────────────────────────────────

export const gutterHighlightsField = StateField.define<Set<number>>({
  create: () => new Set<number>(),
  update(state, tr) {
    for (const e of tr.effects) {
      if (e.is(setGutterHighlights)) return e.value;
    }
    return state;
  },
});

// ── GutterMarker ────────────────────────────────────────────────────────

class RuntimeLineMarker extends GutterMarker {
  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-gutter-runtime-marker";
    el.title = "⚡ Executing";
    return el;
  }

  /** All markers are identical — allow CM6 to reuse them */
  eq(): boolean {
    return true;
  }
}

const runtimeMarker = new RuntimeLineMarker();

// ── Extension bundle ───────────────────────────────────────────────────

export const gutterRuntimeHighlights = [
  gutterHighlightsField,

  gutter({
    class: "cm-gutter-runtime",
    markers(view: EditorView) {
      const lines = view.state.field(gutterHighlightsField);
      if (!lines.size) return new RangeSetBuilder<GutterMarker>().finish();

      const sorted = [...lines].sort((a, b) => a - b);
      const builder = new RangeSetBuilder<GutterMarker>();
      const docLines = view.state.doc.lines;

      for (const lineNum of sorted) {
        if (lineNum < 1 || lineNum > docLines) continue;
        try {
          const line = view.state.doc.line(lineNum);
          builder.add(line.from, line.from, runtimeMarker);
        } catch {
          // Out of range — skip
        }
      }
      return builder.finish();
    },

    // Reserves a spacer so the gutter column is always present
    initialSpacer: () => runtimeMarker,
  }),

  EditorView.baseTheme({
    ".cm-gutter-runtime": {
      width: "10px",
      flexShrink: "0",
    },
    ".cm-gutter-runtime-marker": {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: "#22c55e",
      margin: "0 2px",
      marginTop: "5px",
      animation: "cm-runtime-pulse 1.2s ease-in-out infinite",
    },
    "@keyframes cm-runtime-pulse": {
      "0%, 100%": { opacity: 1, transform: "scale(1)" },
      "50%": { opacity: 0.5, transform: "scale(0.8)" },
    },
  }),
];

// ── Dispatch helper ────────────────────────────────────────────────────

/**
 * Dispatch gutter highlights to the given view.
 * Pass an empty array to clear all highlights.
 */
export function dispatchGutterHighlights(
  view: EditorView,
  lineNumbers: number[],
): void {
  view.dispatch({ effects: setGutterHighlights.of(new Set(lineNumbers)) });
}
