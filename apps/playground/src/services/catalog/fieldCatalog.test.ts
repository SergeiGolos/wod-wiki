import { describe, expect, it } from 'vitest';
import {
  computeCatalogDeltas,
  extractContributionsFromResult,
  extractContributionsFromNote,
  fieldSourceId,
} from './fieldCatalog';
import type { FieldContribution, WorkoutResult, Note } from '@bitcobblers/wod-wiki-core';

function result(logs: unknown[]): WorkoutResult {
  return {
    id: 'r1',
    noteId: 'n1',
    origin: 'journal',
    data: { logs } as WorkoutResult['data'],
  } as unknown as WorkoutResult;
}

describe('field catalog — contribution extraction (ticket 14)', () => {
  it('extracts typed identities from result logs via fieldRef', () => {
    const contributions = extractContributionsFromResult(result([
      {
        outputType: 'segment',
        metrics: [
          { type: 'custom', value: 48, metadata: { fieldRef: { path: 'hrv', kind: 'number' }, originalKey: 'hrv' } },
          { type: 'custom', value: 'deep', metadata: { fieldRef: { path: 'sleep.quality', kind: 'string' }, originalKey: 'Sleep Quality' } },
        ],
      },
    ]));
    expect(contributions.map((c) => `${c.path}|${c.kind}`).sort()).toEqual(['hrv|number', 'sleep.quality|string']);
    const stringC = contributions.find((c) => c.kind === 'string')!;
    expect(stringC.spelling).toBe('Sleep Quality');
    expect(stringC.value).toBe('deep'); // categorical value recorded
  });

  it('falls back to canonicalKey paths for engine-authored metrics', () => {
    const contributions = extractContributionsFromResult(result([
      { outputType: 'analytics', metrics: [{ type: 'totalVolume', value: 3000, unit: 'kg', metadata: { canonicalKey: 'totalVolume', effortSlug: 'fran' } }] },
    ]));
    expect(contributions).toHaveLength(1);
    expect(contributions[0]!.path).toBe('totalVolume');
    expect(contributions[0]!.unit).toBe('kg');
  });

  it('never invents catalog entries for unkeyed custom metrics', () => {
    const contributions = extractContributionsFromResult(result([
      { outputType: 'segment', metrics: [{ type: 'custom', value: 5 }] },
    ]));
    expect(contributions).toEqual([]);
  });

  it('extracts frontmatter scalars from notes as contributions', () => {
    const note = {
      id: 'n1',
      rawContent: '---\nshoe: Alphafly\ncoach: Perry\ncustom: {nested: true}\n---\n\n# body',
    } as unknown as Note;
    const contributions = extractContributionsFromNote(note);
    expect(contributions.map((c) => c.path).sort()).toEqual(['coach', 'shoe']);
    expect(contributions.find((c) => c.path === 'shoe')!.value).toBe('Alphafly');
  });
});

describe('field catalog — idempotent delta math (ticket 14)', () => {
  const A: FieldContribution = { fieldId: 'f(a)', path: 'a', kind: 'number' };
  const B: FieldContribution = { fieldId: 'f(b)', path: 'b', kind: 'number' };

  it('identical re-save produces no delta', () => {
    const deltas = computeCatalogDeltas([A, B], [B, A]);
    expect(deltas.added).toEqual([]);
    expect(deltas.removed).toEqual([]);
  });

  it('edit computes added and removed sides', () => {
    const deltas = computeCatalogDeltas([A], [B]);
    expect(deltas.added).toEqual([B]);
    expect(deltas.removed).toEqual([A]);
  });

  it('counts multiplicity — two observations of one field vs one', () => {
    const deltas = computeCatalogDeltas([A], [A, A]);
    expect(deltas.added).toHaveLength(1);
    expect(deltas.removed).toEqual([]);
  });

  it('changed unit evidence is a delta', () => {
    const deltas = computeCatalogDeltas(
      [{ fieldId: 'f(w)', path: 'weight', kind: 'number', unit: 'lb', spelling: 'weight' }],
      [{ fieldId: 'f(w)', path: 'weight', kind: 'number', unit: 'kg', spelling: 'weight' }],
    );
    expect(deltas.added).toHaveLength(1);
    expect(deltas.removed).toHaveLength(1);
  });

  it('source ids distinguish entity kind and record', () => {
    expect(fieldSourceId('result', 'r1')).toBe('result:r1');
    expect(fieldSourceId('note', 'r1')).toBe('note:r1');
  });
});
