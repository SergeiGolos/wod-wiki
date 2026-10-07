import { describe, expect, it } from 'vitest';
import { QueryService } from '../src/QueryService';
import type { BlockIndexRow, Note } from '@bitcobblers/wod-wiki-core';
import type {
  BlockQueryStore,
  NoteQueryStore,
  QueryServiceStores,
  WqlDomainPredicate,
  WqlDomainReadResult,
} from '../src/stores';
import type { ParsedFindQuery, TagFilter } from '../src/wql';

/**
 * Candidate/domain read parity at the public runFind/runFindBlock seams:
 * a store that serves domain candidates (selection = source clauses + the
 * explicit source fence counted before post-count filters; type/noteId as
 * post-count filters; natural id order paging) must return IDENTICAL rows,
 * identities, order, and stage counts to the whole-store path. The wire's
 * selectedCount baselines the historical pre-filter stages.selected, and
 * server paging rides only when no residual filter precedes the slice.
 */

const T0 = 1_700_000_000_000;

const userNotes: Note[] = [
  { id: 'n1', title: 'one', createdAt: T0, type: 'note' },
  { id: 'n2', title: 'two', createdAt: T0 + 1, type: 'note' },
  { id: 'npage', title: 'guide', createdAt: T0 + 2, type: 'page', sourceId: 'page:guide-x' },
  { id: 'scol', title: 'cats', createdAt: T0 + 3, type: 'collection', sourceId: 'page:collection:cats', catalog: 'cats' },
] as Note[];

const staticNotes: Note[] = [
  { id: 's1', title: 'fran', createdAt: T0 + 4, type: 'note', sourceId: 'collection:girls', catalog: 'girls' },
] as Note[];

const blocks: BlockIndexRow[] = [
  { id: 'b1', noteId: 'n1', segmentId: 's', segmentVersion: 1, dataType: 'wod', rawContent: 'fran', noteTitle: 'one', createdAt: T0 },
  { id: 'b2', noteId: 'n2', segmentId: 's', segmentVersion: 1, dataType: 'wod', rawContent: 'diane', noteTitle: 'two', createdAt: T0 + 1 },
  { id: 'b3', noteId: 'scol', segmentId: 's', segmentVersion: 1, dataType: 'prose', rawContent: 'about', noteTitle: 'cats', createdAt: T0 + 2 },
  { id: 'b4', noteId: 'n2', segmentId: 't', segmentVersion: 1, dataType: 'wod', rawContent: 'annie', noteTitle: 'two', createdAt: T0 + 3 },
] as BlockIndexRow[];

type AnyRow = Note | BlockIndexRow;

/** Mirror of the exact WQL fence the JS pipeline applies. */
function fencePasses(row: AnyRow): boolean {
  return !row.sourceId
    || ['collection:', 'page:', 'guides:', 'playground'].some((p) => row.sourceId!.startsWith(p));
}

/** Mirror of sourceMatches for the kinds the fixtures compile. */
function sourceKindMatch(row: AnyRow, kind: string): boolean {
  if (kind === 'collections' || kind === 'collection') {
    return !!row.sourceId && (row.sourceId.startsWith('collection:') || row.sourceId.startsWith('page:collection:'));
  }
  if (kind === 'playground') return row.sourceId === 'playground';
  return false;
}

function predicateValues(p: WqlDomainPredicate): string[] {
  return 'values' in p ? p.values : [];
}

function rowMatches(row: AnyRow, p: WqlDomainPredicate): boolean {
  const values = predicateValues(p);
  switch (p.field) {
    case 'sourceFence': return fencePasses(row);
    case 'source': return values.some((k) => sourceKindMatch(row, k));
    case 'type': return 'dataType' in row ? values.includes(row.dataType) : values.includes(row.type ?? '');
    case 'id': return values.includes(row.id);
    case 'noteId': return 'noteId' in row && values.includes(row.noteId);
    default: return true;
  }
}

/** Domain-backed store fake for one plane: wire contract verbatim —
 *  selectedCount after selection before filters, matchedCount after filters
 *  before limit, rows the paged page. */
function makeDomainRead(all: AnyRow[], captured: Array<Record<string, unknown>>) {
  return async (req: {
    plan: 'notes' | 'blocks';
    selection?: WqlDomainPredicate[];
    filters?: WqlDomainPredicate[];
    order?: Array<{ field: string; direction: string }>;
    offset?: number;
    limit?: number;
  }): Promise<WqlDomainReadResult> => {
    captured.push({ ...req });
    const selectedRows = all.filter((row) => (req.selection ?? []).every((p) => rowMatches(row, p)));
    const filtered = selectedRows.filter((row) => (req.filters ?? []).every((p) => rowMatches(row, p)));
    let rows = [...filtered].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const offset = req.offset ?? 0;
    rows = req.limit !== undefined ? rows.slice(offset, offset + req.limit) : rows.slice(offset);
    if (req.plan === 'notes') {
      return {
        plan: 'notes', projectionVersion: 1,
        selectedCount: selectedRows.length, matchedCount: filtered.length,
        rows: rows.filter((r): r is Note => !('dataType' in r)),
      };
    }
    return {
      plan: 'blocks', projectionVersion: 1,
      selectedCount: selectedRows.length, matchedCount: filtered.length,
      rows: rows.filter((r): r is BlockIndexRow => 'dataType' in r),
    };
  };
}

