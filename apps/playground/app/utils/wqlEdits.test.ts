/**
 * wqlEdits — app-side structural WQL edits over the engine's parse/serialize
 * surface. These cover the stream host's scope/time/filter-clear helpers and
 * the explorer's metric edit; kind/target pivots and occurrence-level filter
 * edits live in the shared composer (resolveQueryDraft/editQueryClause).
 */
import { describe, expect, it } from 'bun:test';
import {
  scopeOfQuery,
  setScopeFilter,
  setMetricQuery,
  withoutWindow,
  withoutFilters,
} from '../lib/wqlEdits';

describe('scopeOfQuery', () => {
  it('reads the canonical Where-stored scope from the source filter', () => {
    expect(scopeOfQuery('find:note last 2w')).toBeNull();
    expect(scopeOfQuery('find:note{source:journal}')).toBe('journal');
    expect(scopeOfQuery('find:note{source:collections,tags:pr} last 2w')).toBe('collections');
    expect(scopeOfQuery('find:note{source:playground} last 4w')).toBe('playground');
    expect(scopeOfQuery('find:block{source:journal}')).toBe('journal');
  });

  it('is null for non-scoped targets, aggregates and unrepresentable scopes', () => {
    expect(scopeOfQuery('find:effort{source:journal}')).toBeNull();
    expect(scopeOfQuery('find:session{result:abc-123}')).toBeNull();
    expect(scopeOfQuery('sum:totalVolume{} by {week}')).toBeNull();
    expect(scopeOfQuery('find:note{!source:journal}')).toBeNull();
    expect(scopeOfQuery('find:note{source:journal|feeds}')).toBeNull();
    expect(scopeOfQuery('not a query')).toBeNull();
  });
});

describe('setScopeFilter', () => {
  it('sets the scope on an all-sources query, keeping filters and window', () => {
    expect(setScopeFilter('find:note{text:"fran",tags:pr} last 2w', 'journal')).toBe(
      'find:note{text:fran,tags:pr,source:journal} last 2w',
    );
  });

  it('replaces the first source occurrence in place and preserves every other clause', () => {
    expect(setScopeFilter('find:note{source:feeds,tags:pr} by {tag} last 8w', 'collections')).toBe(
      'find:note{source:collections,tags:pr} by {tag} last 8w',
    );
  });

  it('does not merge or drop a second source occurrence', () => {
    expect(setScopeFilter('find:note{source:journal,text:"fran",source:feeds}', 'collections')).toBe(
      'find:note{source:collections,text:fran,source:feeds}',
    );
  });

  it('emits the canonical source:collections scope — never source:page or type:collection', () => {
    const next = setScopeFilter('find:note{tags:pr} last 2w', 'collections');
    expect(next).toBe('find:note{tags:pr,source:collections} last 2w');
    expect(next).not.toContain('source:page');
    expect(next).not.toContain('type:collection');
  });

  it('clears the scope occurrence without touching the rest', () => {
    expect(setScopeFilter('find:note{source:journal,tags:pr} last 8w', null)).toBe(
      'find:note{tags:pr} last 8w',
    );
    expect(setScopeFilter('find:note{source:journal,tags:pr}', '')).toBe('find:note{tags:pr}');
  });

  it('edits block scopes like note scopes', () => {
    expect(setScopeFilter('find:block{text:"cindy"}', 'collections')).toBe(
      'find:block{text:cindy,source:collections}',
    );
  });

  it('leaves other targets, aggregates and unparseable text untouched', () => {
    expect(setScopeFilter('find:effort{discipline:strength}', 'journal')).toBe(
      'find:effort{discipline:strength}',
    );
    expect(setScopeFilter('find:session{} last 4w', 'journal')).toBe('find:session{} last 4w');
    expect(setScopeFilter('sum:totalVolume{} by {week}', 'journal')).toBe('sum:totalVolume{} by {week}');
    expect(setScopeFilter('not a query', 'journal')).toBe('not a query');
  });
});

describe('setMetricQuery', () => {
  it('sets the metric on an aggregate, keeping the head and window', () => {
    expect(setMetricQuery('sum:totalVolume{} by {week} last 6w', 'tis')).toBe(
      'sum:tis{} by {week} last 6w',
    );
  });

  it('never pivots a find query — kind pivots run through the composer warned flow', () => {
    expect(setMetricQuery('find:note{tags:pr} last 2w', 'totalVolume')).toBe(
      'find:note{tags:pr} last 2w',
    );
    expect(setMetricQuery('find:note{source:journal,tags:pr} last 2w', 'totalVolume')).toBe(
      'find:note{source:journal,tags:pr} last 2w',
    );
  });

  it('returns unparseable input untouched', () => {
    expect(setMetricQuery('not a query', 'tis')).toBe('not a query');
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
