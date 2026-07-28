import { describe, expect, it } from 'bun:test';
import type { IndexedDBService } from '@/services/db/IndexedDBService';
import { QueryService, type FactQueryStore } from '@/services/analytics/query';
import { loadSampleData, purgeSampleData, hasSampleData, setSampleDataService } from '@/services/analytics/sample';
import type { AnalyticsDataPoint, Note } from '@/types/storage';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
// Dynamic import is intentional — a test exercising the module-loading boundary.
const { IndexedDBService: RealIndexedDBService } = await import('@/services/db/IndexedDBService?real');

const service: IndexedDBService = new RealIndexedDBService();
setSampleDataService(service);

function factStore(serviceInstance: IndexedDBService): FactQueryStore {
  return {
    getFactsByMetric: (metricKey) => serviceInstance.getFactsByMetric(metricKey),
    getFactsByTimeRange: (start, end) => serviceInstance.getFactsByTimeRange(start, end),
    getNoteTagLabels: async (noteId) => (await serviceInstance.getTagsForNote(noteId)).map(tag => tag.label),
  };
}

describe('sample analytics dataset', () => {
  it('loads a realistic benchmark history that is queryable by effort', async () => {
    const before = await hasSampleData();
    expect(before).toBe(false);

    const { facts } = await loadSampleData();
    expect(facts).toBeGreaterThan(0);

    expect(await hasSampleData()).toBe(true);

    const query = new QueryService(factStore(service));
    const thrusterReps = await query.runQuery('sum:totalReps{effort:thruster}');
    expect(thrusterReps.scalar).toBeGreaterThan(0);
    expect(thrusterReps.stages.selected).toBeGreaterThan(0);

    const pullUpTis = await query.runQuery('avg:tis{effort:pull-up}');
    expect(pullUpTis.scalar).toBeGreaterThan(0);
  });

  it('is idempotent: a second load does not add more facts', async () => {
    const first = await loadSampleData();
    const second = await loadSampleData();
    expect(second.facts).toBe(first.facts);

    const all = await service.getAllAnalytics();
    const sampleFacts = all.filter((f) => f.noteId.startsWith('sample-'));
    expect(sampleFacts).toHaveLength(first.facts);
  });

  it('purges exactly the sample rows and leaves user rows untouched', async () => {
    // Seed a user-owned fact row and tag it distinctly.
    const userNoteId = `user-${crypto.randomUUID()}`;
    const userNote: Note = {
      id: userNoteId,
      title: 'User workout',
      createdAt: Date.now(),
    };
    await service.saveNote(userNote);
    await service.setNoteTags(userNoteId, ['user-data']);
    const userFact: AnalyticsDataPoint = {
      id: `user-fact-${crypto.randomUUID()}`,
      noteId: userNoteId,
      resultId: `user-result-${crypto.randomUUID()}`,
      segmentId: 'user-segment',
      segmentVersion: 1,
      grain: 'summary',
      type: 'totalReps',
      metricKey: 'totalReps',
      value: 100,
      unit: 'reps',
      label: 'Total reps',
      metricLabel: 'Total reps',
      metricUnit: 'reps',
      timestamp: Date.now(),
      createdAt: Date.now(),
    };
    await service.saveAnalyticsPoints([userFact]);

    await purgeSampleData();

    expect(await hasSampleData()).toBe(false);

    const all = await service.getAllAnalytics();
    const sampleFacts = all.filter((f) => f.noteId.startsWith('sample-'));
    expect(sampleFacts).toHaveLength(0);

    const userFacts = await service.getFactsByMetric('totalReps');
    expect(userFacts.some((f) => f.noteId === userNoteId)).toBe(true);

    const userTags = await service.getTagsForNote(userNoteId);
    expect(userTags.map(t => t.label)).toContain('user-data');
  });
});
