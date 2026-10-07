import { describe, expect, it } from 'vitest';
import { QueryService, sourceMatches } from '../src/QueryService';
import { WQL_SOURCE_VALUES } from '../src/vocabulary';
import type { BlockIndexRow, Note } from '@bitcobblers/wod-wiki-core';
import type {
  BlockQueryStore,
  NoteQueryStore,
  QueryServiceStores,
  WqlDomainOrder,
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
  { id: 'npage', title: 'guide', createdAt: T0 + 2, type: 'page', sourceId: 'guides:my-guide' },
  { id: 'scol', title: 'cats', createdAt: T0 + 3, type: 'collection', sourceId: 'page:collection:cats', catalog: 'cats' },
] as Note[];

const staticNotes: Note[] = [
  { id: 's1', title: 'fran', createdAt: T0 + 4, type: 'note', sourceId: 'collection:girls', catalog: 'girls' },
] as Note[];

const blocks: BlockIndexRow[] = [
  { id: 'b0', noteId: 'n1', segmentId: 's', segmentVersion: 1, dataType: 'wod', rawContent: 'fran-seeded', noteTitle: 'one', createdAt: T0 - 1, sourceId: 'page:collection:cats' },
  { id: 'b1', noteId: 'n1', segmentId: 's', segmentVersion: 1, dataType: 'wod', rawContent: 'fran', noteTitle: 'one', createdAt: T0 },
  { id: 'b2', noteId: 'n2', segmentId: 's', segmentVersion: 1, dataType: 'wod', rawContent: 'diane', noteTitle: 'two', createdAt: T0 + 1 },
  { id: 'b3', noteId: 'scol', segmentId: 's', segmentVersion: 1, dataType: 'prose', rawContent: 'squat notes', noteTitle: 'cats', createdAt: T0 + 2 },
  { id: 'b4', noteId: 'n2', segmentId: 't', segmentVersion: 1, dataType: 'wod', rawContent: 'annie squat clean', noteTitle: 'two', createdAt: T0 + 3 },
] as BlockIndexRow[];

type AnyRow = Note | BlockIndexRow;

/** Page-like kinds — the isPage composite's type half. */
const PAGE_LIKE = ['collection', 'syntax', 'behavior', 'analytics', 'dashboard', 'home', 'page'];

function isPageRow(row: AnyRow): boolean {
  if ('dataType' in row) return false;
  return row.type !== 'note'
    && ((!!row.sourceId && (row.sourceId.startsWith('page:') || row.sourceId.startsWith('guides:')))
      || PAGE_LIKE.includes(row.type ?? ''));
}

function predicateHit(row: AnyRow, p: WqlDomainPredicate): boolean {
  const values = 'values' in p ? p.values : [];
  switch (p.field) {
    case 'sourceFence':
      return !row.sourceId || WQL_SOURCE_VALUES.some((k) => sourceMatches(row, k));
    case 'source':
      return values.some((k) => sourceMatches(row, k));
    case 'defaultNotes':
      return p.collections ? row.type !== 'page' : !isPageRow(row);
    case 'text': {
      // Wire text = case-insensitive substring on the plane's text column.
      const needle = p.value.toLowerCase();
      const hay = 'dataType' in row ? row.rawContent : row.title;
      return hay.toLowerCase().includes(needle);
    }
    case 'type':
      return 'dataType' in row ? values.includes(row.dataType) : values.includes(row.type ?? '');
    case 'id':
      return values.includes(row.id);
    case 'noteId':
      return 'noteId' in row && values.includes(row.noteId);
    default:
      return true;
  }
}

function clauseHolds(row: AnyRow, p: WqlDomainPredicate): boolean {
  const hit = predicateHit(row, p);
  return p.negate ? !hit : hit;
}

/** Domain-backed store fake for one plane: wire contract verbatim —
 *  selectedCount after selection before filters, matchedCount after filters
 *  before limit, rows the paged page. */
