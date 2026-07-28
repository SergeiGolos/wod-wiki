/**
 * Sample analytics dataset (PRD #767 §5).
 *
 * Persistence mechanism: summary-grain AnalyticsDataPoint rows written directly
 * to the `analytics` store, each backed by a Note tagged `sample` in the
 * `note_tags` store. This avoids building synthetic WorkoutResult logs and
 * NoteSegments because QueryService and the Dashboard only read fact rows and
 * note_tags — they never join through results/segments.
 *
 * Purge-by-marker uses the shared `sample` tag: all sample notes are found
 * through the `note_tags.by-tag` index, their dependent fact rows are swept
 * from `analytics` by `noteId`, and the notes themselves are removed. Rows
 * not linked to a sample-tagged note are never touched.
 */
import { indexedDBService, type IndexedDBService } from '@/services/db/IndexedDBService';

/**
 * Backing store, injectable for tests. The full bun suite has sibling files
 * that stub this module process-globally via mock.module; tests construct a
 * real instance through the '?real' specifier and install it here (same
 * documented-exception pattern as queryService.integration.test.ts).
 */
let service: IndexedDBService = indexedDBService;

export function setSampleDataService(instance: IndexedDBService): void {
  service = instance;
}
import type { AnalyticsDataPoint, Note } from '@/types/storage';

const SAMPLE_TAG = 'sample';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

interface SampleMovement {
  effortSlug: string;
  discipline: string;
  reps: number;
  /** Pounds; 0 for bodyweight movements. */
  loadLbs: number;
  /** Approximate seconds spent in motion for this movement. */
  tisSeconds: number;
}

