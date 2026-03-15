/**
 * wod-results-widget
 *
 * CM6 extension that inserts a compact results bar after the closing fence of
 * every WOD block that has recorded workout results.
 *
 * Each result appears as a clickable pill showing duration + date.  Clicking a
 * pill emits a `WOD_RESULT_CLICK_EVENT` CustomEvent on the editor DOM so that
 * React components above the editor can open the full-screen review overlay.
 *
 * Architecture:
 *   1. `updateSectionResults` StateEffect — dispatched from React when results
 *      are fetched for a section.
 *   2. `wodResultsField` StateField — holds a Map<sectionId, WorkoutResult[]>.
 *   3. `wodResultsDecorations` StateField — builds block widget decorations
 *      anchored to the end of each wod section's closing fence line.
 *   4. `WodResultsBarWidget` WidgetType — renders the DOM bar.
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { StateEffect, StateField, EditorState, Range } from "@codemirror/state";
import { sectionField } from "./section-state";
import type { WorkoutResult } from "@/types/storage";

// ── Custom DOM event ─────────────────────────────────────────────────

/** Fired on the editor DOM when the user clicks a result pill. */
export const WOD_RESULT_CLICK_EVENT = "wod-result-click";

export interface WodResultClickDetail {
  sectionId: string;
  result: WorkoutResult;
}

// ── StateEffect ──────────────────────────────────────────────────────

/** Dispatch this effect to update (replace) results for a single section. */
export const updateSectionResults = StateEffect.define<{
  sectionId: string;
  results: WorkoutResult[];
}>();

// ── StateField: results map ──────────────────────────────────────────

export const wodResultsField = StateField.define<Map<string, WorkoutResult[]>>({
  create: () => new Map(),
  update(map, tr) {
    let newMap: Map<string, WorkoutResult[]> | null = null;
    for (const e of tr.effects) {
      if (e.is(updateSectionResults)) {
        if (!newMap) newMap = new Map(map);
        newMap.set(e.value.sectionId, e.value.results);
      }
    }
    return newMap ?? map;
  },
});

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "--:--";
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Widget ────────────────────────────────────────────────────────────

class WodResultsBarWidget extends WidgetType {
  constructor(
    readonly sectionId: string,
    readonly results: WorkoutResult[],
  ) {
    super();
  }

  eq(other: WodResultsBarWidget): boolean {
    if (other.sectionId !== this.sectionId) return false;
    if (other.results.length !== this.results.length) return false;
    // Quick equality check: compare completion timestamps of first two entries
    for (let i = 0; i < Math.min(2, this.results.length); i++) {
      if (this.results[i].completedAt !== other.results[i].completedAt) return false;
    }
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "cm-wod-results-bar";

    // Clock icon label
    const icon = document.createElement("span");
    icon.className = "cm-wod-results-icon";
    icon.textContent = "🕐";
    icon.title = `${this.results.length} result${this.results.length !== 1 ? "s" : ""}`;
    bar.appendChild(icon);

    // Result pills — ordered most-recent first (already sorted by caller)
    for (const result of this.results) {
      const duration = formatDuration(result.data?.duration ?? 0);
      const date = formatDate(result.completedAt);

      const pill = document.createElement("button");
      pill.className = "cm-wod-result-pill";
      pill.textContent = `${duration}  ${date}`;
      pill.title = `Recorded: ${new Date(result.completedAt).toLocaleString()}`;

      pill.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const detail: WodResultClickDetail = { sectionId: this.sectionId, result };
        view.dom.dispatchEvent(
          new CustomEvent(WOD_RESULT_CLICK_EVENT, { detail, bubbles: true }),
        );
      });

      bar.appendChild(pill);
    }

    return bar;
  }

  /** Let CM6 know this widget takes up vertical space. */
  get estimatedHeight(): number {
    return 24;
  }

  /** Clicks on pills should reach our listener, not be ignored. */
  ignoreEvent(): boolean {
    return false;
  }
}

// ── Build decorations ─────────────────────────────────────────────────

function _buildResultsDecorations(state: EditorState): DecorationSet {
  const { sections } = state.field(sectionField);
  const resultsMap: Map<string, WorkoutResult[]> = state.field(wodResultsField);
  const decos: Range<Decoration>[] = [];

  for (const section of sections) {
    if (section.type !== "wod") continue;
    const results = resultsMap.get(section.id);
    if (!results || results.length === 0) continue;

    const doc = state.doc;
    if (section.endLine > doc.lines) continue;

    const closeLine = doc.line(section.endLine);

    decos.push(
      Decoration.widget({
        widget: new WodResultsBarWidget(section.id, results),
        block: true,
        side: 1,
      }).range(closeLine.to),
    );
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField: decorations ──────────────────────────────────────────

export const wodResultsDecorations = StateField.define<DecorationSet>({
  create(state) {
    return _buildResultsDecorations(state);
  },
  update(prev, tr) {
    if (tr.docChanged || tr.effects.some((e) => e.is(updateSectionResults))) {
      return _buildResultsDecorations(tr.state);
    }
    return prev.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Theme ─────────────────────────────────────────────────────────────

export const wodResultsTheme = EditorView.baseTheme({
  ".cm-wod-results-bar": {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 10px 2px 8px",
    overflowX: "auto",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    borderTop: "1px solid rgba(128, 128, 128, 0.2)",
    background: "rgba(128, 128, 128, 0.05)",
    fontSize: "11px",
  },
  ".cm-wod-results-icon": {
    opacity: "0.5",
    fontSize: "10px",
    marginRight: "4px",
    userSelect: "none",
  },
  ".cm-wod-result-pill": {
    cursor: "pointer",
    border: "1px solid rgba(100, 100, 240, 0.3)",
    borderRadius: "4px",
    padding: "1px 7px",
    fontSize: "10px",
    fontFamily: "monospace",
    background: "rgba(100, 100, 240, 0.08)",
    color: "inherit",
    transition: "background 0.12s",
    "&:hover": {
      background: "rgba(100, 100, 240, 0.18)",
    },
  },
});

// ── Bundle ────────────────────────────────────────────────────────────

export const wodResultsWidget = [
  wodResultsField,
  wodResultsDecorations,
  wodResultsTheme,
];
