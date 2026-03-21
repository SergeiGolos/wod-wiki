/**
 * Cursor Focus Panel Extension
 *
 * CM6 StateField that tracks the cursor's active WOD line and provides:
 *  1. Block widget decoration — inserted BETWEEN the cursor line and the
 *     next line as a true CM6 block widget (block: true).  The widget
 *     physically occupies space in the editor layout, so line heights,
 *     gutter decorations, hover-tooltip positions, and all other
 *     line-aligned features remain accurate.
 *  2. Mark decorations — colored underlines on the cursor line, one per
 *     metric type, using CSS classes defined via EditorView.baseTheme.
 *  3. Exported state — the focused ICodeStatement + EditorSection,
 *     available to any consumer via getCursorFocusState().
 *
 * The StateField is updated on every selection change (cursor move).
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import {
  EditorState,
  Extension,
  Range,
  StateField,
} from "@codemirror/state";
import { sectionField, type EditorSection } from "./section-state";
import { sharedParser } from "../../../parser/parserInstance";
import { MetricType } from "../../../core/models/Metric";
import type { ICodeStatement } from "../../../core/models/CodeStatement";

// ── Types ────────────────────────────────────────────────────────────

/** Data exposed to external consumers via getCursorFocusState(). */
export interface CursorFocusState {
  /** The WOD section the cursor is in. */
  section: EditorSection;
  /** The parsed statement on the cursor line, or null if none. */
  statement: ICodeStatement | null;
  /** 1-based doc line number of the cursor. */
  cursorLine: number;
  /** Absolute char offset of the cursor line's start. */
  lineFrom: number;
  /** Absolute char offset of the cursor line's end. */
  lineTo: number;
}

// ── Metric display config ─────────────────────────────────────────────

interface MetricStyle {
  label: string;
  icon: string;
  color: string; // hex color used for chip border + text tint
}

const METRIC_STYLES: Partial<Record<string, MetricStyle>> = {
  [MetricType.Duration]:   { label: "Timer",    icon: "⏱",  color: "#3b82f6" },
  [MetricType.Rep]:        { label: "Reps",     icon: "✕",  color: "#22c55e" },
  [MetricType.Effort]:     { label: "Exercise", icon: "🏋",  color: "#ec4899" },
  [MetricType.Rounds]:     { label: "Rounds",   icon: "↻",  color: "#a855f7" },
  [MetricType.Distance]:   { label: "Distance", icon: "📏", color: "#06b6d4" },
  [MetricType.Resistance]: { label: "Weight",   icon: "⚖",  color: "#f97316" },
  [MetricType.Action]:     { label: "Action",   icon: "⚡", color: "#eab308" },
};

// ── Block widget ──────────────────────────────────────────────────────

/**
 * CM6 WidgetType that renders a metric summary panel as a real DOM node
 * inserted between lines.  Because it's a block widget (block: true) the
 * editor accounts for its height in all layout calculations — hover-tooltip
 * positions, gutter markers, line numbers, and scroll offsets all remain
 * accurate.
 */
class MetricBlockWidget extends WidgetType {
  constructor(private readonly statement: ICodeStatement | null) {
    super();
  }

  /**
   * CM6 calls eq() to decide whether to reuse the existing DOM element
   * when decorations are rebuilt.  We reuse when the statement line and
   * metric count haven't changed to avoid unnecessary DOM churn.
   */
  eq(other: MetricBlockWidget): boolean {
    return (
      other.statement?.meta?.line === this.statement?.meta?.line &&
      (other.statement?.metrics?.length ?? 0) === (this.statement?.metrics?.length ?? 0)
    );
  }

