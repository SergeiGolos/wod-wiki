/**
 * cursorFocusExtension — Token-level metric highlighting and cursor focus state
 * for WhiteboardScript timer and log blocks in CodeMirror 6.
 *
 * This extension restores the metric-assigned token highlighting:
 *  1. Mark decorations — individual tokens are underlined and colored based on
 *     the semantic IMetric the parser assigns to that character range (e.g.
 *     duration in blue, reps in orange, effort/movement in green, distance in
 *     teal, resistance in red, action in yellow).
 *     Tokens on the active cursor line receive full opacity; non-active lines
 *     receive dim (20% opacity border) underlines.
 *  2. Focus widget — anchored to the closing fence of the focused workout block,
 *     providing live inspection pills of the metrics on the active line.
 *  3. Metric navigation keymap — Ctrl+ArrowRight / Ctrl+ArrowLeft jumps between
 *     metric tokens within workout blocks.
 *  4. Exported state — the focused ICodeStatement + EditorSection, exposed via
 *     getCursorFocusState(view.state).
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
import { sectionField, type EditorSection } from "@bitcobblers/wod-wiki-ui/extensions";
import {
  createParser,
  MetricType,
  type ICodeStatement,
  type IMetric,
} from "@bitcobblers/wod-wiki-engine";

// ── Types ────────────────────────────────────────────────────────────

/** Data exposed to external consumers via getCursorFocusState(). */
export interface CursorFocusState {
  sectionId?: string;
  section: EditorSection;
  statement: ICodeStatement | null;
  statementIndex?: number;
  cursorLine: number;
  docLine?: number;
  lineFrom: number;
  lineTo: number;
  focusedMetric: IMetric | null;
  focusedMetricIndex?: number;
  allStatements?: ICodeStatement[];
}

// ── Numeric vs text metric classification ────────────────────────────

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

  const labelsEl = document.createElement("div");
  labelsEl.className = "cm-wod-metric-panel__labels";

  for (let i = 0; i < metrics.length; i++) {
    const metric = metrics[i];
    const effectiveType = metric.type === MetricType.Choice
      ? ((metric as any).alternatives as IMetric[] | undefined)?.[0]?.type
      : metric.type;
    const style = METRIC_STYLES[effectiveType as string];
    const isFocused = metric.type === focusedMetricType;
    const span = document.createElement("span");
    span.className = "cm-wod-metric-panel__label-item" +
      (isFocused ? " cm-wod-metric-panel__label-item--focused" : "");
    span.textContent = style?.label ?? String(effectiveType ?? metric.type);
    if (style?.color) {
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

  const focusedMetric = metrics.find((m) => m.type === focusedMetricType);
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
    return createParser().read(raw, section.sport).statements as ICodeStatement[];
  } catch {
    return null;
  }
}

// ── Combined decoration builder ─────────────────────────────────────

function buildDecorations(
  allSections: EditorSection[],
  cursorSection: EditorSection | null,
  cursorDocLine: number,
  state: EditorState,
  focus: CursorFocusState | null,
): DecorationSet {
  const decos: Range<Decoration>[] = [];

  for (const section of allSections) {
    if (section.contentFrom === undefined || section.contentTo === undefined) continue;
    const statements = parseStatements(section, state);
    if (!statements) continue;

    for (const s of statements) {
      const stmtDocLine = section.startLine + (s.meta?.line ?? 0);
      const isActiveLine =
        cursorSection === section && stmtDocLine === cursorDocLine;

      for (const metric of s.metrics) {
        const effectiveType = metric.type === MetricType.Choice
          ? ((metric as any).alternatives as IMetric[] | undefined)?.[0]?.type
          : metric.type;
        const baseClass = METRIC_MARK_CLASS[effectiveType as string];
        if (!baseClass) continue;

        const meta = s.metricMeta?.get(metric);
        if (!meta) continue;

        const from = section.contentFrom + meta.startOffset;
        const to = section.contentFrom + meta.endOffset;
        if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
        if (from >= to || from < 0 || to > state.doc.length) continue;

        const cssClass = isActiveLine ? baseClass : `${baseClass}-dim`;
        decos.push(Decoration.mark({ class: cssClass }).range(from, to));
      }
    }
  }

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
        side: -1,
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

  const workoutSections = sections.filter((s) => s.type === "time" || s.type === "log");

  const cursorSection = workoutSections.find(
    (s) =>
      cursorLine >= s.startLine + 1 &&
      cursorLine < s.endLine
  ) ?? null;

  let focus: CursorFocusState | null = null;
  let stmt: ICodeStatement | null = null;
  let statementIndex = -1;
  let statements: ICodeStatement[] | null = null;

  if (cursorSection) {
    const docLine = state.doc.line(cursorLine);
    statements = parseStatements(cursorSection, state);
    const lineInContent = cursorLine - cursorSection.startLine;
    statementIndex = statements?.findIndex((s) => s.meta?.line === lineInContent) ?? -1;
    stmt = statementIndex >= 0 && statements ? statements[statementIndex] : null;

    focus = {
      sectionId: cursorSection.id,
      section: cursorSection,
      statement: stmt,
      statementIndex,
      cursorLine,
      docLine: cursorLine,
      lineFrom: docLine.from,
      lineTo: docLine.to,
      focusedMetric: null,
      focusedMetricIndex: -1,
      allStatements: statements ?? [],
    };
  }

  let focusedMetric: IMetric | null = null;
  let focusedMetricIndex = -1;
  if (cursorSection && stmt && cursorSection.contentFrom !== undefined) {
    for (let idx = 0; idx < stmt.metrics.length; idx++) {
      const m = stmt.metrics[idx];
      if (m.type === MetricType.Sound || m.type === MetricType.System) continue;
      const meta = stmt.metricMeta?.get(m);
      if (!meta) continue;
      const from = cursorSection.contentFrom + meta.startOffset;
      const to = cursorSection.contentFrom + meta.endOffset;
      if (head >= from && head <= to) {
        focusedMetric = m;
        focusedMetricIndex = idx;
        break;
      }
    }
  }

  if (focus) {
    focus.focusedMetric = focusedMetric;
    focus.focusedMetricIndex = focusedMetricIndex;
  }

  const decos = buildDecorations(workoutSections, cursorSection, cursorLine, state, focus);

  return { focus, decos };
}

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

