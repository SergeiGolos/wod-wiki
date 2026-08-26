import { Decoration,
  EditorView,
  WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateField, EditorState, RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { sectionField, type EditorSection } from "./section-state";

function isTableSeparator(line: string): boolean {
  return /^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)*\|$/.test(line.trim());
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.startsWith("|") && trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed;
  return inner.split("|").map((c) => c.trim());
}

class MarkdownTableWidget extends WidgetType {
  constructor(readonly head: string[], readonly rows: string[][]) {
    super();
  }

  eq(other: MarkdownTableWidget): boolean {
    if (this.head.length !== other.head.length || this.rows.length !== other.rows.length) return false;
    return this.head.every((h, i) => h === other.head[i]);
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-table-preview my-2 overflow-auto border border-border/80 rounded-lg";
    const table = document.createElement("table");
    table.className = "w-full text-xs font-mono border-collapse";

    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    htr.className = "border-b border-border bg-muted/40 text-muted-foreground text-left";
    for (const h of this.head) {
      const th = document.createElement("th");
      th.className = "py-1.5 px-3 font-semibold";
      th.textContent = h;
      htr.appendChild(th);
    }
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const row of this.rows) {
      const tr = document.createElement("tr");
      tr.className = "border-b border-border/40 hover:bg-muted/20";
      for (const cell of row) {
        const td = document.createElement("td");
        td.className = "py-1.5 px-3 text-foreground";
        td.textContent = cell;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }
}

function parseSectionTable(state: EditorState, section: EditorSection): { head: string[]; rows: string[][] } | null {
  const lines: string[] = [];
  for (let l = section.startLine; l <= section.endLine; l++) {
    lines.push(state.doc.line(l).text);
  }
  const tableLines = lines.filter((l) => l.trim().startsWith("|"));
  if (tableLines.length < 2) return null;
  if (!isTableSeparator(tableLines[1])) return null;

  const head = parseTableCells(tableLines[0]);
  const rows = tableLines.slice(2).map(parseTableCells);
  return { head, rows };
}

function buildTableDecos(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);
  const cursor = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "markdown" || section.subtype !== "table") continue;
    if (cursor >= section.from && cursor <= section.to) continue;

    const parsed = parseSectionTable(state, section);
    if (!parsed) continue;

    builder.add(
      section.from,
      section.to,
      Decoration.replace({
        widget: new MarkdownTableWidget(parsed.head, parsed.rows),
        block: true,
      }),
    );
  }

  return builder.finish();
}

const tablePreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecos(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildTableDecos(tr.state);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const markdownTablePreview: Extension = [
  tablePreviewField,
];
