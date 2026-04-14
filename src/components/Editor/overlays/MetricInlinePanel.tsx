/**
 * MetricInlinePanel
 *
 * React overlay that appears directly below the cursor line when the cursor
 * is inside a WOD code fence. Shows a compact row of metric chips with:
 *   - Color-coded labels matching the underline decorations
 *   - Metric type icon + label + value
 *   - Per-line execution history (if available)
 *   - Action buttons passed via the `commands` prop
 *
 * Positioning: uses CM6's `view.coordsAtPos()` to get the bottom of the
 * cursor line in viewport coordinates, then uses `position: fixed` so no
 * scroll-offset math is needed.
 *
 * The panel hides automatically when the cursor leaves a WOD section.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { EditorView } from "@codemirror/view";
import { MetricType } from "@/core/models/Metric";
import type { IMetric } from "@/core/models/Metric";
import type { ICodeStatement } from "@/core/models/CodeStatement";
import type { EditorSection } from "../extensions/section-state";
import { getCursorFocusState } from "../extensions/cursor-focus-panel";
import { cn } from "@/lib/utils";
import type { WodCommand } from "./WodCommand";

// ── Metric display config ────────────────────────────────────────────

interface MetricStyle {
  label: string;
  icon: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

const METRIC_STYLES: Partial<Record<string, MetricStyle>> = {
  [MetricType.Duration]: {
    label: "Timer", icon: "⏱",
    textClass: "text-metric-time",
    bgClass:   "bg-metric-time/10",
    borderClass: "border-metric-time/30",
  },
  [MetricType.Rep]: {
    label: "Reps", icon: "✕",
    textClass: "text-metric-rep",
    bgClass:   "bg-metric-rep/10",
    borderClass: "border-metric-rep/30",
  },
  [MetricType.Effort]: {
    label: "Exercise", icon: "🏋",
    textClass: "text-metric-effort",
    bgClass:   "bg-metric-effort/10",
    borderClass: "border-metric-effort/30",
  },
  [MetricType.Rounds]: {
    label: "Rounds", icon: "↻",
    textClass: "text-metric-rounds",
    bgClass:   "bg-metric-rounds/10",
    borderClass: "border-metric-rounds/30",
  },
  [MetricType.Distance]: {
    label: "Distance", icon: "📏",
    textClass: "text-metric-distance",
    bgClass:   "bg-metric-distance/10",
    borderClass: "border-metric-distance/30",
  },
  [MetricType.Resistance]: {
    label: "Weight", icon: "⚖",
    textClass: "text-metric-resistance",
    bgClass:   "bg-metric-resistance/10",
    borderClass: "border-metric-resistance/30",
  },
  [MetricType.Action]: {
    label: "Action", icon: "⚡",
    textClass: "text-metric-action",
    bgClass:   "bg-metric-action/10",
    borderClass: "border-metric-action/30",
  },
  [MetricType.Label]: {
    label: "Label", icon: "🏷",
    textClass: "text-muted-foreground",
    bgClass:   "bg-muted/30",
    borderClass: "border-border/40",
  },
};

// ── Metric chip ───────────────────────────────────────────────────────

const MetricChip: React.FC<{ metric: IMetric }> = ({ metric }) => {
  const style = METRIC_STYLES[metric.type as string];
  const displayVal =
    metric.image ?? (metric.value !== undefined ? String(metric.value) : "");
  const label = style?.label ?? String(metric.type);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium",
        style?.bgClass ?? "bg-muted/30",
        style?.textClass ?? "text-muted-foreground",
        style?.borderClass ?? "border-border/40",
      )}
    >
      <span>{style?.icon ?? "•"}</span>
      <span>{label}</span>
      {displayVal && (
        <span className="font-semibold">{displayVal}</span>
      )}
    </span>
  );
};

// ── Panel position ────────────────────────────────────────────────────

interface PanelPosition {
  top: number;
  left: number;
  width: number;
}

function computePosition(
  view: EditorView,
  lineFrom: number
): PanelPosition | null {
  try {
    const coords = view.coordsAtPos(lineFrom);
    if (!coords) return null;
    const contentRect = view.contentDOM.getBoundingClientRect();
    return {
      top: coords.bottom + 2,   // 2px gap below the line
      left: contentRect.left,
      width: contentRect.width,
    };
  } catch {
    return null;
  }
}

// ── Panel component ───────────────────────────────────────────────────

export interface MetricInlinePanelProps {
  /** Live editor view reference. */
  view: EditorView | null;
  /** Increment when cursor line changes (drives re-render). */
  cursorVersion: number;
  /** Commands available on WOD blocks (forwarded to action buttons). */
  commands?: WodCommand[];
  /** Note ID (forwarded to commands if needed). */
  noteId?: string;
}

export const MetricInlinePanel: React.FC<MetricInlinePanelProps> = ({
  view,
  cursorVersion,
}) => {
  const [pos, setPos] = useState<PanelPosition | null>(null);
  const [statement, setStatement] = useState<ICodeStatement | null>(null);
  const [section, setSection] = useState<EditorSection | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Recompute focus state and position whenever cursor version changes
  const update = useCallback(() => {
    if (!view) {
      setStatement(null);
      setSection(null);
      setPos(null);
      return;
    }

    const focus = getCursorFocusState(view.state);
    if (!focus) {
      setStatement(null);
      setSection(null);
      setPos(null);
      return;
    }

    setStatement(focus.statement);
    setSection(focus.section);

    const newPos = computePosition(view, focus.lineFrom);
    setPos(newPos);
  }, [view]);

  useEffect(() => {
    update();
  }, [update, cursorVersion]);

  // Also recompute on window scroll/resize to keep position accurate
  useEffect(() => {
    if (!view) return;
    const handler = () => update();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler, true);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler, true);
    };
  }, [view, update]);

  // Don't render if cursor is outside a WOD section
  if (!pos || !section) return null;

  const visibleMetrics = statement?.metrics.filter(
    (m) => m.type !== MetricType.Sound && m.type !== MetricType.System
  ) ?? [];

  return (
    <div
      ref={panelRef}
      className={cn(
        "cm-metric-inline-panel",
        "fixed z-50 pointer-events-none",
        "flex items-center gap-2 px-3 py-1.5",
        "bg-background/90 border border-border/50 shadow-sm rounded-b-md",
        "backdrop-blur-sm",
        "transition-opacity duration-100",
      )}
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxWidth: pos.width,
      }}
      aria-live="polite"
      aria-label="Metric inline panel"
    >
      {visibleMetrics.length > 0 ? (
        <>
          <span className="text-[10px] text-muted-foreground font-medium shrink-0 select-none">
            Metrics:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleMetrics.map((metric, i) => (
              <MetricChip key={`${metric.type}-${i}`} metric={metric} />
            ))}
          </div>
        </>
      ) : (
        <span className="text-[10px] text-muted-foreground/50 italic select-none">
          No metrics on this line
        </span>
      )}

      {/* Keyboard hint */}
      <span className="ml-auto text-[9px] text-muted-foreground/40 shrink-0 select-none">
        Ctrl+↑↓ · adjust value
      </span>
    </div>
  );
};
