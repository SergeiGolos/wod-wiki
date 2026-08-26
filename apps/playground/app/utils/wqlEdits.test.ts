/**
 * wqlEdits — app-side structural WQL edits over the engine's C6 surface
 * (wayfinder ticket 013): parse to the AST, mutate fields, emit through the
 * serializer. These replace the retired clause-compiler helpers the app used
 * to import from the ui package (`pivotClauses`, `setMetricClause`,
 * `clauseValue`).
 */
import { describe, expect, it } from 'bun:test';
import {
  pivotSourceQuery,
  setMetricQuery,
  sourceOfQuery,
  withoutWindow,
  withoutFilters,
} from '../lib/wqlEdits';

describe('sourceOfQuery', () => {
  it('reads the content-plane source from target + source filter', () => {
    expect(sourceOfQuery('find:note last 2w')).toBe('notes');
    expect(sourceOfQuery('find:note{source:journal}')).toBe('journal');
    expect(sourceOfQuery('find:note{source:feeds,tags:pr} last 8w')).toBe('feeds');
    expect(sourceOfQuery('find:block{text:"cindy"}')).toBe('blocks');
    expect(sourceOfQuery('find:effort{discipline:kettlebell}')).toBe('efforts');
  });

  it('reads the metrics and rows planes', () => {
    expect(sourceOfQuery('sum:totalVolume{} by {week}')).toBe('metrics');
    expect(sourceOfQuery('rows:all{result:abc-123}')).toBe('rows');
  });

  it('falls back to notes for unparseable text', () => {
    expect(sourceOfQuery('not a query')).toBe('notes');
  });
});

describe('pivotSourceQuery', () => {
  it('pivots content → scoped content, keeping filters and the window', () => {
    expect(pivotSourceQuery('find:note{tags:pr} last 8w', 'journal')).toBe(
      'find:note{source:journal,tags:pr} last 8w',
    );
  });

  it('pivots scoped content → all notes, dropping the source filter', () => {
    expect(pivotSourceQuery('find:note{source:feeds,tags:pr} last 8w', 'notes')).toBe(
      'find:note{tags:pr} last 8w',
    );
  });

  it('pivots to blocks/efforts targets, dropping the source filter', () => {
    expect(pivotSourceQuery('find:note{source:journal,text:"fran"}', 'blocks')).toBe(
      'find:block{text:fran}',
    );
    expect(pivotSourceQuery('find:note{tags:strength}', 'efforts')).toBe('find:effort{tags:strength}');
  });

  it('pivots metrics → content, keeping shared filters and the window (C1)', () => {
    expect(pivotSourceQuery('sum:totalVolume{effort:back-squat} by {week} last 6w', 'journal')).toBe(
      'find:note{source:journal,effort:back-squat} last 6w',
    );
  });

  it('pivots content → metrics with an empty metric for placeholder guidance', () => {
    expect(pivotSourceQuery('find:note{tags:pr} last 2w', 'metrics')).toBe('sum:{tags:pr} last 2w');
  });

  it('keeps the metric plane head when pivoting metrics → metrics', () => {
    expect(pivotSourceQuery('sum:tis{} by {week} last 6w', 'metrics')).toBe('sum:tis{} by {week} last 6w');
  });

  it('leaves unparseable text untouched', () => {
    expect(pivotSourceQuery('not a query', 'journal')).toBe('not a query');
  });
});

describe('setMetricQuery', () => {
  it('sets the metric on an aggregate, keeping the head and window', () => {
    expect(setMetricQuery('sum:totalVolume{} by {week} last 6w', 'tis')).toBe(
      'sum:tis{} by {week} last 6w',
    );
  });

  it('pivots a content query onto the metrics plane with shared filters', () => {
    expect(setMetricQuery('find:note{tags:pr} last 2w', 'totalVolume')).toBe(
      'sum:totalVolume{tags:pr} last 2w',
    );
  });
});

describe('withoutWindow / withoutFilters', () => {
  it('drops the window', () => {
    expect(withoutWindow('find:note{tags:pr} last 8w')).toBe('find:note{tags:pr}');
  });

  it('drops non-source filters, keeping provenance', () => {
    expect(withoutFilters('find:note{source:journal,tags:pr,text:"fran"} last 8w')).toBe(
      'find:note{source:journal} last 8w',
    );
  });
});
