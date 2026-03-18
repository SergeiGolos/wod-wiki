/**
 * wod-results-widget
 *
 * CM6 extension that manages workout result visualization within WOD blocks.
 *
 * Features:
 *   1. A clickable "Results" badge in the block header (```wod line).
 *   2. An expandable results table inserted before the closing fence.
 *   3. Toggling the badge shows/hides the table.
 *
 * Architecture:
 *   - `wodResultsField`: Stores the actual result data per section.
 *   - `wodResultsExpandedField`: Stores the toggle state (expanded or not) per section.
 *   - `WodResultsBadgeWidget`: The clickable UI in the header.
 *   - `WodResultsBarWidget`: The expandable table at the bottom.
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

/** Fired on the editor DOM when the user clicks a result in the table. */
export const WOD_RESULT_CLICK_EVENT = "wod-result-click";

export interface WodResultClickDetail {
  sectionId: string;
  result: WorkoutResult;
}

// ── StateEffects ─────────────────────────────────────────────────────

/** Update (replace) results for a single section. */
export const updateSectionResults = StateEffect.define<{
  sectionId: string;
  results: WorkoutResult[];
}>();

/** Toggle expansion state of the results table for a section. */
export const toggleWodResults = StateEffect.define<{
  sectionId: string;
  expanded?: boolean; // If omitted, toggles.
}>();

// ── StateFields ──────────────────────────────────────────────────────

/** Field storing the results Map. */
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

