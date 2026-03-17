/**
 * OverlayTrack
 *
 * Renders section-aligned overlay slots on top of the CodeMirror editor.
 *
 * Layout model:
 *  - Track is `position: absolute`, inset to the content area (after gutter,
 *    before scrollbar).
 *  - Track inner div is scroll-synced via `translateY(-scrollTop)`.
 *  - Each WOD slot spans the FULL section height but is transparent — only its
 *    absolutely-positioned children (strip, card) are visible.
 *  - The sticky run-button STRIP is always visible, following the viewport
 *    top as the section scrolls past it (sticky within section bounds).
 *  - The metric CARD appears on hover or cursor focus, positioned near the
 *    target line, without hiding the strip.
 */

import React, { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import type { SectionRect } from "../extensions/section-geometry";
import { sectionGeometry } from "../extensions/section-geometry";
import type { SectionOverlayState } from "./useOverlayWidthState";
import type { EditorSectionType } from "../extensions/section-state";

// ── Non-wod slot heights (px) ────────────────────────────────────────
const SLOT_HEIGHT_INACTIVE: Partial<Record<EditorSectionType, number>> = {
  frontmatter: 120,
  code:        60,
  widget:      220,
  embed:       180,
};
const SLOT_HEIGHT_ACTIVE: Partial<Record<EditorSectionType, number>> = {
  frontmatter: 280,
  code:        140,
  widget:      220,
  embed:       280,
};

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
  /** Widget name (only when sectionType === "widget"). */
  widgetName?: string;
  /** 1-based line number the mouse is hovering over (undefined = not in this section). */
  hoverLine?: number;
  /**
   * For WOD slots: how many px the section top has scrolled above the viewport.
   * Used to position the sticky strip inside the full-height transparent slot.
   */
  stickyTopOffset: number;
  isPanelHovered: boolean;
  /** Document-space Y midpoint of the cursor/hover line; WodCompanion uses this to center the card. */
  lineDocY?: number;
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
  /** Current cursor line (1-based) — used to center the card on the active line */
  cursorLine?: number;
}

// ── Component ────────────────────────────────────────────────────────

