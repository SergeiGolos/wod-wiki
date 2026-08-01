/**
 * Built-in calculation suite as DAG seed records (#849 resolution 4: seeds
 * are TS object literals; no parser on the critical path — the line-form
 * parser's acceptance test is round-tripping these exact records).
 *
 * This is spec §6 compiled to record form, with the migration decisions
 * baked in:
 * - rest exclusion pinned once as the shared filter `rest|pause|rest-*` (§10.6);
 * - origin provenance via the metMinutesEstimated companion count (§10.3);
 * - TIS intermediate nodes published as fact metadata (§10.4);
 * - durationScore carries a `pts` cast — §5.3 applied to intermediates so
 *   the score algebra passes static dimension checking;
 * - rounding lives in `round()` where today rounds, nowhere else (§10.9).
 */

import { CalculationDefinition } from './types';

/** Shared rest/pause exclusion filter constant (§10.6). */
export const REST_EXCLUSION = 'rest|pause|rest-*';

const expr = (id: string, expression: string, unit?: string) =>
  ({ id, kind: 'expr' as const, expression, unit });

export const BUILTIN_CALCS: CalculationDefinition[] = [
  // ── segment scope (Tier-1 annotations) ────────────────────────────────
  {
    id: 'pace-reps',
    kind: 'output',
    scope: 'segment',
    fences: ['wod', 'log'],
    when: 'elapsed > 0 and has(reps)',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { value: expr('value', 'reps / convert(elapsed, min)') },
    }],
    output: { nodeId: 'value', emitType: 'pace', unit: 'reps/min' },
  },
  {
    id: 'pace-speed',
    kind: 'output',
    scope: 'segment',
    fences: ['wod', 'log'],
    when: 'elapsed > 0 and has(distance)',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { value: expr('value', 'distance / convert(elapsed, s)') },
    }],
    output: { nodeId: 'value', emitType: 'pace', unit: 'm/s' },
  },
  {
    id: 'pace-runner',
    kind: 'output',
    scope: 'segment',
    fences: ['wod', 'log'],
    when: 'elapsed > 0 and has(distance)',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { value: expr('value', 'convert(elapsed, min) / convert(distance, km)') },
    }],
    output: { nodeId: 'value', emitType: 'pace', unit: 'min/km' },
  },
  {
    id: 'power',
    kind: 'output',
    scope: 'segment',
    fences: ['wod', 'log'],
    when: 'elapsed > 0 and has(reps) and has(resistance)',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { value: expr('value', 'reps * resistance / convert(elapsed, s)') },
    }],
    output: { nodeId: 'value', emitType: 'power', unit: 'auto' },
  },
  {
    id: 'segment-volume',
    kind: 'library',
    scope: 'segment',
    when: 'has(reps) and has(resistance)',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { segmentVolume: expr('segmentVolume', 'reps * resistance') },
    }],
  },
  {
    id: 'effort-rpe',
    kind: 'library',
    scope: 'segment',
    when: 'has(effortLabel)',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { effortRpe: expr('effortRpe', 'lookup("rpe-labels", effortLabel, "rpe")') },
    }],
  },
  {
    id: 'met-minutes-segment',
    kind: 'library',
    scope: 'segment',
    // Fenced like the legacy MetMinuteProjectionEngine — the annotation must
    // not appear on plan-dialect logs (its workout consumer is fenced too).
    fences: ['wod', 'log'],
    when: 'elapsed > 0',
    variants: [
      {
        id: 'resolved', priority: 100,
        when: 'lookup("effort", effort, "resolvedFrom") != "default"',
        origin: 'analyzed',
        nodes: { metMinutes: expr('metMinutes', 'lookup("effort", effort, "met") * convert(elapsed, min)') },
      },
      {
        id: 'unresolved', priority: 10,
        origin: 'analyzed-estimated',
        nodes: {
          metMinutes: expr('metMinutes', 'lookup("effort", effort, "met") * convert(elapsed, min)'),
          // Companion count (§10.3): workout variants predicate on this.
          metMinutesEstimated: expr('metMinutesEstimated', '1'),
        },
      },
    ],
  },

  // ── workout scope (Tier-2 summaries) ───────────────────────────────────
  {
    id: 'total-reps',
    kind: 'output',
    scope: 'workout',
    fences: ['wod', 'log', 'plan'],
    when: 'has(sum(reps)) and sum(reps) > 0',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { total: expr('total', 'sum(reps)') },
    }],
    output: { nodeId: 'total', key: 'reps', emitType: 'rep', unit: 'reps' },
  },
  {
    id: 'total-reps-by-effort',
    kind: 'output',
    scope: 'workout',
    fences: ['wod', 'log', 'plan'],
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { total: expr('total', `sum(reps, without: ${REST_EXCLUSION})`) },
    }],
    output: { nodeId: 'total', key: 'reps', emitType: 'rep', unit: 'reps', isGrouped: true, groupBy: ['effort'] },
  },
  {
    id: 'total-distance',
    kind: 'output',
    scope: 'workout',
    fences: ['wod', 'log', 'plan'],
    when: 'has(sum(distance)) and sum(distance) > 0',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { total: expr('total', 'sum(distance)') },
    }],
    output: { nodeId: 'total', key: 'distance', emitType: 'distance', unit: 'auto' },
  },
  {
    id: 'total-volume',
    kind: 'output',
    scope: 'workout',
    fences: ['wod', 'log', 'plan'],
    when: 'has(sum(segmentVolume)) and sum(segmentVolume) > 0',
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: { total: expr('total', 'sum(segmentVolume)') },
    }],
    output: { nodeId: 'total', key: 'totalVolume', emitType: 'volume', unit: 'auto' },
  },
  {
    id: 'total-volume-by-effort',
    kind: 'output',
    scope: 'workout',
    fences: ['wod', 'log', 'plan'],
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: {
        total: expr('total', 'sum(segmentVolume)'),
        totalSets: expr('totalSets', 'count(segmentVolume)'),
      },
    }],
    output: {
      nodeId: 'total', key: 'totalVolume', emitType: 'volume', unit: 'auto',
      isGrouped: true, groupBy: ['effort'], publishMetadataNodes: ['totalSets'],
    },
  },
  {
    id: 'met-minutes',
    kind: 'output',
    scope: 'workout',
    fences: ['wod', 'log'],
    when: 'has(sum(metMinutes))',
    variants: [
      {
        // Companion-count provenance (§10.3): any estimated segment flags
        // the whole workout estimated — today's resolveDominantOrigin rule.
        id: 'estimated', priority: 100,
        when: 'sum(metMinutesEstimated) > 0',
        origin: 'analyzed-estimated',
        nodes: { total: expr('total', 'round(sum(metMinutes))') },
      },
      {
        id: 'resolved', priority: 10,
        origin: 'analyzed',
        nodes: { total: expr('total', 'round(sum(metMinutes))') },
      },
    ],
    output: { nodeId: 'total', key: 'calc.metMinutes', emitType: 'work', unit: 'MET-min' },
  },
  {
    id: 'rpeSource',
    kind: 'library',
    scope: 'workout',
    variants: [
      {
        id: 'captured', priority: 100,
        when: 'has(sessionRpe)',
        origin: 'analyzed',
        nodes: { rpe: expr('rpe', 'sessionRpe') },
      },
      {
        id: 'label', priority: 50,
        when: 'has(max(effortRpe))',
        origin: 'analyzed',
        nodes: { rpe: expr('rpe', 'max(effortRpe)') },
      },
      {
        id: 'default', priority: 10,
        origin: 'analyzed-estimated',
        nodes: { rpe: expr('rpe', '5') },
      },
    ],
  },
  {
    id: 'session-load',
    kind: 'output',
    scope: 'workout',
    fences: ['wod', 'log'],
    when: 'has(session.duration)',
    variants: [
      {
        id: 'captured-rpe', priority: 100,
        when: 'has(sessionRpe)',
        origin: 'analyzed',
        nodes: sessionLoadNodes(),
      },
      {
        id: 'label-rpe', priority: 50,
        when: 'has(max(effortRpe))',
        origin: 'analyzed',
        nodes: sessionLoadNodes(),
      },
      {
        id: 'default-rpe', priority: 10,
        origin: 'analyzed-estimated',
        nodes: sessionLoadNodes(),
      },
    ],
    output: {
      nodeId: 'load', key: 'sessionLoad', emitType: 'load', unit: 'AU',
      publishMetadataNodes: ['sRPE', 'durationMinutes'],
    },
  },
  {
    id: 'sharedMet',
    kind: 'library',
    scope: 'workout',
    variants: [
      {
        id: 'personalized', priority: 100,
        when: 'has(profile.vo2max)',
        origin: 'analyzed',
        nodes: { metMax: expr('metMax', 'profile.vo2max / 3.5') },
      },
      {
        id: 'population', priority: 10,
        origin: 'analyzed',
        nodes: { metMax: expr('metMax', '11.4') },
      },
    ],
  },
  {
    id: 'tis',
    kind: 'output',
    scope: 'workout',
    fences: ['wod', 'log', 'plan'],
    when: 'has(sum(metMinutes)) and has(sum(elapsed))',
    variants: [
      {
        // Today's origin rule: estimated iff any elapsed-bearing segment had
        // unresolved effort (dominant-origin via the companion count, §10.3).
        id: 'resolved', priority: 100,
        when: 'not (sum(metMinutesEstimated) > 0)',
        origin: 'analyzed',
        nodes: tisNodes(),
      },
      {
        id: 'estimated', priority: 10,
        origin: 'analyzed-estimated',
        nodes: tisNodes(),
      },
    ],
    output: {
      nodeId: 'tis', key: 'tis', emitType: 'tis', unit: 'pts',
      publishMetadataNodes: ['metScore', 'rpeScore', 'durationScore', 'disciplineFactor', 'metMax'],
    },
  },
];

