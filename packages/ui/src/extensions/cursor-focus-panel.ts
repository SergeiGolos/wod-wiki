import { Decoration,
  EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateField,
  EditorState,
  RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { sectionField, type EditorSection } from "./section-state";
import type { ICodeStatement, IMetric } from '@bitcobblers/wod-wiki-core';
import { createParser } from '@bitcobblers/wod-wiki-lang';

export interface CursorFocusState {
  sectionId: string;
  section: EditorSection;
  lineFrom: number;
  docLine: number;
  statementIndex: number;
  statement: ICodeStatement;
  focusedMetric: IMetric | null;
  focusedMetricIndex: number;
  allStatements: ICodeStatement[];
}

const METRIC_MARK_CLASS: Record<string, string> = {
  duration: "cm-metric-duration",
  rep: "cm-metric-rep",
  rounds: "cm-metric-rounds",
  distance: "cm-metric-distance",
  resistance: "cm-metric-resistance",
  action: "cm-metric-action",
  pace: "cm-metric-pace",
  heart_rate: "cm-metric-heart_rate",
  power: "cm-metric-power",
  calories: "cm-metric-calories",
};

function parseStatements(
  section: EditorSection,
  state: EditorState,
): ICodeStatement[] | null {
  if (section.type !== "time" && section.type !== "log") return null;
  if (section.contentFrom === undefined || section.contentTo === undefined) return null;
  const content = state.doc.sliceString(section.contentFrom, section.contentTo);
  try {
    // Headless string parse — a bare EditorState carries no Lezer tree, so
    // extractStatements() on one always yields zero statements.
    return createParser().read(content, section.sport).statements as ICodeStatement[];
  } catch {
    return null;
  }
}

function buildDecorations(
  state: EditorState,
): { focus: CursorFocusState | null; decos: DecorationSet } {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);
  const cursor = state.selection.main.head;
  const cursorLine = state.doc.lineAt(cursor);

  let focus: CursorFocusState | null = null;

  for (const section of sections) {
    if (section.type !== "time" && section.type !== "log") continue;

    const statements = parseStatements(section, state);
    if (!statements) continue;

    const isCursorInSection = cursor >= section.from && cursor <= section.to;

    for (let idx = 0; idx < statements.length; idx++) {
      const stmt = statements[idx];
      const lineNum = section.startLine + 1 + idx;
      if (lineNum >= section.endLine) break;

      const line = state.doc.line(lineNum);
      const isCursorOnLine = isCursorInSection && cursorLine.number === lineNum;

      for (let mIdx = 0; mIdx < stmt.metrics.length; mIdx++) {
        const m = stmt.metrics[mIdx];
        const cls = METRIC_MARK_CLASS[m.type] || "cm-metric-generic";
        builder.add(
          line.from,
          line.to,
          Decoration.mark({
            class: `cm-metric-mark ${cls}`,
          }),
        );

        if (isCursorOnLine && !focus) {
          focus = {
            sectionId: section.id,
            section,
            lineFrom: line.from,
            docLine: lineNum,
            statementIndex: idx,
            statement: stmt,
            focusedMetric: m,
            focusedMetricIndex: mIdx,
            allStatements: statements,
          };
        }
      }
    }
  }

  return { focus, decos: builder.finish() };
}

interface InternalState {
  focus: CursorFocusState | null;
  decos: DecorationSet;
}

const cursorFocusInternal = StateField.define<InternalState>({
  create(state) {
    return buildDecorations(state);
  },
  update(_value, tr) {
    return buildDecorations(tr.state);
  },
  provide: (f) => EditorView.decorations.from(f, (val) => val.decos),
});

export function getCursorFocusState(state: EditorState): CursorFocusState | null {
  return state.field(cursorFocusInternal, false)?.focus ?? null;
}

export const cursorFocusExtension: Extension = [
  cursorFocusInternal,
];
