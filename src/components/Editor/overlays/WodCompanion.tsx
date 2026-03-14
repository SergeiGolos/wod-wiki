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

import React, { useMemo } from "react";
import type { EditorView } from "@codemirror/view";
import type { ICodeStatement } from "@/core/models/CodeStatement";
import { MetricType } from "@/core/models/Metric";
import { MdTimerRuntime } from "@/parser/md-timer";
import { sectionField, type EditorSection } from "../extensions/section-state";
import { getOverlayActions, type OverlayAction } from "../extensions/wod-overlay";

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

// ── Sub-components ───────────────────────────────────────────────────

const ActionButtons: React.FC<{
  section: EditorSection;
  view: EditorView;
  actions: OverlayAction[];
  compact?: boolean;
}> = ({ section, view, actions, compact }) => {
  if (!actions.length) return null;

  if (compact) {
    // Narrow strip: icon-only tall buttons stacked vertically
    return (
      <div className="flex flex-col items-center gap-1.5 p-1.5">
        {actions.map((a) => (
          <button
            key={a.label}
            title={a.label}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              a.action(view, section);
            }}
            className="w-full flex flex-col items-center gap-0.5 px-1 py-1.5 rounded text-[10px] font-medium
              bg-muted/60 hover:bg-primary hover:text-primary-foreground
              text-muted-foreground transition-colors"
          >
            <span className="text-sm leading-none">{a.icon}</span>
            <span className="leading-none opacity-80" style={{ fontSize: "8px" }}>
              {a.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Full row
  return (
    <div className="flex items-center gap-1 p-2 border-t border-border/50">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            a.action(view, section);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium
            bg-muted hover:bg-primary hover:text-primary-foreground
            text-muted-foreground transition-colors"
        >
          <span>{a.icon}</span>
          <span>{a.label}</span>
        </button>
      ))}
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
}

export const WodCompanion: React.FC<WodCompanionProps> = ({
  sectionId,
  view,
  isActive,
  cursorLine,
  docVersion,
}) => {
  const section = useMemo(
    () => getSection(view, sectionId),
    // docVersion forces re-lookup when doc content changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, sectionId, docVersion],
  );
  const actions = useMemo(() => getOverlayActions(), []);

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
      <div className="h-full w-full flex flex-col bg-popover/60 backdrop-blur-sm border-l border-border/50 overflow-hidden">
        {/* Dialect badge */}
        <div className="px-1.5 py-1 border-b border-border/30 flex justify-center">
          <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground/70">
            {section.dialect ?? "wod"}
          </span>
        </div>
        <ActionButtons section={section} view={view} actions={actions} compact />
      </div>
    );
  }

  // ── ACTIVE: metric details + action buttons ──────────────────────
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
      <div className="flex-1 px-2.5 py-2 overflow-auto">
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

      {/* Action buttons */}
      <ActionButtons section={section} view={view} actions={actions} />
    </div>
  );
};
