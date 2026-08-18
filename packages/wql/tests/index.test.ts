import { describe, it, expect } from 'vitest';
import {
  parseQuery,
  isFindQuery,
  isRowsQuery,
  QueryService,
  WQL_KEYWORDS,
  WQL_CALC_TARGETS,
  WQL_METRIC_FAMILIES,
  WQL_METRIC_AGGREGATES,
  WQL_AGGREGATORS,
  WQL_COMPARISON_OPS,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
  WQL_FIND_TARGETS,
  WQL_SCOPES,
  WQL_CONTENT_FILTER_KEYS,
  WQL_SOURCES,
  WQL_ROLLUP_PERIODS,
  WQL_DISPLAY_UNITS,
  wql,
  wqlLanguage,
  wqlParser,
  buildDashboardDocument,
  parseDashboardNote,
  buildDashboardScaffold,
  EFFORT_DISCIPLINES,
  convert,
  resolveDisplayUnit,
  staticNotesFromBlocks,
  staticTagIndexFromBlocks,
  normalizeSummaryFacts,
  type FactQueryStore,
  type NoteQueryStore,
  type BlockQueryStore,
  type ResultLogStore,
  type EffortQueryStore,
  type QueryServiceStores,
  type ParsedQuery,
  type ParsedFindQuery,
  type ParsedRowsQuery,
  type DashboardDocument,
} from '../src/index';

describe('@wod-wiki/wql public surface', () => {
  it('exports grammar, AST parser, and type guards', () => {
    expect(wqlParser).toBeDefined();
    const findAst = parseQuery('find:note{tags:pr} in journal last 8w');
    expect(isFindQuery(findAst)).toBe(true);
    expect((findAst as ParsedFindQuery).target).toBe('note');

    const rowsAst = parseQuery('rows:segment{block:bc-1}');
    expect(isRowsQuery(rowsAst)).toBe(true);
    expect((rowsAst as ParsedRowsQuery).outputType).toBe('segment');

    const analyticsAst = parseQuery('sum:totalVolume{discipline:strength} by {week}.rollup(1w) in kg');
    expect(isFindQuery(analyticsAst)).toBe(false);
    expect(isRowsQuery(analyticsAst)).toBe(false);
    expect((analyticsAst as ParsedQuery).agg).toBe('sum');
    expect((analyticsAst as ParsedQuery).metric).toBe('totalVolume');
  });

  it('exports vocabulary constants and disciplines', () => {
    expect(WQL_KEYWORDS.length).toBeGreaterThan(0);
    expect(WQL_CALC_TARGETS.length).toBeGreaterThan(0);
    expect(WQL_METRIC_FAMILIES.length).toBeGreaterThan(0);
    expect(WQL_METRIC_AGGREGATES.length).toBeGreaterThan(0);
    expect(WQL_AGGREGATORS.length).toBeGreaterThan(0);
    expect(WQL_COMPARISON_OPS.length).toBeGreaterThan(0);
    expect(WQL_TAG_KEYS.length).toBeGreaterThan(0);
    expect(WQL_VIRTUAL_DIMS.length).toBeGreaterThan(0);
    expect(WQL_FIND_TARGETS.length).toBeGreaterThan(0);
    expect(WQL_SCOPES.length).toBeGreaterThan(0);
    expect(WQL_CONTENT_FILTER_KEYS.length).toBeGreaterThan(0);
    expect(WQL_SOURCES.length).toBeGreaterThan(0);
    expect(WQL_ROLLUP_PERIODS.length).toBeGreaterThan(0);
    expect(WQL_DISPLAY_UNITS.length).toBeGreaterThan(0);
    expect(EFFORT_DISCIPLINES.length).toBe(10);
  });

  it('exports CodeMirror language extension', () => {
    expect(wql).toBeDefined();
    expect(wqlLanguage).toBeDefined();
    const extension = wql();
    expect(extension).toBeDefined();
  });

  it('exports DashboardDocument model, parser, and scaffold', () => {
    const raw = buildDashboardScaffold('My Dashboard');
    const { meta, sections } = parseDashboardNote(raw);
    const doc: DashboardDocument = buildDashboardDocument(sections, meta);
    expect(doc.isDashboard).toBe(true);
    expect(doc.title).toBe('My Dashboard');
    expect(doc.widgets.length).toBeGreaterThanOrEqual(1);
  });

  it('exports QueryService with injectable stores and zero default DB imports', async () => {
    const mockFactStore: FactQueryStore = {
      getFactsByMetric: async () => [],
      getFactsByTimeRange: async () => [],
      getNoteTagLabels: async () => [],
    };
    const mockNoteStore: NoteQueryStore = {
      getAllNotes: async () => [],
      getNoteIdsForTag: async () => new Set(),
    };
    const mockBlockStore: BlockQueryStore = {
      getAllBlocks: async () => [],
    };
    const mockResultStore: ResultLogStore = {
      getResultsByContentId: async () => [],
      getResultById: async () => undefined,
      getResultsForNote: async () => [],
    };
    const mockEffortStore: EffortQueryStore = {
      getAllEfforts: async () => [],
    };

    const stores: QueryServiceStores = {
      factStore: mockFactStore,
      noteStore: mockNoteStore,
      blockStore: mockBlockStore,
      resultStore: mockResultStore,
      effortStore: mockEffortStore,
    };

    const service = new QueryService(stores);
    const result = await service.runQuery('sum:totalVolume{}');
    expect(result.series).toEqual([]);
    expect(result.stages.selected).toBe(0);

    const emptyService = new QueryService();
    const emptyResult = await emptyService.runQuery('sum:totalVolume{}');
    expect(emptyResult.series).toEqual([]);
  });

  it('exports pure utilities: units, static projections, derivation', () => {
    expect(convert(100, 'kg', 'lb')).toBeGreaterThan(200);
    expect(resolveDisplayUnit([{ unit: 'lb' }], { directive: 'kg' }).unit).toBe('kg');
    expect(staticNotesFromBlocks([])).toEqual([]);
    expect(staticTagIndexFromBlocks([])).toBeInstanceOf(Map);
    expect(normalizeSummaryFacts([], { noteId: 'n1', resultId: 'r1' })).toEqual([]);
  });
});
