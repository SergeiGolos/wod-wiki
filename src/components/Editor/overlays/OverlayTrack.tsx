/**
 * OverlayTrack
 *
 * React component that renders section-aligned overlay slots on top of the
 * CodeMirror editor. Each slot is positioned at the section's measured geometry
 * and sized to the computed overlay width (0-100% from the right edge).
 *
 * Layout model:
 *  - The track is `position: absolute` inset to the editor's writable content
 *    area: starts after the gutter (line-numbers) and ends before the native
 *    browser scrollbar.  Overlays therefore never cover line numbers or the
 *    scrollbar regardless of width setting.
 *  - Insets are measured via ResizeObserver so they stay correct when gutters
 *    are toggled or the window is resized.
 *  - The track is scroll-synced with `.cm-scroller` via `translateY(-scrollTop)`.
 *  - Each visible slot has `pointer-events: auto` so its contents are interactive.
 *  - Text underneath remains full-width — the overlay floats on top.
 */

import React, { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import type { SectionRect } from "../extensions/section-geometry";
import { sectionGeometry } from "../extensions/section-geometry";
import type { SectionOverlayState } from "./useOverlayWidthState";
import type { EditorSectionType } from "../extensions/section-state";

// ── Types ────────────────────────────────────────────────────────────

export interface OverlaySlotProps {
  sectionId: string;
  sectionType: EditorSectionType;
  rect: SectionRect;
  widthPercent: number;
  isActive: boolean;
  view: EditorView;
  /** Increments on every document change — use as useMemo dep in companions. */
  docVersion: number;
}

export interface OverlayTrackProps {
  /** The CM6 EditorView (needed for scroll sync + geometry plugin access) */
  view: EditorView | null;
  /** Overlay width map from useOverlayWidthState */
  widths: Map<string, SectionOverlayState>;
  /** Active section id for styling/focus */
  activeSectionId: string | null;
  /** Render function for slot contents — called for each visible slot */
  renderSlot?: (props: OverlaySlotProps) => React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────────

export const OverlayTrack: React.FC<OverlayTrackProps> = ({
  view,
  widths,
  activeSectionId,
  renderSlot,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<SectionRect[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  // left = gutter width; right = scrollbar width
  const [contentInsets, setContentInsets] = useState<{ left: number; right: number }>({ left: 0, right: 0 });
  // Increments whenever the editor document changes so companions re-derive their data.
  const [docVersion, setDocVersion] = useState(0);

  // Measure content-area insets: gutter (left) and scrollbar (right).
  // Re-measures whenever the editor DOM resizes (gutters toggled, window resize, etc.).
  useEffect(() => {
    if (!view) return;

    const measure = () => {
      // Gutter width = offsetLeft of .cm-content within .cm-scroller
      const gutterWidth = view.contentDOM.offsetLeft;
      // Scrollbar width = total scrollDOM width minus the visible (non-scrollbar) width
      const scrollbarWidth = view.scrollDOM.offsetWidth - view.scrollDOM.clientWidth;
      setContentInsets({ left: gutterWidth, right: scrollbarWidth });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view.dom);
    return () => observer.disconnect();
  }, [view]);

  // Watch for document mutations: CM6 synchronously updates contentDOM on every
  // dispatch, so a MutationObserver gives us a reliable change signal without
  // needing to add a CM6 extension.
  useEffect(() => {
    if (!view) return;
    const observer = new MutationObserver(() => setDocVersion((v) => v + 1));
    observer.observe(view.contentDOM, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [view]);

  // Subscribe to section geometry changes
  useEffect(() => {
    if (!view) return;

    const plugin = view.plugin(sectionGeometry);
    if (!plugin) return;

    const unsub = plugin.addListener(setRects);
    return unsub;
  }, [view]);

  // Scroll sync: listen to .cm-scroller scroll events
  useEffect(() => {
    if (!view) return;

    const scroller = view.scrollDOM;
    const handleScroll = () => {
      setScrollTop(scroller.scrollTop);
    };

    // Initial sync
    setScrollTop(scroller.scrollTop);
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, [view]);

  // Filter to slots that have width > 0
  const visibleSlots = rects.filter((rect) => {
    const state = widths.get(rect.sectionId);
    return state && state.effectiveWidth > 0;
  });

  if (!view || visibleSlots.length === 0) return null;

  return (
    <div
      ref={trackRef}
      className="overlay-track"
      style={{
        position: "absolute",
        top: 0,
        left: contentInsets.left,
        right: contentInsets.right,
        bottom: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "relative",
          transform: `translateY(${-scrollTop}px)`,
          willChange: "transform",
        }}
      >
        {visibleSlots.map((rect) => {
          const state = widths.get(rect.sectionId)!;
          const isActive = rect.sectionId === activeSectionId;

          // When clicking on the overlay background (not on a button/input/a),
          // resolve the document position from click coordinates and move the
          // editor cursor there so the user isn't stuck.
          const handleSlotClick = (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            if (target.closest("button,a,input,select,textarea,[role=button]")) return;
            const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
            if (pos == null) return;
            view.dispatch({ selection: { anchor: pos } });
            view.focus();
          };

          return (
            <div
              key={rect.sectionId}
              className={`overlay-slot ${isActive ? "overlay-slot-active" : ""}`}
              style={{
                position: "absolute",
                top: rect.top,
                right: 0,
                width: `${state.effectiveWidth}%`,
                height: rect.height,
                pointerEvents: "auto",
                transition: "width 150ms ease, opacity 150ms ease",
                overflow: "hidden",
              }}
              onClick={handleSlotClick}
            >
              {renderSlot?.({
                sectionId: rect.sectionId,
                sectionType: rect.type,
                rect,
                widthPercent: state.effectiveWidth,
                isActive,
                view,
                docVersion,
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
