import { describe, expect, it } from 'bun:test';
import { QueryService, type UnifiedEventStore, type NoteQueryStore } from '@bitcobblers/wod-wiki-wql';
import { factRowsToEventRows } from '@bitcobblers/wod-wiki-engine';
import type { IndexedDBService } from '@/services/db/IndexedDBService';
import { loadSampleData, purgeSampleData, hasSampleData, setSampleDataService } from '@/services/analytics/sample';
import type { AnalyticsDataPoint, Note } from '@/types/storage';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
// Dynamic import is intentional — a test exercising the module-loading boundary.
const { IndexedDBService: RealIndexedDBService } = await import('@/services/db/IndexedDBService?real');

const service: IndexedDBService = new RealIndexedDBService();
setSampleDataService(service);

function noteStore(serviceInstance: IndexedDBService): NoteQueryStore {
  return {
    getAllNotes: () => serviceInstance.getAllNotes(),
    getNoteIdsForTag: async (label) => new Set((await serviceInstance.getNotesForTag(label)).map(n => n.id)),
    getNoteTagLabels: async (noteId) => (await serviceInstance.getTagsForNote(noteId)).map(tag => tag.label),
  };
}

function queryService(serviceInstance: IndexedDBService) {
  return new QueryService({ eventStore: serviceInstance as UnifiedEventStore, noteStore: noteStore(serviceInstance) });
}

describe('sample analytics dataset', () => {
  it('loads a realistic benchmark history that is queryable by effort', async () => {
    const before = await hasSampleData();
    expect(before).toBe(false);

    const { facts } = await loadSampleData();
    expect(facts).toBeGreaterThan(0);

    expect(await hasSampleData()).toBe(true);

    const query = queryService(service);
    const thrusterReps = await query.runQuery('sum:totalReps{effort:thruster}');
    expect(thrusterReps.scalar).toBeGreaterThan(0);
    expect(thrusterReps.stages.selected).toBeGreaterThan(0);

    const pullUpTis = await query.runQuery('avg:tis{effort:pull-up}');
    expect(pullUpTis.scalar).toBeGreaterThan(0);
  });

  it('includes intensity tiers on load and volume facts', async () => {
    const query = queryService(service);
    const intensity = await query.runQuery('sum:sessionLoad{} by {intensity}.rollup(1w)');

    expect(intensity.series.length).toBeGreaterThan(0);
    const labels = intensity.series.map((s) => s.label);
    expect(labels).not.toContain('(none)');
    expect(labels).toContain('high');
    expect(labels).toContain('moderate');
    expect(labels).toContain('low');

    const volumeByIntensity = await query.runQuery('sum:totalVolume{} by {intensity}');
    expect(volumeByIntensity.series.length).toBeGreaterThan(0);
    expect(volumeByIntensity.series.map((s) => s.label)).not.toContain('(none)');
  });

  it('includes distance facts for rowing and running disciplines', async () => {
    const query = queryService(service);
    const distance = await query.runQuery('sum:totalDistance{} by {discipline}');

    expect(distance.series.length).toBeGreaterThan(0);
    expect(distance.series.some((s) => s.points.reduce((a, p) => a + (p.value as number), 0) > 0)).toBe(true);

    const disciplines = distance.series.map((s) => s.label);
    expect(disciplines).toContain('rowing');
    expect(disciplines).toContain('running');
  });

  it('is idempotent: a second load does not add more facts', async () => {
    const first = await loadSampleData();
    const second = await loadSampleData();
    expect(second.facts).toBe(first.facts);

    const events = await service.scanAll();
    const sampleEvents = events.filter((event) => event.noteId.startsWith('sample-') && event.grain === 'summary');
    expect(sampleEvents).toHaveLength(first.facts);
  });

  it('purges exactly the sample rows and leaves user rows untouched', async () => {
    // Seed a user-owned event row and tag it distinctly.
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
    await service.appendEvents(factRowsToEventRows([userFact]));

    await purgeSampleData();

    expect(await hasSampleData()).toBe(false);

    const events = await service.scanAll();
    const sampleEvents = events.filter((event) => event.noteId.startsWith('sample-'));
    expect(sampleEvents).toHaveLength(0);

    const allEvents = await service.scanAll();
    const userEvents = allEvents.filter((event) => event.noteId === userNoteId);
    expect(userEvents.length).toBeGreaterThan(0);

    const userTags = await service.getTagsForNote(userNoteId);
    expect(userTags.map(t => t.label)).toContain('user-data');
  });
});
