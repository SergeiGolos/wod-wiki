import { describe, expect, it } from 'bun:test';
import { EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { shiftBoundariesOnUpdate, type NoteBoundary } from './noteBoundaries';

function createMockUpdate(initialDoc: string, insertPos: number, insertText: string): ViewUpdate {
  const state = EditorState.create({ doc: initialDoc });
  const tr = state.update({
    changes: { from: insertPos, to: insertPos, insert: insertText },
  });

  return {
    docChanged: true,
    startState: state,
    state: tr.state,
    changes: tr.changes,
  } as unknown as ViewUpdate;
}

describe('shiftBoundariesOnUpdate', () => {
  it('shifts boundaries when lines are inserted in an earlier note', () => {
    const initialBoundaries: NoteBoundary[] = [
      { uuid: 'note-1', startLine: 0 },
      { uuid: 'note-2', startLine: 3 },
    ];

    const update = createMockUpdate('line1\nline2\nline3\nnote2-line1', 5, '\nline-inserted\n');
    const shifted = shiftBoundariesOnUpdate(initialBoundaries, update);

    expect(shifted[0].startLine).toBe(0);
    expect(shifted[1].startLine).toBe(5);
  });

  it('preserves boundaries if change is after the note startLine', () => {
    const initialBoundaries: NoteBoundary[] = [
      { uuid: 'note-1', startLine: 0 },
      { uuid: 'note-2', startLine: 3 },
    ];

    const state = EditorState.create({ doc: 'l1\nl2\nl3\nl4\nl5' });
    const update = createMockUpdate('l1\nl2\nl3\nl4\nl5', state.doc.line(5).from, '\nmore-in-note-2');

    const shifted = shiftBoundariesOnUpdate(initialBoundaries, update);
    expect(shifted[0].startLine).toBe(0);
    expect(shifted[1].startLine).toBe(3);
  });
});
