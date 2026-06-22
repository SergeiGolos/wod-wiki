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
      destinationBlocks: [makeBlock({ id: 'wod-7-deadbeef' })],
      resultId: 'run-1',
      data: { startTime: 0, endTime: 60000, duration: 60000, completed: true } as any,
      completedAt: 60000,
    });

    expect(saved).toHaveLength(1);
    expect(result.noteId).toBe('journal/2026-06-20');
    expect(result.blockContentId).toBe('bc-aaaaaaaa');
    // sectionId resolved against the destination block (content match).
    expect(result.sectionId).toBe('wod-7-deadbeef');
  });

  it('falls the sectionId back to the run block id when no destination block matches', async () => {
    const saved: WorkoutResult[] = [];
    const recorder = createResultRecorder({ saveResult: async (r) => { saved.push(r); } });

    // No destinationBlocks (e.g. WallClockPage, which has none).
    await recorder.record({
      runBlock: makeBlock({ id: 'src-block-id' }),
      destination: { kind: 'effort', id: 'fran', raw: 'effort/fran' } as NoteRef,
      resultId: 'run-2',
      data: {} as any,
      completedAt: 1,
    });

    expect(saved[0]!.sectionId).toBe('src-block-id');
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
