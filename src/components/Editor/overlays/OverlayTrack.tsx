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

// ── Minimum slot heights (px) ────────────────────────────────────────
// Slots expand to at least this height and re-center against their section.
const MIN_SLOT_HEIGHT: Partial<Record<EditorSectionType, number>> = {
  frontmatter: 280,
  wod:         200,
  code:        140,
  widget:      220,
};

// ── Running slot constants ─────────────────────────────────────────────
// When a WOD section has an active runtime, the overlay slot grows to
// accommodate the full TimerScreen and sticks within the visible viewport.
const RUNNING_MIN_HEIGHT_RATIO = 0.75; // 75% of scroller height
const RUNNING_SLOT_WIDTH       = 70;   // % of content area width
const RUNNING_STICKY_PADDING   = 16;   // px from top of visible area

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
  /** True when there is an active runtime panel for this section. */
  isRuntimeActive?: boolean;
  /** True when the runtime panel is in expanded (full content area) mode. */
  isRuntimeExpanded?: boolean;
  /** Widget name (only when sectionType === "widget"). */
  widgetName?: string;
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
  /** Section IDs that currently have an active runtime — slot grows + sticks */
  runtimeActiveSectionIds?: Set<string>;
  /** Section IDs whose runtime overlay is in expanded (full-height) mode */
  expandedRuntimeSectionIds?: Set<string>;
  /** Current cursor line (1-based) — used to center the slot on the active line */
  cursorLine?: number;
}

// ── Component ────────────────────────────────────────────────────────

export const OverlayTrack: React.FC<OverlayTrackProps> = ({
  view,
  widths,
  activeSectionId,
  renderSlot,
  runtimeActiveSectionIds,
  expandedRuntimeSectionIds,
  cursorLine,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<SectionRect[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollerHeight, setScrollerHeight] = useState(0);
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
      setScrollerHeight(view.scrollDOM.clientHeight);
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
    setScrollerHeight(scroller.clientHeight);
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
      {/* ── Expanded (full-screen) slots ──────────────────────────────
          These sit directly on the outer track div so they are NOT affected
          by the scroll-translate on the inner div. They fill the entire
          visible content area regardless of scroll position. */}
      {visibleSlots
        .filter((rect) => {
          const isRunning = runtimeActiveSectionIds?.has(rect.sectionId) ?? false;
          return isRunning && (expandedRuntimeSectionIds?.has(rect.sectionId) ?? false);
        })
        .map((rect) => {
          const state = widths.get(rect.sectionId)!;
          const isActive = rect.sectionId === activeSectionId;
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
              key={`expanded-${rect.sectionId}`}
              className={`overlay-slot overlay-slot-running overlay-slot-expanded ${isActive ? "overlay-slot-active" : ""}`}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "auto",
                overflow: "hidden",
                zIndex: 30,
                transition: "width 150ms ease, height 150ms ease",
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
                isRuntimeExpanded: true,
                widgetName: rect.widgetName,
              })}
            </div>
          );
        })}

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
          const isRunning = runtimeActiveSectionIds?.has(rect.sectionId) ?? false;
          const isExpanded = isRunning && (expandedRuntimeSectionIds?.has(rect.sectionId) ?? false);

          // Expanded slots are rendered scroll-locked above — skip them here.
          if (isExpanded) return null;

          // ── Slot height ────────────────────────────────────────────
          // Expanded: fill 100% of the visible scroller height.
          // Running: expand to cover ≥75% of scroller height.
          // Normal: expand to a minimum per-type height.
          const runningMinH = Math.round(
            (scrollerHeight || window.innerHeight) * (isExpanded ? 1.0 : RUNNING_MIN_HEIGHT_RATIO),
          );
          const minH = isRunning ? runningMinH : (MIN_SLOT_HEIGHT[rect.type] ?? 0);
          // Widget slots use a fixed height — their section height is inflated
          // by the JSON body lines which aren't displayed in the slot.
          const effectiveHeight = rect.type === "widget"
            ? minH
            : Math.max(rect.height, minH);

          // ── Slot width ──────────────────────────────────────────────
          // Expanded: fill 100% of the content area (full viewing area).
          // Running (not expanded): 70% width panel beside the editor text.
          // Normal: use the computed overlay width.
          const slotWidthPct = isExpanded ? 100 : (isRunning ? RUNNING_SLOT_WIDTH : state.effectiveWidth);

          // ── Slot vertical position ──────────────────────────────────
          // Running: center on section midline; then sticky-clamp within viewport
          //          when the section is taller than the slot.
          // Normal:  center on cursor line (if in section) or section midline.
          let slotTop: number;
          if (isRunning) {
            // Always center on the section midline.
            // Then apply sticky clamping so the slot stays within the visible
            // viewport when the section is taller than the slot.
            const sectionMidY = rect.top + rect.height / 2;
            const centeredTop = sectionMidY - effectiveHeight / 2;

            if (effectiveHeight >= rect.height) {
              // Panel is larger than the section: just center it on the section,
              // never go above absolute track top.
              slotTop = Math.max(0, centeredTop);
            } else {
              // Panel fits within the section: keep it sticky within the viewport
              // so it stays visible while the user scrolls through a long section.
              const stickyTarget = scrollTop + RUNNING_STICKY_PADDING;
              const maxTop = rect.top + rect.height - effectiveHeight;
              // prefer sticking to viewport top, but never above section top or
              // below section bottom
              slotTop = Math.max(rect.top, Math.min(stickyTarget, maxTop));
            }
          } else {
            // Centering logic for normal (non-running) slots:
            //   - Slot LARGER than section  → center on the section midline.
            //   - Slot SMALLER than section → center on the cursor line (if cursor
            //     is inside this section), otherwise center on section midline.
            //   Result is clamped so the slot never rises above the track's top.
            const sectionMidY = rect.top + rect.height / 2;
            let targetCenterY = sectionMidY;

            if (effectiveHeight < rect.height && cursorLine !== undefined && view) {
              // Convert cursor line to document-space Y (top of that line block).
              try {
                const lineCount = view.state.doc.lines;
                const safeLine = Math.max(1, Math.min(cursorLine, lineCount));
                const lineFrom = view.state.doc.line(safeLine).from;
                const lineBlock = view.lineBlockAt(lineFrom);
                const cursorDocY = lineBlock.top + lineBlock.height / 2;
                // Only use cursor centering if the cursor is within the section.
                if (cursorDocY >= rect.top && cursorDocY <= rect.top + rect.height) {
                  targetCenterY = cursorDocY;
                }
              } catch {
                // lineBlockAt can throw on unmounted views — fall back to midline
              }
            }

            const unclamped = targetCenterY - effectiveHeight / 2;
            // Never go above track top (0), never push bottom below section end.
            slotTop = Math.max(
              0,
              Math.min(unclamped, rect.top + rect.height - effectiveHeight),
            );
          }

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
              className={`overlay-slot ${isActive ? "overlay-slot-active" : ""} ${isRunning ? "overlay-slot-running" : ""}`}
              style={{
                position: "absolute",
                top: slotTop,
                right: 0,
                width: `${slotWidthPct}%`,
                height: effectiveHeight,
                pointerEvents: "auto",
                transition: isRunning
                  ? "top 80ms ease, width 150ms ease, height 150ms ease"
                  : "width 150ms ease, opacity 150ms ease",
                overflow: "hidden",
                zIndex: isRunning ? 20 : undefined,
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
                isRuntimeExpanded: isExpanded,
                widgetName: rect.widgetName,
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
