import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { sectionField, EditorSection } from "./section-state";

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
      const { sections } = this.view.state.field(sectionField);
      const scrollRect = this.view.scrollDOM.getBoundingClientRect();
      const scrollTop = this.view.scrollDOM.scrollTop;

      this.rects = sections.map((sec) => {
        const fromCoords = this.view.coordsAtPos(sec.from);
        const toCoords = this.view.coordsAtPos(sec.to);

        const top = fromCoords ? fromCoords.top - scrollRect.top + scrollTop : 0;
        const bottom = toCoords ? toCoords.bottom - scrollRect.top + scrollTop : top;
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