/** Field storing which sections are currently expanded. */
export const wodResultsExpandedField = StateField.define<Set<string>>({
  create: () => new Set(),
  update(set, tr) {
    let newSet: Set<string> | null = null;
    for (const e of tr.effects) {
      if (e.is(toggleWodResults)) {
        if (!newSet) newSet = new Set(set);
        const { sectionId, expanded } = e.value;
        const isCurrentlyExpanded = set.has(sectionId);
        const target = expanded !== undefined ? expanded : !isCurrentlyExpanded;
        
        if (target) newSet.add(sectionId);
        else newSet.delete(sectionId);
      }
    }
    return newSet ?? set;
  }
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

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ── Table Widget (Bottom) ───────────────────────────────────────────

class WodResultsBarWidget extends WidgetType {
  constructor(
    readonly sectionId: string,
    readonly results: WorkoutResult[],
    readonly expanded: boolean
  ) {
    super();
  }

  eq(other: WodResultsBarWidget): boolean {
    if (other.sectionId !== this.sectionId) return false;
    if (other.expanded !== this.expanded) return false;
    if (other.results.length !== this.results.length) return false;
    // Quick equality check: compare completion timestamps of first two entries
    for (let i = 0; i < Math.min(2, this.results.length); i++) {
      if (this.results[i].completedAt !== other.results[i].completedAt) return false;
    }
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-wod-results-inlay";
    
    if (!this.expanded) {
        wrapper.style.display = "none";
        return wrapper;
    }

    // Separator line between WOD content and results
    const sep = document.createElement("div");
    sep.className = "cm-wod-results-separator";
    wrapper.appendChild(sep);

    const container = document.createElement("div");
    container.className = "cm-wod-results-container";

    const grid = document.createElement("div");
    grid.className = "cm-wod-results-grid";

    // Header
    const header = document.createElement("div");
    header.className = "cm-wod-results-grid-header";
    header.innerHTML = `
        <div class="cm-col-date">Date</div>
        <div class="cm-col-time">Time</div>
        <div class="cm-col-dur">Duration</div>
        <div class="cm-col-stat">Status</div>
        <div class="cm-col-link"></div>
    `;
    grid.appendChild(header);

    // Rows
    for (const result of this.results) {
        const row = document.createElement("div");
        row.className = "cm-wod-results-grid-row";
        
        const duration = formatDuration(result.data?.duration ?? 0);
        const date = formatDateShort(result.completedAt);
        const time = formatTime(result.completedAt);
        const isDone = result.data?.state === 'completed' || !!result.data?.duration;

        row.innerHTML = `
            <div class="cm-col-date">${date}</div>
            <div class="cm-col-time">${time}</div>
            <div class="cm-col-dur">${duration}</div>
            <div class="cm-col-stat">
                <span class="cm-status-pill ${isDone ? 'status-done' : 'status-partial'}">
                    ${isDone ? 'Finished' : 'Partial'}
                </span>
            </div>
            <div class="cm-col-link">
                <button class="cm-review-link" title="Open Review">↗</button>
            </div>
        `;

        row.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const detail: WodResultClickDetail = { sectionId: this.sectionId, result };
            view.dom.dispatchEvent(
                new CustomEvent(WOD_RESULT_CLICK_EVENT, { detail, bubbles: true }),
            );
        });

        grid.appendChild(row);
    }

    container.appendChild(grid);
    wrapper.appendChild(container);
    return wrapper;
  }

  /** Estimated height of the expanded table. */
  get estimatedHeight(): number {
    if (!this.expanded) return 0;
    // Header (18px) + rows (22px each) + separator/padding (12px)
    return 18 + (this.results.length * 22) + 12;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

// ── Build decorations ─────────────────────────────────────────────────

function _buildResultsDecorations(state: EditorState): DecorationSet {
  const { sections } = state.field(sectionField);
  const resultsMap: Map<string, WorkoutResult[]> = state.field(wodResultsField);
  const expandedSet = state.field(wodResultsExpandedField);
  const decos: Range<Decoration>[] = [];

  for (const section of sections) {
    if (section.type !== "wod") continue;
    const results = resultsMap.get(section.id);
    if (!results || results.length === 0) continue;

    const doc = state.doc;
    const isExpanded = expandedSet.has(section.id);

    // 1. Results Table (at the bottom of the content)
    if (section.endLine > doc.lines) continue;
    const anchorPos = section.contentTo ?? doc.line(section.endLine).from - 1;
    if (anchorPos < 0 || anchorPos > doc.length) continue;

    decos.push(
      Decoration.widget({
        widget: new WodResultsBarWidget(section.id, results, isExpanded),
        block: true,
        side: 1,
      }).range(anchorPos),
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
    if (tr.docChanged || 
        tr.effects.some((e) => e.is(updateSectionResults) || e.is(toggleWodResults))) {
      return _buildResultsDecorations(tr.state);
    }
    return prev.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Theme ─────────────────────────────────────────────────────────────

export const wodResultsTheme = EditorView.baseTheme({
  ".cm-wod-results-inlay": {
    padding: "0",
  },
  ".cm-wod-results-separator": {
    height: "1px",
    margin: "4px 8px 2px",
    background: "rgba(128, 128, 128, 0.15)",
  },
  ".cm-wod-results-container": {
    padding: "0 8px 4px",
  },
  ".cm-wod-results-grid": {
    display: "flex",
    flexDirection: "column",
    border: "1px solid rgba(128, 128, 128, 0.15)",
    borderRadius: "4px",
    overflow: "hidden",
    background: "rgba(128, 128, 128, 0.03)",
  },
  ".cm-wod-results-grid-header": {
    display: "flex",
    background: "rgba(128, 128, 128, 0.1)",
    borderBottom: "1px solid rgba(128, 128, 128, 0.15)",
    fontSize: "9px",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "2px 8px",
    color: "rgba(128, 128, 128, 0.6)",
  },
  ".cm-wod-results-grid-row": {
    display: "flex",
    alignItems: "center",
    padding: "2px 8px",
    fontSize: "11px",
    borderBottom: "1px solid rgba(128, 128, 128, 0.05)",
    cursor: "pointer",
    transition: "background 0.2s",
    "&:last-child": { borderBottom: "none" },
    "&:hover": {
      background: "rgba(59, 130, 246, 0.1)",
    },
  },
  ".cm-col-date": { flex: "0 0 70px" },
  ".cm-col-time": { flex: "0 0 70px", opacity: "0.6" },
  ".cm-col-dur": { flex: "0 0 80px", fontWeight: "600" },
  ".cm-col-stat": { flex: "1" },
  ".cm-col-link": { flex: "0 0 30px", textAlign: "right", opacity: "0.4" },
  ".cm-status-pill": {
    fontSize: "9px",
    padding: "0 6px",
    borderRadius: "10px",
    fontWeight: "600",
  },
  ".status-done": {
    background: "rgba(34, 197, 94, 0.1)",
    color: "rgb(21, 128, 61)",
  },
  ".status-partial": {
    background: "rgba(234, 179, 8, 0.1)",
    color: "rgb(161, 98, 7)",
  },
  ".cm-review-link": {
    background: "none",
    border: "none",
    padding: "0",
    cursor: "pointer",
    color: "inherit",
  },
});

// ── Bundle ────────────────────────────────────────────────────────────

export const wodResultsWidget = [
  wodResultsField,
  wodResultsExpandedField,
  wodResultsDecorations,
  wodResultsTheme,
];

