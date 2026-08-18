import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { ScriptBlock } from "@wod-wiki/engine";

export interface RuntimePanelEntry {
  sectionId: string;
  block: ScriptBlock;
  afterPos: number;
  expanded?: boolean;
}

export const RUNTIME_PANEL_HEIGHT_PX = 500;
export const RUNTIME_PANEL_HEIGHT_EXPANDED_PX = 600;

export const addRuntimePanel = StateEffect.define<RuntimePanelEntry>();
export const removeRuntimePanel = StateEffect.define<{ sectionId: string }>();
export const expandRuntimePanel = StateEffect.define<{ sectionId: string; expanded: boolean }>();

class RuntimeSpacerWidget extends WidgetType {
  constructor(readonly height: number) {
    super();
  }

  eq(other: RuntimeSpacerWidget): boolean {
    return other.height === this.height;
  }

  toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-runtime-panel-spacer";
    el.style.height = `${this.height}px`;
    el.style.pointerEvents = "none";
    return el;
  }

  get block(): boolean {
    return true;
  }
}

function buildRuntimePanelDecos(panels: Map<string, RuntimePanelEntry>): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const sorted = Array.from(panels.values()).sort((a, b) => a.afterPos - b.afterPos);

  for (const entry of sorted) {
    const height = entry.expanded ? RUNTIME_PANEL_HEIGHT_EXPANDED_PX : RUNTIME_PANEL_HEIGHT_PX;
    builder.add(
      entry.afterPos,
      entry.afterPos,
      Decoration.widget({
        widget: new RuntimeSpacerWidget(height),
        block: true,
        side: 1,
      }),
    );
  }

  return builder.finish();
}

export const runtimePanelField = StateField.define<Map<string, RuntimePanelEntry>>({
  create() {
    return new Map();
  },
  update(panels, tr) {
    let next = panels;
    for (const e of tr.effects) {
      if (e.is(addRuntimePanel)) {
        next = new Map(next);
        next.set(e.value.sectionId, e.value);
      } else if (e.is(removeRuntimePanel)) {
        if (next.has(e.value.sectionId)) {
          next = new Map(next);
          next.delete(e.value.sectionId);
        }
      } else if (e.is(expandRuntimePanel)) {
        const existing = next.get(e.value.sectionId);
        if (existing) {
          next = new Map(next);
          next.set(e.value.sectionId, { ...existing, expanded: e.value.expanded });
        }
      }
    }
    return next;
  },
  provide: (f) =>
    EditorView.decorations.compute([f], (state) => buildRuntimePanelDecos(state.field(f))),
});

export function dispatchAddRuntimePanel(
  view: EditorView,
  sectionId: string,
  block: ScriptBlock,
  afterPos: number,
  expanded = false,
): void {
  view.dispatch({
    effects: addRuntimePanel.of({ sectionId, block, afterPos, expanded }),
  });
}

export function dispatchRemoveRuntimePanel(view: EditorView, sectionId: string): void {
  view.dispatch({ effects: removeRuntimePanel.of({ sectionId }) });
}

export function dispatchExpandRuntimePanel(
  view: EditorView,
  sectionId: string,
  expanded: boolean,
): void {
  view.dispatch({ effects: expandRuntimePanel.of({ sectionId, expanded }) });
}