/** SessionLoad node graph — identical across variants, only the origin differs. */
function sessionLoadNodes(): CalculationDefinition['variants'][number]['nodes'] {
  return {
    sRPE: expr('sRPE', 'rpeSource.rpe'),
    durationMinutes: expr('durationMinutes', 'convert(session.duration, min)'),
    load: expr('load', 'round(rpeSource.rpe * convert(session.duration, min))'),
  };
}

/** TIS node graph — identical across variants, only the origin differs. */
function tisNodes(): CalculationDefinition['variants'][number]['nodes'] {
  return {
    elapsedMin: expr('elapsedMin', 'convert(sum(elapsed), min)'),
    avgMets: expr('avgMets', 'sum(metMinutes) / elapsedMin'),
    metMax: expr('metMax', 'sharedMet.metMax'),
    metScore: expr('metScore', 'min(100, avgMets / metMax * 100)'),
    rpeScore: expr('rpeScore', 'rpeSource.rpe * 10'),
    // The pts cast (§5.3 on intermediates): hours×score folds time into the
    // dimensionless score algebra so the weighted sum type-checks.
    durationScore: expr('durationScore', 'elapsedMin / 60 * metScore', 'pts'),
    disciplineFactor: expr('disciplineFactor', 'lookup("effort", effort, "disciplineFactor")'),
    tis: expr('tis', 'round(0.30 * metScore + 0.35 * rpeScore + 0.20 * durationScore + 0.15 * disciplineFactor, 1)'),
  };
}

