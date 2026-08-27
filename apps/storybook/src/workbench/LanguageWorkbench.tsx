/**
 * Language Workbench Component
 *
 * Interactive development and validation workbench for Whiteboard Script and WQL.
 * Designed with a playground-aligned 2/3 + 1/3 split layout:
 *  - Left Column (2/3 width): Note Editor + Timer / Wall Clock stacked vertically;
 *  - Right Column (1/3 width): State & Data View (Compiled Statements + Streaming Output Timeline);
 *  - Bottom: WQL Aggregate Query Lane + 2×2 Diagnostics Grid.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import crossfitJournal from '../../../../packages/wql/fixtures/corpus/crossfit-multi-week.json';
import {
  QueryService,
  parseQuery,
  isFindQuery,
  isRowsQuery,
  type QueryResult,
  inMemoryEventStore,
  type NoteQueryStore,
  createParser,
  getHints,
  hintsToContainer,
  defineLanguagePack,
  type IDialect,
  type ICodeStatement,
  type DialectAnalysis,
  type LanguagePack,
  type IScript,
  type IMetric,
  type IScriptRuntime,
  type IRuntimeBlock,
  type IOutputStatement,
  createCompiler,
  RuntimeFactory,
  ScriptRuntimeProvider,
  useRuntimeExecution,
  useScriptRuntime,
  useStackSnapshot,
  useOutputStatements,
  useStackTimers,
  usePrimaryTimer,
  useSecondaryTimers,
  useActiveControls,
  useStackDisplayRows,
  useRoundDisplay,
  metricPresentation,
  type MetricPresentationToken,
} from '@bitcobblers/wod-wiki-engine';
import type { ScriptBlock } from '@bitcobblers/wod-wiki-core';
import { TimerStackView } from '@/components/organisms/workout/TimerStackView';
import { calculateDuration } from '@/lib/timeUtils';
import type { ITimerDisplayEntry } from '@/clock/types/DisplayTypes';
import {
  editorPreset,
  sectionField,
  type EditorSection,
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlBars,
  TopList,
} from '@bitcobblers/wod-wiki-ui';
import {
  DEFAULT_NOTE,
  DEFAULT_WQL,
  PRESETS as DEFAULT_WQL_PRESETS,
} from './presets';

// ── Demo Language Pack (runtime registration proof) ────────────────────────

const DEMO_PACK_ID = 'demo-pack';

/** Emits a `demo.pack` hint on any statement whose source mentions "benchmark". */
export class DemoPackDialect implements IDialect {
  id = DEMO_PACK_ID;
  name = 'Demo Pack';
  priority = 10;

  analyze(statement: ICodeStatement): DialectAnalysis {
    const raw = statement.raw ?? '';
    if (/benchmark/i.test(raw)) {
      return { metrics: hintsToContainer(['demo.pack']) };
    }
    return {};
  }
}

export const demoPack: LanguagePack = defineLanguagePack({
  identity: {
    id: DEMO_PACK_ID,
    name: 'Demo Pack',
  },
  lang: {
    analyzer: DemoPackDialect,
  },
});

// ── CodeMirror Mounting Hooks ───────────────────────────────────────────────

export function useCodeMirror(
  host: React.RefObject<HTMLDivElement | null>,
  doc: string,
  dialect: 'wql',
  onChange: (next: string) => void,
): { setDoc: (next: string) => void } {
  const cb = useRef(onChange);
  cb.current = onChange;
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [
          ...editorPreset({ dialect }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current(u.state.doc.toString());
          }),
        ],
      }),
      parent: host.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialect]);

  const setDoc = useCallback((next: string) => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== next) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: next },
      });
    }
  }, []);

  return { setDoc };
}

/** Sections of a note doc, computed with the canonical `sectionField` parser. */
export function computeNoteSections(doc: string): EditorSection[] {
  return EditorState.create({ doc, extensions: [sectionField] }).field(sectionField).sections;
}

/**
 * Note editor mount — markdown preset (sections, syntax hiding, linting,
 * completions) exactly like the playground note page. Reports the doc and its
 * parsed sections on every keystroke.
 */
export function useNoteEditor(
  host: React.RefObject<HTMLDivElement | null>,
  doc: string,
  onChange: (next: string, sections: EditorSection[]) => void,
): { setDoc: (next: string) => void } {
  const cb = useRef(onChange);
  cb.current = onChange;
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [
          ...editorPreset({ dialect: 'markdown' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              cb.current(u.state.doc.toString(), u.state.field(sectionField).sections);
            }
          }),
        ],
      }),
      parent: host.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDoc = useCallback((next: string) => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== next) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: next },
      });
    }
  }, []);

  return { setDoc };
}

export interface ParseStats {
  script?: IScript;
  statements: number;
  hints: string[];
  error?: string;
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
}

