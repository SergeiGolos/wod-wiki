import { useMemo, type ReactNode } from 'react';
import type { IMetric } from '@bitcobblers/wod-wiki-core';
import { metricPresentation, type MetricPresentationToken } from '@bitcobblers/wod-wiki-lang';

// ── Time formatting ──────────────────────────────────────────────────────────

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

// ── Metric badge presentation (runtime-badge surface) ────────────────────────

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

/** Metric badges for a statement/output metric group. */
export function presentBadges(metrics: Iterable<IMetric>): ReactNode {
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

// ── Metric categorisation (fixed column vocabulary) ──────────────────────────

export interface CategorizedMetrics {
  efforts: IMetric[];
  reps: IMetric[];
  loads: IMetric[];
  rounds: IMetric[];
  durations: IMetric[];
  distances: IMetric[];
  hints: IMetric[];
}

export function extractMetricsByCategory(metrics?: Iterable<IMetric>): CategorizedMetrics {
  if (!metrics) {
    return { efforts: [], reps: [], loads: [], rounds: [], durations: [], distances: [], hints: [] };
  }

  const list = Array.from(metrics) as IMetric[];
  return {
    efforts: list.filter((m) => {
      const t = String(m.type).toLowerCase();
      return t === 'effort' || t === 'text' || t === 'action' || t === 'label';
    }),
    reps: list.filter((m) => String(m.type).toLowerCase() === 'rep'),
    loads: list.filter((m) => {
      const t = String(m.type).toLowerCase();
      return t === 'resistance' || t === 'intensity' || t === 'load' || t === 'volume';
    }),
    rounds: list.filter((m) => {
      const t = String(m.type).toLowerCase();
      return t === 'rounds' || t === 'current-round' || t === 'increment';
    }),
    durations: list.filter((m) => {
      const t = String(m.type).toLowerCase();
      return t === 'duration' || t === 'time' || t === 'elapsed';
    }),
    distances: list.filter((m) => String(m.type).toLowerCase() === 'distance'),
    hints: list.filter((m) => {
      const t = String(m.type).toLowerCase();
      return t === 'hint' || t === 'custom' || t === 'system' || t === 'sound' || t === 'lap' || t === 'group';
    }),
  };
}

// ── Filter presets ───────────────────────────────────────────────────────────

export interface OutputFilterPreset {
  label: string;
  query: string;
}

export type OutputFilterInput = string | OutputFilterPreset;

/** Default row filter — segment statements only (the Workbench default). */
export const DEFAULT_PRIMARY_FILTER = 'type:segment';

export const DEFAULT_OUTPUT_FILTERS: OutputFilterPreset[] = [
  { label: 'All', query: '' },
  { label: 'Segments', query: 'type:segment' },
  { label: 'Events', query: 'type:event' },
];

export function normalizeOutputFilter(filter: OutputFilterInput): OutputFilterPreset {
  if (typeof filter === 'object' && filter !== null && 'label' in filter && 'query' in filter) {
    return filter;
  }
  const str = String(filter).trim();
  const lower = str.toLowerCase();
  if (lower === 'all' || lower === '') {
    return { label: 'All', query: '' };
  }
  if (lower === 'segments' || lower === 'segment' || lower === 'type:segment') {
    return { label: 'Segments', query: 'type:segment' };
  }
  if (lower === 'events' || lower === 'event' || lower === 'type:event') {
    return { label: 'Events', query: 'type:event' };
  }
  if (lower === 'milestones' || lower === 'milestone' || lower === 'type:milestone') {
    return { label: 'Milestones', query: 'type:milestone' };
  }
  return { label: str, query: str };
}

// ── Row shape ────────────────────────────────────────────────────────────────

/** Structural subset satisfied by live `IOutputStatement`s, stored statements,
 *  and `UnifiedEventRecord` event rows alike. */
export interface OutputStatementRow {
  readonly id?: number | string;
  readonly outputType?: string;
  readonly timeSpan?: { started: number; ended?: number };
  readonly metrics?: Iterable<IMetric>;
  readonly sourceBlockKey?: string;
  readonly completionReason?: string;
}

/** Client-side row filter: `type:<x>` targets the output type, otherwise free
 *  text matches type/block key/completion reason/metric values. Aggregate
 *  queries (`sum:`/`avg:`/`count:`) pass everything through. */
function matchesOutputFilter(out: OutputStatementRow, filter: string): boolean {
  const lower = filter.toLowerCase().trim();
  if (!lower || lower === 'all') return true;
  if (lower.startsWith('sum:') || lower.startsWith('avg:') || lower.startsWith('count:')) {
    return true;
  }

  const outType = String(out.outputType || '').toLowerCase();
  if (lower.startsWith('type:')) {
    return outType.includes(lower.slice(5).trim());
  }

  const typeMatch = outType.includes(lower);
  const keyMatch = out.sourceBlockKey?.toLowerCase().includes(lower);
  const reasonMatch = out.completionReason?.toLowerCase().includes(lower);
  const metricMatch =
    out.metrics &&
    Array.from(out.metrics).some((m: IMetric) => {
      const valStr = typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value ?? '');
      return String(m.type).toLowerCase().includes(lower) || valStr.toLowerCase().includes(lower);
    });
  return Boolean(typeMatch || keyMatch || reasonMatch || metricMatch);
}

