/**
 * PROTOTYPE — THROWAWAY (wayfinder #992). Do not productionise from this file.
 *
 * Question: what does the Session Outputs Card List look like below `sm`?
 * Three structurally different variants, switchable via `?variant=A|B|C`
 * (floating bottom bar + ←/→ keys), rendered from real OutputStatementRow
 * fixtures with the real badge/token system.
 *
 * View at 375px (storybook viewport toolbar or devtools). Judge layout in
 * light theme — storybook dark is broken repo-wide pending the theme-bridge
 * fix (wayfinder #994).
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { IMetric } from '@bitcobblers/wod-wiki-core';
import {
  presentBadges,
  OUTPUT_TYPE_CLASS,
  OUTPUT_TYPE_DOT,
  extractMetricsByCategory,
  formatMMSS,
  formatClockTime,
  type OutputStatementRow,
} from '@bitcobblers/wod-wiki-ui';

const meta: Meta = {
  title: 'Prototype/Mobile Card List',
  parameters: { layout: 'padded' },
};
export default meta;

// ── Fixtures: a Fran-ish couplet with rest, distance, completion ──────────────

const T0 = Date.UTC(2026, 7, 28, 17, 0, 0);
const at = (sec: number) => T0 + sec * 1000;
const m = (type: string, value: unknown, unit?: string): IMetric =>
  ({ type, value, unit, origin: 'runtime' } as IMetric);

const FIXTURES: OutputStatementRow[] = [
  { id: 1, outputType: 'milestone', timeSpan: { started: at(0), ended: at(0) }, metrics: [m('label', 'Workout started')], sourceBlockKey: 'main#1' },
  { id: 2, outputType: 'segment', timeSpan: { started: at(4), ended: at(96) }, metrics: [m('effort', 'Thrusters'), m('rep', 21), m('resistance', 42, 'kg'), m('round', 1)], sourceBlockKey: 'main#1' },
  { id: 3, outputType: 'segment', timeSpan: { started: at(96), ended: at(214) }, metrics: [m('effort', 'Pull-ups'), m('rep', 21), m('round', 1)], sourceBlockKey: 'main#1' },
  { id: 4, outputType: 'milestone', timeSpan: { started: at(214), ended: at(214) }, metrics: [m('label', 'Round 2')], sourceBlockKey: 'main#1' },
  { id: 5, outputType: 'segment', timeSpan: { started: at(215), ended: at(288) }, metrics: [m('effort', 'Thrusters'), m('rep', 15), m('resistance', 42, 'kg'), m('round', 2)], sourceBlockKey: 'main#1' },
  { id: 6, outputType: 'segment', timeSpan: { started: at(288), ended: at(390) }, metrics: [m('effort', 'Pull-ups'), m('rep', 15), m('round', 2)], sourceBlockKey: 'main#1' },
  { id: 7, outputType: 'segment', timeSpan: { started: at(390), ended: at(435) }, metrics: [m('effort', 'Rest'), m('duration', 45, 's')], sourceBlockKey: 'main#1', completionReason: 'rest' },
  { id: 8, outputType: 'segment', timeSpan: { started: at(435), ended: at(540) }, metrics: [m('effort', 'Row'), m('distance', 500, 'm'), m('round', 3)], sourceBlockKey: 'cooldown#2' },
  { id: 9, outputType: 'completion', timeSpan: { started: at(0), ended: at(540) }, metrics: [m('effort', 'Fran'), m('duration', 372, 's'), m('hint', 'workout.benchmark')], sourceBlockKey: 'main#1', completionReason: 'all-rounds-complete' },
];

// ── Shared bits ───────────────────────────────────────────────────────────────

function TypeChip({ type }: { type?: string }) {
  const t = String(type ?? 'system');
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${OUTPUT_TYPE_CLASS[t] ?? OUTPUT_TYPE_CLASS.system}`}>
      {t.slice(0, 4)}
    </span>
  );
}

function TimeBlock({ row, compact = false }: { row: OutputStatementRow; compact?: boolean }) {
  const started = row.timeSpan?.started;
  const ended = row.timeSpan?.ended;
  const elapsed = ended !== undefined && started !== undefined ? ended - started : undefined;
  const offset = started !== undefined ? started - T0 : 0;
  return (
    <div className="font-mono tabular-nums leading-tight whitespace-nowrap">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-bold text-primary">+{formatMMSS(offset)}</span>
        {elapsed !== undefined && <span className="text-[10px] text-muted-foreground/80">({formatMMSS(elapsed)})</span>}
      </div>
      {!compact && started !== undefined && (
        <div className="text-[9px] text-muted-foreground/60">{formatClockTime(new Date(ended ?? started))}</div>
      )}
    </div>
  );
}

function BadgeRow({ metrics, className = '' }: { metrics: IMetric[]; className?: string }) {
  if (metrics.length === 0) return null;
  return <div className={`flex flex-wrap gap-1 ${className}`}>{presentBadges(metrics)}</div>;
}

function movementOf(row: OutputStatementRow): string {
  const cats = extractMetricsByCategory(row.metrics);
  const first = cats.efforts[0];
  return first ? String(first.value ?? '—') : String(row.outputType ?? 'statement');
}

// ── Variant A — Timeline feed ─────────────────────────────────────────────────
// Left rail: type dot + connector. Density-first: everything on card lines.

function VariantA({ outputs }: { outputs: OutputStatementRow[] }) {
  return (
    <ol className="flex flex-col">
      {outputs.map((row, i) => {
        const cats = extractMetricsByCategory(row.metrics);
        const others = [...cats.reps, ...cats.loads, ...cats.rounds, ...cats.durations, ...cats.distances];
        return (
          <li key={row.id ?? i} className="flex gap-3">
            <div className="flex flex-col items-center pt-2">
              <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${OUTPUT_TYPE_DOT[String(row.outputType)] ?? OUTPUT_TYPE_DOT.system}`} />
              {i < outputs.length - 1 && <span className="w-px flex-1 bg-border/60" />}
            </div>
            <div className="flex-1 min-w-0 mb-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <TypeChip type={row.outputType} />
                  <BadgeRow metrics={cats.efforts} className="min-w-0" />
                </div>
                <TimeBlock row={row} compact />
              </div>
              <BadgeRow metrics={others} className="mt-1.5" />
              {cats.hints.length > 0 && <BadgeRow metrics={cats.hints} className="mt-1" />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Variant B — Row card / table mirror ───────────────────────────────────────
// Keeps the table mental model: header line, then a labelled 2-col metric grid.

const FIELD: Array<[label: string, key: 'reps' | 'loads' | 'rounds' | 'durations' | 'distances']> = [
  ['Reps', 'reps'],
  ['Load', 'loads'],
  ['Rnds', 'rounds'],
  ['Target', 'durations'],
  ['Dist', 'distances'],
];

function VariantB({ outputs }: { outputs: OutputStatementRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      {outputs.map((row, i) => {
        const cats = extractMetricsByCategory(row.metrics);
        const fields = FIELD.filter(([, k]) => (cats[k] as IMetric[]).length > 0);
        return (
          <article key={row.id ?? i} className="rounded-xl border border-border/60 bg-card px-3 py-2.5">
            <header className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <TypeChip type={row.outputType} />
                <span className="text-xs font-semibold text-foreground truncate">{movementOf(row)}</span>
              </div>
              <TimeBlock row={row} compact />
            </header>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-1.5 items-center">
              {fields.map(([label, k]) => (
                <React.Fragment key={label}>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                  <BadgeRow metrics={cats[k] as IMetric[]} />
                </React.Fragment>
              ))}
              {cats.hints.length > 0 && (
                <React.Fragment key="hints">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Hints</span>
                  <BadgeRow metrics={cats.hints} />
                </React.Fragment>
              )}
              {fields.length === 0 && cats.hints.length === 0 && (
                <span className="text-[11px] text-muted-foreground/60 col-span-2">No metrics on this statement</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ── Variant C — Grouped by movement ───────────────────────────────────────────
// Hierarchy-first: movements as section cards with aggregates, statements inside.

function VariantC({ outputs }: { outputs: OutputStatementRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, { rows: OutputStatementRow[]; reps: number; load: number; dist: number; time: number }>();
    for (const row of outputs) {
      const cats = extractMetricsByCategory(row.metrics);
      const name = movementOf(row);
      const g = map.get(name) ?? { rows: [], reps: 0, load: 0, dist: 0, time: 0 };
      g.rows.push(row);
      for (const r of cats.reps) g.reps += Number(r.value) || 0;
      for (const l of cats.loads) g.load += Number(l.value) || 0;
      for (const d of cats.distances) g.dist += Number(d.value) || 0;
      const ts = row.timeSpan;
      if (ts?.started !== undefined && ts.ended !== undefined) g.time += ts.ended - ts.started;
      map.set(name, g);
    }
    return [...map.entries()];
  }, [outputs]);

  return (
    <div className="flex flex-col gap-3">
      {groups.map(([name, g]) => (
        <section key={name} className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
          <header className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-2 border-b border-border/40">
            <span className="text-xs font-bold text-foreground truncate">{name}</span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
              {g.reps > 0 && <span className="rounded bg-muted px-1.5 py-0.5">Σ {g.reps} reps</span>}
              {g.load > 0 && <span className="rounded bg-muted px-1.5 py-0.5">Σ {g.load} kg</span>}
              {g.dist > 0 && <span className="rounded bg-muted px-1.5 py-0.5">Σ {g.dist} m</span>}
              {g.time > 0 && <span className="rounded bg-muted px-1.5 py-0.5">{formatMMSS(g.time)}</span>}
            </div>
          </header>
          <div className="divide-y divide-border/30">
            {g.rows.map((row, i) => {
              const cats = extractMetricsByCategory(row.metrics);
              const others = [...cats.reps, ...cats.loads, ...cats.rounds, ...cats.durations, ...cats.distances];
              return (
                <div key={row.id ?? i} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <TypeChip type={row.outputType} />
                    <BadgeRow metrics={others} />
                  </div>
                  <TimeBlock row={row} compact />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Empty states (rendered under whichever variant is active) ────────────────

function EmptyStates({ variantName }: { variantName: string }) {
  return (
    <section className="mt-8 pt-4 border-t border-dashed border-border/60">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Empty states — {variantName}
      </p>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <p className="text-xs text-muted-foreground">No output statements recorded for this run.</p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">Start the workout to stream statements here.</p>
        </div>
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <p className="text-xs text-muted-foreground">No output statements match the current filter.</p>
          <button type="button" className="mt-2 text-[11px] text-primary underline">Clear filter</button>
        </div>
      </div>
    </section>
  );
}

// ── Switcher ──────────────────────────────────────────────────────────────────

const VARIANTS: Array<[key: string, name: string, Comp: React.FC<{ outputs: OutputStatementRow[] }>]> = [
  ['A', 'Timeline feed', VariantA],
  ['B', 'Row card (table mirror)', VariantB],
  ['C', 'Grouped by movement', VariantC],
];


function PrototypeSwitcher({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const idx = Math.max(0, VARIANTS.findIndex(([k]) => k === current));
  const cycle = (dir: 1 | -1) => onChange(VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length][0]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContenteditable)) return;
      if (e.key === 'ArrowLeft') cycle(-1);
      if (e.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-zinc-900/90 px-3 py-1.5 text-white shadow-lg backdrop-blur">
      <button type="button" onClick={() => cycle(-1)} aria-label="Previous variant" className="px-1.5 text-lg leading-none">‹</button>
      <span className="min-w-[11rem] text-center text-[11px] font-semibold">
        {VARIANTS[idx][0]} — {VARIANTS[idx][1]}
      </span>
      <button type="button" onClick={() => cycle(1)} aria-label="Next variant" className="px-1.5 text-lg leading-none">›</button>
    </div>
  );
}

// ── Story ─────────────────────────────────────────────────────────────────────

export const Cards: StoryObj = {
  render: function Render() {
    const [variant, setV] = useState(
      () => new URLSearchParams(window.location.search).get('variant') ?? 'A',
    );
    const [, name, Comp] = VARIANTS.find(([k]) => k === variant) ?? VARIANTS[0];
    const switchTo = (next: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set('variant', next);
      window.history.replaceState(null, '', `?${params.toString()}`);
      setV(next);
    };
    return (
      <div className="max-w-[430px] mx-auto pb-16" data-testid="mobile-cards-prototype">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Prototype · {name} · 9 statements
        </p>
        <Comp outputs={FIXTURES} />
        <EmptyStates variantName={name} />
        <PrototypeSwitcher current={variant} onChange={switchTo} />
      </div>
    );
  },
};