function makeDomainRead(all: AnyRow[], captured: Array<Record<string, unknown>>): DomainRead {
  return async (req: DomainRequest): Promise<WqlDomainReadResult> => {
    captured.push({ ...req });
    const selectedRows = all.filter((row) => (req.selection ?? []).every((p) => clauseHolds(row, p)));
    const filtered = selectedRows.filter((row) => (req.filters ?? []).every((p) => clauseHolds(row, p)));
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

function makeNoteStore(all: Note[], domainRead?: DomainRead): NoteQueryStore {
  return {
    getAllNotes: async () => all,
    getNoteIdsForTag: async () => new Set<string>(),
    getNoteTagLabels: async () => [],
    ...(domainRead ? { queryDomain: domainRead } : {}),
  };
}

function makeBlockStore(all: BlockIndexRow[], domainRead?: DomainRead): BlockQueryStore {
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
  // Each plane gets its OWN domain read over its OWN rows — the domain read
  // serves the user plane's notes and the block index respectively; the
  // static plane is a separate bundled store never behind IStorage.
  const stores: QueryServiceStores = {
    noteStore: makeNoteStore(userNotes, withDomain ? makeDomainRead([...userNotes], captured) : undefined),
    blockStore: makeBlockStore(blocks, withDomain ? makeDomainRead([...blocks], captured) : undefined),
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
  it('applies the parser source scope before counts and paging', async () => {
    const rows: Note[] = [
      { id: 'a-guide', title: 'bench', type: 'note', sourceId: 'guides:bench', createdAt: T0 },
      { id: 'b-user', title: 'bench', type: 'note', sourceId: 'journal', createdAt: T0 },
      { id: 'c-user', title: 'bench', type: 'note', sourceId: 'journal', createdAt: T0 },
    ];
    const parsed = { ...find('note', [{ key: 'text', negate: false, values: [val('bench')] }], { limit: 1 }),
      sourceScope: ['journal', 'collections', 'playground'] };
    const plain = new QueryService({ noteStore: makeNoteStore(rows) });
    const domain = new QueryService({ noteStore: makeNoteStore(rows, makeDomainRead(rows, [])) });
    const result = await outcome(domain, parsed);
    expect(result).toEqual(await outcome(plain, parsed));
    expect(result.noteIds).toEqual(['b-user']);
    expect(result.stages.selected).toBe(2);
  });

  it('preserves page-like notes when negated or wildcard type clauses disable default exclusion', async () => {
    const rows: Note[] = [
      { id: 'n', title: 'note', type: 'note', createdAt: T0 },
      { id: 's', title: 'syntax', type: 'syntax', createdAt: T0 },
    ];
    for (const filter of [
      { key: 'type', negate: true, values: [val('page')] },
      { key: 'type', negate: false, values: [{ value: 'syntax', wildcard: true }] },
    ]) {
      const parsed = find('note', [filter]);
      const plain = new QueryService({ noteStore: makeNoteStore(rows) });
      const domain = new QueryService({ noteStore: makeNoteStore(rows, makeDomainRead(rows, [])) });
      const result = await outcome(domain, parsed);
      expect(result).toEqual(await outcome(plain, parsed));
      expect(result.noteIds).toEqual(filter.negate ? ['n', 's'] : ['s']);
    }
  });

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
    // Residual tags filter: no server offset/limit — the JS pipeline owns
    // the slice. Natural id order still rides the read.
    expect(domain.captured[0].limit).toBeUndefined();
    expect(domain.captured[0].offset).toBeUndefined();
    expect(domain.captured[0].order).toEqual([{ field: 'id', direction: 'asc' }]);
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

  it(':note | limit 2 — default exclusion compiles; static plane keeps the JS slice', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('note', [], { limit: 2 });
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
    expect(domain.captured).toHaveLength(1);
    expect(domain.captured[0]).toMatchObject({
      plan: 'notes',
      selection: [
        { field: 'defaultNotes', collections: false },
        { field: 'sourceFence' },
      ],
    });
    // Static plane unions after the user plane and the historical slice cuts
    // the merged array — no server paging for static-backed deployments.
    expect(domain.captured[0].limit).toBeUndefined();
    // Baseline = defaultNotes-selected user plane + JS-selected static rows.
    expect((await outcome(domain.service, parsed)).stages.selected).toBe(3);
    expect((await outcome(domain.service, parsed)).stages.matched).toBe(2);
  });

  it(':block{text:squat,type:wod} | limit 2 — literal text compiles as the wire text filter and pages', async () => {
    const plain = makeService(false);
    const domain = makeService(true);
    const parsed = find('block', [
      { key: 'text', negate: false, values: [val('squat')] },
      { key: 'type', negate: false, values: [val('wod')] },
    ], { limit: 2 });
    expect(await outcome(domain.service, parsed)).toEqual(await outcome(plain.service, parsed));
    expect(domain.captured[0]).toMatchObject({
      plan: 'blocks',
      filters: [{ field: 'text', value: 'squat' }, { field: 'type', values: ['wod'] }],
      limit: 2,
    });
    // The prose 'squat notes' block matches the text but not the type; the
    // wod block survives both — one match, paged payload.
    expect((await outcome(domain.service, parsed)).stages.matched).toBe(1);
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
