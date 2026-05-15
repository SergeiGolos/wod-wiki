/**
 * Cursor Focus Panel Extension
 *
 * CM6 StateField that tracks the cursor's active WOD line and provides:
 *  1. Focus widget — anchored to the closing fence of the focused WOD block,
 *     so cursor feedback lives with the block instead of in a viewport panel.
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
  keymap,
} from "@codemirror/view";
import {
  EditorState,
  Extension,
  Prec,
  Range,
  StateField,
} from "@codemirror/state";
import { sectionField, type EditorSection } from "./section-state";
import { sharedParser } from "@/hooks/useRuntimeParser";
import { MetricType } from "../../../core/models/Metric";
import type { ICodeStatement } from "../../../core/models/CodeStatement";
import type { IMetric } from "../../../core/models/Metric";

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
  /** The metric token the cursor is physically on, or null. */
  focusedMetric: IMetric | null;
}

// ── Numeric vs text metric classification ────────────────────────────

/** Metrics adjusted with Ctrl+↑↓ (numeric values). */
const NUMERIC_METRICS = new Set<string>([
  MetricType.Duration,
  MetricType.Rep,
  MetricType.Rounds,
  MetricType.Distance,
  MetricType.Resistance,
]);

// ── Metric display config ─────────────────────────────────────────────

interface MetricStyle {
  label: string;
  color: string;
}

const METRIC_STYLES: Partial<Record<string, MetricStyle>> = {
  [MetricType.Duration]:   { label: "Timer",    color: "hsl(var(--metric-time))" },
  [MetricType.Rep]:        { label: "Reps",     color: "hsl(var(--metric-rep))" },
  [MetricType.Effort]:     { label: "Exercise", color: "hsl(var(--metric-effort))" },
  [MetricType.Rounds]:     { label: "Rounds",   color: "hsl(var(--metric-rounds))" },
  [MetricType.Distance]:   { label: "Distance", color: "hsl(var(--metric-distance))" },
  [MetricType.Resistance]: { label: "Weight",   color: "hsl(var(--metric-resistance))" },
  [MetricType.Action]:     { label: "Action",   color: "hsl(var(--metric-action))" },
};

const DIM_OPACITY_HEX = "33";

// ── Panel rendering ───────────────────────────────────────────────────

export function renderPanelContent(
  statement: ICodeStatement | null,
  focusedMetricType: string | null,
): HTMLElement {
  const container = document.createElement("div");
  container.className = "cm-wod-metric-panel";

  const metrics = (statement?.metrics ?? []).filter(
    (m) => m.type !== MetricType.Sound && m.type !== MetricType.System
  );

  if (metrics.length === 0) {
    const empty = document.createElement("span");
    empty.className = "cm-wod-metric-panel__empty";
    empty.textContent = "—";
    container.appendChild(empty);
    return container;
  }

  // Labels row — no icons, no boxes, color-tinted text
  const labelsEl = document.createElement("div");
  labelsEl.className = "cm-wod-metric-panel__labels";

  for (let i = 0; i < metrics.length; i++) {
    const metric = metrics[i];
    const style = METRIC_STYLES[metric.type as string];
    const isFocused = metric.type === focusedMetricType;

    const span = document.createElement("span");
    span.className = "cm-wod-metric-panel__label-item" +
      (isFocused ? " cm-wod-metric-panel__label-item--focused" : "");
    span.textContent = style?.label ?? String(metric.type);
    if (style?.color) {
      // Full color when focused; 20% opacity hex suffix when dim
      span.style.color = isFocused ? style.color : `${style.color}${DIM_OPACITY_HEX}`;
    }
    labelsEl.appendChild(span);

    if (i < metrics.length - 1) {
      const sep = document.createElement("span");
      sep.className = "cm-wod-metric-panel__sep";
      sep.textContent = " · ";
      labelsEl.appendChild(sep);
    }
  }
  container.appendChild(labelsEl);

  // Shortcut hint — varies by focused metric type
  const focusedMetric = metrics.find(m => m.type === focusedMetricType);
  const hint = document.createElement("span");
  hint.className = "cm-wod-metric-panel__hint";
  if (focusedMetric) {
    const isNumeric = NUMERIC_METRICS.has(focusedMetric.type as string);
    hint.textContent = isNumeric ? "Ctrl+↑↓ · adjust" : "Ctrl+. · edit";
  } else {
    hint.textContent = "Ctrl+←→ · jump metric";
  }
  container.appendChild(hint);

  return container;
}

