/**
 * gutter-unified.ts
 *
 * A single CM6 gutter column that combines:
 *  - Runtime execution highlights (green bar, pulsing)
 *  - Lint diagnostics (red / amber / blue bar)
 *
 * Priority when a line has multiple signals: runtime > error > warning > info.
 *
 * Usage:
 *   1. Include `gutterUnified` spread in your extensions (replaces both
 *      `lintGutter()` and `gutterRuntimeHighlights`).
 *   2. Replace `lintGutter()` with nothing — the unified gutter reads
 *      diagnostics directly via `forEachDiagnostic`.
 *   3. Call `dispatchGutterHighlights(view, lineNumbers)` to set active lines.
 */

import { StateEffect, StateField, RangeSetBuilder } from "@codemirror/state";
import { GutterMarker, gutter, EditorView } from "@codemirror/view";
import { forEachDiagnostic } from "@codemirror/lint";

// ── Runtime highlight state ──────────────────────────────────────────────

/** Set (replace) the full set of active document line numbers (1-based). */
export const setGutterHighlights = StateEffect.define<Set<number>>();

export const gutterHighlightsField = StateField.define<Set<number>>({
  create: () => new Set<number>(),
  update(state, tr) {
    for (const e of tr.effects) {
      if (e.is(setGutterHighlights)) return e.value;
    }
    return state;
  },
});

// ── Marker types ─────────────────────────────────────────────────────────

type MarkerKind = "runtime" | "error" | "warning" | "info";

const KIND_CLASS: Record<MarkerKind, string> = {
  runtime: "cm-unified-marker-runtime",
  error:   "cm-unified-marker-error",
  warning: "cm-unified-marker-warning",
  info:    "cm-unified-marker-info",
};

const markerCache = new Map<MarkerKind, UnifiedMarker>();

class UnifiedMarker extends GutterMarker {
  constructor(public readonly kind: MarkerKind) {
    super();
  }

  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = `cm-unified-marker ${KIND_CLASS[this.kind]}`;
    if (this.kind === "runtime") el.title = "⚡ Executing";
    return el;
  }

  eq(other: UnifiedMarker): boolean {
    return this.kind === other.kind;
  }

  static get(kind: MarkerKind): UnifiedMarker {
    let m = markerCache.get(kind);
    if (!m) { m = new UnifiedMarker(kind); markerCache.set(kind, m); }
    return m;
  }
}

// ── Extension bundle ─────────────────────────────────────────────────────

export const gutterUnified = [
  gutterHighlightsField,

  gutter({
    class: "cm-gutter-unified",

    markers(view: EditorView) {
      const runtimeLines = view.state.field(gutterHighlightsField);

      // Collect per-line severity from diagnostics
      const lineSeverity = new Map<number, "error" | "warning" | "info">();
      forEachDiagnostic(view.state, (diag, from) => {
        const lineNum = view.state.doc.lineAt(from).number;
        const current = lineSeverity.get(lineNum);
        if (
          diag.severity === "error" ||
          (diag.severity === "warning" && current !== "error") ||
          (diag.severity === "info"    && !current)
        ) {
          lineSeverity.set(lineNum, diag.severity as "error" | "warning" | "info");
        }
      });

      // Collect all line numbers that need a marker
      const allLines = new Set<number>([...runtimeLines, ...lineSeverity.keys()]);
      if (!allLines.size) return new RangeSetBuilder<GutterMarker>().finish();

      const sorted = [...allLines].sort((a, b) => a - b);
      const docLines = view.state.doc.lines;
      const builder = new RangeSetBuilder<GutterMarker>();

      for (const lineNum of sorted) {
        if (lineNum < 1 || lineNum > docLines) continue;
        try {
          const line = view.state.doc.line(lineNum);
          const kind: MarkerKind =
            runtimeLines.has(lineNum) ? "runtime" :
            (lineSeverity.get(lineNum) ?? "info");
          builder.add(line.from, line.from, UnifiedMarker.get(kind));
        } catch {
          // Out of range — skip
        }
      }

      return builder.finish();
    },

    initialSpacer: () => UnifiedMarker.get("info"),
  }),

  EditorView.baseTheme({
    ".cm-gutter-unified": {
      width: "6px",
      flexShrink: "0",
    },
    ".cm-unified-marker": {
      width: "3px",
      height: "100%",
      minHeight: "18px",
      borderRadius: "0 2px 2px 0",
      display: "block",
    },
    ".cm-unified-marker-runtime": {
      background: "#22c55e",
      animation: "cm-gutter-pulse 1.2s ease-in-out infinite",
    },
    ".cm-unified-marker-error": {
      background: "#ef4444",
    },
    ".cm-unified-marker-warning": {
      background: "#f59e0b",
    },
    ".cm-unified-marker-info": {
      background: "#3b82f6",
    },
    "@keyframes cm-gutter-pulse": {
      "0%, 100%": { opacity: 1 },
      "50%":      { opacity: 0.45 },
    },
  }),
];

// ── Dispatch helper ───────────────────────────────────────────────────────

/**
 * Dispatch runtime highlight line numbers to the given view.
 * Pass an empty array to clear all highlights.
 */
export function dispatchGutterHighlights(
  view: EditorView,
  lineNumbers: number[],
): void {
  view.dispatch({ effects: setGutterHighlights.of(new Set(lineNumbers)) });
}
