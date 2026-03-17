/**
 * WodCompanion
 *
 * Overlay companion for wod / log / plan fenced code blocks.
 *
 * Layout modes:
 *   INACTIVE (15% strip) — cursor is outside the block.
 *     Shows action buttons (Run, Plan, …) as a compact vertical column.
 *     Shows a minimized latest result line if results exist.
 *
 *   ACTIVE (35% panel) — cursor is inside the block.
 *     Top: Latest result line (if any)
 *     Middle: Metric chips for the statement under the cursor.
 *     Bottom: History of previous results and action buttons.
 */

import React, { useMemo, useState } from "react";
import type { EditorView } from "@codemirror/view";
import type { ICodeStatement } from "@/core/models/CodeStatement";
import { MetricType } from "@/core/models/Metric";
import { MdTimerRuntime } from "@/parser/md-timer";
import { sectionField, type EditorSection } from "../extensions/section-state";
import { cn } from "@/lib/utils";
import type { WodBlock } from "../types";
import type { WodCommand } from "./WodCommand";
import { useWodBlockResults } from "../hooks/useWodBlockResults";
import { History, ExternalLink } from "lucide-react";
import type { Segment } from "@/core/models/AnalyticsModels";
import { getAnalyticsFromLogs } from "@/services/AnalyticsTransformer";

// ── Singleton parser (created once per module) ───────────────────────
const parser = new MdTimerRuntime();

// ── Helpers ──────────────────────────────────────────────────────────

/** Get the EditorSection for this sectionId. */
function getSection(view: EditorView, sectionId: string): EditorSection | null {
  const { sections } = view.state.field(sectionField);
  return sections.find((s) => s.id === sectionId) ?? null;
}

/** Parse the content inside the fences and return ICodeStatements. */
function parseContent(view: EditorView, section: EditorSection): ICodeStatement[] {
  if (section.contentFrom === undefined || section.contentTo === undefined) return [];
  const raw = view.state.doc.sliceString(section.contentFrom, section.contentTo);
  if (!raw.trim()) return [];
  try {
    return parser.read(raw).statements as ICodeStatement[];
  } catch {
    return [];
  }
}

/**
 * Find the statement at the cursor's line within the block.
 * `cursorDocLine` is the 1-based absolute line number in the full document.
 * Content lines start at `section.startLine + 1`.
 */
function findActiveStatement(
  statements: ICodeStatement[],
  section: EditorSection,
  cursorDocLine: number,
): ICodeStatement | null {
  if (!statements.length) return null;
  // 1-based line within the content string
  const lineInContent = cursorDocLine - section.startLine;  // startLine = fence line
  return statements.find((s) => s.meta?.line === lineInContent) ?? null;
}

/** Format milliseconds as M:SS or H:MM:SS */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ── Metric chip data ─────────────────────────────────────────────────

interface MetricChip {
  label: string;
  value: string;
  icon: string;
  color: string;
}

