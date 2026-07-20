/**
 * End-to-end identity test through the REAL IndexedDB stack (fake-indexeddb
 * backing): IndexedDBNotePersistence → IndexedDBContentProvider →
 * IndexedDBService. Defends the result-identity contract:
 *   - result rows carry segmentId (NoteSegment FK), segmentVersion, origin
 *   - analytics rows carry the same block identity + blockContentId
 *   - rows are queryable through the by-content index
 *   - NoteSegment version lineage stamps onto subsequent results
 *
 * Registry note: sibling test files mock.module('@/services/db/IndexedDBService')
 * with partial stubs and Bun shares one module registry per process, so the
 * real service class is imported via a '?real' query specifier (a distinct
 * module key that bypasses the mock) and injected explicitly. This file never
 * calls mock.module itself. Dynamic import is intentional — a test exercising
 * the module-loading boundary (documented exception).
 */
import { describe, expect, it } from 'bun:test';

import { IndexedDBNotePersistence } from './IndexedDBNotePersistence';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { parseDocumentSections } from '@/components/Editor/utils/sectionParser';
import type { IndexedDBService } from '@/services/db/IndexedDBService';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
const { IndexedDBService: RealIndexedDBService } = await import('@/services/db/IndexedDBService?real') as typeof import('@/services/db/IndexedDBService');

const service: IndexedDBService = new RealIndexedDBService();
const persistence = new IndexedDBNotePersistence(service, new IndexedDBContentProvider(service));

const RAW_CONTENT = [
  '# Fran',
  '',
  '```wod',
  '21-15-9',
  'Thrusters 95lb',
  'Pull-ups',
  '```',
  '',
].join('\n');

describe('result identity (real IndexedDB stack)', () => {
  it('stamps segmentId, segmentVersion and origin on result + analytics rows', async () => {
    const noteId = `it-${crypto.randomUUID()}`;

    await persistence.createNote({
      id: noteId,
      title: 'Fran',
      rawContent: RAW_CONTENT,
      targetDate: Date.now(),
    });

    const section = parseDocumentSections(RAW_CONTENT).find(s => s.type === 'wod');
    expect(section).toBeDefined();

    await persistence.mutateNote(noteId, {
      workoutResult: {
        id: `result-${noteId}`,
        blockId: section!.id,
        blockContentId: section!.contentId,
        segmentId: section!.id,
        origin: 'playground',
        data: {
          startTime: 0, endTime: 60_000, duration: 60_000, completed: true,
          logs: [
            {
              id: 1, outputType: 'segment', timeSpan: { started: 0, ended: 60_000 },
              metrics: [{ type: 'rep', value: 90, origin: 'runtime' }],
              sourceBlockKey: 'block-1', stackLevel: 0,
            },
            {
              id: 2, outputType: 'analytics', timeSpan: { started: 60_000, ended: 60_000 },
              metrics: [
                { type: 'label', value: 'Total Reps', image: 'Total Reps', origin: 'analyzed' },
                { type: 'rep', value: 90, unit: 'reps', origin: 'analyzed' },
              ],
              sourceBlockKey: 'analytics-summary', stackLevel: 0,
            },
          ],
        } as never,
        createdAt: 60_000,
      },
    });

    // ── Result row: full identity stamped and readable via indexes ────────
    const results = await service.getResultsForNote(noteId);
    expect(results).toHaveLength(1);
    const result = results[0]!;
    expect(result.segmentId).toBe(section!.id);
    expect(result.segmentVersion).toBe(1); // first version of the segment
    expect(result.origin).toBe('playground');
    expect(result.blockContentId).toBe(section!.contentId);

    const byContent = await service.getResultsByContentId(section!.contentId!);
    expect(byContent.some(r => r.id === result.id)).toBe(true);

    // ── Analytics rows: summary facts only, with block identity ──────────
    const points = await service.getAnalyticsByContentId(section!.contentId!);
    expect(points).toHaveLength(1);
    for (const point of points) {
      expect(point.grain).toBe('summary');
      expect(point.metricKey).toBe('totalReps');
      expect(point.value).toBe(90);
      expect(point.segmentId).toBe(section!.id);
      expect(point.segmentVersion).toBe(1);
      expect(point.origin).toBe('playground');
      expect(point.resultId).toBe(result.id);
    }

    // ── Version lineage: editing the content bumps the segment version ────
    // Segment ids embed a content hash, so an edit chains to a NEW segment id
    // at version 2 (matched by position + type). The version number is the
    // lineage; the id identifies the content incarnation that was run.
    const edited = RAW_CONTENT.replace('Thrusters 95lb', 'Thrusters 75lb');
    await persistence.mutateNote(noteId, { rawContent: edited });
    const editedSection = parseDocumentSections(edited).find(s => s.type === 'wod')!;
    const bumped = await service.getLatestSegmentVersion(editedSection.id);
    expect(bumped?.version).toBe(2);

    await persistence.mutateNote(noteId, {
      workoutResult: {
        id: `result-2-${noteId}`,
        blockId: editedSection.id,
        blockContentId: editedSection.contentId,
        segmentId: editedSection.id,
        origin: 'journal',
        data: { startTime: 100, endTime: 160_000, duration: 60_000, logs: [], completed: true } as never,
        createdAt: 160_000,
      },
    });
    const all = await service.getResultsForNote(noteId);
    const second = all.find(r => r.id === `result-2-${noteId}`)!;
    expect(second.segmentVersion).toBe(2);
    expect(second.origin).toBe('journal');
  });

  it('reads similar workouts across notes via blockContentId, excluding playground by default', async () => {
    // Distinct content from the first test so the shared DB's by-content rows don't bleed across tests.
    const CONTENT = RAW_CONTENT.replace('21-15-9', '27-21-15');
    const noteA = `it-a-${crypto.randomUUID()}`;
    const noteB = `it-b-${crypto.randomUUID()}`;
    // Identical content in two notes => same blockContentId (shared workout).
    for (const id of [noteA, noteB]) {
      await persistence.createNote({ id, title: 'Fran', rawContent: CONTENT, targetDate: Date.now() });
    }
    const section = parseDocumentSections(CONTENT).find(s => s.type === 'wod')!;

    const record = (noteId: string, origin: 'journal' | 'playground', at: number) =>
      persistence.mutateNote(noteId, {
        workoutResult: {
          id: `r-${origin}-${noteId}`,
          blockId: section.id,
          blockContentId: section.contentId,
          segmentId: section.id,
          origin,
          data: { startTime: at, endTime: at + 1000, duration: 1000, logs: [], completed: true } as never,
          createdAt: at + 1000,
        },
      });

    await record(noteA, 'journal', 1000);
    await record(noteB, 'journal', 2000);
    await record(noteB, 'playground', 3000);

    // Cross-note: both journal results, newest first, playground hidden.
    const similar = await persistence.getSimilarWorkoutResults(section.contentId!);
    expect(similar.map(r => r.id)).toEqual([`r-journal-${noteB}`, `r-journal-${noteA}`]);

    // Playground toggle reveals the playground run.
    const withPlayground = await persistence.getSimilarWorkoutResults(section.contentId!, { includePlayground: true });
    expect(withPlayground.map(r => r.id)).toEqual([`r-playground-${noteB}`, `r-journal-${noteB}`, `r-journal-${noteA}`]);

    // excludeNoteId scopes to other notes only.
    const othersOnly = await persistence.getSimilarWorkoutResults(section.contentId!, { excludeNoteId: noteA });
    expect(othersOnly.map(r => r.id)).toEqual([`r-journal-${noteB}`]);
  });
});