function makeNoteStore(all: Note[], domainRead?: ReturnType<typeof makeDomainRead>): NoteQueryStore {
  return {
    getAllNotes: async () => all,
    getNoteIdsForTag: async () => new Set<string>(),
    getNoteTagLabels: async () => [],
    ...(domainRead ? { queryDomain: domainRead } : {}),
  };
}

function makeBlockStore(all: BlockIndexRow[], domainRead?: ReturnType<typeof makeDomainRead>): BlockQueryStore {
  return {
    getAllBlocks: async () => all,
    ...(domainRead ? { queryDomain: domainRead } : {}),
  };
}

function staticStore(): NoteQueryStore {
  return {
    getAllNotes: async () => staticNotes,
    getNoteIdsForTag: async () => new Set<string>(),
    getNoteTagLabels: async () => [],
  };
}

function makeService(withDomain: boolean): { service: QueryService; captured: Array<Record<string, unknown>> } {
  const captured: Array<Record<string, unknown>> = [];
  const read = makeDomainRead([...userNotes, ...staticNotes], captured);
  const stores: QueryServiceStores = {
    noteStore: makeNoteStore(userNotes, withDomain ? read : undefined),
    blockStore: makeBlockStore(blocks, withDomain ? read : undefined),
    staticNoteStore: staticStore(),
  };
  return { service: new QueryService(stores), captured };
}

function find(target: string, filters: TagFilter[], pipes?: ParsedFindQuery['pipes']): ParsedFindQuery {
  return { family: 'find', raw: '', target, filters, ...(pipes ? { pipes } : {}) };
}

const val = (v: string): TagFilter['values'][number] => ({ value: v, wildcard: false });

async function outcome(service: QueryService, parsed: ParsedFindQuery) {
  const res = await service.runFind(parsed, {});
  return {
    noteIds: res.notes.map((n) => n.id),
    blockIds: res.blocks.map((b) => b.id),
    stages: res.stages,
  };
}

describe('domain candidate reads — parity with the whole-store path', () => {
  it(':block{type:wod} | limit 2 — server paging bounds the payload, counts stay baselined', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('block', [{ key: 'type', negate: false, values: [val('wod')] }], { limit: 2 });
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
    expect(domain.captured[0]).toMatchObject({ plan: 'blocks', limit: 2, order: [{ field: 'id', direction: 'asc' }] });
    // The baseline selected count is the post-fence population BEFORE the
    // type filter — never the narrowed candidate rows.
    expect((await outcome(domain.service, parsed)).stages.selected).toBe(blocks.length);
    expect((await outcome(domain.service, parsed)).stages.matched).toBe(2);
  });

  it(':block{type:wod,tags:x} | limit 2 — residual tag filter forbids server paging', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('block', [
      { key: 'type', negate: false, values: [val('wod')] },
      { key: 'tags', negate: false, values: [val('x')] },
    ], { limit: 2 });
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
    expect(domain.captured[0]).toMatchObject({ plan: 'blocks' });
    expect(domain.captured[0].limit).toBeUndefined();
    expect(domain.captured[0].order).toBeUndefined();
  });

  it(':block{note:n2} — exact-id filter rides as a post-count filter, baseline preserved', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('block', [{ key: 'note', negate: false, values: [val('n2')] }]);
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
    expect((await outcome(domain.service, parsed)).stages.selected).toBe(blocks.length);
  });

  it(':note{type:page} — user plane domain-read, static plane counted through the same JS stages', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('note', [{ key: 'type', negate: false, values: [val('page')] }]);
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
    expect((await outcome(domain.service, parsed)).stages.selected)
      .toBe(userNotes.length + staticNotes.length);
  });

  it(':note{type:page} | limit 1 — server page plus static plane composes identically', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('note', [{ key: 'type', negate: false, values: [val('page')] }], { limit: 1 });
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
  });

  it(':note | limit 2 — nonselective query keeps the whole-store path (no domain request)', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('note', [], { limit: 2 });
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
    expect(domain.captured).toHaveLength(0);
  });

  it('source:collections compiles into selection and counts before filters', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('block', [
      { key: 'source', negate: false, values: [val('collections')] },
      { key: 'type', negate: false, values: [val('wod')] },
    ]);
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
    expect(domain.captured[0]).toMatchObject({
      plan: 'blocks',
      selection: [{ field: 'source', values: ['collections'] }, { field: 'sourceFence' }],
      filters: [{ field: 'type', values: ['wod'] }],
    });
  });
});
