/**
 * Static-corpus integration pins for issue #853: the two clauses the
 * 2026-08-01 dogfood report found inert — `tags:` and `last <n>w` —
 * exercised end-to-end through `runFind` against the real generated
 * block index (src/generated/static-block-index.json). Engine-only tests
 * (findRange, findBlock) use inline fixtures and cannot catch a corpus or
 * static-store regression; these can.
 *
 * Fixture note: `feeds/crossfit-programming/2026-01-12/wednesday-hero`
 * carries frontmatter `tags: [crossfit, conditioning, strength]`.
 */
import { describe, expect, it } from 'bun:test';
import { QueryService, type FactQueryStore, type NoteQueryStore, type BlockQueryStore, type ResultLogStore } from './QueryService';
import { parseQuery, type ParsedFindQuery } from './wql';

const WEDNESDAY_HERO = 'feeds/crossfit-programming/2026-01-12/wednesday-hero';

// Journal-side stores are empty; the static stores are module-level and read
// the real corpus — exactly the preview deployment's shape.
const emptyFacts: FactQueryStore = {
  getFactsByMetric: async () => [],
  getFactsByTimeRange: async () => [],
  getNoteTagLabels: async () => [],
};
const emptyNotes: NoteQueryStore = { getAllNotes: async () => [], getNoteIdsForTag: async () => new Set() };
const emptyBlocks: BlockQueryStore = { getAllBlocks: async () => [] };
const emptyResults: ResultLogStore = { getResultsByContentId: async () => [], getResultById: async () => undefined, getResultsForNote: async () => [] };

const service = new QueryService(emptyFacts, emptyNotes, emptyBlocks, emptyResults);
const run = (wql: string) => service.runFind(parseQuery(wql) as ParsedFindQuery);

describe('static corpus — tags: clause (#853)', () => {
  it('tags:strength matches the Wednesday Hero feed note', async () => {
    const result = await run('find:note{tags:strength} in all');
    expect(result.parsed.error).toBeUndefined();
    expect(result.notes.map(n => n.id)).toContain(WEDNESDAY_HERO);
    expect(result.stages.matched).toBeGreaterThan(0);
  });

  it('tags:strength also matches its blocks under find:block', async () => {
    const result = await run('find:block{tags:strength} in all');
    expect(result.blocks.some(b => b.noteId === WEDNESDAY_HERO)).toBe(true);
  });

  it('an unknown tag matches nothing (truthful zero, not an error)', async () => {
    const result = await run('find:note{tags:no-such-tag-xyz} in all');
    expect(result.notes).toEqual([]);
  });
});

describe('static corpus — last <n>w window (#853)', () => {
  it('an unbounded query returns the months-old corpus', async () => {
    const result = await run('find:note in all');
    expect(result.notes.map(n => n.id)).toContain(WEDNESDAY_HERO);
  });

  it('last 2w drops notes dated months before now', async () => {
    // Wednesday Hero is dated 2026-01-12 via its feed path; unless the corpus
    // is regenerated with same-day dates, a 2-week wall-clock window excludes it.
    const result = await run('find:note in all last 2w');
    expect(result.notes.map(n => n.id)).not.toContain(WEDNESDAY_HERO);
  });

  it('undated collection notes are excluded from dated windows but present unbounded', async () => {
    const windowed = await run('find:note in all last 2w');
    expect(windowed.notes.every(n => !n.sourceId?.startsWith('collection:'))).toBe(true);

    const unbounded = await run('find:note in all');
    expect(unbounded.notes.some(n => n.sourceId?.startsWith('collection:'))).toBe(true);
  });
});

describe("static corpus — activity-anchored windows (#857)", () => {
  const runAnchored = (wql: string) =>
    service.runFind(parseQuery(wql) as ParsedFindQuery, { anchor: 'latest-activity' });

  it('last 2w anchored to latest activity keeps the newest corpus entries', async () => {
    const result = await runAnchored('find:note in all last 2w');
    // Corpus max date is 2026-01-12 (Wednesday Hero); cutoff = 2025-12-29.
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.map(n => n.id)).toContain(WEDNESDAY_HERO);
    const cutoff = Date.parse('2026-01-12T00:00:00Z') - 14 * 86_400_000;
    expect(result.notes.every(n => n.createdAt === 0 || n.createdAt >= cutoff)).toBe(true);
  });

  it('drops entries older than the anchored window (2025-12-15 is >2w before the max)', async () => {
    const result = await runAnchored('find:note in all last 2w');
    expect(result.notes.some(n => n.id.includes('2025-12-15'))).toBe(false);
  });
});
