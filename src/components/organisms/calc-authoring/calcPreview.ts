/**
 * Live preview backend (#880) — drives the real headless `CalcEngine`
 * (through `createAnalyticsEngineForBlock`) over stored workout logs for the
 * draft calc lines.
 *
 * Pure logic, no DOM — unit-testable.
 *
 *   - segment scope: per-segment annotations the engine appends to each
 *     segment statement (Phase 1).
 *   - workout scope: running totals, recomputed per segment prefix (Phase 2)
 *     via the engine's live projection emitter.
 *   - store scope: trailing-window series over the workload's daily loads
 *     (illustrative; cross-workout store evaluation needs the Analytics Store
 *     QueryService — labeled a fixture here, as in the prototype).
 */

import { createAnalyticsEngineForBlock } from '@/core/analytics/createAnalyticsEngineForBlock';
import { OutputStatement, IOutputStatement } from '@/core/models/OutputStatement';
import { ScriptBlock, StoredOutputStatement } from '@/components/Editor/types';
import type { CalculationDefinition, CalcScope } from '@/core/analytics/calc/types';
import { outputNodeId } from '@/core/analytics/calc/lineform';

export interface PreviewRequest {
  logs: StoredOutputStatement[];
  block: ScriptBlock;
  defs: CalculationDefinition[];
  scope: CalcScope;
  vo2max?: number;
  sessionRpe?: number;
}

export interface PreviewResult {
  /** One entry per segment (segment scope) or per prefix (workout scope). */
  rows: (PreviewRow | null)[];
  /** Store scope: trailing-window series (last N points). */
  series?: (number | null)[];
  errors: string[];
}

export interface PreviewRow {
  label: string;
  text: string;
  unit?: string;
  estimated?: boolean;
  raw?: number;
}

function toLive(stored: StoredOutputStatement): IOutputStatement {
  return new OutputStatement({
    outputType: stored.outputType,
    timeSpan: stored.timeSpan,
    sourceBlockKey: stored.sourceBlockKey,
    stackLevel: stored.stackLevel,
    sourceStatementId: stored.sourceStatementId,
    metrics: stored.metrics,
    parent: stored.parent,
    completionReason: stored.completionReason,
  });
}

/** Strip analyzed annotations so re-running processes can't double-apply. */
function stripAnalyzed(stored: StoredOutputStatement): StoredOutputStatement {
  return { ...stored, metrics: stored.metrics.filter((m) => m.origin !== 'analyzed') };
}

function calcEmitKey(def: CalculationDefinition): string {
  return def.output?.emitType ?? def.output?.key ?? def.id;
}

/**
 * Find a projection output by its projection name (Label metric value) and
 * return its numeric value metric.
 */
function extractProjectionValue(
  finalOutputs: readonly IOutputStatement[],
  key: string,
): { value: unknown; unit?: string; origin?: string } | undefined {
  for (const out of finalOutputs) {
    if (out.outputType !== 'analytics') continue;
    const label = out.metrics.find((m) => m.type?.toLowerCase() === 'label' && String(m.value) === key)
      ?? out.metrics.find((m) => String(m.value) === key);
    if (!label) continue;
    const num = out.metrics.find((m) => typeof m.value === 'number');
    if (num) return { value: num.value, unit: num.unit, origin: num.origin };
  }
  return undefined;
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function makeEngine(block: ScriptBlock, req: PreviewRequest, calcs: CalculationDefinition[]) {
  return createAnalyticsEngineForBlock(block, {
    userProfile: req.vo2max !== undefined ? { vo2max: req.vo2max } : undefined,
    calcs,
  }).engine;
}

export function runCalcPreview(req: PreviewRequest): PreviewResult {
  const errors: string[] = [];
  const target = req.defs[0];
  if (!target) return { rows: [], errors: ['No calc line to preview.'] };
  const key = calcEmitKey(target);

  const segmentLogs = req.logs.filter((l) => l.outputType === 'segment');

  if (req.scope === 'segment') {
    const engine = makeEngine(req.block, req, req.defs);
    const rows: (PreviewRow | null)[] = [];
    for (const stored of segmentLogs) {
      const enriched = engine.run(toLive(stripAnalyzed(stored)));
      const match = enriched.metrics.rawMetrics.find((m) => m.type === key);
      if (!match) { rows.push(null); continue; }
      const value = typeof match.value === 'number' ? match.value : NaN;
      if (!Number.isFinite(value)) { rows.push(null); continue; }
      rows.push({
        label: (stored.metrics.find((m) => m.type === 'effort-data')?.value as { label?: string } | undefined)?.label ?? 'segment',
        text: fmt(value),
        unit: match.unit,
        estimated: match.origin === 'analyzed-estimated',
        raw: value,
      });
    }
    return { rows, errors };
  }

  if (req.scope === 'workout') {
    const stripped = segmentLogs.map(stripAnalyzed);
    const rows: (PreviewRow | null)[] = [];
    for (let upto = 1; upto <= stripped.length; upto++) {
      const engine = makeEngine(req.block, req, req.defs);
      for (let i = 0; i < upto; i++) engine.run(toLive(stripped[i]));
      const final = engine.finalize();
      const m = extractProjectionValue(final, key);
      const value = m ? (typeof m.value === 'number' ? m.value : NaN) : NaN;
      if (m && Number.isFinite(value)) {
        rows.push({
          label: `after line ${upto}`,
          text: fmt(value),
          unit: m.unit,
          estimated: m.origin === 'analyzed-estimated',
          raw: value,
        });
      } else {
        rows.push(null);
      }
    }
    return { rows, errors };
  }

  return runStorePreview(target, errors);
}

/** Fixture daily sessionLoad values (28 days) — mirrors the prototype. */
const DAILY_LOADS = [420, 0, 380, 510, 0, 290, 610, 450, 0, 520, 340, 0, 480, 390, 560, 0, 410, 470, 0, 530, 360, 440, 0, 500, 580, 320, 0, 460];

function runStorePreview(target: CalculationDefinition, errors: string[]): PreviewResult {
  const series: (number | null)[] = [];
  const expr = target.variants[0]?.nodes[outputNodeId(target) ?? 'value']?.expression ?? '';

  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
  const sd = (x: number[]) => { const m = mean(x); return Math.sqrt(mean(x.map((v) => (v - m) ** 2))); };
  const windowed = (n: number, f: (w: number[]) => number) =>
    DAILY_LOADS.map((_, i) => (i + 1 >= n ? f(DAILY_LOADS.slice(i + 1 - n, i + 1)) : NaN));

  const a7 = windowed(7, mean);
  const a28 = windowed(28, mean);
  const s7 = windowed(7, sd);
  const sum7 = windowed(7, (x) => x.reduce((a, b) => a + b, 0));

  const ratio = expr.includes('windowSd') || expr.length === 0
    ? a7.map((v, i) => v / s7[i])
    : a7.map((v, i) => v / a28[i]);
  const points = expr.includes('windowSum') || expr.includes(' * sum') ? sum7 : ratio;
  last7(points, series);

  return { rows: [], series, errors };
}

function last7(points: number[], into: (number | null)[]): void {
  for (const v of points.slice(-7)) into.push(Number.isNaN(v) ? null : Number(Math.round(v * 100) / 100));
}