export function formatMMSS(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatClockTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Elapsed (Σ span lengths) for a running or finished timer. */
export function sumSpans(spans: ReadonlyArray<{ started: number; ended?: number }>): number {
  const now = Date.now();
  return spans.reduce((total, span) => total + Math.max(0, (span.ended ?? now) - span.started), 0);
}

/** Live wall-clock time (ticking every second). */
export function useWallNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ── Metric badge presentation (Playground Palette) ───────────────────────────

export const TONE_CLASS: Record<string, string> = {
  time: 'border-sky-500/40 bg-sky-500/10 text-sky-500 dark:text-sky-300',
  rep: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  effort: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300',
  distance: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
  rounds: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300',
  action: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  resistance: 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300',
  rest: 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-300 italic',
  muted: 'border-border/70 bg-muted/50 text-muted-foreground',
  system: 'border-border/60 bg-muted/40 text-muted-foreground',
  unknown: 'border-border/60 bg-muted/40 text-muted-foreground',
};

export function MetricBadge({ token }: { token: MetricPresentationToken }) {
  if (!token.visible || !token.label) return null;
  if (token.renderKind === 'comment') {
    return (
      <span className="text-[10px] italic text-muted-foreground" title={token.tooltip}>
        {token.label}
      </span>
    );
  }
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight select-none ${
        TONE_CLASS[token.tone] ?? TONE_CLASS.unknown
      }`}
      title={token.tooltip}
    >
      {token.label}
    </span>
  );
}

/** Metric badges for a statement/output metric group (runtime-badge surface). */
export function presentBadges(metrics: Iterable<IMetric>): React.ReactNode {
  return (
    <>
      {metricPresentation
        .presentGroup(Array.from(metrics), 'runtime-badge')
        .map((token, i) => (
          <MetricBadge key={i} token={token} />
        ))}
    </>
  );
}

export const OUTPUT_TYPE_CLASS: Record<string, string> = {
  segment: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  milestone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  completion: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  metric: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  system: 'bg-muted/70 text-muted-foreground border-border/50',
  event: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  group: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  load: 'bg-muted/70 text-muted-foreground border-border/50',
  compiler: 'bg-muted/70 text-muted-foreground border-border/50',
  analytics: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
};

export const OUTPUT_TYPE_DOT: Record<string, string> = {
  segment: 'bg-emerald-500 shadow-emerald-500/50',
  milestone: 'bg-amber-500 shadow-amber-500/50',
  completion: 'bg-blue-500 shadow-blue-500/50',
  metric: 'bg-violet-500 shadow-violet-500/50',
  system: 'bg-muted-foreground/40',
  event: 'bg-rose-500 shadow-rose-500/50',
  group: 'bg-indigo-500 shadow-indigo-500/50',
  load: 'bg-muted-foreground/40',
  compiler: 'bg-muted-foreground/40',
  analytics: 'bg-cyan-500 shadow-cyan-500/50',
};

// ── Code Statement Representations (Right Column Top) ───────────────────────

export function statementDepth(stmt: ICodeStatement, byId: Map<number, ICodeStatement>): number {
  let depth = 0;
  let current = stmt.parent != null ? byId.get(stmt.parent) : undefined;
  const visited = new Set<number>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    depth += 1;
    current = current.parent != null ? byId.get(current.parent) : undefined;
  }
  return depth;
}

export function StatementStrip({
  statements,
  error,
  blockLabel,
  activeIds,
  completedIds,
}: {
  statements: readonly ICodeStatement[] | undefined;
  error?: string;
  blockLabel?: string;
  activeIds?: ReadonlySet<number>;
  completedIds?: ReadonlySet<number>;
}) {
  const rows = statements ?? [];
  const byId = useMemo(() => new Map(rows.map((s) => [s.id, s])), [rows]);

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs p-4 shadow-xs"
      data-testid="statement-strip"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
            Compiled Statements
            {blockLabel && <span className="ml-1.5 normal-case font-normal text-muted-foreground">— {blockLabel}</span>}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
          <span className="rounded bg-muted/80 px-1.5 py-0.5 text-muted-foreground">
            {rows.length} total
          </span>
          {activeIds && activeIds.size > 0 && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 font-bold text-primary">
              {activeIds.size} active
            </span>
          )}
          {completedIds && completedIds.size > 0 && (
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-500">
              {completedIds.size} done
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {rows.length === 0 && !error && (
        <p className="py-6 text-center text-xs text-muted-foreground">No parsed statements in active block.</p>
      )}

      {rows.length > 0 && (
        <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 pr-1">
          {rows.map((stmt, idx) => {
            const raw = stmt.raw ?? stmt.text ?? '';
            const isActive = activeIds?.has(stmt.id) ?? false;
            const isDone = completedIds?.has(stmt.id) ?? false;
            const depth = statementDepth(stmt, byId);
            return (
              <div
                key={stmt.id ?? idx}
                data-testid={`code-statement-${stmt.id ?? idx}`}
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border p-2 font-mono text-[11px] transition-all ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                    : isDone
                      ? 'border-border/40 bg-background/20 opacity-55'
                      : 'border-border/60 bg-background/50 hover:bg-background/80'
                }`}
                style={{ marginLeft: `${depth * 14}px` }}
              >
                <span className="rounded bg-muted/70 px-1 py-0.2 text-[9px] text-muted-foreground font-sans">
                  L{stmt.line ?? '·'}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{raw || `#${stmt.id}`}</span>
                <span className="flex flex-wrap items-center gap-1 font-sans">{presentBadges(stmt.metrics)}</span>
                {isDone && <span className="text-[11px] text-blue-500 font-bold">✓</span>}
                {isActive && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary uppercase tracking-wider">
                    active
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ActiveStatementStrip({
  statements,
  error,
  blockLabel,
}: {
  statements: readonly ICodeStatement[] | undefined;
  error?: string;
  blockLabel?: string;
}) {
  const snapshot = useStackSnapshot();
  const { outputs } = useOutputStatements();

  const activeIds = useMemo(
    () => new Set(snapshot.blocks.flatMap((b) => [...b.sourceIds])),
    [snapshot],
  );
  const completedIds = useMemo(
    () => new Set(outputs.map((o) => o.sourceStatementId).filter((id): id is number => id != null)),
    [outputs],
  );

  return (
    <StatementStrip
      statements={statements}
      error={error}
      blockLabel={blockLabel}
      activeIds={activeIds}
      completedIds={completedIds}
    />
  );
}

// ── Runtime Controls ────────────────────────────────────────────────────────

export interface RuntimeControlsProps {
  status: string;
  elapsedTime: number;
  stepCount: number;
  onStart: () => void;
  onResume: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onStep: () => void;
  isDirty: boolean;
  canStep: boolean;
}

export const STATUS_CLASS: Record<string, string> = {
  idle: 'bg-muted text-muted-foreground border-border/70',
  running: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse',
  paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  error: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        STATUS_CLASS[status] || STATUS_CLASS.idle
      }`}
      data-testid="execution-status"
    >
      {status}
    </span>
  );
}

export function ControlsToolbar({
  status,
  elapsedTime,
  stepCount,
  onStart,
  onResume,
  onPause,
  onStop,
  onReset,
  onStep,
  canStep,
}: RuntimeControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/60 p-2 text-xs">
      <div className="flex items-center gap-1.5 font-mono text-xs">
        <span className="text-muted-foreground text-[11px] uppercase tracking-wider">Session:</span>
        <span className="font-bold text-foreground tabular-nums text-sm" data-testid="elapsed-time">
          {formatDurationMs(elapsedTime)}
        </span>
        <span className="text-[10px] text-muted-foreground/80">({stepCount} ticks)</span>
      </div>

      <div className="flex items-center gap-1.5">
        {status === 'running' ? (
          <button
            onClick={onPause}
            data-testid="btn-pause"
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-accent cursor-pointer transition-all shadow-xs"
          >
            ⏸ Pause
          </button>
        ) : status === 'paused' ? (
          <button
            onClick={onResume}
            data-testid="btn-resume"
            className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition-all active:scale-95"
          >
            ▶ Resume
          </button>
        ) : (
          <button
            onClick={onStart}
            data-testid="btn-start"
            className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition-all active:scale-95"
          >
            {status === 'idle' ? '▶ Run Workout' : '↺ Re-run'}
          </button>
        )}

        <button
          onClick={onStep}
          disabled={!canStep || status === 'completed'}
          data-testid="btn-step"
          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-35 cursor-pointer transition-all shadow-xs"
        >
          ⏭ Step
        </button>

        <button
          onClick={onStop}
          disabled={status === 'idle'}
          data-testid="btn-stop"
          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-35 cursor-pointer transition-all shadow-xs"
        >
          ⏹ Stop
        </button>

        <button
          onClick={onReset}
          disabled={status === 'idle'}
          data-testid="btn-reset"
          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-35 cursor-pointer transition-all shadow-xs"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}

// ── Wall Clock View (Left Column Bottom) ────────────────────────────────────

export function WallClockHeader({ wallNow, status }: { wallNow: Date; status: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Wall Clock & Timer</h4>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
        <div className="text-right border-l border-border/50 pl-3">
          <div className="font-mono text-sm font-bold tabular-nums text-foreground leading-none" data-testid="wall-time">
            {formatClockTime(wallNow)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {wallNow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WallClockPanel(props: RuntimeControlsProps) {
  const runtime = useScriptRuntime();
  const primaryTimer = usePrimaryTimer();
  const secondaryTimers = useSecondaryTimers();
  const allTimers = useStackTimers();
  const activeControls = useActiveControls();
  const stackItems = useStackDisplayRows();
  const wallNow = useWallNow();

  const roundsItem = stackItems?.find((i) => i.block.blockType === 'Rounds');
  const roundDisplay = useRoundDisplay(roundsItem?.block);

  const [now, setNow] = useState(Date.now());
  const isAnyTimerRunning = useMemo(() => {
    return allTimers.some((t) => t.timer.spans.some((s) => s.ended === undefined));
  }, [allTimers]);

  useEffect(() => {
    if (!isAnyTimerRunning) return;
    let frameId: number;
    const update = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frameId);
  }, [isAnyTimerRunning]);

  const primaryElapsedMs = useMemo(() => {
    if (!primaryTimer) return 0;
    return calculateDuration(primaryTimer.timer.spans, now);
  }, [primaryTimer, now]);

  const timerStates = useMemo(() => {
    const map = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();
    for (const entry of allTimers) {
      const blockKey = entry.block.key.toString();
      const elapsed = calculateDuration(entry.timer.spans, now);
      map.set(blockKey, {
        elapsed,
        duration: entry.timer.durationMs,
        format: entry.timer.direction,
      });
    }
    return map;
  }, [allTimers, now]);

  const primaryTimerEntry: ITimerDisplayEntry | undefined = useMemo(() => {
    if (!primaryTimer) return undefined;
    const blockKey = primaryTimer.block.key.toString();
    return {
      id: `timer-${blockKey}`,
      ownerId: blockKey,
      timerMemoryId: '',
      label: primaryTimer.timer.label,
      format: primaryTimer.timer.direction,
      durationMs: primaryTimer.timer.durationMs,
      role: primaryTimer.isPinned ? 'primary' : 'auto',
      accumulatedMs: primaryElapsedMs,
    };
  }, [primaryTimer, primaryElapsedMs]);

  const secondaryTimerEntries: ITimerDisplayEntry[] = useMemo(() => {
    return secondaryTimers.map((entry) => {
      const blockKey = entry.block.key.toString();
      return {
        id: `timer-${blockKey}`,
        ownerId: blockKey,
        timerMemoryId: '',
        label: entry.timer.label,
        format: entry.timer.direction,
        durationMs: entry.timer.durationMs,
        role: entry.isPinned ? 'primary' : 'auto',
        accumulatedMs: calculateDuration(entry.timer.spans, now),
      };
    });
  }, [secondaryTimers, now]);

  const actions = useMemo(() => {
    return activeControls
      .filter((btn) => btn.visible && btn.enabled && btn.eventName)
      .map((btn) => ({
        id: btn.id,
        name: btn.label,
        eventName: btn.eventName!,
        ownerId: '',
        displayLabel: btn.label,
        isPinned: btn.isPinned,
      }));
  }, [activeControls]);

  const leafItem = stackItems?.find((i) => i.isLeaf);
  const subLabels = useMemo((): string[] | undefined => {
    if (!leafItem?.displayRows || leafItem.displayRows.length === 0) return undefined;
    const lines = leafItem.displayRows
      .map((row) =>
        metricPresentation
          .presentGroup([...row] as IMetric[], 'timer-subtitle')
          .filter((t) => t.visible)
          .map((t) => t.label)
          .filter(Boolean)
          .join(' ')
          .trim(),
      )
      .filter(Boolean);
    return lines.length > 0 ? lines : undefined;
  }, [leafItem]);

  const mainLabel = roundDisplay?.label ?? primaryTimer?.timer.label ?? leafItem?.label ?? 'Ready to Start';

  const displayTimerEntry: ITimerDisplayEntry | undefined = useMemo(() => {
    if (!primaryTimerEntry) {
      return {
        id: 'session-timer',
        ownerId: 'session',
        timerMemoryId: '',
        label: mainLabel,
        format: 'up',
        role: 'auto',
        accumulatedMs: props.elapsedTime,
      };
    }
    return {
      ...primaryTimerEntry,
      label: mainLabel,
      accumulatedMs: primaryElapsedMs,
    };
  }, [primaryTimerEntry, mainLabel, primaryElapsedMs, props.elapsedTime]);

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs p-5 shadow-xs"
      data-testid="panel-wallclock"
    >
      <WallClockHeader wallNow={wallNow} status={props.status} />

      <div className="py-2">
        <TimerStackView
          elapsedMs={primaryElapsedMs || props.elapsedTime}
          hasActiveBlock={Boolean(runtime)}
          onStart={props.onStart}
          onPause={props.onPause}
          onStop={props.onStop}
          onNext={() => {
            runtime?.handle({ name: 'next', timestamp: new Date(), data: {} });
          }}
          actions={actions.length > 0 ? actions : undefined}
          onAction={(eventName, payload) => {
            runtime.handle({ name: eventName, timestamp: new Date(), data: payload });
            if (eventName === 'timer:pause') props.onPause();
            else if (eventName === 'timer:resume' || eventName === 'timer:start') props.onResume();
            else if (eventName === 'workout:stop') props.onStop();
          }}
          isRunning={isAnyTimerRunning || props.status === 'running'}
          isPaused={props.status === 'paused'}
          disableNext={props.status === 'paused'}
          primaryTimer={displayTimerEntry}
          subLabels={subLabels}
          secondaryTimers={secondaryTimerEntries}
          stackItems={stackItems}
          timerStates={timerStates}
        />
      </div>

      <ControlsToolbar {...props} />
    </section>
  );
}

export function IdleWallClockPanel(props: RuntimeControlsProps) {
  const wallNow = useWallNow();

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs p-5 shadow-xs"
      data-testid="panel-wallclock"
    >
      <WallClockHeader wallNow={wallNow} status={props.status} />

      <div className="py-2">
        <TimerStackView
          elapsedMs={0}
          hasActiveBlock={false}
          onStart={props.onStart}
          onPause={props.onPause}
          onStop={props.onStop}
          onNext={() => {}}
          isRunning={false}
          isPaused={false}
          disableNext={true}
          primaryTimer={{
            id: 'idle-timer',
            ownerId: 'idle',
            timerMemoryId: '',
            label: 'Ready to Start',
            format: 'up',
            role: 'auto',
            accumulatedMs: 0,
          }}
        />
      </div>

      <ControlsToolbar {...props} />
    </section>
  );
}

// ── Output Timeline (Right Column Bottom) ───────────────────────────────────

export function OutputTimelineHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-500" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Output Stream</h4>
      </div>
      <span className="text-[10px] font-mono rounded bg-muted/80 px-2 py-0.5 text-muted-foreground font-semibold" data-testid="output-count">
        {count} emitted
      </span>
    </div>
  );
}

export function ActiveOutputTimeline() {
  const { outputs } = useOutputStatements();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [outputs.length]);

  const t0 = outputs.length > 0 ? outputs[0].timeSpan.started : undefined;
  const rows = outputs.slice(-300);

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs p-4 shadow-xs"
      data-testid="panel-timeline"
    >
      <OutputTimelineHeader count={outputs.length} />

      {outputs.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No output statements yet — outputs stream live as blocks complete.
        </p>
      ) : (
        <div ref={scrollRef} className="max-h-80 overflow-y-auto pr-1">
          <div className="relative ml-1 border-l-2 border-border/60">
            {rows.map((out, idx) => {
              const startedAt = out.timeSpan.started;
              const endedAt = out.timeSpan.ended;
              const type = String(out.outputType);
              return (
                <div
                  key={out.id ?? idx}
                  data-testid={`timeline-row-${idx}`}
                  className="relative pb-2.5 pl-4.5"
                  style={{ marginLeft: `${Math.min(out.stackLevel, 5) * 8}px` }}
                >
                  <span
                    className={`absolute top-1.5 -left-[6px] h-2.5 w-2.5 rounded-full border-2 border-background shadow-xs ${
                      OUTPUT_TYPE_DOT[type] ?? OUTPUT_TYPE_DOT.system
                    }`}
                  />
                  <div className="rounded-lg border border-border/50 bg-background/50 p-2 shadow-2xs">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground font-mono">
                      <span className="font-bold text-primary tabular-nums">
                        {t0 !== undefined ? `+${formatMMSS(startedAt - t0)}` : '+00:00'}
                      </span>
                      <span className="tabular-nums opacity-80">{formatClockTime(new Date(endedAt ?? startedAt))}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                          OUTPUT_TYPE_CLASS[type] ?? OUTPUT_TYPE_CLASS.system
                        }`}
                      >
                        {type}
                      </span>
                      <span className="max-w-[140px] truncate font-mono text-[10px] text-foreground font-medium">
                        {out.sourceBlockKey || 'session'}
                      </span>
                      {out.completionReason && (
                        <span className="text-[9px] text-muted-foreground font-mono">· {out.completionReason}</span>
                      )}
                    </div>
                    {out.metrics && out.metrics.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">{presentBadges(out.metrics)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function IdleOutputTimeline() {
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs p-4 shadow-xs"
      data-testid="panel-timeline"
    >
      <OutputTimelineHeader count={0} />
      <p className="py-8 text-center text-xs text-muted-foreground">
        Start the workout to stream live engine output statements.
      </p>
    </section>
  );
}

