import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { sectionField, type EditorSection } from "./section-state";

export interface SectionRect {
  sectionId: string;
  top: number;
  height: number;
  type: EditorSection["type"];
  subtype?: EditorSection["subtype"];
  widgetName?: string;
}

export type GeometryListener = (rects: SectionRect[], docVersion: number) => void;

class SectionGeometryPlugin {
  rects: SectionRect[] = [];
  docVersion: number = 0;
  private listeners: Set<GeometryListener> = new Set();

  constructor(private view: EditorView) {
    this.measure();
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      this.docVersion++;
    }
    if (update.docChanged || update.viewportChanged || update.geometryChanged) {
      this.measure();
    }
  }

  addListener(fn: GeometryListener): () => void {
    this.listeners.add(fn);
    fn(this.rects, this.docVersion);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private measure() {
    try {
      const sectionState = this.view.state.field(sectionField, false);
      const sections = sectionState?.sections ?? [];
      const scrollRect = this.view.scrollDOM?.getBoundingClientRect ? this.view.scrollDOM.getBoundingClientRect() : { top: 0, left: 0, bottom: 0, right: 0 };
      const scrollTop = this.view.scrollDOM?.scrollTop ?? 0;
      this.rects = sections.map((sec) => {
        let fromCoords = null;
        let toCoords = null;
        try {
          fromCoords = this.view.coordsAtPos ? this.view.coordsAtPos(sec.from) : null;
          toCoords = this.view.coordsAtPos ? this.view.coordsAtPos(sec.to) : null;
        } catch {
          // Layout reading is disallowed during EditorView updating phase
        }

        const top = fromCoords ? fromCoords.top - (scrollRect?.top ?? 0) + scrollTop : 0;
        const bottom = toCoords ? toCoords.bottom - (scrollRect?.top ?? 0) + scrollTop : top;
        const height = Math.max(bottom - top, 20);

        return {
          sectionId: sec.id,
          top,
          height,
          type: sec.type,
          subtype: sec.subtype,
          widgetName: sec.widgetName,
        };
      });

      this.notify();
    } catch {
      // Best-effort viewport measurement
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.rects, this.docVersion);
    }
  }

  destroy() {
    this.listeners.clear();
  }
}

export const sectionGeometry = ViewPlugin.fromClass(SectionGeometryPlugin);
