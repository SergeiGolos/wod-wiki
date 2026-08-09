import { afterEach, describe, expect, it, mock } from 'bun:test';
/**
 * #944 — write-on-completion: when NoteEditor's runtime completes a workout,
 * the note gains a ```query:table fence carrying `rows:{result:<id>}` directly
 * after the workout block, stacking newest-first across re-runs; the same id
 * is threaded to onCompleteWorkout so persistence records the result the
 * table references.
 *
 * FullscreenTimer is mocked at the seam MarkdownCanvasPage.test uses — the
 * CM6 document, sectionField, and the completion handler stay real.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types';

const sampleResults: WorkoutResults = {
  completed: true,
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_005_000,
  duration: 5_000,
  logs: [],
  metrics: [],
} as unknown as WorkoutResults;

mock.module('@/components/organisms/review/FullscreenTimer', () => ({
  FullscreenTimer: (props: {
    block: ScriptBlock;
    onCompleteWorkout: (blockId: string, results: WorkoutResults) => void;
  }) => (
    <button
      data-testid="complete-workout"
      onClick={() => props.onCompleteWorkout(props.block.id, sampleResults)}
    >
      complete
    </button>
  ),
}));

mock.module('@/services/persistence', () => ({
  notePersistence: {
    getNote: async () => ({ extendedResults: [] }),
    listNotes: async () => [],
  },
}));

// Lives in the playground tree on purpose: `bun test ./src` shares one module
// registry per process and sibling suites stub '@/services/analytics/query'
// without runRows, which crashes the QueryBlockView this test mounts. The
// playground suite runs each file in its own process (tests/run-isolated.ts),
// so the real query module loads cleanly here.

import { NoteEditor } from '@/components/organisms/editor/NoteEditor';

// CM6 measures via the jsdom window, not globalThis — polyfill both.
(window as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(cb, 0);
(window as any).cancelAnimationFrame ??= (id: number) => clearTimeout(id);
// scrollIntoView schedules a CM6 measure pass, which reads text rects jsdom
// doesn't implement.
const zeroRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
(window.Range.prototype as any).getClientRects ??= () => [];
(window.Range.prototype as any).getBoundingClientRect ??= () => zeroRect;
(window.Element.prototype as any).getClientRects ??= () => [];

const DOC = 'Intro prose.\n\n```time\n5s\n```\n\nTrailing notes.';

afterEach(() => cleanup());

function renderEditor(onChange: (value: string) => void, value = DOC) {
  const onCompleteWorkout = mock((_blockId: string, _results: WorkoutResults | undefined, _resultId?: string): void => {});
  render(
    <NoteEditor
      value={value}
      onChange={onChange}
      noteId="journal/2026-08-02"
      onCompleteWorkout={onCompleteWorkout}
    />,
  );
  return { onCompleteWorkout };
}

async function completeOneRun() {
  // Open the timer via the block's Run command, then complete it.
  const runButton = await screen.findByText('Run');
  fireEvent.click(runButton);
  const completeButton = await screen.findByTestId('complete-workout');
  fireEvent.click(completeButton);
}

describe('NoteEditor write-on-completion (#944)', () => {
  it('inserts a query:table rows block after the workout block and threads the result id', async () => {
    let latestValue = DOC;
    const onChange = (value: string) => { latestValue = value; };
    const { onCompleteWorkout } = renderEditor(onChange);

    await completeOneRun();

    await waitFor(() => expect(latestValue).toContain('```query:table'));
    const match = /rows:\{result:([0-9a-f-]+)\}/.exec(latestValue);
    expect(match).not.toBeNull();
    expect(latestValue).toContain(
      '```time\n5s\n```\n\n```query:table\nrows:{result:' + match![1] + '}\n```\n\nTrailing notes.',
    );
    // The table references the id persistence is told to record.
    expect(onCompleteWorkout).toHaveBeenCalledTimes(1);
    expect(onCompleteWorkout.mock.calls[0][2]).toBe(match![1]);
  });

  it('stacks a re-run newest-first between the workout block and the prior table', async () => {
    let latestValue = DOC;
    const onChange = (value: string) => { latestValue = value; };
    const { onCompleteWorkout } = renderEditor(onChange);

    await completeOneRun();
    await waitFor(() => expect(latestValue).toContain('```query:table'));
    const firstId = /rows:\{result:([0-9a-f-]+)\}/.exec(latestValue)![1];

    await completeOneRun();
    await waitFor(() => {
      const ids = [...latestValue.matchAll(/rows:\{result:([0-9a-f-]+)\}/g)].map(m => m[1]);
      expect(ids.length).toBe(2);
    });
    const ids = [...latestValue.matchAll(/rows:\{result:([0-9a-f-]+)\}/g)].map(m => m[1]);
    expect(ids[1]).toBe(firstId);
    expect(ids[0]).not.toBe(firstId);
    expect(onCompleteWorkout).toHaveBeenCalledTimes(2);
    expect(onCompleteWorkout.mock.calls[1][2]).toBe(ids[0]);
  });
});
