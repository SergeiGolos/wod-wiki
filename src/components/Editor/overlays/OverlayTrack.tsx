/**
 * OverlayTrack
 *
 * React component that renders section-aligned overlay slots on top of the
 * CodeMirror editor. Each slot is positioned at the section's measured geometry
 * and sized to the computed overlay width (0-100% from the right edge).
 *
 * Layout model:
 *  - The track is `position: absolute; top: 0; right: 0; pointer-events: none`
 *    inside the `cm-unified-editor` container.
 *  - It is scroll-synced with `.cm-scroller` via `transform: translateY(-scrollTop)`.
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
        right: 0,
        left: 0,
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
            >
              {renderSlot?.({
                sectionId: rect.sectionId,
                sectionType: rect.type,
                rect,
                widthPercent: state.effectiveWidth,
                isActive,
                view,
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