// ── Focus widget ──────────────────────────────────────────────────────

class CursorFocusPanelWidget extends WidgetType {
  constructor(
    readonly sectionId: string,
    readonly cursorLine: number,
    readonly statement: ICodeStatement,
    readonly focusedMetricType: string | null,
  ) {
    super();
  }

  eq(other: CursorFocusPanelWidget): boolean {
    return (
      other.sectionId === this.sectionId &&
      other.cursorLine === this.cursorLine &&
      other.statement === this.statement &&
      other.focusedMetricType === this.focusedMetricType
    );
  }

  toDOM(): HTMLElement {
    const host = document.createElement("div");
    host.className = "cm-wod-metric-panel-anchor";
    host.appendChild(renderPanelContent(this.statement, this.focusedMetricType));
    return host;
  }

  ignoreEvent(): boolean {
    return false;
  }
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
 * Build mark decorations (underlines on metric tokens).  Decorations must be
 * sorted by `from` and passed to a single Decoration.set() call.
 *
 * Underlines are always rendered at 20% opacity across ALL WOD sections.
 * The line the cursor is on gets full-opacity underlines.
 */
function buildDecorations(
  allSections: EditorSection[],
  cursorSection: EditorSection | null,
  cursorDocLine: number,
  state: EditorState,
  focus: CursorFocusState | null,
): DecorationSet {
  const decos: Range<Decoration>[] = [];

  // Mark decorations — iterate ALL WOD sections so underlines are always
  // visible. Metrics on the cursor line get full opacity; all others get
  // the dim (20% opacity) variant of the same CSS class.
  for (const section of allSections) {
    if (section.contentFrom === undefined || section.contentTo === undefined) continue;
    const statements = parseStatements(section, state);
    if (!statements) continue;

    for (const s of statements) {
      // Convert the statement's content-relative line to an absolute doc line.
      const stmtDocLine = section.startLine + (s.meta?.line ?? 0);
      const isActiveLine =
        cursorSection === section && stmtDocLine === cursorDocLine;

      for (const metric of s.metrics) {
        const baseClass = METRIC_MARK_CLASS[metric.type as string];
        if (!baseClass) continue;

        const meta = s.metricMeta?.get(metric);
        if (!meta) continue;

        // startOffset / endOffset are 0-based into the WOD content string;
        // adding contentFrom converts them to absolute document offsets.
        const from = section.contentFrom + meta.startOffset;
        const to = section.contentFrom + meta.endOffset;
        if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
        if (from >= to || from < 0 || to > state.doc.length) continue;

        const cssClass = isActiveLine ? baseClass : `${baseClass}-dim`;
        decos.push(Decoration.mark({ class: cssClass }).range(from, to));
      }
    }
  }

  // Focus panel widget — anchored to the focused WOD block's closing fence.
  // The widget is a block decoration at the end of the bottom ``` line, so it
  // scrolls with the document and only appears for the block containing cursor.
  if (focus?.statement && focus.section.endLine <= state.doc.lines) {
    const closeLine = state.doc.line(focus.section.endLine);
    const focusedMetricType = (focus.focusedMetric?.type as string | undefined) ?? null;
    decos.push(
      Decoration.widget({
        widget: new CursorFocusPanelWidget(
          focus.section.id,
          focus.cursorLine,
          focus.statement,
          focusedMetricType,
        ),
        block: true,
        side: -1,  // before the closing ``` line
      }).range(closeLine.from),
    );
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

  // All WOD sections — used to render always-visible dim underlines
  const wodSections = sections.filter((s) => s.type === "wod");

  // Find the WOD section containing the cursor
  const cursorSection = wodSections.find(
    (s) =>
      cursorLine >= s.startLine + 1 && // skip opening fence line
      cursorLine < s.endLine            // skip closing fence line
  ) ?? null;

  let focus: CursorFocusState | null = null;
  let stmt: ICodeStatement | null = null;

  if (cursorSection) {
    const docLine = state.doc.line(cursorLine);
    const statements = parseStatements(cursorSection, state);
    const lineInContent = cursorLine - cursorSection.startLine;
    stmt = statements?.find((s) => s.meta?.line === lineInContent) ?? null;

    focus = {
      section: cursorSection,
      statement: stmt,
      cursorLine,
      lineFrom: docLine.from,
      lineTo: docLine.to,
      focusedMetric: null, // filled in below
    };
  }

  // Determine which metric the cursor is physically on (by char offset)
  let focusedMetric: IMetric | null = null;
  if (cursorSection && stmt && cursorSection.contentFrom !== undefined) {
    for (const m of stmt.metrics) {
      if (m.type === MetricType.Sound || m.type === MetricType.System) continue;
      const meta = stmt.metricMeta?.get(m);
      if (!meta) continue;
      const from = cursorSection.contentFrom + meta.startOffset;
      const to   = cursorSection.contentFrom + meta.endOffset;
      if (head >= from && head <= to) {
        focusedMetric = m;
        break;
      }
    }
  }

  if (focus) focus.focusedMetric = focusedMetric;

  // Build mark decorations for all sections plus the focused block widget.
  const decos = buildDecorations(wodSections, cursorSection, cursorLine, state, focus);

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

// ── Metric navigation keymap ─────────────────────────────────────────

/**
 * Jump the cursor to the next (direction=1) or previous (direction=-1) metric
 * token on the current WOD line.  Returns false when not in a WOD block or
 * no further metric exists in that direction (so CM6 falls through to the
 * default word-jump behaviour).
 */
function jumpMetric(view: EditorView, direction: 1 | -1): boolean {
  const focus = getCursorFocusState(view.state);
  // Not inside a WOD block — let default word-jump behaviour apply.
  if (!focus) return false;

  // We ARE inside a WOD block: always consume the event so the default
  // word-jump (Ctrl+ArrowRight/Left) never fires within WOD content.
  if (!focus.statement) return true;

  const { section } = focus;
  const contentFrom = section.contentFrom ?? 0;
  const { head } = view.state.selection.main;

  // Build a flat list of all metric ranges across ALL statements in the
  // section, sorted by position, so we can jump across statement boundaries.
  const allStatements = parseStatements(section, view.state) ?? [];
  const allRanges: { from: number; to: number }[] = [];
  for (const s of allStatements) {
    for (const m of s.metrics) {
      if (m.type === MetricType.Sound || m.type === MetricType.System) continue;
      const meta = s.metricMeta?.get(m);
      if (!meta) continue;
      allRanges.push({
        from: contentFrom + meta.startOffset,
        to:   contentFrom + meta.endOffset,
      });
    }
  }
  allRanges.sort((a, b) => a.from - b.from);

  // No metrics in the entire section — still consume so word-jump doesn't fire.
  if (allRanges.length === 0) return true;

  let target: { from: number; to: number } | undefined;
  if (direction === 1) {
    // Next metric: first range whose start is strictly after cursor
    target = allRanges.find((r) => r.from > head);
  } else {
    // Prev metric: last range whose start is strictly before cursor
    target = [...allRanges].reverse().find((r) => r.from < head);
  }

  // No further metric in that direction — stay put (still consume).
  if (!target) return true;
  view.dispatch({ selection: { anchor: target.from } });
  return true;
}

// Prec.high ensures this beats defaultKeymap's Ctrl+ArrowRight/Left word-jump
// whenever the cursor is inside a WOD block.
const metricNavKeymap = Prec.high(keymap.of([
  { key: "Ctrl-ArrowRight", run: (v) => jumpMetric(v, 1) },
  { key: "Ctrl-ArrowLeft",  run: (v) => jumpMetric(v, -1) },
]));

// ── CSS theme ────────────────────────────────────────────────────────

const metricUnderlineTheme = EditorView.baseTheme({
  // ── Metric token underlines — use CSS variables so Mineral/Arctic Frost
  //    switch automatically via the .dark class without needing &dark overrides.
  ".cm-metric-underline-duration":   { borderBottom: "2px solid hsl(var(--metric-time))",       color: "hsl(var(--metric-time))" },
  ".cm-metric-underline-rep":        { borderBottom: "2px solid hsl(var(--metric-rep))",        color: "hsl(var(--metric-rep))" },
  ".cm-metric-underline-effort":     { borderBottom: "2px solid hsl(var(--metric-effort))",     color: "hsl(var(--metric-effort))" },
  ".cm-metric-underline-rounds":     { borderBottom: "2px solid hsl(var(--metric-rounds))",     color: "hsl(var(--metric-rounds))" },
  ".cm-metric-underline-distance":   { borderBottom: "2px solid hsl(var(--metric-distance))",   color: "hsl(var(--metric-distance))" },
  ".cm-metric-underline-resistance": { borderBottom: "2px solid hsl(var(--metric-resistance))", color: "hsl(var(--metric-resistance))" },
  ".cm-metric-underline-action":     { borderBottom: "2px solid hsl(var(--metric-action))",     color: "hsl(var(--metric-action))" },

  // ── Dim underlines — 20% opacity border, full-opacity text ───────────
  ".cm-metric-underline-duration-dim":   { borderBottom: "2px solid hsl(var(--metric-time) / 0.2)",       color: "hsl(var(--metric-time))" },
  ".cm-metric-underline-rep-dim":        { borderBottom: "2px solid hsl(var(--metric-rep) / 0.2)",        color: "hsl(var(--metric-rep))" },
  ".cm-metric-underline-effort-dim":     { borderBottom: "2px solid hsl(var(--metric-effort) / 0.2)",     color: "hsl(var(--metric-effort))" },
  ".cm-metric-underline-rounds-dim":     { borderBottom: "2px solid hsl(var(--metric-rounds) / 0.2)",     color: "hsl(var(--metric-rounds))" },
  ".cm-metric-underline-distance-dim":   { borderBottom: "2px solid hsl(var(--metric-distance) / 0.2)",   color: "hsl(var(--metric-distance))" },
  ".cm-metric-underline-resistance-dim": { borderBottom: "2px solid hsl(var(--metric-resistance) / 0.2)", color: "hsl(var(--metric-resistance))" },
  ".cm-metric-underline-action-dim":     { borderBottom: "2px solid hsl(var(--metric-action) / 0.2)",     color: "hsl(var(--metric-action))" },

  // ── Closing-fence focus widget ────────────────────────────────────
  ".cm-wod-metric-panel-anchor": {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
  },
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
  ".cm-wod-metric-panel__labels": {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    minWidth: "0",
  },
  ".cm-wod-metric-panel__label-item": {
    fontSize: "10px",
    fontWeight: "500",
    whiteSpace: "nowrap",
    transition: "color 0.1s",
  },
  ".cm-wod-metric-panel__label-item--focused": {
    fontWeight: "600",
  },
  ".cm-wod-metric-panel__sep": {
    fontSize: "10px",
    color: "rgba(128,128,128,0.3)",
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
  metricNavKeymap,
];
