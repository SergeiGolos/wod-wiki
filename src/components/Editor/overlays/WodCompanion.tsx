/**
 * WodCompanion
 *
 * Overlay companion for wod / log / plan fenced code blocks.
 *
 * Layout modes:
 *   INACTIVE (15% strip) — cursor is outside the block.
 *     Shows action buttons (Run, Plan, …) as a compact vertical column.
 *
 *   ACTIVE (35% panel) — cursor is inside the block.
 *     Top half: metric chips for the statement under the cursor, showing
 *       every parsed fragment with its type, value, and unit.
 *     Bottom: same action buttons in a horizontal row.
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
import { useWodBlockResults } from "../../hooks/useWodBlockResults";
import { History, ExternalLink } from "lucide-react";
import type { Segment } from "@/core/models/AnalyticsModels";

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
  const match = statements.find((s) => s.meta?.line === lineInContent);
  return match ?? statements[0];
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
      <div className="flex flex-col items-end gap-1 p-1.5">
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
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[110px] bg-popover border border-border rounded-md shadow-lg py-1">
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

// ── Main component ───────────────────────────────────────────────────

export interface WodCompanionProps {
  sectionId: string;
  view: EditorView;
  isActive: boolean;
  widthPercent: number;
  /** Absolute 1-based document line number of the cursor (for metric lookup). */
  cursorLine: number;
  /** Increments on every document change — forces re-parse on content edits. */
  docVersion: number;
  /** Commands to display as action buttons. */
  commands: WodCommand[];
  /**
   * How many commands show as direct buttons.  Additional commands are hidden
   * behind a "…" overflow menu.  Default: 1.
   */
  visibleCount?: number;
  /** Callback to open the full-screen review grid for a set of segments. */
  onOpenReview?: (segments: Segment[]) => void;
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

export const WodCompanion: React.FC<WodCompanionProps> = ({
  sectionId,
  view,
  isActive,
  cursorLine,
  docVersion,
  commands,
  visibleCount = 1,
  onOpenReview,
}) => {
  // In a real app, this would come from a NoteContext
  const noteId = (view.state as any).noteId || "current";
  const { results } = useWodBlockResults(noteId, sectionId);

  const section = useMemo(
    () => getSection(view, sectionId),
    // docVersion forces re-lookup when doc content changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, sectionId, docVersion],
  );

  const statements = useMemo(
    () => (section ? parseContent(view, section) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, section?.id, docVersion],
  );

  const activeStatement = useMemo(
    () => (section && isActive ? findActiveStatement(statements, section, cursorLine) : null),
    [section, isActive, statements, cursorLine],
  );

  const chips = useMemo(
    () => (activeStatement ? metricChips(activeStatement) : []),
    [activeStatement],
  );

  if (!section) return null;

  // ── INACTIVE: compact action strip ──────────────────────────────
  if (!isActive) {
    return (
      <div className="h-full w-full flex flex-col bg-popover/60 backdrop-blur-sm border-l border-border/50 overflow-visible">
        <CommandButtons commands={commands} visibleCount={visibleCount} section={section} view={view} compact />
        {/* Minimized results indicator if they exist */}
        {results.length > 0 && (
          <div className="mt-auto flex flex-col items-end p-1.5 opacity-50 hover:opacity-100 transition-opacity">
            <div className="bg-muted/80 rounded-sm p-1" title={`${results.length} results`}>
              <History className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ACTIVE: metric details + results + action buttons ─────────────
  const lineText = (activeStatement?.meta as any)?.raw ?? "";
  const lineInContent = cursorLine - section.startLine;

  return (
    <div className="h-full w-full flex flex-col bg-popover/90 backdrop-blur-sm border-l border-border overflow-hidden">
      {/* Header: dialect + current line indicator */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/50 bg-muted/30">
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase tracking-wide">
          {section.dialect ?? "wod"}
        </span>
        <span className="text-[10px] text-muted-foreground">line {lineInContent}</span>
      </div>

      {/* Current line raw text */}
      <div className="px-2.5 py-2 border-b border-border/30">
        <div
          className="text-xs font-mono text-foreground truncate"
          title={lineText}
        >
          {lineText || <span className="italic text-muted-foreground">—</span>}
        </div>
      </div>

      {/* Metric chips */}
      <div className="px-2.5 py-2 border-b border-border/30">
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, i) => (
              <div
                key={i}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${chip.color}`}
                title={chip.label}
              >
                <span>{chip.icon}</span>
                <span className="font-mono">{chip.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[10px] italic text-muted-foreground">No parsed metrics</span>
        )}
      </div>

      {/* Results section */}
      <div className="flex-1 overflow-auto">
        {results.length > 0 && (
          <div className="flex flex-col">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-tight flex items-center gap-1.5 bg-muted/20">
              <History className="h-3 w-3" />
              Recent Results
            </div>
            <div className="divide-y divide-border/30">
              {results.slice(0, 5).map((res) => (
                <div
                  key={res.id}
                  onClick={() => {
                    if (res.data?.logs && onOpenReview) {
                      onOpenReview(res.data.logs as any);
                    }
                  }}
                  className="group flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-foreground font-medium">
                      {new Date(res.completedAt).toLocaleDateString()} {new Date(res.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {formatDuration(res.data.duration)} {res.data.completed ? "" : "(partial)"}
                    </span>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <CommandButtons commands={commands} visibleCount={visibleCount} section={section} view={view} />
    </div>
  );
};