function jumpMetric(view: EditorView, direction: 1 | -1): boolean {
  const focus = getCursorFocusState(view.state);
  if (!focus) return false;
  if (!focus.statement) return true;

  const { section } = focus;
  const contentFrom = section.contentFrom ?? 0;
  const { head } = view.state.selection.main;

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

  if (allRanges.length === 0) return true;

  let target: { from: number; to: number } | undefined;
  if (direction === 1) {
    target = allRanges.find((r) => r.from > head);
  } else {
    target = [...allRanges].reverse().find((r) => r.from < head);
  }

  if (!target) return true;
  view.dispatch({ selection: { anchor: target.from } });
  return true;
}

const metricNavKeymap = Prec.high(keymap.of([
  { key: "Ctrl-ArrowRight", run: (v) => jumpMetric(v, 1) },
  { key: "Ctrl-ArrowLeft",  run: (v) => jumpMetric(v, -1) },
]));

// ── CSS theme ────────────────────────────────────────────────────────

const metricUnderlineTheme = EditorView.baseTheme({
  ".cm-metric-underline-duration":   { borderBottom: "2px solid hsl(var(--metric-time))",       color: "hsl(var(--metric-time))" },
  ".cm-metric-underline-rep":        { borderBottom: "2px solid hsl(var(--metric-rep))",        color: "hsl(var(--metric-rep))" },
  ".cm-metric-underline-effort":     { borderBottom: "2px solid hsl(var(--metric-effort))",     color: "hsl(var(--metric-effort))" },
  ".cm-metric-underline-rounds":     { borderBottom: "2px solid hsl(var(--metric-rounds))",     color: "hsl(var(--metric-rounds))" },
  ".cm-metric-underline-distance":   { borderBottom: "2px solid hsl(var(--metric-distance))",   color: "hsl(var(--metric-distance))" },
  ".cm-metric-underline-resistance": { borderBottom: "2px solid hsl(var(--metric-resistance))", color: "hsl(var(--metric-resistance))" },
  ".cm-metric-underline-action":     { borderBottom: "2px solid hsl(var(--metric-action))",     color: "hsl(var(--metric-action))" },

  ".cm-metric-underline-duration-dim":   { borderBottom: "2px solid hsl(var(--metric-time) / 0.2)",       color: "hsl(var(--metric-time))" },
  ".cm-metric-underline-rep-dim":        { borderBottom: "2px solid hsl(var(--metric-rep) / 0.2)",        color: "hsl(var(--metric-rep))" },
  ".cm-metric-underline-effort-dim":     { borderBottom: "2px solid hsl(var(--metric-effort) / 0.2)",     color: "hsl(var(--metric-effort))" },
  ".cm-metric-underline-rounds-dim":     { borderBottom: "2px solid hsl(var(--metric-rounds) / 0.2)",     color: "hsl(var(--metric-rounds))" },
  ".cm-metric-underline-distance-dim":   { borderBottom: "2px solid hsl(var(--metric-distance) / 0.2)",   color: "hsl(var(--metric-distance))" },
  ".cm-metric-underline-resistance-dim": { borderBottom: "2px solid hsl(var(--metric-resistance) / 0.2)", color: "hsl(var(--metric-resistance))" },
  ".cm-metric-underline-action-dim":     { borderBottom: "2px solid hsl(var(--metric-action) / 0.2)",     color: "hsl(var(--metric-action))" },

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