export const OverlayTrack: React.FC<OverlayTrackProps> = ({
  view,
  widths,
  activeSectionId,
  renderSlot,
  cursorLine,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<SectionRect[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [contentInsets, setContentInsets] = useState<{ left: number; right: number }>({ left: 0, right: 0 });
  const [docVersion, setDocVersion] = useState(0);
  // 1-based doc line under the mouse pointer (undefined when outside)
  const [hoverLine, setHoverLine] = useState<number | undefined>(undefined);
  // sectionId whose panel the mouse is physically over (keeps panel pinned)
  const [hoverSectionId, setHoverSectionId] = useState<string | undefined>(undefined);

  // Measure gutter + scrollbar insets
  useEffect(() => {
    if (!view) return;
    const measure = () => {
      const gutterWidth = view.contentDOM.offsetLeft;
      const scrollbarWidth = view.scrollDOM.offsetWidth - view.scrollDOM.clientWidth;
      setContentInsets({ left: gutterWidth, right: scrollbarWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view.dom);
    return () => observer.disconnect();
  }, [view]);

  // MutationObserver → docVersion bump on every CM6 dispatch
  useEffect(() => {
    if (!view) return;
    const observer = new MutationObserver(() => setDocVersion((v) => v + 1));
    observer.observe(view.contentDOM, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [view]);

  // Section geometry subscription
  useEffect(() => {
    if (!view) return;
    const plugin = view.plugin(sectionGeometry);
    if (!plugin) return;
    return plugin.addListener(setRects);
  }, [view]);

  // Scroll sync
  useEffect(() => {
    if (!view) return;
    const scroller = view.scrollDOM;
    const handleScroll = () => setScrollTop(scroller.scrollTop);
    setScrollTop(scroller.scrollTop);
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, [view]);

  // Hover-line tracking at DOCUMENT level so events fire even when the
  // mouse is over the overlay panel (which is a sibling of the CM scroller,
  // not a child, so scroller-level listeners miss those events).
  useEffect(() => {
    if (!view) return;
    const scroller = view.scrollDOM;
    const handleMouseMove = (e: MouseEvent) => {
      const bounds = scroller.getBoundingClientRect();
      if (
        e.clientY < bounds.top || e.clientY > bounds.bottom ||
        e.clientX < bounds.left || e.clientX > bounds.right
      ) {
        setHoverLine(undefined);
        return;
      }
      try {
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos == null) { setHoverLine(undefined); return; }
        setHoverLine(view.state.doc.lineAt(pos).number);
      } catch {
        setHoverLine(undefined);
      }
    };
    const handleMouseLeave = () => setHoverLine(undefined);
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    scroller.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      scroller.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [view]);

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
        overflow: "visible",
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
          const isPanelHovered = hoverSectionId === rect.sectionId;

          // ── For WOD blocks: slot always spans full section height ────
          // The WodCompanion renders its children (strip + card) using
          // absolute positioning within this transparent full-height container.
          let slotTop: number;
          let slotHeight: number;

          if (rect.type === "wod") {
            slotTop = rect.top;
            slotHeight = rect.height;
          } else {
            // Non-WOD: sized and centered as before
            const isComp = isActive;
            const heightMap = isComp ? SLOT_HEIGHT_ACTIVE : SLOT_HEIGHT_INACTIVE;
            const minH = heightMap[rect.type] ?? 0;
            slotHeight = rect.type === "widget" ? minH : Math.max(rect.height, minH);

            if (isActive) {
              // Center on cursor line for active non-wod slots
              const sectionMidY = rect.top + rect.height / 2;
              let targetCenterY = sectionMidY;
              if (cursorLine !== undefined) {
                try {
                  const lineCount = view.state.doc.lines;
                  const safeLine = Math.max(1, Math.min(cursorLine, lineCount));
                  const lineFrom = view.state.doc.line(safeLine).from;
                  const lb = view.lineBlockAt(lineFrom);
                  const y = lb.top + lb.height / 2;
                  if (y >= rect.top && y <= rect.top + rect.height) targetCenterY = y;
                } catch { /* ignore */ }
              }
              const unclamped = targetCenterY - slotHeight / 2;
              slotTop = Math.max(rect.top, Math.min(unclamped, rect.top + rect.height - slotHeight));
            } else {
              slotTop = rect.top;
            }
          }

          // stickyTopOffset: clamped to [0, rect.height - 28] so strip stays within section.
          const STRIP_H = 28;
          const rawSticky = Math.max(0, scrollTop - rect.top);
          const stickyTopOffset = Math.min(rawSticky, Math.max(0, rect.height - STRIP_H));

          // lineDocY: document-space Y midpoint of the active cursor or hover line,
          // only for WOD blocks. WodCompanion uses it to center the metric card.
          let lineDocY: number | undefined;
          if (rect.type === "wod") {
            const refLine = isActive ? cursorLine : hoverLine;
            if (refLine !== undefined) {
              try {
                const sf = Math.max(1, Math.min(refLine, view.state.doc.lines));
                const lb = view.lineBlockAt(view.state.doc.line(sf).from);
                const y = lb.top + lb.height / 2;
                if (y >= rect.top && y <= rect.top + rect.height) lineDocY = y;
              } catch { /* ignore */ }
            }
          }

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
                top: slotTop,
                right: 0,
                width: `${state.effectiveWidth}%`,
                height: slotHeight,
                pointerEvents: rect.type === "wod" ? "none" : "auto",
                transition: "width 150ms ease",
                overflow: "visible",
              }}
              onClick={rect.type !== "wod" ? handleSlotClick : undefined}
              onMouseEnter={() => setHoverSectionId(rect.sectionId)}
              onMouseLeave={() => setHoverSectionId(undefined)}
            >
              {renderSlot?.({
                sectionId: rect.sectionId,
                sectionType: rect.type,
                rect,
                widthPercent: state.effectiveWidth,
                isActive,
                view,
                docVersion,
                widgetName: rect.widgetName,
                hoverLine,
                stickyTopOffset,
                isPanelHovered,
                lineDocY,
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
