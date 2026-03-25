/**
 * Markdown Syntax Hiding Extension
 *
 * When the cursor is NOT on a given line:
 *   - Heading lines (#, ##, … ######): hides the leading `# ` characters so
 *     only the bare heading text is shown, while still applying a larger font
 *     via a line-level class.
 *   - Bold markers (**text**): the two `**` delimiters are hidden; the inner
 *     text retains its bold style from @codemirror/lang-markdown highlighting.
 *   - Italic markers (*text* and _text_): the single `*` or `_` delimiters
 *     are hidden; the inner text retains its italic style.
 *
 * When the cursor IS on the line the raw markdown is fully visible and editable,
 * but heading lines still render with an enlarged font to preserve visual flow.
 */

import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { EditorState, Range, StateField, Extension } from "@codemirror/state";
import { sectionField } from "./section-state";

// ── Regex patterns ───────────────────────────────────────────────────

/** Matches a heading prefix (one to six `#` followed by a space). */
const HEADING_RE = /^(#{1,6}) /;

/**
 * Bold: **text** where text contains no newlines or unescaped asterisks.
 * We use [^*\n]+ to avoid consuming the closing `**`.
 */
const BOLD_RE = /\*\*([^*\n]+)\*\*/g;

/**
 * Italic with single star: *text* — but NOT where `**` appears.
 * Negative lookahead/lookbehind guards against matching inside bold delimiters.
 */
const ITALIC_STAR_RE = /(?<!\*)\*([^*\n]+)\*(?!\*)/g;

/**
 * Italic with underscore: _text_ — guards against word-boundary underscores
 * (e.g. snake_case identifiers) with a simple non-alphanumeric boundary check.
 */
const ITALIC_UNDER_RE = /(?<![_\w])_([^_\n]+)_(?![_\w])/g;

// ── Pre-allocated line decoration specs (one per heading level) ──────

const HEADING_LINE_DECOS = [1, 2, 3, 4, 5, 6].map((level) =>
  Decoration.line({ attributes: { class: `cm-md-heading-${level}` } })
);

// ── Core decoration builder ──────────────────────────────────────────

function buildDecorations(state: EditorState): DecorationSet {
  const { sections } = state.field(sectionField);
  const cursor = state.selection.main.head;
  const cursorLineNum = state.doc.lineAt(cursor).number;
  const decos: Range<Decoration>[] = [];

  for (const section of sections) {
    // Only decorate markdown prose — leave wod/code/frontmatter alone.
    if (section.type !== "markdown") continue;

    for (let ln = section.startLine; ln <= section.endLine; ln++) {
      const line = state.doc.line(ln);
      const lineText = line.text;
      const onCursorLine = ln === cursorLineNum;

      // ── Heading handling ──────────────────────────────────────────

      const headingMatch = HEADING_RE.exec(lineText);
      if (headingMatch) {
        const level = headingMatch[1].length; // 1–6
        // Always enlarge the heading font, even when the cursor is on the line.
        decos.push(HEADING_LINE_DECOS[level - 1].range(line.from));

        if (!onCursorLine) {
          // Hide "## " prefix (hashes + trailing space).
          const prefixLen = headingMatch[0].length;
          decos.push(
            Decoration.replace({}).range(line.from, line.from + prefixLen)
          );
        }
        // Skip inline marker processing on heading lines.
        continue;
      }

      // ── Inline marker hiding (only when cursor is elsewhere) ──────

      if (onCursorLine) continue;

      // 1. Process bold `**text**` first and record their char ranges so
      //    the italic pass can skip positions already covered.
      const boldRanges: Array<[number, number]> = [];

      BOLD_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = BOLD_RE.exec(lineText)) !== null) {
        const from = line.from + m.index;
        const to = from + m[0].length;
        boldRanges.push([m.index, m.index + m[0].length]);
        // Hide opening and closing `**` (2 chars each).
        decos.push(Decoration.replace({}).range(from, from + 2));
        decos.push(Decoration.replace({}).range(to - 2, to));
      }

      // Returns true when [start, end) overlaps any collected bold range.
      const overlapsWithBold = (start: number, end: number): boolean =>
        boldRanges.some(([bs, be]) => start < be && end > bs);

      // 2. Italic with `*` — skip matches that fall inside a bold span.
      ITALIC_STAR_RE.lastIndex = 0;
      while ((m = ITALIC_STAR_RE.exec(lineText)) !== null) {
        if (overlapsWithBold(m.index, m.index + m[0].length)) continue;
        const from = line.from + m.index;
        const to = from + m[0].length;
        decos.push(Decoration.replace({}).range(from, from + 1));
        decos.push(Decoration.replace({}).range(to - 1, to));
      }

      // 3. Italic with `_`.
      ITALIC_UNDER_RE.lastIndex = 0;
      while ((m = ITALIC_UNDER_RE.exec(lineText)) !== null) {
        const from = line.from + m.index;
        const to = from + m[0].length;
        decos.push(Decoration.replace({}).range(from, from + 1));
        decos.push(Decoration.replace({}).range(to - 1, to));
      }
    }
  }

  decos.sort((a, b) => a.from - b.from);
  return Decoration.set(decos);
}

// ── StateField ───────────────────────────────────────────────────────

const markdownSyntaxHidingField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Base theme ───────────────────────────────────────────────────────

const markdownSyntaxHidingTheme = EditorView.baseTheme({
  // Heading font sizes — applied to the cm-line div; text inside inherits.
  ".cm-md-heading-1": { fontSize: "1.5em", fontWeight: "700", lineHeight: "1.4" },
  ".cm-md-heading-2": { fontSize: "1.3em", fontWeight: "700", lineHeight: "1.4" },
  ".cm-md-heading-3": { fontSize: "1.15em", fontWeight: "600", lineHeight: "1.4" },
  ".cm-md-heading-4": { fontSize: "1.05em", fontWeight: "600", lineHeight: "1.4" },
  ".cm-md-heading-5": { fontSize: "1em", fontWeight: "600", lineHeight: "1.35" },
  ".cm-md-heading-6": { fontSize: "1em", fontWeight: "500", lineHeight: "1.35" },
});

// ── Public extension ─────────────────────────────────────────────────

export function markdownSyntaxHiding(): Extension {
  return [markdownSyntaxHidingField, markdownSyntaxHidingTheme];
}
