/**
 * useScrollTypewriter.test.ts — unit tests for the ```scroll typewriter's
 * scrub contract: a stage's script completes TYPEWRITER_WINDOW into the
 * stage and holds for the rest of the span (the reading pause before the
 * next stage's typing starts).
 */

import { useState } from 'react';
import { describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useScrollTypewriter, TYPEWRITER_WINDOW } from './useScrollTypewriter';
import type { ScrollSlice } from './scrollRunway';
import type { ScrollStage } from './parseCanvasMarkdown';

const STAGES: ScrollStage[] = [
  { id: 'intro', range: [0, 0.25] },
  { id: 'movement', range: [0.25, 0.5] },
  { id: 'reps', range: [0.5, 1] },
];

const SCRIPT = '3 rounds:\n- 10 thrusters\n- 15 pull-ups';

function sliceAt(index: number, t: number): ScrollSlice {
  const stage = STAGES[index];
  return { index, stage, t, ring: null };
}

function setup(sourcesByStageId: Record<string, string>) {
  let emit: ((slice: ScrollSlice) => void) | null = null;
  const subscribe = (cb: (slice: ScrollSlice) => void) => {
    emit = cb;
    return () => {
      emit = null;
    };
  };
  const hook = renderHook(() => {
    const [doc, setDoc] = useState('');
    const { userDiverged, complete } = useScrollTypewriter({
      sourcesByStageId,
      doc,
      setDoc,
      subscribe,
      enabled: true,
    });
    return { doc, userDiverged, complete };
  });
  const emitSlice = (slice: ScrollSlice) => act(() => emit?.(slice));
  return { hook, emitSlice };
}

describe('useScrollTypewriter', () => {
  it('completes the script a quarter of the way through the stage', () => {
    const { hook, emitSlice } = setup({ movement: SCRIPT });

    emitSlice(sliceAt(1, 0.1));
    expect(hook.result.current.doc.length).toBeGreaterThan(0);
    expect(hook.result.current.doc).not.toBe(SCRIPT);

    emitSlice(sliceAt(1, TYPEWRITER_WINDOW));
    expect(hook.result.current.doc).toBe(SCRIPT);
  });

  it('holds the complete script through the rest of the stage span', () => {
    const { hook, emitSlice } = setup({ movement: SCRIPT });

    for (const t of [0.4, 0.7, 0.999]) emitSlice(sliceAt(1, t));

    expect(hook.result.current.doc).toBe(SCRIPT);
  });

  it('types the first stage script immediately', () => {
    const { hook, emitSlice } = setup({ intro: SCRIPT });

    emitSlice(sliceAt(0, 0));

    expect(hook.result.current.doc).toBe(SCRIPT);
  });

  it('rewinds and types the next stage script from scratch on a boundary crossing', () => {
    const next = 'for time:\n- 400m run';
    const { hook, emitSlice } = setup({ movement: SCRIPT, reps: next });

    emitSlice(sliceAt(1, 0.9));
    expect(hook.result.current.doc).toBe(SCRIPT);

    emitSlice(sliceAt(2, 0.05));
    expect(hook.result.current.doc).not.toBe(SCRIPT);
    expect(next.startsWith(hook.result.current.doc)).toBe(true);

    emitSlice(sliceAt(2, TYPEWRITER_WINDOW));
    expect(hook.result.current.doc).toBe(next);
  });
});
