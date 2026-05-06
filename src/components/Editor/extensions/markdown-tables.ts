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

/**
 * Returns the character offset *within* a raw table line where cell `ci`
 * content begins (i.e. just after the (ci+1)-th pipe, past any leading space).
 */
function findCellPosInLine(lineText: string, ci: number): number {
  let pipeCount = 0;
  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === "|") {
      pipeCount++;
      if (pipeCount === ci + 1) {
        // Skip a single leading space if present (standard table format)
        let j = i + 1;
        while (j < lineText.length && lineText[j] === " ") j++;
        return j;
      }
    }
  }
  return 0;
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

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function findUnescaped(source: string, needle: string, from: number): number {
  let index = source.indexOf(needle, from);
  while (index !== -1) {
    let slashCount = 0;
    for (let pos = index - 1; pos >= 0 && source[pos] === "\\"; pos--) {
      slashCount++;
    }
    if (slashCount % 2 === 0) return index;
    index = source.indexOf(needle, index + needle.length);
  }
  return -1;
}

function safeLinkHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;

  try {
    const url = new URL(trimmed, window.location.href);
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? trimmed : null;
  } catch {
    return null;
  }
}

function appendInlineMarkdown(parent: HTMLElement | DocumentFragment, source: string): void {
  let cursor = 0;

  const appendText = (text: string) => {
    if (text) parent.appendChild(document.createTextNode(text));
  };

  while (cursor < source.length) {
    if (source[cursor] === "\\" && cursor + 1 < source.length) {
      appendText(source[cursor + 1]);
      cursor += 2;
      continue;
    }

    if (source[cursor] === "`") {
      const end = findUnescaped(source, "`", cursor + 1);
      if (end !== -1) {
        const code = document.createElement("code");
        code.className = "cm-md-table-inline-code";
        code.textContent = source.slice(cursor + 1, end);
        parent.appendChild(code);
        cursor = end + 1;
        continue;
      }
    }

    if (source[cursor] === "[") {
      const labelEnd = findUnescaped(source, "](", cursor + 1);
      if (labelEnd !== -1) {
        const hrefEnd = findUnescaped(source, ")", labelEnd + 2);
        if (hrefEnd !== -1) {
          const label = source.slice(cursor + 1, labelEnd);
          const href = safeLinkHref(source.slice(labelEnd + 2, hrefEnd));
          if (href) {
            const link = document.createElement("a");
            link.className = "cm-md-table-link";
            link.href = href;
            if (/^https?:\/\//.test(href)) {
              link.rel = "noopener noreferrer";
              link.target = "_blank";
            }
            appendInlineMarkdown(link, label);
            parent.appendChild(link);
          } else {
            appendInlineMarkdown(parent, label);
          }
          cursor = hrefEnd + 1;
          continue;
        }
      }
    }

    const token = source.startsWith("**", cursor)
      ? { marker: "**", tag: "strong" }
      : source.startsWith("~~", cursor)
        ? { marker: "~~", tag: "s" }
        : null;

    if (token) {
      const end = findUnescaped(source, token.marker, cursor + token.marker.length);
      if (end !== -1) {
        const element = document.createElement(token.tag);
        appendInlineMarkdown(element, source.slice(cursor + token.marker.length, end));
        parent.appendChild(element);
        cursor = end + token.marker.length;
        continue;
      }
    }

    if ((source[cursor] === "*" && !source.startsWith("**", cursor)) || source[cursor] === "_") {
      const marker = source[cursor];
      const end = findUnescaped(source, marker, cursor + 1);
      if (end !== -1) {
        const element = document.createElement("em");
        appendInlineMarkdown(element, source.slice(cursor + 1, end));
        parent.appendChild(element);
        cursor = end + 1;
        continue;
      }
    }

    const nextSpecial = ["\\", "`", "[", "*", "_", "~"]
      .map((char) => source.indexOf(char, cursor + 1))
      .filter((index) => index !== -1)
      .sort((a, b) => a - b)[0] ?? source.length;
    appendText(source.slice(cursor, nextSpecial));
    cursor = nextSpecial;
  }
}

function renderTableCellMarkdown(cell: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  if (!cell) {
    fragment.appendChild(document.createTextNode("\u00A0"));
    return fragment;
  }

  appendInlineMarkdown(fragment, cell);
  return fragment;
}

// ── Table widget ─────────────────────────────────────────────────────

class MarkdownTableWidget extends WidgetType {
  constructor(
    readonly tableLines: string[],
    readonly tableFrom: number,
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

    wrapper.appendChild(this._buildTable(view));
    return wrapper;
  }

  private _buildTable(view: EditorView): HTMLElement {
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

      // Map rendered row index back to source line index:
      //   ri=0 → source line 0 (header)
      //   ri=1+ → source line ri+1 (skipping separator at index 1)
      const srcLineIdx = hasSep && ri > 0 ? ri + 1 : ri;

      cells.forEach((cell, ci) => {
        const td = document.createElement(isHeader ? "th" : "td");
        const align = alignments[ci] ?? "left";
        td.className = `cm-md-table-cell cm-md-align-${align}`;
        td.appendChild(renderTableCellMarkdown(cell));

        // Click → move cursor into the source cell, collapsing the preview
        td.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const firstLine = view.state.doc.lineAt(this.tableFrom);
          const targetLineNum = firstLine.number + srcLineIdx;
          if (targetLineNum > view.state.doc.lines) return;
          const targetLine = view.state.doc.line(targetLineNum);
          const colOffset = findCellPosInLine(targetLine.text, ci);
          view.dispatch({
            selection: { anchor: targetLine.from + colOffset },
            scrollIntoView: true,
          });
          view.focus();
        });

        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    return table;
  }

  ignoreEvent(): boolean {
    // Keep true so CM6 doesn’t also try to reposition the cursor via posAtCoords;
    // our mousedown handler above dispatches the correct selection directly.
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
    cursor: "pointer",
  },

  // Data rows
  ".cm-md-table-row td": {
    padding: "4px 14px 4px 6px",
    borderBottom: "1px solid rgba(128,128,128,0.12)",
    color: "inherit",
    verticalAlign: "top",
    cursor: "pointer",
  },

  // Hover highlight for clickable cells
  ".cm-md-table-cell:hover": {
    backgroundColor: "rgba(128,128,128,0.08)",
  },

  ".cm-md-table-cell strong": {
    fontWeight: "700",
  },

  ".cm-md-table-cell em": {
    fontStyle: "italic",
  },

  ".cm-md-table-cell s": {
    textDecoration: "line-through",
  },

  ".cm-md-table-inline-code": {
    padding: "1px 4px",
    borderRadius: "4px",
    backgroundColor: "rgba(128,128,128,0.12)",
    fontFamily: "var(--font-mono, monospace)",
    fontSize: "0.92em",
  },

  ".cm-md-table-link": {
    color: "hsl(var(--primary, 212 32% 50%))",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
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
