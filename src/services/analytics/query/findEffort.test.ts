/**
 * find:effort query tests — verifies effort/discipline/intensity/origin/text
 * filtering against the effort registry via an injectable EffortQueryStore
 * mock (same pattern as findBlock.test.ts).
 */
import { describe, expect, it } from 'bun:test';
import { QueryService, type EffortQueryStore } from './QueryService';
import { parseQuery, type ParsedFindQuery } from './wql';
import type { IEffort } from '@/effort-registry';

function makeEffort(overrides: Partial<IEffort> = {}): IEffort {
  return {
    id: 'e-1',
    slug: 'push-up',
    label: 'Push-Up',
    aliases: ['pushup', 'press-up'],
    baseAttributes: { met: 3.8, discipline: 'strength', intensityTier: 'moderate' },
    registrySource: 'bundled',
    ...overrides,
  } as IEffort;
}

const efforts: IEffort[] = [
  makeEffort({ id: 'e-1', slug: 'push-up', label: 'Push-Up', baseAttributes: { met: 3.8, discipline: 'strength', intensityTier: 'moderate' }, registrySource: 'bundled' }),
  makeEffort({ id: 'e-2', slug: 'fran', label: 'Fran', aliases: [], baseAttributes: { met: 11.5, discipline: 'gymnastics', intensityTier: 'high' }, registrySource: 'bundled' }),
  makeEffort({ id: 'e-3', slug: 'my-wod', label: 'My Custom WOD', aliases: ['fran-ish'], baseAttributes: { met: 9.0, intensityTier: 'high' }, registrySource: 'user' }),
];

function makeService(): QueryService {
  const effortStore: EffortQueryStore = { getAllEfforts: async () => efforts };
  return new QueryService(
    { getFactsByMetric: async () => [], getFactsByTimeRange: async () => [], getNoteTagLabels: async () => [] },
    { getAllNotes: async () => [], getNoteIdsForTag: async () => new Set<string>() },
    { getAllBlocks: async () => [] },
    undefined,
    effortStore,
  );
}

function find(raw: string): ParsedFindQuery {
  const parsed = parseQuery(raw);
  if (!('target' in parsed)) throw new Error(`not a find query: ${raw}`);
  return parsed;
}

describe('find:effort queries', () => {
  it('returns the whole registry with empty filters', async () => {
    const result = await makeService().runFind(find('find:effort in all'));
    expect(result.efforts).toHaveLength(3);
    expect(result.stages.selected).toBe(3);
    expect(result.stages.matched).toBe(3);
    expect(result.notes).toEqual([]);
    expect(result.blocks).toEqual([]);
  });

  it('parses the efforts head end-to-end from WQL text', async () => {
    const result = await makeService().runFind(find('find:effort{discipline:strength} in all'));
    expect(result.efforts?.map(e => e.slug)).toEqual(['push-up']);
  });

  it('filters by intensity tier', async () => {
    const result = await makeService().runFind(find('find:effort{intensity:high} in all'));
    expect(result.efforts?.map(e => e.slug).sort()).toEqual(['fran', 'my-wod']);
  });

  it('filters by registry origin', async () => {
    const result = await makeService().runFind(find('find:effort{origin:user} in all'));
    expect(result.efforts?.map(e => e.slug)).toEqual(['my-wod']);
  });

  it('matches the effort key by slug, label, or alias', async () => {
    const bySlug = await makeService().runFind(find('find:effort{effort:fran} in all'));
    expect(bySlug.efforts?.map(e => e.slug)).toEqual(['fran']);
    const byLabel = await makeService().runFind(find('find:effort{effort:Push-Up} in all'));
    expect(byLabel.efforts?.map(e => e.slug)).toEqual(['push-up']);
    const byAlias = await makeService().runFind(find('find:effort{effort:fran-ish} in all'));
    expect(byAlias.efforts?.map(e => e.slug)).toEqual(['my-wod']);
  });

  it('filters text as substring over label, slug, and aliases', async () => {
    const result = await makeService().runFind(find('find:effort{text:press} in all'));
    expect(result.efforts?.map(e => e.slug)).toEqual(['push-up']);
  });

  it('ANDs across keys and ORs within a key', async () => {
    const result = await makeService().runFind(
      find('find:effort{intensity:high,discipline:gymnastics} in all'),
    );
    expect(result.efforts?.map(e => e.slug)).toEqual(['fran']);
  });

  it('honors negated filters', async () => {
    const parsed = find('find:effort{intensity:high} in all');
    parsed.filters[0]!.negate = true;
    const result = await makeService().runFind(parsed);
    expect(result.efforts?.map(e => e.slug)).toEqual(['push-up']);
  });
});
