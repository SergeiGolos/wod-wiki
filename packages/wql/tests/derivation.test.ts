import { describe, expect, it } from 'vitest';
import {
  projectEventToFacts,
  toEventRows,
  toSummaryEventRows,
  type EventRowIdentity,
} from '../src/derivation';
import type { StoredOutputStatement, UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';

const TS = 1_700_000_000_000;
const IDENTITY: EventRowIdentity = {
  noteId: 'n1',
  resultId: 'r1',
  blockContentId: 'bc1',
  origin: 'journal',
  pageId: 'p1',
  workoutTimestamp: TS,
};

function statement(overrides: Partial<StoredOutputStatement> = {}): StoredOutputStatement {
  return {
    outputType: 'segment',
    metrics: [
      { type: 'label', value: 'Total Volume' },
      { type: 'volume', value: 142, unit: 'kg', metadata: { effortSlug: 'effort-01' } },
    ],
    timeSpan: { started: TS + 5_000, ended: TS + 65_000 },
    sourceBlockKey: 'blk-1',
    stackLevel: 2,
    ...overrides,
  } as StoredOutputStatement;
}

function summaryStatement(
  projection: string,
  value: number,
  unit: string,
  metadata: Record<string, unknown> = {},
): StoredOutputStatement {
  return {
    outputType: 'analytics',
    metrics: [
      { type: 'label', value: projection },
      { type: 'volume', value, unit, metadata },
    ],
    timeSpan: { started: TS, ended: TS },
  } as StoredOutputStatement;
}

/** Narrow the loose stored-metric union down to the metadata-carrying shape. */
function metricMetadata(metric: unknown): Record<string, unknown> | undefined {
  if (metric && typeof metric === 'object' && 'metadata' in metric) {
    const meta = (metric as { metadata?: unknown }).metadata;
    return meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : undefined;
  }
  return undefined;
}

describe('toEventRows — logs → event rows, 1:1 per statement (ticket 002)', () => {
  it('maps every statement to an event row with promoted identity and deterministic id', () => {
    const rows = toEventRows([statement(), statement({ outputType: 'system' })], IDENTITY);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'r1:0',
      resultId: 'r1',
      noteId: 'n1',
      blockContentId: 'bc1',
      pageId: 'p1',
      origin: 'journal',
      grain: 'event',
      outputType: 'segment',
      // canonical workout time wins over the statement's own timeSpan
      timestamp: TS,
      effortSlug: 'effort-01',
      sourceBlockKey: 'blk-1',
      stackLevel: 2,
    });
    expect(rows[1].id).toBe('r1:1');
    expect(rows[1].timestamp).toBe(TS);
    // metrics array carried verbatim
    expect(rows[0].metrics).toEqual(statement().metrics);
  });

  it('falls back to the statement timeSpan start when no workout timestamp is given', () => {
    const rows = toEventRows([statement()], { ...IDENTITY, workoutTimestamp: undefined });
    expect(rows[0].timestamp).toBe(TS + 5_000);
  });

  it('takes effortSlug from the first metric that carries one', () => {
    const s = statement({
      metrics: [
        { type: 'label', value: 'X' },
        { type: 'reps', value: 21 },
        { type: 'volume', value: 100, metadata: { effortSlug: 'effort-09' } },
      ],
    } as Partial<StoredOutputStatement>);
    expect(toEventRows([s], IDENTITY)[0].effortSlug).toBe('effort-09');
  });
});

describe('toSummaryEventRows — analytics outputs → deterministic summary rows (tickets 002/004)', () => {
  it('emits one keep-last summary row per metricKey+groupTags with a deterministic id', () => {
    const logs: StoredOutputStatement[] = [
      summaryStatement('Total Volume', 100, 'kg', { effortSlug: 'effort-01' }),
      summaryStatement('Total Volume', 200, 'kg', { effortSlug: 'effort-01' }), // keep-last
      summaryStatement('TIS', 12, 'min'),
    ];
    const rows = toSummaryEventRows(logs, IDENTITY);

    expect(rows).toHaveLength(2);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const vol = byId.get('r1:summary:totalVolume:effort=effort-01');
    expect(vol).toBeDefined();
    expect(vol!.grain).toBe('summary');
    expect(vol!.outputType).toBe('analytics');
    expect(vol!.timestamp).toBe(TS);
    // exactly one metrics entry; fold identity lives in metadata
    expect(vol!.metrics).toHaveLength(1);
    const m = vol!.metrics[0] as { value: unknown };
    expect(m.value).toBe(200);
    expect(metricMetadata(vol!.metrics[0])).toMatchObject({ canonicalKey: 'totalVolume', effortSlug: 'effort-01' });
    expect(byId.get('r1:summary:tis')).toBeDefined();
  });

  it('is deterministic — same logs, same ids, no timestamp salt', () => {
    const logs = [summaryStatement('Total Volume', 100, 'kg')];
    const a = toSummaryEventRows(logs, IDENTITY);
    const b = toSummaryEventRows(logs, IDENTITY);
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });

  it('carries grade through the summary fold and back out of projection', () => {
    const logs: StoredOutputStatement[] = [
      summaryStatement('Total Volume', 200, 'kg', { effortSlug: 'effort-01', grade: 'Rx' }),
    ];
    const [row] = toSummaryEventRows(logs, IDENTITY);
    expect(metricMetadata(row.metrics[0])?.grade).toBe('Rx');
    const [fact] = projectEventToFacts(row);
    expect(fact.grade).toBe('Rx');
  });
});

describe('projectEventToFacts — event rows → flat fact currency (ticket 003 SELECT)', () => {
  it('flattens an event row to one fact per numeric metric, canonical key first', () => {
    const row: UnifiedEventRecord = toEventRows(
      [
        statement({
          metrics: [
            { type: 'label', value: 'Total Volume' },
            { type: 'volume', value: 142, unit: 'kg', metadata: { canonicalKey: 'totalVolume', effortSlug: 'effort-01' } },
            { type: 'reps', value: 21 },
          ],
        } as Partial<StoredOutputStatement>),
      ],
      IDENTITY,
    )[0];
    const facts = projectEventToFacts(row);

    expect(facts).toHaveLength(2);
    expect(facts[0]).toMatchObject({
      id: 'r1:0:0',
      resultId: 'r1',
      grain: 'event',
      metricKey: 'totalVolume', // metadata.canonicalKey wins
      value: 142,
      effortSlug: 'effort-01',
      timestamp: TS,
    });
    // no canonicalKey → name-derived from the row's label metric
    expect(facts[1].metricKey).toBe('totalVolume');
    expect(facts[1].value).toBe(21);
  });

  it('projects a summary row to exactly one fact from its single metrics entry', () => {
    const summary = toSummaryEventRows(
      [summaryStatement('Total Volume', 200, 'kg', { effortSlug: 'effort-01' })],
      IDENTITY,
    )[0];
    const facts = projectEventToFacts(summary);

    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      id: `${summary.id}:0`,
      grain: 'summary',
      metricKey: 'totalVolume',
      value: 200,
    });
  });
});
