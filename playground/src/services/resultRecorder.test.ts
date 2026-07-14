import { describe, expect, it, mock } from 'bun:test';
import { createResultRecorder } from './resultRecorder';
import type { ScriptBlock } from '@/components/Editor/types';
import type { ResultWriter, ResultMutation } from './resultRecorder';

function makeBlock(overrides: Partial<ScriptBlock> = {}): ScriptBlock {
  return {
    id: 'wod-5-deadbeef',
    contentId: 'bc-aaaaaaaa',
    dialect: 'wod',
    startLine: 4,
    endLine: 8,
    content: '21-15-9\nThrusters 95lb\nPull-ups',
    state: 'idle',
    version: 1,
    createdAt: 0,
    widgetIds: {},
    ...overrides,
  };
}

const EMPTY_ENTRY = {
  id: 'note',
  title: 'Note',
  rawContent: '',
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  targetDate: 0,
  schemaVersion: 1,
  extendedResults: [],
};

/** Stub writer that captures every workoutResult the Recorder hands it. */
function makeWriter(): ResultWriter & { captured: ResultMutation[] } {
  const captured: ResultMutation[] = [];
  return {
    captured,
    async getNote() {
      return EMPTY_ENTRY;
    },
    async mutateNote(_locator, mutation) {
      captured.push(mutation);
    },
  };
}

describe('createResultRecorder', () => {
  it('persists a result keyed by the destination noteId + stable blockContentId', async () => {
    const writer = makeWriter();
    const recorder = createResultRecorder(writer);

    const result = await recorder.record({
      runBlock: makeBlock(),
      blockId: makeBlock().id,
      noteId: '00000000-0000-4000-8000-000000000001',
      resultId: 'run-1',
      data: { startTime: 0, endTime: 60000, duration: 60000, completed: true } as never,
      completedAt: 60000,
    });

    expect(writer.captured).toHaveLength(1);
    expect(result.noteId).toBe('00000000-0000-4000-8000-000000000001');
    expect(result.blockContentId).toBe('bc-aaaaaaaa');
    expect(writer.captured[0]?.workoutResult?.blockContentId).toBe('bc-aaaaaaaa');
  });

  it('records blockContentId from the run block contentId', async () => {
    const writer = makeWriter();
    const recorder = createResultRecorder(writer);

    await recorder.record({
      runBlock: makeBlock({ contentId: 'content-hash-xyz' }),
      blockId: 'wod-5-deadbeef',
      noteId: '00000000-0000-4000-8000-000000000002',
      resultId: 'run-2',
      data: { startTime: 0, endTime: 1, duration: 1, completed: true } as never,
      completedAt: 1,
    });

    expect(writer.captured[0]?.workoutResult?.blockContentId).toBe('content-hash-xyz');
  });

  it('writes exactly once through the writer', async () => {
    const getNote = mock(async () => EMPTY_ENTRY);
    const mutateNote = mock(async (_locator: { id: string }, _m: ResultMutation) => undefined);
    const writer: ResultWriter = { getNote, mutateNote };
    const recorder = createResultRecorder(writer);
    await recorder.record({
      runBlock: makeBlock(),
      blockId: 'wod-5-deadbeef',
      noteId: '00000000-0000-4000-8000-000000000003',
      resultId: 'run-3',
      data: { startTime: 0, endTime: 1, duration: 1, completed: true } as never,
      completedAt: 1,
    });

    expect(mutateNote).toHaveBeenCalledTimes(1);
  });

  it('forwards analyticsSegments atomically to the writer', async () => {
    const writer = makeWriter();
    const recorder = createResultRecorder(writer);

    await recorder.record({
      runBlock: makeBlock(),
      blockId: 'wod-5-deadbeef',
      noteId: '00000000-0000-4000-8000-000000000004',
      resultId: 'run-4',
      data: { startTime: 0, endTime: 1, duration: 1, completed: true } as never,
      completedAt: 1,
      analyticsSegments: [{ id: 1, name: 'Run', type: 'timer', startTime: 0, endTime: 1, elapsed: 5, total: 5, parentId: null, depth: 0, metric: {}, lane: 0 }],
    });

    expect(writer.captured[0]?.workoutResult?.analyticsSegments).toEqual([
      { id: 1, name: 'Run', type: 'timer', startTime: 0, endTime: 1, elapsed: 5, total: 5, parentId: null, depth: 0, metric: {}, lane: 0 },
    ]);
  });
});