// ── Debug Panels (2×2 Diagnostics Grid) ─────────────────────────────────────

export function ParserPanel({ script, error }: { script?: IScript; error?: string }) {
  const statements = script?.statements ?? [];
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-4 shadow-xs"
      data-testid="panel-parser"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          1. Parser AST &amp; Metrics
        </h4>
        <span className="text-[11px] font-mono text-muted-foreground">
          {statements.length} statement{statements.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {statements.length === 0 && !error && (
        <p className="py-4 text-center text-xs text-muted-foreground">No parsed statements.</p>
      )}

      <div className="max-h-64 overflow-y-auto flex flex-col gap-2 font-mono text-xs pr-1">
        {statements.map((stmt, idx) => {
          const raw = stmt.raw ?? '';
          const metrics: IMetric[] = [...stmt.metrics];
          const hints = getHints(stmt);

          return (
            <div
              key={stmt.id ?? idx}
              className="rounded-lg border border-border/60 bg-background/50 p-2 text-[11px]"
              data-testid={`parsed-statement-${idx}`}
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="font-semibold text-primary">
                  Statement #{stmt.id ?? idx + 1} (Line {stmt.line ?? '?'})
                </span>
                {raw && <span className="truncate max-w-[200px] text-[10px] text-foreground/80">{raw}</span>}
              </div>

              {metrics.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {metrics.map((m, mIdx) => {
                    const type = String(m.type);
                    const valStr = typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value ?? '');
                    return (
                      <span
                        key={mIdx}
                        className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px]"
                        title={`origin: ${m.origin}`}
                      >
                        <span className="text-foreground font-medium">{type}</span>
                        {valStr && <span className="text-muted-foreground">: {valStr}</span>}
                        {m.unit && <span className="text-accent-foreground font-mono"> {m.unit}</span>}
                        <span className="text-[9px] text-muted-foreground/70 ml-1">@{m.origin}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {hints.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px] text-primary/80">
                  <span className="text-muted-foreground font-sans text-[9px]">hints:</span>
                  {hints.map((h, hIdx) => (
                    <span key={hIdx} className="rounded bg-primary/10 px-1 text-primary">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActiveStackPanel(props: RuntimeControlsProps) {
  const snapshot = useStackSnapshot();
  const blocks = snapshot.blocks ?? [];

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-4 shadow-xs"
      data-testid="panel-stack"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          2. Runtime Stack
        </h4>
        <div className="flex items-center gap-2">
          {props.isDirty && props.status !== 'idle' && (
            <span
              className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 border border-amber-500/40 animate-pulse"
              data-testid="dirty-badge"
            >
              ⚠️ modified
            </span>
          )}
          <StatusBadge status={props.status} />
        </div>
      </div>

      <div className="max-h-52 overflow-y-auto flex flex-col gap-1 font-mono text-xs pr-1">
        {blocks.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Stack empty.</p>
        ) : (
          blocks.map((b: IRuntimeBlock, idx: number) => {
            const isTop = idx === blocks.length - 1;
            return (
              <div
                key={b.key?.toString() || idx}
                className={`flex items-center justify-between rounded-lg border p-1.5 text-[11px] ${
                  isTop ? 'border-primary/60 bg-primary/5 font-semibold' : 'border-border/50 bg-background/40'
                }`}
                data-testid={`stack-block-${idx}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
                  <span className="text-foreground">{b.label}</span>
                  <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">{b.blockType || 'block'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {b.isComplete && <span className="text-[10px] text-blue-500">✓ complete</span>}
                  {isTop && <span className="rounded bg-primary/20 px-1.5 text-[9px] text-primary">active</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function IdleStackPanel(props: RuntimeControlsProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-4 shadow-xs"
      data-testid="panel-stack"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          2. Runtime Stack
        </h4>
        <StatusBadge status={props.status} />
      </div>
      <div className="py-6 text-center text-xs text-muted-foreground">
        Click <strong className="text-foreground">▶ Run Workout</strong> to mount the runtime.
      </div>
    </div>
  );
}

export function ActiveMemoryPanel() {
  const snapshot = useStackSnapshot();
  const blocks = snapshot.blocks ?? [];
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const activeBlock: IRuntimeBlock | undefined = blocks[selectedIdx] ?? blocks[blocks.length - 1];

  const allMemory: IMetric[] = useMemo(() => {
    if (!activeBlock?.getAllMemory) return [];
    try {
      return (activeBlock.getAllMemory() ?? []).flatMap((loc) => [...loc.metrics]);
    } catch {
      return [];
    }
  }, [activeBlock]);

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-4 shadow-xs"
      data-testid="panel-memory"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          3. Block Memory Map
        </h4>
        {blocks.length > 0 && (
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-foreground font-mono"
            data-testid="memory-block-select"
          >
            {blocks.map((b: IRuntimeBlock, idx: number) => (
              <option key={b.key?.toString() || idx} value={idx}>
                #{idx + 1}: {b.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {!activeBlock ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No active runtime block.</p>
      ) : allMemory.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No memory entries on selected block.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5 font-mono text-xs pr-1">
          {allMemory.map((m, idx) => {
            const valStr = typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value ?? '');
            return (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-1.5 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">{String(m.type)}</span>
                  <span className="text-muted-foreground">: {valStr}</span>
                  {m.unit && <span className="text-accent-foreground font-mono">{m.unit}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground">@{m.origin}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function IdleMemoryPanel() {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-4 shadow-xs"
      data-testid="panel-memory"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          3. Block Memory Map
        </h4>
      </div>
      <p className="py-6 text-center text-xs text-muted-foreground">
        No active runtime block.
      </p>
    </div>
  );
}

export function ActiveLogsPanel() {
  const { outputs } = useOutputStatements();

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-4 shadow-xs"
      data-testid="panel-logs"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          4. Output Log Stream
        </h4>
        <span className="text-[11px] font-mono text-muted-foreground" data-testid="output-log-count">
          {outputs.length} statement{outputs.length === 1 ? '' : 's'}
        </span>
      </div>

      {outputs.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">No emitted output statements.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1 font-mono text-xs pr-1">
          {outputs.slice(-200).map((out: IOutputStatement, idx: number) => {
            const metricsStr = out.metrics
              ?.map((m) => `${String(m.type)}:${typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value ?? '')}`)
              .join(' ') ?? '';

            return (
              <div
                key={idx}
                className="rounded-lg border border-border/40 bg-background/40 p-1.5 text-[11px]"
                data-testid={`log-statement-${idx}`}
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span className="text-primary font-medium">[{out.outputType}]</span>
                  <span>{out.sourceBlockKey || 'session'}</span>
                </div>
                {metricsStr && <p className="text-foreground/90">{metricsStr}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function IdleLogsPanel() {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-4 shadow-xs"
      data-testid="panel-logs"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          4. Output Log Stream
        </h4>
      </div>
      <p className="py-6 text-center text-xs text-muted-foreground">
        No emitted output statements.
      </p>
    </div>
  );
}

export function ActiveDebugGrid({
  script,
  parseError,
  controlsProps,
}: {
  script?: IScript;
  parseError?: string;
  controlsProps: RuntimeControlsProps;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="debug-panel-grid">
      <ParserPanel script={script} error={parseError} />
      <ActiveStackPanel {...controlsProps} />
      <ActiveMemoryPanel />
      <ActiveLogsPanel />
    </div>
  );
}

export function IdleDebugGrid({
  script,
  parseError,
  controlsProps,
}: {
  script?: IScript;
  parseError?: string;
  controlsProps: RuntimeControlsProps;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="debug-panel-grid">
      <ParserPanel script={script} error={parseError} />
      <IdleStackPanel {...controlsProps} />
      <IdleMemoryPanel />
      <IdleLogsPanel />
    </div>
  );
}

// ── Main LanguageWorkbench Component ────────────────────────────────────────

export interface LanguageWorkbenchProps {
  /** Initial markdown note content (defaults to Fran) */
  initialNote?: string;
  /** Initial WQL query */
  initialWql?: string;
  /** Show or hide WQL lane (defaults to true) */
  showWqlLane?: boolean;
  /** Show or hide 2x2 debug grid (defaults to true) */
  showDebugGrid?: boolean;
  /** Custom WQL presets */
  wqlPresets?: string[];
  /** Optional custom test ID override */
  'data-testid'?: string;
}

export function LanguageWorkbench({
  initialNote = DEFAULT_NOTE,
  initialWql = DEFAULT_WQL,
  showWqlLane = true,
  showDebugGrid = true,
  wqlPresets = DEFAULT_WQL_PRESETS,
  'data-testid': testId = 'language-workbench',
}: LanguageWorkbenchProps = {}) {
  const [wqlText, setWqlText] = useState(initialWql);
  const [result, setResult] = useState<QueryResult | undefined>();
  const [queryError, setQueryError] = useState<string | undefined>();

  // Note editor state — markdown doc + parsed sections (from sectionField)
  const [noteText, setNoteText] = useState(initialNote);
  const [noteSections, setNoteSections] = useState<EditorSection[]>(() => computeNoteSections(initialNote));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  // Runtime lifecycle state
  const [runtime, setRuntime] = useState<IScriptRuntime | null>(null);
  const [runSnapshot, setRunSnapshot] = useState<string>('');
  const factoryRef = useRef<RuntimeFactory | null>(null);
  const pendingStartRef = useRef(false);

  if (!factoryRef.current) {
    factoryRef.current = new RuntimeFactory(createCompiler());
  }

  const execution = useRuntimeExecution(runtime);
  // Keep a stable handle to the latest execution controls for deferred starts.
  const executionRef = useRef(execution);
  executionRef.current = execution;

  const service = useMemo(() => {
    const noteStore: NoteQueryStore = {
      getAllNotes: async () => crossfitJournal.notes as unknown as Note[],
      getNoteIdsForTag: async (tag: string) =>
        new Set(crossfitJournal.notes.filter((n) => n.tags?.includes(tag)).map((n) => n.id)),
      getNoteTagLabels: async (id: string) =>
        crossfitJournal.notes.find((n) => n.id === id)?.tags ?? [],
    };
    return new QueryService(inMemoryEventStore(crossfitJournal.records as unknown as UnifiedEventRecord[]), noteStore);
  }, []);

  // WQL lane: re-run the query (debounced) as the editor changes.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const parsed = parseQuery(wqlText);
        if (parsed.error) {
          setQueryError(parsed.error);
          return;
        }
        if (isFindQuery(parsed) || isRowsQuery(parsed)) {
          setQueryError('Workbench lane runs aggregate queries — find/rows families stay on their own surfaces.');
          return;
        }
        const newest = Math.max(...crossfitJournal.records.map((r) => r.timestamp));
        const r = await service.run(parsed, { rangeEnd: newest, preferredUnit: 'lb' });
        setQueryError(undefined);
        setResult(r);
      } catch (e) {
        setQueryError(e instanceof Error ? e.message : String(e));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [wqlText, service]);

  // Runnable `time` or `log` blocks extracted from the note's fences.
  const timeBlocks = useMemo(() => {
    return noteSections
      .filter((s) => (s.type === 'time' || s.type === 'log') && s.contentFrom !== undefined && s.contentTo !== undefined)
      .map((s, i) => {
        const content = noteText.slice(s.contentFrom!, s.contentTo!);
        const labelLine =
          content
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.length > 0) ?? `block ${i + 1}`;
        return { section: s, index: i, content, label: labelLine.replace(/^\/\/\s*/, '') };
      });
  }, [noteSections, noteText]);

  const activeBlock = timeBlocks.find((b) => b.section.id === activeBlockId) ?? timeBlocks[0];
  const runSource = activeBlock?.content ?? noteText;

  // Whiteboard lane: parse the selected time block on every keystroke.
  const parse: ParseStats = useMemo(() => {
    try {
      const script = createParser().read(runSource, activeBlock?.section.sport);
      const hints = script.statements.flatMap((s) => getHints(s));
      return { script, statements: script.statements.length, hints };
    } catch (e) {
      return { statements: 0, hints: [], error: e instanceof Error ? e.message : String(e) };
    }
  }, [runSource, activeBlock]);

  const wqlHost = useRef<HTMLDivElement>(null);
  const noteHost = useRef<HTMLDivElement>(null);
  const wqlEditor = useCodeMirror(wqlHost, initialWql, 'wql', setWqlText);
  useNoteEditor(noteHost, initialNote, (next, sections) => {
    setNoteText(next);
    setNoteSections(sections);
  });

  const handleSelectWqlPreset = (preset: string) => {
    setWqlText(preset);
    wqlEditor.setDoc(preset);
  };

  // Runtime Lifecycle Actions
  const handleStartWorkout = () => {
    const factory = factoryRef.current!;
    if (runtime) {
      factory.disposeRuntime(runtime);
    }
    const currentScript = parse.script;
    if (!currentScript || currentScript.statements.length === 0) return;

    const block: ScriptBlock = {
      content: runSource,
      statements: currentScript.statements,
    };

    const newRuntime = factory.createRuntime(block, { debugMode: true });
    if (newRuntime) {
      pendingStartRef.current = true;
      setRuntime(newRuntime);
      setRunSnapshot(runSource);
    }
  };

  // Auto-start ticking once the runtime state change (and the execution hook's
  // reset-on-runtime-change) has settled. The ref indirection avoids starting
  // through a stale closure bound to the previous runtime.
  useEffect(() => {
    if (!runtime || !pendingStartRef.current) return;
    pendingStartRef.current = false;
    const t = setTimeout(() => executionRef.current.start(), 0);
    return () => clearTimeout(t);
  }, [runtime]);

  const handleStopWorkout = () => {
    execution.stop();
    if (runtime && factoryRef.current) {
      factoryRef.current.disposeRuntime(runtime);
      setRuntime(null);
    }
  };

  const handleResetWorkout = () => {
    execution.reset();
  };

  useEffect(() => {
    return () => {
      if (runtime && factoryRef.current) {
        factoryRef.current.disposeRuntime(runtime);
      }
    };
  }, [runtime]);
  const groupCount = result?.parsed.groupBy.length ?? 0;
  const isDirty = Boolean(runSnapshot && runSource !== runSnapshot);

  const controlsProps: RuntimeControlsProps = {
    status: execution.status,
    elapsedTime: execution.elapsedTime,
    stepCount: execution.stepCount,
    onStart: handleStartWorkout,
    onResume: execution.start,
    onPause: execution.pause,
    onStop: handleStopWorkout,
    onReset: handleResetWorkout,
    onStep: execution.step,
    isDirty,
    canStep: Boolean(runtime),
  };

  return (
    <div className="flex flex-col gap-6" data-testid={testId}>
      {/* ── 2/3 (Left: Editor + Timer) and 1/3 (Right: Statements + Output) Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2/3 width): Note Editor & Wall Clock stacked */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* 1. Note Editor Panel */}
          <section className="rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs p-3.5 flex flex-col gap-3 shadow-xs">
            <div
              ref={noteHost}
              className="min-h-72 overflow-hidden rounded-lg border border-border/60 bg-background/70 shadow-inner"
              data-testid="script-editor-host"
            />

            {/* Time-block selector tabs (only if multiple blocks) */}
            {timeBlocks.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5" data-testid="time-block-chips">
                <span className="text-[11px] font-bold text-muted-foreground mr-1 uppercase tracking-wider">Blocks:</span>
                {timeBlocks.map((b) => (
                  <button
                    key={b.section.id}
                    onClick={() => setActiveBlockId(b.section.id)}
                    data-testid={`time-block-chip-${b.index}`}
                    className={`max-w-[240px] truncate rounded-lg border px-2.5 py-1 font-mono text-[11px] cursor-pointer transition-all ${
                      b.section.id === activeBlock?.section.id
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-border text-foreground hover:bg-accent'
                    }`}
                  >
                    #{b.index + 1} · {b.label}
                  </button>
                ))}
              </div>
            )}

            {parse.error && <p className="text-xs text-destructive font-mono">{parse.error}</p>}
          </section>

          {/* 2. Timer & Wall Clock View (stacked directly under the editor) */}
          {runtime ? (
            <ScriptRuntimeProvider runtime={runtime}>
              <WallClockPanel {...controlsProps} />
            </ScriptRuntimeProvider>
          ) : (
            <IdleWallClockPanel {...controlsProps} />
          )}
        </div>

        {/* Right Column (1/3 width): Data & State View (Compiled Statements + Output Stream) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {runtime ? (
            <ScriptRuntimeProvider runtime={runtime}>
              {/* Compiled Statements */}
              <ActiveStatementStrip
                statements={parse.script?.statements}
                error={parse.error}
                blockLabel={activeBlock?.label}
              />
              {/* Output Statements Stream */}
              <ActiveOutputTimeline />
            </ScriptRuntimeProvider>
          ) : (
            <>
              <StatementStrip
                statements={parse.script?.statements}
                error={parse.error}
                blockLabel={activeBlock?.label}
              />
              <IdleOutputTimeline />
            </>
          )}
        </div>
      </div>

      {/* Query lane */}
      {showWqlLane && (
        <section className="rounded-xl border border-border/70 bg-card/40 backdrop-blur-xs p-4 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">WQL — Live Query & Analytics</h3>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">in-memory event store</span>
          </div>

          <div ref={wqlHost} data-testid="wql-editor-host" className="overflow-hidden rounded-lg border border-border/60 bg-background/70 shadow-inner" />
          <div className="flex flex-wrap gap-1.5">
            {wqlPresets.map((p) => (
              <button
                key={p}
                onClick={() => handleSelectWqlPreset(p)}
                data-testid={`preset-${p.replace(/[^a-zA-Z0-9]/g, '-')}`}
                className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] cursor-pointer transition-all ${
                  wqlText === p
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border/70 bg-card/40 text-foreground hover:bg-accent hover:border-border'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {queryError && <p className="text-xs text-destructive font-mono">{queryError}</p>}
          {result && !queryError && (
            <div className="h-56" data-testid="wql-result-widget">
              {groupCount === 0 ? (
                <WidgetFrame title="Scalar" question="What total?" query={wqlText}>
                  <QueryValue result={result} label="from fixture" />
                </WidgetFrame>
              ) : groupCount === 1 && result.parsed.groupBy[0] === 'week' ? (
                <WidgetFrame title="Trend" question="Rising?" query={wqlText}>
                  <WqlTimeseries result={result} />
                </WidgetFrame>
              ) : (
                <WidgetFrame title="Breakdown" question="Which group?" query={wqlText}>
                  {result.series.length > 3 ? (
                    <TopList result={result} limit={6} />
                  ) : (
                    <WqlBars result={result} />
                  )}
                </WidgetFrame>
              )}
            </div>
          )}
        </section>
      )}

      {/* Diagnostics Grid */}
      {showDebugGrid && (
        runtime ? (
          <ScriptRuntimeProvider runtime={runtime}>
            <ActiveDebugGrid script={parse.script} parseError={parse.error} controlsProps={controlsProps} />
          </ScriptRuntimeProvider>
        ) : (
          <IdleDebugGrid script={parse.script} parseError={parse.error} controlsProps={controlsProps} />
        )
      )}
    </div>
  );
}
