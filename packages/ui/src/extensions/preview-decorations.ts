import {
  Decoration,
  DecorationSet,
  EditorView,
} from "@codemirror/view";
import { StateField, EditorState, Extension, RangeSetBuilder } from "@codemirror/state";
import { sectionField } from "./section-state";

const fenceOpenDeco = Decoration.line({
  attributes: { class: "cm-wod-fence cm-wod-fence-open" },
});

const fenceCloseDeco = Decoration.line({
  attributes: { class: "cm-wod-fence cm-wod-fence-close" },
});

const workoutInnerDeco = Decoration.line({
  attributes: { class: "cm-wod-inner" },
});

function buildWorkoutDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { sections } = state.field(sectionField);

  for (const section of sections) {
    if (section.type !== "time" && section.type !== "log") continue;

    const startLine = state.doc.line(section.startLine);
    const endLine = state.doc.line(section.endLine);

    builder.add(startLine.from, startLine.from, fenceOpenDeco);

    for (let l = section.startLine + 1; l < section.endLine; l++) {
      const line = state.doc.line(l);
      builder.add(line.from, line.from, workoutInnerDeco);
    }

    if (section.endLine > section.startLine) {
      builder.add(endLine.from, endLine.from, fenceCloseDeco);
    }
  }

  return builder.finish();
}

const scriptBlockDecoField = StateField.define<DecorationSet>({
  create(state) {
    return buildWorkoutDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged) {
      return buildWorkoutDecorations(tr.state);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const scriptBlockBaseTheme = EditorView.baseTheme({
  ".cm-wod-fence": {
    opacity: "0.5",
    fontSize: "0.85em",
  },
  ".cm-wod-fence-open": {
    borderRadius: "6px 6px 0 0",
  },
  ".cm-wod-fence-close": {
    borderRadius: "0 0 6px 6px",
  },
  ".cm-wod-inner": {
    paddingLeft: "8px",
    backgroundColor: "rgba(128, 128, 128, 0.05)",
  },
});

export const previewDecorations: Extension = [
  scriptBlockDecoField,
  scriptBlockBaseTheme,
];
