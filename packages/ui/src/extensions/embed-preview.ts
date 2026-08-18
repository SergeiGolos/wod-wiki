import { Decoration,
  EditorView,
  WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { EditorState, StateField, RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { sectionField } from "./section-state";

class EmbedSpacerWidget extends WidgetType {
  constructor(readonly height: number) {
    super();
  }

  eq(other: EmbedSpacerWidget): boolean {
    return other.height === this.height;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-embed-spacer";
    el.style.height = `${this.height}px`;
    el.style.pointerEvents = "none";
    return el;
  }

  get estimatedHeight(): number {
    return this.height;
  }

  get block(): boolean {
    return true;
  }
}

function buildEmbedDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);

  for (const section of sections) {
    if (section.type === "embed" && section.embed?.height) {
      const line = state.doc.line(section.startLine);
      builder.add(
        line.from,
        line.from,
        Decoration.widget({
          widget: new EmbedSpacerWidget(section.embed.height),
          side: 1,
        }),
      );
    }
  }

  return builder.finish();
}

const embedPreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildEmbedDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged) {
      return buildEmbedDecorations(tr.state);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const embedPreviewDecorations: Extension = [
  embedPreviewField,
];
