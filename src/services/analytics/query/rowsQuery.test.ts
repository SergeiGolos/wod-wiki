/**
 * Rows Query tests — the third WQL family (rows:{…}, #949, ADR
 * docs/adr/rows-query-plane.md).
 *
 * Defends the observable contracts:
 *   1. Parse: bare head + optional output-type target; filters reuse the
 *      shared grammar; `last` window supported; aggregation suffixes
 *      (where/by/rollup) are loud errors — rows never aggregates.
 *   2. Execute: scopes result:/block:/note: union and dedupe; runs sort
 *      newest-first by workout end time; output-type narrowing filters
 *      statements; unsupported filters (wrong key, negation, wildcard) and
 *      scope-less queries error loudly; facts are never read ("logs win").
 */
import { describe, expect, it } from 'bun:test';
import type { WorkoutResult } from '@/types/storage';
import type { StoredOutputStatement } from '@/components/Editor/types';
import { parseQuery, isRowsQuery } from './wql';
import { QueryService, type FactQueryStore, type NoteQueryStore, type BlockQueryStore, type EffortQueryStore, type ResultLogStore } from './QueryService';

const DAY = 86_400_000;
const day0 = Math.floor(1_700_000_000_000 / DAY) * DAY;

// ─── Fixtures ───────────────────────────────────────────────────

let logSeq = 0;
function log(outputType: string): StoredOutputStatement {
  logSeq += 1;
  return { id: logSeq, outputType, timeSpan: { started: day0, ended: day0 + 1000 }, metrics: [] } as unknown as StoredOutputStatement;
}

function makeResult(id: string, noteId: string, blockContentId: string, endTime: number, logs = [log('segment'), log('segment'), log('milestone')]): WorkoutResult {
  return {
    id,
    noteId,
    blockContentId,
    data: { startTime: endTime - 60_000, endTime, duration: 60_000, logs },
    createdAt: endTime,
  } as WorkoutResult;
}

// rA (newest) + rB share block bc-1 / note n1; rC is another block + note.
const RA = makeResult('rA', 'n1', 'bc-1', day0);
const RB = makeResult('rB', 'n1', 'bc-1', day0 - 7 * DAY);
const RC = makeResult('rC', 'n2', 'bc-2', day0 - 14 * DAY);
const RESULTS = [RA, RB, RC];

function makeService(resultCalls: string[] = []) {
  const factStore: FactQueryStore = {
    getFactsByMetric: async () => { throw new Error('facts must never be read on the rows path'); },
    getFactsByTimeRange: async () => { throw new Error('facts must never be read on the rows path'); },
    getNoteTagLabels: async () => [],
  };
  const noteStore: NoteQueryStore = { getAllNotes: async () => [] } as unknown as NoteQueryStore;
  const blockStore: BlockQueryStore = { getAllBlocks: async () => [] };
  const effortStore: EffortQueryStore = { getAllEfforts: async () => [] };
  const resultStore: ResultLogStore = {
    getResultById: async (id) => { resultCalls.push(`by-id:${id}`); return RESULTS.find((r) => r.id === id); },
    getResultsByContentId: async (bc) => { resultCalls.push(`by-content:${bc}`); return RESULTS.filter((r) => r.blockContentId === bc); },
    getResultsForNote: async (noteId) => { resultCalls.push(`by-note:${noteId}`); return RESULTS.filter((r) => r.noteId === noteId); },
  };
  return new QueryService(factStore, noteStore, blockStore, resultStore, effortStore);
}

function rows(raw: string) {
  const parsed = parseQuery(raw);
  if (!isRowsQuery(parsed)) throw new Error(`expected rows query, got ${JSON.stringify(parsed)}`);
  return parsed;
}

// ─── Parse ──────────────────────────────────────────────────────

