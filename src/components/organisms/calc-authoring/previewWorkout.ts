/**
 * Preview workout fixture (#880) — a small Fran-like stored workout used as
 * the default headless-engine preview target, mirroring the prototype's FRAN
 * fixture and the engine's own test segments. Segment logs carry pre-resolved
 * effort-data so the effort lookup resolves without a live resolver.
 *
 * Production callers may substitute any stored workout via the panel's
 * `logs`/`block` props; this fixture keeps the surface self-sufficient.
 */

import { OutputStatement } from '@bitcobblers/wod-wiki-engine';
import { toStoredOutputStatement, ScriptBlock, StoredOutputStatement } from '@/components/Editor/types';
import type { IMetric } from '@bitcobblers/wod-wiki-engine';

interface SegSpec {
  label: string;
  slug: string;
  met: number;
  discipline: string;
  elapsedMs: number;
  reps?: number;
  resistanceKg?: number;
}

const ROUND: SegSpec[] = [
  { label: 'Thruster', slug: 'thruster', met: 8.5, discipline: 'strength', elapsedMs: 150_000, reps: 21, resistanceKg: 43 },
  { label: 'Pull-up', slug: 'pull-up', met: 7.0, discipline: 'gymnastics', elapsedMs: 120_000, reps: 21, resistanceKg: 0 },
  { label: 'Thruster', slug: 'thruster', met: 8.5, discipline: 'strength', elapsedMs: 150_000, reps: 15, resistanceKg: 43 },
  { label: 'Pull-up', slug: 'pull-up', met: 7.0, discipline: 'gymnastics', elapsedMs: 120_000, reps: 15, resistanceKg: 0 },
  { label: 'Thruster', slug: 'thruster', met: 8.5, discipline: 'strength', elapsedMs: 150_000, reps: 9, resistanceKg: 43 },
  { label: 'Pull-up', slug: 'pull-up', met: 7.0, discipline: 'gymnastics', elapsedMs: 120_000, reps: 9, resistanceKg: 0 },
];

function effortData(spec: SegSpec): IMetric {
  return {
    type: 'effort-data',
    origin: 'analyzed',
    value: {
      slug: spec.slug, label: spec.label, aliases: [],
      baseAttributes: { met: spec.met, discipline: spec.discipline },
      registrySource: 'bundled',
    },
  };
}

function buildSegment(spec: SegSpec, id: number): StoredOutputStatement {
  const metrics: IMetric[] = [effortData(spec)];
  metrics.push({ type: 'elapsed', value: spec.elapsedMs, origin: 'runtime' });
  if (spec.reps !== undefined) metrics.push({ type: 'rep', value: spec.reps, origin: 'runtime' });
  if (spec.resistanceKg !== undefined) metrics.push({ type: 'resistance', value: spec.resistanceKg, origin: 'runtime' });

  const stmt = new OutputStatement({
    outputType: 'segment',
    timeSpan: { started: id * 1000, ended: id * 1000 + spec.elapsedMs },
    sourceBlockKey: 'preview-block',
    stackLevel: 1,
    metrics,
  });
  return toStoredOutputStatement(stmt);
}

function buildBlock(): ScriptBlock {
  return {
    id: 'preview-block',
    dialect: 'time',
    startLine: 0,
    endLine: 10,
    content: '```time\nFran preview\n```',
    state: 'idle',
    widgetIds: {},
    version: 1,
    createdAt: 0,
  };
}

export const previewWorkoutLogs: StoredOutputStatement[] = ROUND.map((r, i) => buildSegment(r, i + 1));
export const previewBlock: ScriptBlock = buildBlock();