interface SampleSession {
  noteId: string;
  title: string;
  workoutType: 'fran' | 'cindy' | 'annie';
  timestamp: number;
  durationSeconds: number;
  movements: SampleMovement[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function franMovement(reps: number, loadLbs: number, effortSlug: string, discipline: string): SampleMovement {
  const secondsPerRep = effortSlug === 'thruster' ? 2.2 : 1.6;
  return {
    effortSlug,
    discipline,
    reps,
    loadLbs,
    tisSeconds: round1(reps * secondsPerRep),
  };
}

function buildFran(now: number, weekOffset: number, attempt: number): SampleSession {
  // Slight improvement trend: duration drops ~5% per attempt.
  const baseDuration = 330 - attempt * 16;
  const durationSeconds = Math.max(180, round1(baseDuration + (Math.random() - 0.5) * 20));
  const thrusterReps = 45;
  const pullUpReps = 45;
  return {
    noteId: `sample-fran-${weekOffset}-${crypto.randomUUID()}`,
    title: `Sample — Fran (week ${12 - weekOffset})`,
    workoutType: 'fran',
    timestamp: now - weekOffset * WEEK,
    durationSeconds,
    movements: [
      franMovement(thrusterReps, 95, 'thruster', 'strength'),
      franMovement(pullUpReps, 0, 'pull-up', 'gymnastics'),
    ],
  };
}

function buildCindy(now: number, weekOffset: number, attempt: number): SampleSession {
  // Capacity improves slightly: a few more rounds each attempt.
  const rounds = 10 + attempt + Math.round((Math.random() - 0.5) * 2);
  const clampedRounds = Math.max(8, rounds);
  return {
    noteId: `sample-cindy-${weekOffset}-${crypto.randomUUID()}`,
    title: `Sample — Cindy (week ${12 - weekOffset})`,
    workoutType: 'cindy',
    timestamp: now - weekOffset * WEEK,
    durationSeconds: 1200,
    movements: [
      { effortSlug: 'pull-up', discipline: 'gymnastics', reps: clampedRounds * 5, loadLbs: 0, tisSeconds: round1(clampedRounds * 5 * 1.5) },
      { effortSlug: 'push-up', discipline: 'gymnastics', reps: clampedRounds * 10, loadLbs: 0, tisSeconds: round1(clampedRounds * 10 * 1.2) },
      { effortSlug: 'air-squat', discipline: 'bodyweight', reps: clampedRounds * 15, loadLbs: 0, tisSeconds: round1(clampedRounds * 15 * 1.1) },
    ],
  };
}

function buildAnnie(now: number, weekOffset: number, attempt: number): SampleSession {
  const baseDuration = 540 - attempt * 22;
  const durationSeconds = Math.max(360, round1(baseDuration + (Math.random() - 0.5) * 30));
  const reps = 150;
  return {
    noteId: `sample-annie-${weekOffset}-${crypto.randomUUID()}`,
    title: `Sample — Annie (week ${12 - weekOffset})`,
    workoutType: 'annie',
    timestamp: now - weekOffset * WEEK,
    durationSeconds,
    movements: [
      { effortSlug: 'double-under', discipline: 'gymnastics', reps, loadLbs: 0, tisSeconds: round1(reps * 0.5) },
      { effortSlug: 'sit-up', discipline: 'bodyweight', reps, loadLbs: 0, tisSeconds: round1(reps * 1.3) },
    ],
  };
}

function generateSessions(now: number): SampleSession[] {
  const sessions: SampleSession[] = [];
  // Fran every 4 weeks.
  for (let i = 0; i < 3; i++) {
    sessions.push(buildFran(now, i * 4, i));
  }
  // Cindy every 3 weeks.
  for (let i = 0; i < 4; i++) {
    sessions.push(buildCindy(now, 1 + i * 3, i));
  }
  // Annie every 3 weeks, offset from Cindy.
  for (let i = 0; i < 4; i++) {
    sessions.push(buildAnnie(now, 2 + i * 3, i));
  }
  return sessions.sort((a, b) => a.timestamp - b.timestamp);
}

function buildSessionFacts(session: SampleSession): AnalyticsDataPoint[] {
  const createdAt = Date.now();
  const baseId = `sample-${session.noteId}`;
  const resultId = `${baseId}-result`;
  const baseIdentity = {
    noteId: session.noteId,
    resultId,
    segmentId: 'sample-segment',
    segmentVersion: 1,
    blockContentId: `sample-content-${session.workoutType}`,
    origin: 'journal' as const,
  };

  const totalReps = session.movements.reduce((sum, m) => sum + m.reps, 0);
  const totalVolume = session.movements.reduce((sum, m) => sum + m.reps * m.loadLbs, 0);
  const totalTis = session.movements.reduce((sum, m) => sum + m.tisSeconds, 0);
  const sessionLoad = round1(totalVolume / 100 + totalReps + session.durationSeconds / 10);

  const facts: AnalyticsDataPoint[] = [
    {
      id: `${baseId}-elapsed`,
      ...baseIdentity,
      grain: 'summary',
      type: 'elapsed',
      metricKey: 'elapsed',
      value: session.durationSeconds,
      unit: 's',
      label: 'Elapsed time',
      metricLabel: 'Elapsed time',
      metricUnit: 's',
      timestamp: session.timestamp,
      createdAt,
    },
    {
      id: `${baseId}-totalReps`,
      ...baseIdentity,
      grain: 'summary',
      type: 'totalReps',
      metricKey: 'totalReps',
      value: totalReps,
      unit: 'reps',
      label: 'Total reps',
      metricLabel: 'Total reps',
      metricUnit: 'reps',
      timestamp: session.timestamp,
      createdAt,
    },
    {
      id: `${baseId}-tis`,
      ...baseIdentity,
      grain: 'summary',
      type: 'tis',
      metricKey: 'tis',
      value: round1(totalTis),
      unit: 's',
      label: 'Time in motion',
      metricLabel: 'Time in motion',
      metricUnit: 's',
      timestamp: session.timestamp,
      createdAt,
    },
  ];

  if (totalVolume > 0) {
    facts.push({
      id: `${baseId}-totalVolume`,
      ...baseIdentity,
      grain: 'summary',
      type: 'totalVolume',
      metricKey: 'totalVolume',
      value: round1(totalVolume),
      unit: 'lb',
      label: 'Total volume',
      metricLabel: 'Total volume',
      metricUnit: 'lb',
      timestamp: session.timestamp,
      createdAt,
    });
  }

  facts.push({
    id: `${baseId}-sessionLoad`,
    ...baseIdentity,
    grain: 'summary',
    type: 'sessionLoad',
    metricKey: 'sessionLoad',
    value: sessionLoad,
    unit: 'AU',
    label: 'Session load',
    metricLabel: 'Session load',
    metricUnit: 'AU',
    timestamp: session.timestamp,
    createdAt,
  });

  // Per-effort facts for `by {effort}` / `by {discipline}` queries.
  for (const m of session.movements) {
    const movementVolume = m.reps * m.loadLbs;
    facts.push({
      id: `${baseId}-totalReps-${m.effortSlug}`,
      ...baseIdentity,
      grain: 'summary',
      type: 'totalReps',
      metricKey: 'totalReps',
      value: m.reps,
      unit: 'reps',
      label: 'Total reps',
      metricLabel: 'Total reps',
      metricUnit: 'reps',
      effortSlug: m.effortSlug,
      discipline: m.discipline,
      timestamp: session.timestamp,
      createdAt,
    });
    facts.push({
      id: `${baseId}-tis-${m.effortSlug}`,
      ...baseIdentity,
      grain: 'summary',
      type: 'tis',
      metricKey: 'tis',
      value: m.tisSeconds,
      unit: 's',
      label: 'Time in motion',
      metricLabel: 'Time in motion',
      metricUnit: 's',
      effortSlug: m.effortSlug,
      discipline: m.discipline,
      timestamp: session.timestamp,
      createdAt,
    });
    if (movementVolume > 0) {
      facts.push({
        id: `${baseId}-totalVolume-${m.effortSlug}`,
        ...baseIdentity,
        grain: 'summary',
        type: 'totalVolume',
        metricKey: 'totalVolume',
        value: round1(movementVolume),
        unit: 'lb',
        label: 'Total volume',
        metricLabel: 'Total volume',
        metricUnit: 'lb',
        effortSlug: m.effortSlug,
        discipline: m.discipline,
        timestamp: session.timestamp,
        createdAt,
      });
    }
    facts.push({
      id: `${baseId}-sessionLoad-${m.effortSlug}`,
      ...baseIdentity,
      grain: 'summary',
      type: 'sessionLoad',
      metricKey: 'sessionLoad',
      value: round1(movementVolume / 100 + m.reps + m.tisSeconds / 10),
      unit: 'AU',
      label: 'Session load',
      metricLabel: 'Session load',
      metricUnit: 'AU',
      effortSlug: m.effortSlug,
      discipline: m.discipline,
      timestamp: session.timestamp,
      createdAt,
    });
  }

  return facts;
}

async function getSampleTagId(): Promise<string | undefined> {
  const tag = await service.getTagByLabel(SAMPLE_TAG);
  return tag?.id;
}

async function getSampleNoteIds(): Promise<string[]> {
  const notes = await service.getNotesForTag(SAMPLE_TAG);
  return notes.map(n => n.id);
}

export async function hasSampleData(): Promise<boolean> {
  const noteIds = await getSampleNoteIds();
  return noteIds.length > 0;
}

export async function loadSampleData(): Promise<{ facts: number }> {
  if (await hasSampleData()) {
    const noteIds = await getSampleNoteIds();
    const all = await service.getAllAnalytics();
    return { facts: all.filter((f) => noteIds.includes(f.noteId)).length };
  }

  const now = Date.now();
  const sessions = generateSessions(now);
  let factsWritten = 0;

  for (const session of sessions) {
    const note: Note = {
      id: session.noteId,
      title: session.title,
      createdAt: session.timestamp,
      type: 'playground',
    };
    await service.saveNote(note);
    await service.setNoteTags(session.noteId, [SAMPLE_TAG]);

    const facts = buildSessionFacts(session);
    await service.saveAnalyticsPoints(facts);
    factsWritten += facts.length;
  }

  return { facts: factsWritten };
}

export async function purgeSampleData(): Promise<void> {
  const noteIds = await getSampleNoteIds();
  if (noteIds.length === 0) return;

  // Delete each sample note. This cascades to note_tags, segments, results,
  // attachments, and analytics-by-result via IndexedDBService.deleteNote.
  for (const noteId of noteIds) {
    await service.deleteNote(noteId);
  }

  // Because we wrote summary facts directly without backing results, also
  // sweep any remaining analytics rows whose noteId matches a sample note.
  const all = await service.getAllAnalytics();
  const toDelete = all.filter((f) => noteIds.includes(f.noteId)).map((f) => f.id);
  if (toDelete.length > 0) {
    await service.deleteAnalyticsPoints(toDelete);
  }

  // Drop the shared sample tag if nothing links to it anymore.
  const notes = await service.getNotesForTag(SAMPLE_TAG);
  if (notes.length === 0) {
    const tagId = await getSampleTagId();
    if (tagId) {
      await service.deleteTag(tagId);
    }
  }
}
