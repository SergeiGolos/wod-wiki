import 'fake-indexeddb/auto';
import { describe, expect, it } from 'bun:test';
import { parseQuery, isFindQuery } from '@bitcobblers/wod-wiki-engine';
import { queryService } from './queryService';

function parseFindQuery(raw: string) {
  const parsed = parseQuery(raw);
  if (!isFindQuery(parsed)) {
    throw new Error(`Expected a find query: ${raw}`);
  }
  return parsed;
}

describe('queryService with static stores', () => {
  it('discovers collections when querying scope collections', async () => {
    const query = parseFindQuery('find:note in collections');
    const result = await queryService.runFind(query);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.every((n) => n.sourceId?.startsWith('collection:'))).toBe(true);
    expect(result.notes.some((n) => n.catalog === 'crossfit-girls')).toBe(true);
  });

  it('discovers feeds when querying scope feeds', async () => {
    const query = parseFindQuery('find:note in feeds');
    const result = await queryService.runFind(query);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.every((n) => n.sourceId?.startsWith('feed:'))).toBe(true);
  });

  it('discovers both collections and feeds when querying scope all', async () => {
    const query = parseFindQuery('find:note in all');
    const result = await queryService.runFind(query);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.some((n) => n.sourceId?.startsWith('collection:'))).toBe(true);
    expect(result.notes.some((n) => n.sourceId?.startsWith('feed:'))).toBe(true);
  });

  it('discovers blocks from static corpus when querying find:block in all', async () => {
    const query = parseFindQuery('find:block in all');
    const result = await queryService.runFind(query);
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.blocks.some((b) => b.sourceId?.startsWith('collection:'))).toBe(true);
    expect(result.blocks.some((b) => b.sourceId?.startsWith('feed:'))).toBe(true);
  });
});