// ── store scope (cross-workout rollups, #877) ──────────────────────────────
//
// ACWR / monotony / strain as composed calcs — the rollup absorption (#850).
// Window semantics are parity-pinned to workloadRollup.ts (#864): trailing
// windows over a zero-filled continuous day domain, population SD, strain =
// monotony × weekly sum. Each output publishes one fact per series point.

const dailyLoads = () => ({ id: 'daily', kind: 'wql' as const, expression: 'sum:sessionLoad{} by {day}' });

export const STORE_CALCS: CalculationDefinition[] = [
  {
    id: 'acwr',
    kind: 'output',
    scope: 'store',
    fences: ['wod', 'log'],
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: {
        daily: dailyLoads(),
        acute: expr('acute', 'windowMean(daily, 7d)'),
        chronic: expr('chronic', 'windowMean(daily, 28d)'),
        value: expr('value', 'acute / chronic'),
      },
    }],
    output: { nodeId: 'value', key: 'calc.acwr', unit: 'ratio', label: 'Acute:Chronic Workload Ratio' },
  },
  {
    id: 'monotony',
    kind: 'output',
    scope: 'store',
    fences: ['wod', 'log'],
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: {
        daily: dailyLoads(),
        mean7: expr('mean7', 'windowMean(daily, 7d)'),
        sd7: expr('sd7', 'windowSd(daily, 7d)'),
        value: expr('value', 'mean7 / sd7'),
      },
    }],
    output: { nodeId: 'value', key: 'calc.monotony', unit: 'ratio', label: 'Training Monotony' },
  },
  {
    id: 'strain',
    kind: 'output',
    scope: 'store',
    fences: ['wod', 'log'],
    variants: [{
      id: 'default', priority: 10, origin: 'analyzed',
      nodes: {
        daily: dailyLoads(),
        monotony: expr('monotony', 'windowMean(daily, 7d) / windowSd(daily, 7d)', 'ratio'),
        weekly: expr('weekly', 'windowSum(daily, 7d)'),
        value: expr('value', 'monotony * weekly'),
      },
    }],
    output: { nodeId: 'value', key: 'calc.strain', unit: 'AU', label: 'Training Strain' },
  },
];