  toDOM(): HTMLElement {
    const container = document.createElement("div");
    container.className = "cm-wod-metric-panel";

    const metrics = (this.statement?.metrics ?? []).filter(
      (m) => m.type !== MetricType.Sound && m.type !== MetricType.System
    );

    if (metrics.length === 0) {
      const empty = document.createElement("span");
      empty.className = "cm-wod-metric-panel__empty";
      empty.textContent = "No metrics on this line";
      container.appendChild(empty);
    } else {
      const chipsEl = document.createElement("div");
      chipsEl.className = "cm-wod-metric-panel__chips";

      for (const metric of metrics) {
        const style = METRIC_STYLES[metric.type as string];
        const chip = document.createElement("span");
        chip.className = "cm-wod-metric-panel__chip";
        chip.textContent = `${style?.icon ?? "•"} ${style?.label ?? String(metric.type)}`;
        if (style?.color) {
          chip.style.color = style.color;
          chip.style.background = `${style.color}18`;
          chip.style.borderColor = `${style.color}50`;
        }
        chipsEl.appendChild(chip);
      }
      container.appendChild(chipsEl);
    }

    const hint = document.createElement("span");
    hint.className = "cm-wod-metric-panel__hint";
    hint.textContent = "Ctrl+↑↓ · adjust value";
    container.appendChild(hint);

    return container;
  }

  /** Let events pass through so the editor can still handle clicks below. */
  ignoreEvent(): boolean { return false; }
}

// ── Mark decoration class map ─────────────────────────────────────────

/** Map from MetricType to a CSS class added to mark decorations. */
const METRIC_MARK_CLASS: Partial<Record<string, string>> = {
  [MetricType.Duration]:   "cm-metric-underline-duration",
  [MetricType.Rep]:        "cm-metric-underline-rep",
  [MetricType.Effort]:     "cm-metric-underline-effort",
  [MetricType.Rounds]:     "cm-metric-underline-rounds",
  [MetricType.Distance]:   "cm-metric-underline-distance",
  [MetricType.Resistance]: "cm-metric-underline-resistance",
  [MetricType.Action]:     "cm-metric-underline-action",
};

// ── Parser helper ─────────────────────────────────────────────────────

function parseStatements(
  section: EditorSection,
  state: EditorState
): ICodeStatement[] | null {
  if (section.contentFrom === undefined || section.contentTo === undefined) return null;
  const raw = state.doc.sliceString(section.contentFrom, section.contentTo);
  if (!raw.trim()) return null;
  try {
    return sharedParser.read(raw).statements as ICodeStatement[];
  } catch {
    return null;
  }
}

// ── Combined decoration builder ─────────────────────────────────────

/**
 * Build both the block widget (inserted below cursor line) and mark
 * decorations (underlines on metric tokens).  Both must be sorted by `from`
 * and passed to a single Decoration.set() call.
 *
 * Block widget placement:
 *   range = docLine.to, side = 1  →  widget appears BELOW the cursor line,
 *   pushed into the space between that line and the one below it.
 */
