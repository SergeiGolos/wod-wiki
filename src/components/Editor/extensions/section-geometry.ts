/**
 * Section Geometry ViewPlugin
 *
 * Measures the visual rectangle of each section visible in the viewport.
 * Provides `SectionRect` data that the React overlay track reads to position
 * companion panels at the correct vertical offset and height.
 *
 * The plugin uses CM6's `requestMeasure` / `lineBlockAt` / `viewportLineBlocks`
 * to turn document-position-based sections into pixel-based geometry, and
 * updates whenever the viewport scrolls or the document changes.
 */

import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { sectionField, EditorSection } from "./section-state";

// ── Types ────────────────────────────────────────────────────────────

/** Pixel-based rectangle for a section, relative to the editor's scroll container */
export interface SectionRect {
  /** The section this rect belongs to */
  sectionId: string;
  /** Top position in px, relative to the top of .cm-scroller's scroll content */
  top: number;
  /** Height in px */
  height: number;
  /** Section type (forwarded for convenience) */
  type: EditorSection["type"];
  /** Section subtype (forwarded for convenience) */
  subtype?: EditorSection["subtype"];
  /** Widget name (only for type === "widget") */
  widgetName?: string;
}

/** Callback type for geometry change listeners */
export type GeometryListener = (rects: SectionRect[], docVersion: number) => void;

// ── Plugin ───────────────────────────────────────────────────────────

class SectionGeometryPlugin {
  rects: SectionRect[] = [];
  /** Increments only on `update.docChanged` — safe to use as a memo dep. */
  docVersion: number = 0;
  private listeners: Set<GeometryListener> = new Set();
  private pendingNotify: number | null = null;

  constructor(private view: EditorView) {
    this.measure();
  }

  update(update: ViewUpdate) {
    // viewportChanged fires on scroll but rects are document-space coordinates
    // (lineBlockAt returns positions relative to scroll content, not viewport).
    // Scroll cannot change rect values — skip remeasure to avoid a render storm
    // on every scroll tick. geometryChanged covers resize/line-height changes.
    if (update.docChanged) {
      this.docVersion++;
    }
    if (update.docChanged || update.geometryChanged) {
      this.measure();
    }
  }

  /** Subscribe to geometry changes. Returns unsubscribe function. */
  addListener(fn: GeometryListener): () => void {
    this.listeners.add(fn);
    // Deliver current state immediately
    fn(this.rects, this.docVersion);
    return () => this.listeners.delete(fn);
  }

  /** Compute pixel rects for all sections overlapping the viewport */
  private measure() {
    const { sections } = this.view.state.field(sectionField);
    const rects: SectionRect[] = [];

    for (const sec of sections) {
      // Skip sections entirely outside the viewport for performance
      // (lineBlockAt clamps to doc length, so out-of-viewport is cheap to check)
      const from = Math.max(sec.from, 0);
      const to = Math.min(sec.to, this.view.state.doc.length);

      let topBlock;
      let bottomBlock;
      try {
        topBlock = this.view.lineBlockAt(from);
        bottomBlock = this.view.lineBlockAt(to);
      } catch {
        // lineBlockAt can throw if the position is in a collapsed region
        continue;
      }

      const top = topBlock.top;
      const bottom = bottomBlock.top + bottomBlock.height;

      rects.push({
        sectionId: sec.id,
        top,
        height: bottom - top,
        type: sec.type,
        subtype: sec.subtype,
        widgetName: sec.widgetName,
      });
    }

    this.rects = rects;
    this.notify();
  }

  private notify() {
    // Debounce via RAF: multiple CM6 updates within one frame (e.g. scroll +
    // viewport change) coalesce into a single listener call, preventing a
    // render storm that would feed back into scroll events.
    if (this.pendingNotify !== null) return;
    this.pendingNotify = requestAnimationFrame(() => {
      this.pendingNotify = null;
      for (const fn of this.listeners) {
        fn(this.rects, this.docVersion);
      }
    });
  }

  destroy() {
    if (this.pendingNotify !== null) cancelAnimationFrame(this.pendingNotify);
    this.listeners.clear();
  }
}

/**
 * CM6 ViewPlugin that measures section geometry.
 *
 * Usage:
 *   extensions: [sectionField, sectionGeometry]
 *
 * Read geometry from React:
 *   const plugin = view.plugin(sectionGeometry);
 *   plugin?.addListener(rects => setRects(rects));
 */
export const sectionGeometry = ViewPlugin.fromClass(SectionGeometryPlugin);
