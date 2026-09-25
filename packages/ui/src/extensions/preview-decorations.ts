import {
  Decoration,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { StateField, EditorState, RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { sectionField } from "./section-state";

class WorkoutFooterWidget extends WidgetType {
  eq(_other: WorkoutFooterWidget): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-wod-block-footer";
    return el;
  }

  get estimatedHeight(): number {
    return 28;
  }

  get block(): boolean {
    return true;
  }
}

class WorkoutInsertSpacerWidget extends WidgetType {
  eq(_other: WorkoutInsertSpacerWidget): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-wod-insert-spacer";
    return el;
  }

  get estimatedHeight(): number {
    return 28;
  }

  get block(): boolean {
    return true;
  }
}

const footerWidget = new WorkoutFooterWidget();
const insertSpacerWidget = new WorkoutInsertSpacerWidget();

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
  const cursorHead = state.selection.main.head;
  const cursorLineNum = state.doc.lineAt(cursorHead).number;

  for (const section of sections) {
    if (section.type !== "time" && section.type !== "log") continue;

    const isCursorInside =
      cursorLineNum > section.startLine && cursorLineNum < section.endLine;

    const startLine = state.doc.line(section.startLine);
    const endLine = state.doc.line(section.endLine);

    if (section.endLine <= section.startLine) {
      builder.add(startLine.from, startLine.from, fenceOpenDeco);
      continue;
    }

    builder.add(startLine.from, startLine.from, fenceOpenDeco);

    for (let l = section.startLine + 1; l < section.endLine; l++) {
      const line = state.doc.line(l);
      builder.add(line.from, line.from, workoutInnerDeco);

      if (isCursorInside && l === cursorLineNum) {
        builder.add(
          line.to,
          line.to,
          Decoration.widget({ widget: insertSpacerWidget, block: true, side: 1 })
        );
      }
    }

    if (!isCursorInside) {
      builder.add(
        endLine.from,
        endLine.from,
        Decoration.widget({ widget: footerWidget, block: true, side: -1 })
      );
    }

    builder.add(endLine.from, endLine.from, fenceCloseDeco);
  }

  return builder.finish();
}
const scriptBlockDecoField = StateField.define<DecorationSet>({
  create(state) {
    return buildWorkoutDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
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
    color: "hsl(var(--metric-time))",
    paddingLeft: "8px",
    paddingRight: "8px",
    backgroundColor: "rgba(128, 128, 128, 0.05)",
    borderLeft: "1px solid hsl(var(--border) / 0.5)",
    borderRight: "1px solid hsl(var(--border) / 0.5)",
    boxSizing: "border-box",
  },
  ".cm-wod-fence-open": {
    borderTop: "1px solid hsl(var(--border) / 0.5)",
    borderRadius: "6px 6px 0 0",
  },
  ".cm-wod-fence-close": {
    borderBottom: "1px solid hsl(var(--border) / 0.5)",
    borderRadius: "0 0 6px 6px",
  },
  ".cm-wod-inner": {
    paddingLeft: "8px",
    paddingRight: "8px",
    backgroundColor: "rgba(128, 128, 128, 0.05)",
    borderLeft: "1px solid hsl(var(--border) / 0.5)",
    borderRight: "1px solid hsl(var(--border) / 0.5)",
    boxSizing: "border-box",
  },
  ".cm-wod-block-footer": {
    height: "28px",
    backgroundColor: "rgba(128, 128, 128, 0.05)",
    borderLeft: "1px solid hsl(var(--border) / 0.5)",
    borderRight: "1px solid hsl(var(--border) / 0.5)",
    boxSizing: "border-box",
    pointerEvents: "none",
  },
  ".cm-wod-insert-spacer": {
    height: "28px",
    backgroundColor: "rgba(128, 128, 128, 0.05)",
    borderLeft: "1px solid hsl(var(--border) / 0.5)",
    borderRight: "1px solid hsl(var(--border) / 0.5)",
    boxSizing: "border-box",
    pointerEvents: "none",
  },
});
export const previewDecorations: Extension = [
  scriptBlockDecoField,
  scriptBlockBaseTheme,
];
