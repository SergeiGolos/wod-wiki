import { StateEffect, StateField, RangeSetBuilder } from "@codemirror/state";
import { GutterMarker, gutter, EditorView } from "@codemirror/view";
import { forEachDiagnostic } from "@codemirror/lint";

export const setGutterHighlights = StateEffect.define<Set<number>>();

export const gutterHighlightsField = StateField.define<Set<number>>({
  create() {
    return new Set();
  },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setGutterHighlights)) return e.value;
    }
    return value;
  },
});

type MarkerKind = "runtime" | "error" | "warning" | "info";

const KIND_CLASS: Record<MarkerKind, string> = {
  runtime: "cm-gutter-runtime",
  error: "cm-gutter-error",
  warning: "cm-gutter-warning",
  info: "cm-gutter-info",
};

class UnifiedMarker extends GutterMarker {
  constructor(readonly kind: MarkerKind) {
    super();
  }

  toDOM() {
    const el = document.createElement("div");
    el.className = `cm-unified-gutter-marker ${KIND_CLASS[this.kind]}`;
    return el;
  }
}

const markerCache = new Map<MarkerKind, UnifiedMarker>([
  ["runtime", new UnifiedMarker("runtime")],
  ["error", new UnifiedMarker("error")],
  ["warning", new UnifiedMarker("warning")],
  ["info", new UnifiedMarker("info")],
]);

const unifiedGutterInstance = gutter({
  class: "cm-unified-gutter",
  markers(view) {
    const builder = new RangeSetBuilder<GutterMarker>();
    const highlights = view.state.field(gutterHighlightsField);
    const lineMarkers = new Map<number, MarkerKind>();

    for (const lineNum of highlights) {
      if (lineNum >= 1 && lineNum <= view.state.doc.lines) {
        lineMarkers.set(lineNum, "runtime");
      }
    }

    forEachDiagnostic(view.state, (d) => {
      const line = view.state.doc.lineAt(d.from).number;
      if (lineMarkers.get(line) === "runtime") return;
      const existing = lineMarkers.get(line);
      if (!existing || (d.severity === "error" && existing !== "error")) {
        lineMarkers.set(line, d.severity as MarkerKind);
      }
    });

    const sortedLines = Array.from(lineMarkers.keys()).sort((a, b) => a - b);
    for (const l of sortedLines) {
      const line = view.state.doc.line(l);
      const marker = markerCache.get(lineMarkers.get(l)!);
      if (marker) {
        builder.add(line.from, line.from, marker);
      }
    }

    return builder.finish();
  },
  initialSpacer: () => new UnifiedMarker("info"),
});

export const gutterUnified = [
  gutterHighlightsField,
  unifiedGutterInstance,
];

export function dispatchGutterHighlights(
  view: EditorView,
  lineNumbers: number[],
): void {
  view.dispatch({ effects: setGutterHighlights.of(new Set(lineNumbers)) });
}
