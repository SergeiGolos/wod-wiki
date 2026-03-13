/**
 * Markdown Table Preview Decorations
 *
 * Replaces consecutive markdown table lines (| cell | cell |) with a
 * rendered HTML table widget when the cursor is NOT inside them.
 * When the cursor enters a table, the widget collapses and the raw
 * markdown is shown for editing — the same pattern as frontmatter-preview.
 *
 * The shared "Lines X–Y · ✎ Edit" bar lets users click to re-enter
 * the raw source without using the keyboard.
 *
 * Table format supported:
 *   | Header A | Header B |
 *   |----------|:--------:|
 *   | value    | value    |
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { EditorState, Range, StateField, Extension, Prec } from "@codemirror/state";
import { sectionField } from "./section-state";

// ── Table parsing helpers (mirrors MarkdownDisplay.tsx logic) ────────

function isTableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 1;
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)*\|$/.test(line.trim());
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseTableAlignment(
  line: string
): ("left" | "center" | "right")[] {
  return parseTableCells(line).map((cell) => {
    const t = cell.replace(/\s/g, "");
    if (t.startsWith(":") && t.endsWith(":")) return "center";
    if (t.endsWith(":")) return "right";
    return "left";
  });
}

// ── Shared edit-bar helper ───────────────────────────────────────────
// (same pattern used by frontmatter-preview.ts)

function buildPreviewEditBar(
  view: EditorView,
  sectionFrom: number,
  lineStart: number,
  lineEnd: number
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "cm-preview-edit-bar";

  const info = document.createElement("span");
  info.className = "cm-preview-line-info";
  info.textContent = `Lines ${lineStart}–${lineEnd}`;
  bar.appendChild(info);

  const btn = document.createElement("button");
  btn.className = "cm-preview-edit-btn";
  btn.textContent = "✎ Edit";
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const target = Math.min(sectionFrom, view.state.doc.length);
    view.dispatch({ selection: { anchor: target, head: target } });
    view.focus();
  });
  bar.appendChild(btn);

  return bar;
}

// ── Table widget ─────────────────────────────────────────────────────

class MarkdownTableWidget extends WidgetType {
  constructor(
    readonly tableLines: string[],
    readonly tableFrom: number,
    readonly lineStart: number,
    readonly lineEnd: number
  ) {
    super();
  }

  eq(other: MarkdownTableWidget): boolean {
    return (
      this.tableFrom === other.tableFrom &&
      this.tableLines.length === other.tableLines.length &&
      this.tableLines[0] === other.tableLines[0]
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-md-table-preview";

    wrapper.appendChild(
      buildPreviewEditBar(view, this.tableFrom, this.lineStart, this.lineEnd)
    );

    wrapper.appendChild(this._buildTable());
    return wrapper;
  }

  private _buildTable(): HTMLElement {
    const lines = this.tableLines;
    const hasSep = lines.length >= 2 && isTableSeparator(lines[1]);
    const alignments = hasSep ? parseTableAlignment(lines[1]) : [];

    const table = document.createElement("table");
    table.className = "cm-md-table";

    // Include header row, skip separator, include data rows
    const rows = hasSep
      ? [lines[0], ...lines.slice(2)]
      : lines;

    rows.forEach((line, ri) => {
      const isHeader = ri === 0 && hasSep;
      const cells = parseTableCells(line);
      const tr = document.createElement("tr");
      tr.className = isHeader ? "cm-md-table-header" : "cm-md-table-row";

      cells.forEach((cell, ci) => {
        const td = document.createElement(isHeader ? "th" : "td");
        const align = alignments[ci] ?? "left";
        td.className = `cm-md-table-cell cm-md-align-${align}`;
        td.textContent = cell || "\u00A0";
        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    return table;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// ── Build decorations from sections ─────────────────────────────────

function buildTableDecos(state: EditorState): DecorationSet {
  const { sections } = state.field(sectionField);
  const decos: Range<Decoration>[] = [];
  const cursorHead = state.selection.main.head;

  for (const section of sections) {
    // Only scan markdown sections (not wod, not frontmatter)
    if (section.type !== "markdown") continue;

    const doc = state.doc;
    let ln = section.startLine;

    while (ln <= section.endLine) {
      const lineObj = doc.line(ln);

      if (!isTableLine(lineObj.text)) {
        ln++;
        continue;
      }

      // Gather consecutive table lines
      const groupStart = ln;
      const groupLines: string[] = [];

      while (ln <= section.endLine && isTableLine(doc.line(ln).text)) {
        groupLines.push(doc.line(ln).text);
        ln++;
      }

      const groupEnd = ln - 1;

      // Need at least a header + separator to be a valid table
      if (groupLines.length < 2 || !isTableSeparator(groupLines[1])) continue;

      const fromPos = doc.line(groupStart).from;
      const toPos = doc.line(groupEnd).to;

      // Don't replace when cursor is inside the table range
      if (cursorHead >= fromPos && cursorHead <= toPos) continue;

      decos.push(
        Decoration.replace({
          widget: new MarkdownTableWidget(
            groupLines,
            fromPos,
            groupStart,
            groupEnd
          ),
          block: true,
        }).range(fromPos, toPos)
      );
    }
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField ───────────────────────────────────────────────────────

const tablePreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecos(state);
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return buildTableDecos(tr.state);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Base theme ───────────────────────────────────────────────────────

const tablePreviewTheme = EditorView.baseTheme({
  // Shared edit bar (defined here for table; same classes used by
  // frontmatter-preview.ts so no duplication in the DOM/CSSOM)
  ".cm-preview-edit-bar": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px 6px",
    marginBottom: "4px",
    fontSize: "10px",
    color: "var(--cm-muted-foreground, #888)",
    borderBottom: "1px solid rgba(128,128,128,0.15)",
  },
  ".cm-preview-line-info": {
    fontFamily: "var(--font-mono, monospace)",
    opacity: "0.6",
  },
  ".cm-preview-edit-btn": {
    fontSize: "10px",
    padding: "1px 7px",
    borderRadius: "4px",
    border: "1px solid rgba(128,128,128,0.3)",
    background: "transparent",
    cursor: "pointer",
    color: "inherit",
    opacity: "0.7",
    transition: "opacity 0.15s, border-color 0.15s",
  },
  ".cm-preview-edit-btn:hover": {
    opacity: "1",
    borderColor: "rgba(128,128,128,0.6)",
  },

  // Table container
  ".cm-md-table-preview": {
    padding: "4px 0 8px",
    display: "block",
    overflowX: "auto",
  },

  // The <table> element
  ".cm-md-table": {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    lineHeight: "1.5",
    fontFamily: "inherit",
  },

  // Header row
  ".cm-md-table-header th": {
    fontWeight: "600",
    padding: "5px 14px 5px 6px",
    borderBottom: "2px solid rgba(128,128,128,0.3)",
    color: "inherit",
    whiteSpace: "nowrap",
  },

  // Data rows
  ".cm-md-table-row td": {
    padding: "4px 14px 4px 6px",
    borderBottom: "1px solid rgba(128,128,128,0.12)",
    color: "inherit",
    verticalAlign: "top",
  },

  // Column separators between cells
  ".cm-md-table-header th + th, .cm-md-table-row td + td": {
    borderLeft: "1px solid rgba(128,128,128,0.12)",
  },

  // Alignment helpers
  ".cm-md-align-left": { textAlign: "left" },
  ".cm-md-align-center": { textAlign: "center" },
  ".cm-md-align-right": { textAlign: "right" },

  // Dark-mode adjustments
  "&dark .cm-md-table-header th": {
    borderBottomColor: "rgba(200,200,200,0.25)",
  },
  "&dark .cm-md-table-row td": {
    borderBottomColor: "rgba(200,200,200,0.1)",
  },
  "&dark .cm-md-table-header th + th, &dark .cm-md-table-row td + td": {
    borderLeftColor: "rgba(200,200,200,0.1)",
  },
});

// ── Keymap: navigate INTO table widgets with arrow keys ─────────────
//
// Decoration.replace with block:true makes CM6 skip the replaced range
// entirely on ArrowDown/ArrowUp. These handlers intercept those keys and
// move the cursor INSIDE the range instead, causing the StateField to
// rebuild without the decoration so the raw markdown becomes editable.

function enterTableDown(view: EditorView): boolean {
  const { head } = view.state.selection.main;
  const curLineNum = view.state.doc.lineAt(head).number;
  const nextLineNum = curLineNum + 1;
  if (nextLineNum > view.state.doc.lines) return false;

  const nextLine = view.state.doc.line(nextLineNum);
  const decos = view.state.field(tablePreviewField);
  let targetFrom: number | null = null;

  // Find a replace decoration whose range contains nextLine.from
  decos.between(nextLine.from, nextLine.from, (from) => {
    targetFrom = from;
    return false;
  });

  if (targetFrom === null) return false;

  view.dispatch({
    selection: { anchor: targetFrom, head: targetFrom },
    scrollIntoView: true,
  });
  return true;
}

function enterTableUp(view: EditorView): boolean {
  const { head } = view.state.selection.main;
  const curLineNum = view.state.doc.lineAt(head).number;
  const prevLineNum = curLineNum - 1;
  if (prevLineNum < 1) return false;

  const prevLine = view.state.doc.line(prevLineNum);
  const decos = view.state.field(tablePreviewField);
  let targetTo: number | null = null;

  decos.between(prevLine.from, prevLine.to, (_, to) => {
    targetTo = to;
    return false;
  });

  if (targetTo === null) return false;

  // Land on the start of the last line inside the replaced range
  const lastLineFrom = view.state.doc.lineAt(
    Math.max(targetTo - 1, 0)
  ).from;
  view.dispatch({
    selection: { anchor: lastLineFrom, head: lastLineFrom },
    scrollIntoView: true,
  });
  return true;
}

const tableNavKeymap = Prec.high(keymap.of([
  { key: "ArrowDown", run: enterTableDown },
  { key: "ArrowUp", run: enterTableUp },
]));

// ── Public export ────────────────────────────────────────────────────

/**
 * Extension: renders markdown tables as HTML table widgets when the
 * cursor is outside them.  Moving the cursor onto a table row collapses
 * the widget and reveals the raw markdown for editing.
 */
export const markdownTablePreview: Extension = [
  tablePreviewField,
  tableNavKeymap,
  tablePreviewTheme,
];
