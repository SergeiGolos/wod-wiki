import { describe, expect, it } from 'vitest';
import type { StoredOutputStatement, EventRecord } from '@bitcobblers/wod-wiki-core';
import { parseQuery, type ParsedFindQuery } from '../src/wql';
import { toEventRows } from '../src/derivation';
import { QueryService, type EventStore } from '../src/QueryService';

const DAY = 86_400_000;
const day0 = Math.floor(1_700_000_000_000 / DAY) * DAY;

let logSeq = 0;
function log(outputType: NonNullable<StoredOutputStatement['outputType']>, started: number): StoredOutputStatement {
  logSeq += 1;
  return { id: logSeq, outputType, timeSpan: { started, ended: started + 1000 }, metrics: [] };
}

/** The event rows a streaming write path appended for one result.
 *  Ticket 12: statements carry their own timeSpans, anchored at the
 *  workout's end time — row timestamps are the statements' own instants,
 *  never the derivation clock. */
function makeResult(id: string, noteId: string, blockContentId: string, endTime: number): EventRecord[] {
  const logs = [log('segment', endTime), log('segment', endTime + 1000), log('milestone', endTime + 2000)];
  return toEventRows(logs, { noteId, resultId: id, blockContentId, workoutTimestamp: endTime });
}

const RA = makeResult('rA', 'n1', 'bc-1', day0);
const RB = makeResult('rB', 'n1', 'bc-1', day0 - 7 * DAY);
const RC = makeResult('rC', 'n2', 'bc-2', day0 - 14 * DAY);
const EVENT_ROWS = [...RA, ...RB, ...RC];

function makeService(resultCalls: string[] = []) {
  const eventStore: EventStore = {
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

function findQuery(raw: string): ParsedFindQuery {
  const parsed = parseQuery(raw);
  if (parsed.family !== 'find') throw new Error(`expected find query, got ${JSON.stringify(parsed)}`);
  return parsed as ParsedFindQuery;
}

describe('rows: retirement and replacement hints (#1044)', () => {
  it('rows:all{result:r} fails to parse pointing at :session', () => {
    const p = parseQuery('rows:all{result:r1}');
    expect(p.error).toContain('retired');
    expect(p.error).toContain('session{result:r1}');
  });

  it('rows:segment without scope points at :segment', () => {
    const p = parseQuery('rows:segment{effort:snatch}');
    expect(p.error).toContain('retired');
    expect(p.error).toContain('segment{effort:snatch}');
  });

  it('rows:segment with scope points at :session with plane:segment', () => {
    const p = parseQuery('rows:segment{result:r1}');
    expect(p.error).toContain('retired');
    expect(p.error).toContain('plane:segment');
  });

  it('rows:load with scope points at :session with plane:load', () => {
    const p = parseQuery('rows:load{result:r1}');
    expect(p.error).toContain('retired');
    expect(p.error).toContain('plane:load');
  });

  it('bare rows: points at the replacement heads', () => {
    const p = parseQuery('rows:');
    expect(p.error).toContain('retired');
    expect(p.error).toContain('session');
    expect(p.error).toContain('segment');
  });
});

describe('QueryService.runFind for :session (#1041/#1042)', () => {
  it('result scope returns the single session with all statement types', async () => {
    const res = await makeService().runFind(findQuery(':session{result:rA}'));
    expect(res.runs).toBeDefined();
    expect(res.runs!.map((r) => r.resultId)).toEqual(['rA']);
    expect(res.runs![0]!.events.map((e) => e.outputType)).toEqual(['segment', 'segment', 'milestone']);
  });

  it('block scope unions all versions, newest first', async () => {
    const res = await makeService().runFind(findQuery(':session{block:bc-1}'));
    expect(res.runs!.map((r) => r.resultId)).toEqual(['rA', 'rB']);
  });

  it('note scope returns every run in the note', async () => {
    const res = await makeService().runFind(findQuery(':session{note:n1}'));
    expect(res.runs!.map((r) => r.resultId)).toEqual(['rA', 'rB']);
  });

  it('scopes OR within a key and union across keys, deduped by result id', async () => {
    const res = await makeService().runFind(findQuery(':session{result:rA|rC, block:bc-1}'));
    expect(res.runs!.map((r) => r.resultId)).toEqual(['rA', 'rB', 'rC']);
  });

  it('plane filter narrows statements, not runs', async () => {
    const res = await makeService().runFind(findQuery(':session{result:rA, plane:segment}'));
    expect(res.runs![0]!.events.map((e) => e.outputType)).toEqual(['segment', 'segment']);
  });

  it('drops runs whose narrowing leaves no statements', async () => {
    const res = await makeService().runFind(findQuery(':session{block:bc-1, plane:nonexistent}'));
    expect(res.runs).toEqual([]);
  });

  it('last window filters by canonical workout time', async () => {
    const res = await makeService().runFind(findQuery(':session{block:bc-1} last 6d'), { anchorNow: day0 });
    expect(res.runs!.map((r) => r.resultId)).toEqual(['rA']);
  });

  it('overlapping result/note scopes fetch every row once — no doubling', async () => {
    // Scopes UNION across keys: note n1 owns rA AND rB, so the run set is
    // rA + rB; rA's rows arrive via BOTH fetches and must appear once each.
    const res = await makeService().runFind(findQuery(':session{result:rA, note:n1}'));
    expect(res.runs!.map((r) => r.resultId)).toEqual(['rA', 'rB']);
    const events = res.runs!.flatMap((r) => r.events);
    expect(events).toHaveLength(6);
    expect(new Set(events.map((e) => e.id)).size).toBe(6);
  });
});