const METRIC_CONFIG: Partial<Record<string, { label: string; icon: string; color: string }>> = {
  [MetricType.Duration]:  { label: "Timer",    icon: "⏱",  color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  [MetricType.Rep]:       { label: "Reps",     icon: "✕",  color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  [MetricType.Effort]:    { label: "Exercise", icon: "🏋",  color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  [MetricType.Rounds]:    { label: "Rounds",   icon: "↻",  color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  [MetricType.Distance]:  { label: "Distance", icon: "📏", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  [MetricType.Resistance]:{ label: "Weight",   icon: "⚖",  color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  [MetricType.Action]:    { label: "Action",   icon: "⚡",  color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
};

function metricChips(statement: ICodeStatement): MetricChip[] {
  return statement.metrics
    .filter((m) => m.type !== MetricType.Sound && m.type !== MetricType.System)
    .map((m) => {
      const cfg = METRIC_CONFIG[m.type as string];
      const displayVal = m.image ?? (m.value !== undefined ? String(m.value) : "—");
      return {
        label: cfg?.label ?? String(m.type),
        value: displayVal,
        icon: cfg?.icon ?? "•",
        color: cfg?.color ?? "bg-muted text-muted-foreground",
      };
    });
}

// ── Block resolver ────────────────────────────────────────────────────

function buildWodBlock(view: EditorView, section: EditorSection): WodBlock {
  const content =
    section.contentFrom !== undefined && section.contentTo !== undefined
      ? view.state.doc.sliceString(section.contentFrom, section.contentTo)
      : "";
  return {
    id: section.id,
    dialect: section.dialect || "wod",
    startLine: section.startLine - 1,
    endLine: section.endLine - 1,
    content,
    state: "idle",
    version: 1,
    createdAt: Date.now(),
    widgetIds: {},
  };
}

// ── CommandButtons ────────────────────────────────────────────────────
/**
 * Renders a row (active) or vertical strip (compact/inactive) of command
 * buttons.  The first `visibleCount` commands are shown directly; any
 * remaining commands are hidden behind a "…" overflow menu.
 */
const CommandButtons: React.FC<{
  commands: WodCommand[];
  visibleCount: number;
  section: EditorSection;
  view: EditorView;
  compact?: boolean;
}> = ({ commands, visibleCount, section, view, compact }) => {
  const [overflowOpen, setOverflowOpen] = useState(false);

  if (!commands.length) return null;

  const visible = commands.slice(0, visibleCount);
  const overflow = commands.slice(visibleCount);

  const fire = (cmd: WodCommand) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cmd.onClick(buildWodBlock(view, section));
  };

  // ── COMPACT (inactive strip) ── thin pill buttons, top-right corner
  if (compact) {
    return (
      <div className="flex flex-row items-center gap-1 p-1.5">
        {visible.map((cmd) => (
          <button
            key={cmd.id}
            title={cmd.label}
            onClick={fire(cmd)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-medium transition-colors shadow-sm whitespace-nowrap",
              cmd.primary
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50",
            )}
          >
            <span className="flex items-center h-3 w-3">{cmd.icon}</span>
            <span>{cmd.label}</span>
          </button>
        ))}
        {overflow.length > 0 && (
          <div className="relative">
            <button
              title="More actions"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOverflowOpen((o) => !o);
              }}
              className="flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium transition-colors shadow-sm bg-muted/60 hover:bg-muted text-muted-foreground border border-border/50"
            >
              …
            </button>
            {overflowOpen && (
              <div className="absolute right-0 bottom-full mb-1 z-50 min-w-[110px] bg-popover border border-border rounded-md shadow-lg py-1">
                {overflow.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={(e) => {
                      setOverflowOpen(false);
                      fire(cmd)(e);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-muted text-foreground"
                  >
                    <span className="flex items-center">{cmd.icon}</span>
                    <span>{cmd.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── FULL ROW (active 35% panel) ── icon + label horizontal
  return (
    <div className="flex items-center gap-1.5 p-2 border-t border-border/50 flex-wrap">
      {visible.map((cmd) => (
        <button
          key={cmd.id}
          title={cmd.label}
          onClick={fire(cmd)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-medium transition-colors shadow-sm",
            cmd.primary
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50",
          )}
        >
          <span className="flex items-center h-3 w-3">{cmd.icon}</span>
          <span>{cmd.label}</span>
        </button>
      ))}
      {overflow.length > 0 && (
        <div className="relative">
          <button
            title="More actions"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOverflowOpen((o) => !o);
            }}
            className="flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium transition-colors shadow-sm bg-muted text-muted-foreground hover:bg-muted/80 border border-border/50"
          >
            …
          </button>
          {overflowOpen && (
            <div className="absolute bottom-full right-0 mb-1 z-50 min-w-[120px] bg-popover border border-border rounded-md shadow-lg py-1">
              {overflow.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={(e) => {
                    setOverflowOpen(false);
                    fire(cmd)(e);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-muted text-foreground"
                >
                  <span className="flex items-center">{cmd.icon}</span>
                  <span>{cmd.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── ResultLine Component ──────────────────────────────────────────────

const ResultLine: React.FC<{
  result: any;
  onOpenReview?: (segments: Segment[]) => void;
  compact?: boolean;
}> = ({ result, onOpenReview, compact }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (result.data?.logs && onOpenReview) {
      const { segments } = getAnalyticsFromLogs(result.data.logs as any, result.data.startTime);
      onOpenReview(segments);
    }
  };

  if (compact) {
    return (
      <div 
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors group bg-primary/10 border border-primary/20 rounded-md shadow-sm"
        title={`Latest: ${formatDuration(result.data.duration)} (${new Date(result.completedAt).toLocaleDateString()})`}
      >
        <History className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-mono font-bold text-primary">{formatDuration(result.data.duration)}</span>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/10 cursor-pointer transition-colors border-b border-border/30 bg-primary/5"
    >
      <History className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="flex-1 flex items-center justify-between min-w-0">
        <span className="text-[10px] text-foreground font-bold truncate">
          {formatDuration(result.data.duration)}
        </span>
        <span className="text-[9px] text-muted-foreground whitespace-nowrap ml-2">
          {new Date(result.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────

export interface WodCompanionProps {
  /** Note ID for results lookup */
  noteId?: string;
  sectionId: string;
  view: EditorView;
  isActive: boolean;
  widthPercent: number;
  /** Absolute 1-based document line number of the cursor (for metric lookup). */
  cursorLine: number;
  /** Absolute 1-based document line number the mouse is hovering over (may be undefined when mouse is over the panel itself). */
  hoverLine?: number;
  /** How many px the section top has scrolled above the viewport. */
  stickyTopOffset: number;
  /** True while the mouse is physically over the slot (keeps card pinned). */
  isPanelHovered: boolean;
  /** Document-space Y midpoint of cursor/hover line (for card centering). */
  lineDocY?: number;
  /** Section rect — used for card position clamping. */
  rect: import('../extensions/section-geometry').SectionRect;
  /** Increments on every document change — forces re-parse on content edits. */
  docVersion: number;
  /** Commands to display as action buttons. */
  commands: WodCommand[];
  /** How many commands show as direct buttons. Default: 1. */
  visibleCount?: number;
  /** Callback to open the full-screen review grid for a set of segments. */
  onOpenReview?: (segments: Segment[]) => void;
}

export const WodCompanion: React.FC<WodCompanionProps> = ({
  noteId: propNoteId,
  sectionId,
  view,
  isActive,
  cursorLine,
  hoverLine,
  stickyTopOffset,
  isPanelHovered,
  lineDocY,
  rect,
  docVersion,
  commands,
  visibleCount = 1,
  onOpenReview,
}) => {
  const noteId = propNoteId || (view.state as any).noteId || "current";
  const { results } = useWodBlockResults(noteId, sectionId);

  const section = useMemo(
    () => getSection(view, sectionId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, sectionId, docVersion],
  );

  const statements = useMemo(
    () => (section ? parseContent(view, section) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, section?.id, docVersion],
  );

  // Track last valid hoverLine inside this section so the card doesn't blank
  // when the mouse moves from editor text into the panel itself.
  const lastHoverLineRef = React.useRef<number | null>(null);
  const hoverInsideSection = section && hoverLine !== undefined
    && hoverLine >= section.startLine
    && hoverLine <= section.endLine;
  if (hoverInsideSection && hoverLine !== undefined) {
    lastHoverLineRef.current = hoverLine;
  }

  // Use remembered line when panel is hovered but hoverLine dropped off
  const effectiveHoverLine = hoverInsideSection
    ? hoverLine!
    : (isPanelHovered ? (lastHoverLineRef.current ?? null) : null);

  const effectiveLine = isActive ? cursorLine : (effectiveHoverLine ?? cursorLine);

  // Don't show the card when on the opening ```wod or closing ``` fence lines
  const onFenceLine = section
    ? effectiveLine === section.startLine || effectiveLine === section.endLine
    : false;
  const showCard = !onFenceLine && (isActive || effectiveHoverLine !== null);

  const activeStatement = useMemo(
    () => (section && showCard ? findActiveStatement(statements, section, effectiveLine) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section, effectiveLine, showCard, statements],
  );

  const chips = useMemo(
    () => (activeStatement ? metricChips(activeStatement) : []),
    [activeStatement],
  );

  if (!section) return null;

  const lineText = (activeStatement?.meta as any)?.raw ?? "";
  const lineInContent = effectiveLine - section.startLine;

  // The slot is full-height and transparent. We render two absolute children:
  //  1. STRIP — always visible, sticky to top of viewport within section bounds
  //  2. CARD  — compact metric panel, shown on hover/active, positioned below strip

  const STRIP_H = 28;
  const CARD_H  = 200;

  // Card top: centered on the active line, but clamped to stay within the slot
  // and below the sticky strip. lineDocY is document-space, rect.top is slot top.
  let cardTop: number;
  if (lineDocY !== undefined) {
    const lineRelY = lineDocY - rect.top;              // line Y relative to slot top
    const centered = lineRelY - CARD_H / 2;           // center card on line
    const minTop = stickyTopOffset + STRIP_H + 4;     // must be below strip
    const maxTop = rect.height - CARD_H;              // must not overflow slot bottom
    cardTop = Math.max(minTop, Math.min(centered, Math.max(minTop, maxTop)));
  } else {
    cardTop = stickyTopOffset + STRIP_H + 4;          // fallback: just below strip
  }

  return (
    <div className="relative w-full h-full" style={{ pointerEvents: "none" }}>

      {/* ── STRIP: always visible, sticky-top ────────────────────── */}
      <div
        className="absolute inset-x-0 flex items-center justify-end gap-1 px-2 pointer-events-auto
                   bg-background/70 backdrop-blur-sm border-l border-b border-border/40 rounded-bl-md"
        style={{ top: stickyTopOffset, height: STRIP_H }}
      >
        {results.length > 0 && (
          <ResultLine result={results[0]} onOpenReview={onOpenReview} compact />
        )}
        <CommandButtons
          commands={commands}
          visibleCount={visibleCount}
          section={section}
          view={view}
          compact
        />
      </div>

      {/* ── CARD: compact metric panel on hover / cursor ─────────── */}
      {showCard && (
        <div
          className="absolute inset-x-0 flex flex-col bg-popover/95 backdrop-blur-md
                     border border-border/80 shadow-xl rounded-lg overflow-hidden pointer-events-auto"
          style={{ top: cardTop, maxHeight: CARD_H }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/50 shrink-0">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase tracking-wider font-semibold">
              {section.dialect ?? "wod"}
            </span>
            <div className="flex items-center min-w-0 gap-2">
              <span className="text-xs text-muted-foreground/60">L{lineInContent}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs font-mono text-foreground/90 truncate font-medium" title={lineText}>
                {lineText || <span className="italic text-muted-foreground">—</span>}
              </span>
            </div>
          </div>

          {/* Metric chips */}
          <div className="px-3 py-2.5 min-h-0 overflow-auto">
            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-semibold ${chip.color}`}
                    title={chip.label}
                  >
                    <span className="text-base leading-none">{chip.icon}</span>
                    <span className="font-mono tracking-tight">{chip.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs italic text-muted-foreground">No metrics on this line</span>
            )}
          </div>

          {/* Latest result */}
          {results.length > 0 && (
            <div className="border-t border-border/40 shrink-0">
              <ResultLine result={results[0]} onOpenReview={onOpenReview} compact />
            </div>
          )}

          {/* Action buttons */}
          <div className="border-t border-border/40 shrink-0">
            <CommandButtons commands={commands} visibleCount={visibleCount} section={section} view={view} />
          </div>
        </div>
      )}
    </div>
  );
};