describe('parseQuery — rows family', () => {
  it('parses the bare head with a result scope', () => {
    const p = rows('rows:{result:abc}');
    expect(p.error).toBeUndefined();
    expect(p.outputType).toBeUndefined();
    expect(p.filters).toEqual([{ key: 'result', negate: false, values: [{ value: 'abc', wildcard: false }] }]);
  });

  it('parses the output-type target and block scope', () => {
    const p = rows('rows:segment{block:bc-1}');
    expect(p.error).toBeUndefined();
    expect(p.outputType).toBe('segment');
    expect(p.filters[0]).toMatchObject({ key: 'block' });
  });

  it('parses the note scope with a last window', () => {
    const p = rows('rows:{note:n1} last 8w');
    expect(p.error).toBeUndefined();
    expect(p.last).toEqual({ size: 8, unit: 'w' });
  });

  it('rejects aggregation suffixes — rows never aggregates', () => {
    expect(rows('rows:{result:x} by {session}').error).toContain('no where / by / rollup');
    expect(rows('rows:{result:x} where find:note{}').error).toContain('no where / by / rollup');
    expect(rows('rows:{result:x} .rollup(1w)').error).toContain('no where / by / rollup');
  });

  it('rejects malformed heads and filters', () => {
    expect(rows('rows foo').error).toBeDefined();
    expect(rows('rows:{result:').error).toBeDefined();
  });
});

// ─── Execute ────────────────────────────────────────────────────

describe('QueryService.runRows', () => {
  it('result scope returns the single session with all statement types', async () => {
    const res = await makeService().runRows(rows('rows:{result:rA}'));
    expect(res.error).toBeUndefined();
    expect(res.runs.map((r) => r.result.id)).toEqual(['rA']);
    expect(res.runs[0]!.logs.map((l) => l.outputType)).toEqual(['segment', 'segment', 'milestone']);
  });

  it('block scope unions all versions, newest first', async () => {
    const res = await makeService().runRows(rows('rows:{block:bc-1}'));
    expect(res.runs.map((r) => r.result.id)).toEqual(['rA', 'rB']);
  });

  it('note scope returns every run in the note', async () => {
    const res = await makeService().runRows(rows('rows:{note:n1}'));
    expect(res.runs.map((r) => r.result.id)).toEqual(['rA', 'rB']);
  });

  it('scopes OR within a key and union across keys, deduped by result id', async () => {
    const res = await makeService().runRows(rows('rows:{result:rA|rC, block:bc-1}'));
    expect(res.runs.map((r) => r.result.id)).toEqual(['rA', 'rB', 'rC']);
  });

  it('output-type narrowing filters statements, not runs', async () => {
    const res = await makeService().runRows(rows('rows:segment{result:rA}'));
    expect(res.runs[0]!.logs.map((l) => l.outputType)).toEqual(['segment', 'segment']);
    const milestoneOnly = await makeService().runRows(rows('rows:milestone{result:rA}'));
    expect(milestoneOnly.runs[0]!.logs).toHaveLength(1);
  });

  it('drops runs whose narrowing leaves no statements', async () => {
    const res = await makeService().runRows(rows('rows:nonexistent-type{block:bc-1}'));
    expect(res.runs).toEqual([]);
  });

  it('last window filters by workout end time', async () => {
    const res = await makeService().runRows(rows('rows:{block:bc-1} last 6d'), { anchorNow: day0 });
    expect(res.runs.map((r) => r.result.id)).toEqual(['rA']);
  });

  it('rejects unsupported filters loudly (wrong key, negation, wildcard)', async () => {
    expect((await makeService().runRows(rows('rows:{effort:thruster}'))).error).toContain('Unsupported rows filter');
    expect((await makeService().runRows(rows('rows:{!result:rA}'))).error).toContain('Unsupported rows filter');
    expect((await makeService().runRows(rows('rows:{block:bc-*}'))).error).toContain('Unsupported rows filter');
  });

  it('rejects a scope-less query', async () => {
    expect((await makeService().runRows(rows('rows:{}'))).error).toContain('needs a scope');
  });

  it('propagates parse errors without touching stores', async () => {
    const calls: string[] = [];
    const res = await makeService(calls).runRows(rows('rows foo'));
    expect(res.error).toBeDefined();
    expect(res.runs).toEqual([]);
    expect(calls).toEqual([]);
  });
});