// ── Filter pills ─────────────────────────────────────────────────────────────

export function OutputFilterPills({
  presets,
  filter,
  onChange,
}: {
  presets: OutputFilterPreset[];
  filter: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => onChange(p.query)}
          data-testid={`output-filter-preset-${p.label.toLowerCase().replace(/\s+/g, '-')}`}
          className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] cursor-pointer transition-all ${
            filter === p.query || (p.query === '' && filter === '')
              ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
              : 'border-border/70 bg-card text-foreground hover:bg-accent'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── The table ────────────────────────────────────────────────────────────────

export interface OutputStatementsTableProps {
  outputs: readonly OutputStatementRow[];
  /** Filter expression (`type:segment`, free text). Empty shows all. */
  filter?: string;
  /** Epoch ms the +offset column is relative to. Defaults to first statement start. */
  timeOrigin?: number;
}

/** The Session Results Table body — one row per output statement with the
 *  fixed Movement/Reps/Load/Rounds/Target/Distance/Hints badge columns. */
export function OutputStatementsTable({
  outputs,
  filter = '',
  timeOrigin,
}: OutputStatementsTableProps) {
  const t0 = timeOrigin ?? (outputs.length > 0 ? outputs[0].timeSpan?.started : undefined);

  const rows = useMemo(() => {
    if (!filter.trim()) return outputs;
    return outputs.filter((out) => matchesOutputFilter(out, filter));
  }, [outputs, filter]);

  return (
    <div className="overflow-x-auto rounded-md border border-border/50 bg-background/40">
      <table className="w-full text-left font-mono text-xs border-collapse" data-testid="output-statements-table">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider whitespace-nowrap">
            <th className="p-2 w-12 text-center">Type</th>
            <th className="p-2 min-w-[110px]">Time</th>
            <th className="p-2 font-sans min-w-[140px]">🏃 Movement</th>
            <th className="p-2 font-sans min-w-[60px]">🔢 Reps</th>
            <th className="p-2 font-sans min-w-[70px]">💪 Load</th>
            <th className="p-2 font-sans min-w-[80px]">🔄 Rounds</th>
            <th className="p-2 font-sans min-w-[70px]">⏱️ Target</th>
            <th className="p-2 font-sans min-w-[70px]">📏 Distance</th>
            <th className="p-2 font-sans min-w-[110px]">🏷️ Hints</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-8 text-center text-muted-foreground font-sans text-xs">
                {outputs.length === 0
                  ? 'No output statements recorded for this run.'
                  : 'No output statements match the current filter.'}
              </td>
            </tr>
          ) : (
            rows.map((out, idx) => {
              const cats = extractMetricsByCategory(out.metrics);
              const started = out.timeSpan?.started;
              const ended = out.timeSpan?.ended;
              const elapsedStr = ended !== undefined && started !== undefined ? formatMMSS(ended - started) : 'running';
              const wallTimeStr = formatClockTime(new Date(ended ?? started ?? 0));
              const offsetStr = started !== undefined && t0 !== undefined ? `+${formatMMSS(started - t0)}` : '+00:00';
              const hoverInfo = `#${out.id ?? idx + 1} · Block: ${out.sourceBlockKey || 'session'}${
                out.completionReason ? ` · Reason: ${out.completionReason}` : ''
              }`;

              const badgeCell = (badges: IMetric[]) => (
                <td className="p-2 font-sans">
                  {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-1">{presentBadges(badges)}</div>
                  ) : (
                    <span className="text-muted-foreground/30 font-mono text-[11px] select-none">—</span>
                  )}
                </td>
              );

              return (
                <tr
                  key={out.id ?? idx}
                  title={hoverInfo}
                  className="hover:bg-muted/30 transition-colors group cursor-default"
                >
                  {/* 1. Type (minimal size, first column) */}
                  <td className="p-2 text-center whitespace-nowrap">
                    <span
                      className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                        OUTPUT_TYPE_CLASS[String(out.outputType)] ?? OUTPUT_TYPE_CLASS.system
                      }`}
                      title={`Type: ${out.outputType} | ${hoverInfo}`}
                    >
                      {String(out.outputType ?? 'system').slice(0, 4)}
                    </span>
                  </td>

                  {/* 2. Consolidated time (line 1: offset & elapsed, line 2: wall time) */}
                  <td className="p-2 whitespace-nowrap leading-tight">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="font-bold text-primary tabular-nums">{offsetStr}</span>
                      <span className="text-[10px] text-muted-foreground/80 tabular-nums">({elapsedStr})</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
                      {wallTimeStr}
                    </div>
                  </td>

                  {/* 3. Movement */}
                  {badgeCell(cats.efforts)}
                  {/* 4. Reps */}
                  {badgeCell(cats.reps)}
                  {/* 5. Load */}
                  {badgeCell(cats.loads)}
                  {/* 6. Rounds */}
                  {badgeCell(cats.rounds)}
                  {/* 7. Target (durations) */}
                  {badgeCell(cats.durations)}
                  {/* 8. Distance */}
                  {badgeCell(cats.distances)}
                  {/* 9. Hints */}
                  {badgeCell(cats.hints)}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
