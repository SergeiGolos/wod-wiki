import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { StateField, EditorState, Extension, RangeSetBuilder } from "@codemirror/state";
import { sectionField } from "./section-state";

const HEADING_RE = /^(#{1,6}) /;
const BOLD_RE = /\*\*([^*\n]+)\*\*/g;
const ITALIC_STAR_RE = /(?<!\*)\*([^*\n]+)\*(?!\*)/g;

const HEADING_LINE_DECOS = [1, 2, 3, 4, 5, 6].map((level) =>
  Decoration.line({ attributes: { class: `cm-md-heading cm-md-heading-${level}` } }),
);

const hideSyntaxDeco = Decoration.replace({});
const boldDeco = Decoration.mark({ class: "cm-md-bold font-bold" });
const italicDeco = Decoration.mark({ class: "cm-md-italic italic" });

function buildDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);
  const cursor = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "markdown") continue;

    for (let l = section.startLine; l <= section.endLine; l++) {
      const line = state.doc.line(l);
      const isCursorOnLine = cursor >= line.from && cursor <= line.to;

      const headingMatch = line.text.match(HEADING_RE);
      if (headingMatch) {
        const level = headingMatch[1].length;
        builder.add(line.from, line.from, HEADING_LINE_DECOS[level - 1]);
        if (!isCursorOnLine) {
          builder.add(line.from, line.from + headingMatch[0].length, hideSyntaxDeco);
        }
      }

      if (!isCursorOnLine) {
        let match: RegExpExecArray | null;
        BOLD_RE.lastIndex = 0;
        while ((match = BOLD_RE.exec(line.text)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          builder.add(start, start + 2, hideSyntaxDeco);
          builder.add(start + 2, end - 2, boldDeco);
          builder.add(end - 2, end, hideSyntaxDeco);
        }

        ITALIC_STAR_RE.lastIndex = 0;
        while ((match = ITALIC_STAR_RE.exec(line.text)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          builder.add(start, start + 1, hideSyntaxDeco);
          builder.add(start + 1, end - 1, italicDeco);
          builder.add(end - 1, end, hideSyntaxDeco);
        }
      }
    }
  }

  return builder.finish();
}

const markdownSyntaxHidingField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const markdownSyntaxHidingTheme = EditorView.baseTheme({
  ".cm-md-heading-1": { fontSize: "1.3em", fontWeight: "bold" },
  ".cm-md-heading-2": { fontSize: "1.2em", fontWeight: "bold" },
  ".cm-md-heading-3": { fontSize: "1.1em", fontWeight: "bold" },
});

export function markdownSyntaxHiding(): Extension {
  return [markdownSyntaxHidingField, markdownSyntaxHidingTheme];
}
