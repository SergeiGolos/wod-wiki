import { describe, expect, it } from 'vitest';
import type { StoredOutputStatement, UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';
import { parseQuery, isRowsQuery, type ParsedRowsQuery } from '../src/wql';
import { toEventRows } from '../src/derivation';
import { QueryService, type UnifiedEventStore } from '../src/QueryService';

const DAY = 86_400_000;
const day0 = Math.floor(1_700_000_000_000 / DAY) * DAY;

let logSeq = 0;
function log(outputType: NonNullable<StoredOutputStatement['outputType']>): StoredOutputStatement {
  logSeq += 1;
  return { id: logSeq, outputType, timeSpan: { started: day0, ended: day0 + 1000 }, metrics: [] };
}

/** The event rows a streaming write path appended for one result. */
function makeResult(id: string, noteId: string, blockContentId: string, endTime: number, logs = [log('segment'), log('segment'), log('milestone')]): UnifiedEventRecord[] {
  return toEventRows(logs, { noteId, resultId: id, blockContentId, workoutTimestamp: endTime });
}

const RA = makeResult('rA', 'n1', 'bc-1', day0);
const RB = makeResult('rB', 'n1', 'bc-1', day0 - 7 * DAY);
const RC = makeResult('rC', 'n2', 'bc-2', day0 - 14 * DAY);
const EVENT_ROWS = [...RA, ...RB, ...RC];

function makeService(resultCalls: string[] = []) {
  const eventStore: UnifiedEventStore = {
    getEventsByTimeRange: async () => { throw new Error('time range must never be read on the rows path'); },
    getEventsByResult: async (id) => { resultCalls.push(`by-id:${id}`); return EVENT_ROWS.filter((r) => r.resultId === id); },
    getEventsForNote: async (noteId) => { resultCalls.push(`by-note:${noteId}`); return EVENT_ROWS.filter((r) => r.noteId === noteId); },
    getEventsByContent: async (bc) => { resultCalls.push(`by-content:${bc}`); return EVENT_ROWS.filter((r) => r.blockContentId === bc); },
    scanAll: async () => { throw new Error('scan must never be read on the rows path'); },
    appendEvents: async () => {},
    finalizeSummaries: async () => {},
    deleteEvents: async () => {},
  };
  const noteStore = { getAllNotes: async () => [], getNoteIdsForTag: async () => new Set<string>(), getNoteTagLabels: async () => [] };
  const blockStore = { getAllBlocks: async () => [] };
  const effortStore = { getAllEfforts: async () => [] };
  return new QueryService(eventStore, noteStore, blockStore, effortStore);
}

function rows(raw: string) {
  const parsed = parseQuery(raw);
  if (!isRowsQuery(parsed)) throw new Error(`expected rows query, got ${JSON.stringify(parsed)}`);
  return parsed;
}

/** Hand-built rows AST — the programmatic surface stays open to custom
 *  outputType values the C7 text surface rejects (prototype: closed enum). */
function rowsAst(outputType: string, scopeKey: 'result' | 'block' | 'note', scopeValue: string): ParsedRowsQuery {
  return {
    family: 'rows',
    raw: `rows:${outputType}{${scopeKey}:${scopeValue}}`,
    outputType,
    filters: [{ key: scopeKey, negate: false, values: [{ value: scopeValue, wildcard: false }] }],
  };
}

describe('parseQuery — rows family', () => {
  it('parses the explicit all target with a result scope', () => {
    const p = rows('rows:all{result:abc}');
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
    const p = rows('rows:all{note:n1} last 8w');
    expect(p.error).toBeUndefined();
    expect(p.window).toEqual({ kind: 'relative', size: 8, unit: 'w' });
  });

  it('rejects aggregation suffixes — rows never aggregates', () => {
    expect(rows('rows:all{result:x} by {session}').error).toContain('no where / by / rollup');
    expect(rows('rows:all{result:x} where find:note{}').error).toContain('no where / by / rollup');
    expect(rows('rows:all{result:x} .rollup(1w)').error).toContain('no where / by / rollup');
  });

  it('rejects malformed heads and filters', () => {
    expect(rows('rows foo').error).toBeDefined();
    expect(rows('rows:all{result:').error).toBeDefined();
  });
});

describe('QueryService.runRows', () => {
  it('result scope returns the single session with all statement types', async () => {
    const res = await makeService().runRows(rows('rows:all{result:rA}'));
    expect(res.error).toBeUndefined();
    expect(res.runs.map((r) => r.resultId)).toEqual(['rA']);
    expect(res.runs[0]!.events.map((e) => e.outputType)).toEqual(['segment', 'segment', 'milestone']);
  });

  it('block scope unions all versions, newest first', async () => {
    const res = await makeService().runRows(rows('rows:all{block:bc-1}'));
    expect(res.runs.map((r) => r.resultId)).toEqual(['rA', 'rB']);
  });

  it('note scope returns every run in the note', async () => {
    const res = await makeService().runRows(rows('rows:all{note:n1}'));
    expect(res.runs.map((r) => r.resultId)).toEqual(['rA', 'rB']);
  });

  it('scopes OR within a key and union across keys, deduped by result id', async () => {
    const res = await makeService().runRows(rows('rows:all{result:rA|rC, block:bc-1}'));
    expect(res.runs.map((r) => r.resultId)).toEqual(['rA', 'rB', 'rC']);
  });

  it('output-type narrowing filters statements, not runs', async () => {
    const res = await makeService().runRows(rows('rows:segment{result:rA}'));
    expect(res.runs[0]!.events.map((e) => e.outputType)).toEqual(['segment', 'segment']);
    // Custom stored type: the TEXT surface is a closed enum (C7 rejects
    // rows:milestone at parse), but runRows still narrows by any column
    // value when handed the AST programmatically.
    const milestoneOnly = await makeService().runRows(rowsAst('milestone', 'result', 'rA'));
    expect(milestoneOnly.runs[0]!.events).toHaveLength(1);
  });

  it('drops runs whose narrowing leaves no statements', async () => {
    const res = await makeService().runRows(rowsAst('nonexistent-type', 'block', 'bc-1'));
    expect(res.runs).toEqual([]);
  });

  it('rows: rejects unknown targets at parse (C7)', () => {
    expect(rows('rows:milestone{result:rA}').error).toContain('Unknown rows target "milestone"');
    expect(rows('rows:nonexistent-type{block:bc-1}').error).toContain('Unknown rows target');
  });

  it('last window filters by canonical workout time', async () => {
    const res = await makeService().runRows(rows('rows:all{block:bc-1} last 6d'), { anchorNow: day0 });
    expect(res.runs.map((r) => r.resultId)).toEqual(['rA']);
  });

  // Parse-level filter/scope rejection is pinned once in wql.test.ts
  // (C4 block); here the runtime contract is error propagation only:

  it('propagates parse errors without touching stores', async () => {
    const calls: string[] = [];
    const res = await makeService(calls).runRows(rows('rows:all{tags:x}'));
    expect(res.error).toBeDefined();
    expect(res.runs).toEqual([]);
    expect(calls).toEqual([]);
  });
});
