import { describe, expect, it, mock } from 'bun:test';
import { createResultRecorder } from './resultRecorder';
import type { ScriptBlock } from '@/components/Editor/types';
import type { WorkoutResult } from '@/types/storage';
import type { NoteRef } from '../lib/noteIdentity';

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

describe('createResultRecorder', () => {
  it('persists a result keyed by the destination noteId + stable blockContentId', async () => {
    const saved: WorkoutResult[] = [];
    const recorder = createResultRecorder({
      saveResult: async (r) => { saved.push(r); },
    });

    const result = await recorder.record({
      runBlock: makeBlock(),
      destination: { kind: 'journal', id: '2026-06-20', raw: 'journal/2026-06-20' } satisfies NoteRef,
      resultId: 'run-1',
      data: { startTime: 0, endTime: 60000, duration: 60000, completed: true } as any,
      completedAt: 60000,
    });

    expect(saved).toHaveLength(1);
    expect(result.noteId).toBe('journal/2026-06-20');
    expect(result.blockContentId).toBe('bc-aaaaaaaa');
  });

  it('records blockContentId from the run block contentId', async () => {
    const saved: WorkoutResult[] = [];
    const recorder = createResultRecorder({ saveResult: async (r) => { saved.push(r); } });

    await recorder.record({
      runBlock: makeBlock({ contentId: 'content-hash-xyz' }),
      destination: { kind: 'effort', id: 'fran', raw: 'effort/fran' } as NoteRef,
      resultId: 'run-2',
      data: {} as any,
      completedAt: 1,
    });

    expect(saved[0]!.blockContentId).toBe('content-hash-xyz');
    expect(saved[0]!.noteId).toBe('effort/fran');
  });

  it('writes exactly once through the sink', async () => {
    const saveResult = mock(async (_r: WorkoutResult) => {});
    const recorder = createResultRecorder({ saveResult });

    await recorder.record({
      runBlock: makeBlock(),
      destination: { kind: 'journal', id: 'd', raw: 'journal/d' } as NoteRef,
      resultId: 'run-3',
      data: {} as any,
      completedAt: 1,
    });

    expect(saveResult).toHaveBeenCalledTimes(1);
  });
});
