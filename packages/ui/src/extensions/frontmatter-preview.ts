import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { StateField, EditorState, Extension, RangeSetBuilder } from "@codemirror/state";
import { sectionField, type EditorSection } from "./section-state";

export class DefaultFrontmatterWidget extends WidgetType {
  constructor(readonly props: Record<string, string>) {
    super();
  }

  eq(other: DefaultFrontmatterWidget): boolean {
    const keysA = Object.keys(this.props);
    const keysB = Object.keys(other.props);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => this.props[k] === other.props[k]);
  }

  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-frontmatter-preview p-3 my-1 rounded-lg border border-border/80 bg-muted/20 text-xs font-mono";
    const entries = Object.entries(this.props);
    if (entries.length === 0) {
      el.textContent = "Empty frontmatter";
      return el;
    }
    const dl = document.createElement("dl");
    dl.className = "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1";
    for (const [k, v] of entries) {
      const dt = document.createElement("dt");
      dt.className = "text-muted-foreground font-semibold";
      dt.textContent = `${k}:`;
      const dd = document.createElement("dd");
      dd.className = "text-foreground truncate";
      dd.textContent = v;
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    el.appendChild(dl);
    return el;
  }
}

function parseFrontmatterProps(
  state: EditorState,
  section: EditorSection,
): Record<string, string> {
  const text = state.doc.sliceString(section.from, section.to);
  const lines = text.split("\n").filter((l) => !l.trim().startsWith("---"));
  const props: Record<string, string> = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const k = line.slice(0, colonIdx).trim();
      const v = line.slice(colonIdx + 1).trim();
      if (k) props[k] = v;
    }
  }
  return props;
}

function buildFrontmatterDecos(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);
  const cursor = state.selection.main.head;

  for (const section of sections) {
    if (section.type !== "frontmatter") continue;
    // Hide preview when cursor is inside the frontmatter block
    if (cursor >= section.from && cursor <= section.to) continue;

    const props = parseFrontmatterProps(state, section);
    builder.add(
      section.from,
      section.to,
      Decoration.replace({
        widget: new DefaultFrontmatterWidget(props),
        block: true,
      }),
    );
  }

  return builder.finish();
}

export const frontmatterPreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildFrontmatterDecos(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildFrontmatterDecos(tr.state);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const frontmatterPreview: Extension = [
  frontmatterPreviewField,
];
