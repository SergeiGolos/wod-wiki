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
import { buildResultListItemDOM } from "@/components/results/resultListItemDOM";

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

    for (const result of this.results) {
      const duration = formatDuration(result.data?.duration ?? 0);
      const timeLabel = formatTime(result.completedAt);
      const dateLabel = formatDateShort(result.completedAt);

      const row = buildResultListItemDOM({
        timeLabel,
        title: duration !== "--:--" ? duration : "Result",
        subtitle: dateLabel,
        onClick: () => {
          const detail: WodResultClickDetail = { sectionId: this.sectionId, result };
          view.dom.dispatchEvent(
            new CustomEvent(WOD_RESULT_CLICK_EVENT, { detail, bubbles: true }),
          );
        },
      });

      wrapper.appendChild(row);
    }

    return wrapper;
  }

  /** Estimated height of the expanded list. Each row is ~44px (py-3 = 12px×2 + content ~20px). */
  get estimatedHeight(): number {
    if (!this.expanded) return 0;
    return 5 + (this.results.length * 44);
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
});

// ── Bundle ────────────────────────────────────────────────────────────

export const wodResultsWidget = [
  wodResultsField,
  wodResultsExpandedField,
  wodResultsDecorations,
  wodResultsTheme,
];

