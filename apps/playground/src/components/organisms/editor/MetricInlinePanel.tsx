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
import { MetricType } from '@bitcobblers/wod-wiki-engine';
import type { IMetric } from '@bitcobblers/wod-wiki-engine';
import { getCursorFocusState, type CursorFocusState } from '@/app/editor/cursorFocusExtension';
import { presentThemedGroup } from "@/components/metrics/presentation";
import type { SegmentType } from "@/components/organisms/command-palette/segmentSources";
import { cn } from "@/lib/utils";
import type { ScriptCommand } from "@/components/Editor/overlays/ScriptCommand";

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

/** Metric types that map onto statement-builder segments (clickable). */
const SEGMENT_FOR_METRIC: Partial<Record<string, SegmentType>> = {
  [MetricType.Rep]:        'reps',
  [MetricType.Effort]:     'movement',
  [MetricType.Resistance]: 'weight',
};

const MetricChip: React.FC<{
  metric: IMetric;
  tooltip?: string;
  isFocused: boolean;
  onClick?: () => void;
}> = ({ metric, tooltip, isFocused, onClick }) => {
  const style = METRIC_STYLES[metric.type as string];
  const isHint = metric.type === MetricType.Hint;
  const displayVal =
    metric.image ?? (metric.value !== undefined ? String(metric.value) : "");
  const label = style?.label ?? String(metric.type);

  return (
    <span
      title={tooltip}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium",
        "pointer-events-auto transition-opacity hover:opacity-80",
        style?.bgClass ?? "bg-muted/30",
        style?.textClass ?? "text-muted-foreground",
        style?.borderClass ?? "border-border/40",
        onClick && "cursor-pointer",
        isFocused && "font-bold shadow-sm",
      )}
    >
      <span>{isHint ? metric.icon : (style?.icon ?? "•")}</span>
      {!isHint && <span>{label}</span>}
      {!isHint && displayVal && (
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
    const editorRect = view.dom?.getBoundingClientRect?.() ?? { top: 0, left: 0 };
    const contentRect = view.contentDOM?.getBoundingClientRect?.() ?? { left: 0, width: 0 };
    return {
      top: coords.bottom - editorRect.top,   // flush below text in the active line's padding space
      left: contentRect.left - editorRect.left,  // relative to editor left (accounting for gutter)
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
  /** Optional override of getCursorFocusState for testing. */
  getCursorFocusState?: typeof getCursorFocusState;
  /** Commands available on WOD blocks (forwarded to action buttons). */
  commands?: ScriptCommand[];
  /** Note ID (forwarded to commands if needed). */
  noteId?: string;
}

export const MetricInlinePanel: React.FC<MetricInlinePanelProps> = ({
  view,
  cursorVersion,
  getCursorFocusState: getCursorFocusStateProp,
}) => {
  const [pos, setPos] = useState<PanelPosition | null>(null);
  const [focus, setFocus] = useState<CursorFocusState | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Recompute focus state and position whenever cursor version changes
  const update = useCallback(() => {
    if (!view) {
      setFocus(null);
      setPos(null);
      return;
    }

    const nextFocus = (getCursorFocusStateProp ?? getCursorFocusState)(view.state);
    setFocus(nextFocus);
    setPos(nextFocus ? computePosition(view, nextFocus.lineFrom) : null);
  }, [view, getCursorFocusStateProp]);

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
  if (!pos || !focus?.section) return null;

  const lineStatements = focus.allStatements?.filter(s => s.meta?.line === focus.cursorLine - focus.section.startLine)
    ?? (focus.statement ? [focus.statement] : []);
  const visibleMetrics = lineStatements.flatMap(s => s.metrics.toArray()).filter(
    (m) => m.type !== MetricType.Sound && m.type !== MetricType.System
      // Hints are data-only unless authored with an icon; iconed hints render as icon + hover text.
      && !(m.type === MetricType.Hint && !m.icon)
  );
  // Same presentation tokens the effort widget's badges use (tooltip content).
  const tokens = presentThemedGroup(visibleMetrics, 'runtime-badge');

  const handleChipClick = (metric: IMetric) => {
    const segment = SEGMENT_FOR_METRIC[metric.type as string];
    if (!segment) return;
    import("@/components/Editor/services/statementBuilderFlow").then(
      ({ runStatementBuilderFlow }) => {
        runStatementBuilderFlow(focus, view!, segment);
      }
    );
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "cm-metric-inline-panel",
        "absolute z-50 pointer-events-none",
        "flex items-center gap-2 px-3 h-[28px]",
        "bg-background/90 backdrop-blur-sm",
        "border-l border-r border-border/50",
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
              <MetricChip
                key={`${metric.type}-${i}`}
                metric={metric}
                tooltip={metric.type === MetricType.Hint
                  ? String(metric.value ?? '')
                  : tokens[i]?.tooltip}
                isFocused={focus.focusedMetric === metric}
                onClick={SEGMENT_FOR_METRIC[metric.type as string]
                  ? () => handleChipClick(metric)
                  : undefined}
              />
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