function buildDecorations(
  section: EditorSection,
  statements: ICodeStatement[] | null,
  stmt: ICodeStatement | null,
  cursorDocLine: number,
  state: EditorState
): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const docLine = state.doc.line(cursorDocLine);

  // Block widget — placed at end of cursor line, side:1 = below the line
  decos.push(
    Decoration.widget({
      widget: new MetricBlockWidget(stmt),
      block: true,
      side: 1,
    }).range(docLine.to)
  );

  // Mark decorations — underline metric tokens across ALL statements in the
  // WOD section, using the absolute content offsets from the Lezer mapper.
  if (statements && section.contentFrom !== undefined) {
    for (const s of statements) {
      for (const metric of s.metrics) {
        const cssClass = METRIC_MARK_CLASS[metric.type as string];
        if (!cssClass) continue;

        const meta = s.metricMeta?.get(metric);
        if (!meta) continue;

        // startOffset / endOffset are 0-based into the WOD content string;
        // adding contentFrom converts them to absolute document offsets.
        const from = section.contentFrom + meta.startOffset;
        const to = section.contentFrom + meta.endOffset;
        if (from >= to || from < 0 || to > state.doc.length) continue;

        decos.push(Decoration.mark({ class: cssClass }).range(from, to));
      }
    }
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField ───────────────────────────────────────────────────────

function computeFocusState(
  state: EditorState
): { focus: CursorFocusState | null; decos: DecorationSet } {
  const { sections } = state.field(sectionField);
  const { head } = state.selection.main;
  const cursorLine = state.doc.lineAt(head).number;

  // Find the WOD section containing the cursor
  const section = sections.find(
    (s) =>
      s.type === "wod" &&
      cursorLine >= s.startLine + 1 && // skip opening fence line
      cursorLine < s.endLine            // skip closing fence line
  );

  if (!section) {
    return { focus: null, decos: Decoration.none };
  }

  const docLine = state.doc.line(cursorLine);
  const statements = parseStatements(section, state);
  const lineInContent = cursorLine - section.startLine;
  const stmt = statements?.find((s) => s.meta?.line === lineInContent) ?? null;

  const focus: CursorFocusState = {
    section,
    statement: stmt,
    cursorLine,
    lineFrom: docLine.from,
    lineTo: docLine.to,
  };

  // Build block widget + mark decorations together (both stmt and empty-line cases)
  const decos = buildDecorations(section, statements, stmt, cursorLine, state);

  return { focus, decos };
}

// Internal state shape
interface InternalState {
  focus: CursorFocusState | null;
  decos: DecorationSet;
}

const cursorFocusInternal = StateField.define<InternalState>({
  create(state) {
    return computeFocusState(state);
  },
  update(prev, tr) {
    if (!tr.docChanged && tr.startState.selection.eq(tr.state.selection)) return prev;
    return computeFocusState(tr.state);
  },
  provide: (f) =>
    EditorView.decorations.from(f, (state) => state.decos),
});

// ── Public accessor ──────────────────────────────────────────────────

/**
 * Read the current cursor focus data from any EditorState that has loaded
 * the cursorFocusExtension. Returns null if the cursor is not in a WOD block.
 */
export function getCursorFocusState(
  state: EditorState
): CursorFocusState | null {
  try {
    return state.field(cursorFocusInternal).focus;
  } catch {
    return null;
  }
}

// ── CSS theme ────────────────────────────────────────────────────────

const metricUnderlineTheme = EditorView.baseTheme({
  // ── Metric token underlines ───────────────────────────────────────
  ".cm-metric-underline-duration":   { borderBottom: "2px solid #3b82f6" },
  ".cm-metric-underline-rep":        { borderBottom: "2px solid #22c55e" },
  ".cm-metric-underline-effort":     { borderBottom: "2px solid #ec4899" },
  ".cm-metric-underline-rounds":     { borderBottom: "2px solid #a855f7" },
  ".cm-metric-underline-distance":   { borderBottom: "2px solid #06b6d4" },
  ".cm-metric-underline-resistance": { borderBottom: "2px solid #f97316" },
  ".cm-metric-underline-action":     { borderBottom: "2px solid #eab308" },

  // ── Block widget panel ────────────────────────────────────────────
  ".cm-wod-metric-panel": {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "3px 12px 6px",
    fontSize: "11px",
    borderTop: "1px solid rgba(128,128,128,0.12)",
    background: "rgba(0,0,0,0.02)",
    userSelect: "none",
    boxSizing: "border-box",
    width: "100%",
    margin: "0",
    overflow: "hidden",
  },
  "&dark .cm-wod-metric-panel": {
    borderTopColor: "rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  },
  ".cm-wod-metric-panel__label": {
    fontWeight: "500",
    flexShrink: "0",
    opacity: "0.55",
  },
  ".cm-wod-metric-panel__chips": {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    alignItems: "center",
    minWidth: "0",
  },
  ".cm-wod-metric-panel__chip": {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 7px",
    borderRadius: "4px",
    border: "1px solid",
    fontWeight: "500",
    whiteSpace: "nowrap",
    fontSize: "10px",
  },
  ".cm-wod-metric-panel__hint": {
    marginLeft: "auto",
    fontSize: "9px",
    opacity: "0.3",
    flexShrink: "0",
  },
  ".cm-wod-metric-panel__empty": {
    fontStyle: "italic",
    opacity: "0.4",
    fontSize: "10px",
  },
});

// ── Exported extension ───────────────────────────────────────────────

export const cursorFocusExtension: Extension = [
  cursorFocusInternal,
  metricUnderlineTheme,
];
