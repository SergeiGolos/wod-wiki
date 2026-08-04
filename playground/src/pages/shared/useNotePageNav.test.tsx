/**
 * useNotePageNav — log links are display-only (#891/#894).
 *
 * Time links keep their Run affordance (onRun); log links get result badges
 * but NO onRun, so every consumer (CanvasPage, JournalPageShell,
 * PageNavDropdown, L3 nav) renders them as scroll targets only.
 */

import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavContext, initialNavState } from '../../nav/NavContext';
import { useNotePageNav } from './useNotePageNav';
import type { PageNavLink } from './pageUtils';
import type { ScriptBlock } from '@/components/Editor/types';

const CONTENT = ['# Note', '', '```time', '10:00 AMRAP', '```', '', '```log', '5-5-5 Back Squat', '```'].join('\n');

const block = (startLine: number): ScriptBlock => ({
  id: `block-${startLine}`,
  startLine,
  endLine: startLine + 2,
  content: 'x',
  state: 'idle',
  widgetIds: {},
  version: 1,
  createdAt: 0,
});

function renderNav(scriptBlocks: ScriptBlock[]): PageNavLink[] {
  let captured: PageNavLink[] = [];
  function Harness() {
    captured = useNotePageNav({ content: CONTENT, scriptBlocks, onStartWorkout: () => {} });
    return null;
  }
  render(
    <MemoryRouter>
      <NavContext.Provider
        value={{
          tree: [],
          navState: initialNavState,
          dispatch: () => {},
          l3Items: [],
          setL3Items: () => {},
          scrollToSection: () => {},
          registerScrollFn: () => {},
        }}
      >
        <Harness />
      </NavContext.Provider>
    </MemoryRouter>,
  );
  return captured;
}

describe('useNotePageNav — log link gating', () => {
  afterEach(() => cleanup());

  it('time links keep onRun; log links are display-only', () => {
    // ```time opens on line 3 (1-based), ```log on line 7
    const index = renderNav([block(2), block(6)]);
    const timeLink = index.find(l => l.type === 'time');
    const logLink = index.find(l => l.type === 'log');

    expect(timeLink?.onRun).toBeDefined();
    expect(logLink).toBeDefined();
    expect(logLink?.onRun).toBeUndefined();
  });

  it('time link onRun resolves the matching block', () => {
    const onStart = mock(() => {});
    let captured: PageNavLink[] = [];
    function Harness() {
      captured = useNotePageNav({ content: CONTENT, scriptBlocks: [block(2), block(6)], onStartWorkout: onStart });
      return null;
    }
    render(
      <MemoryRouter>
        <NavContext.Provider
          value={{
            tree: [],
            navState: initialNavState,
            dispatch: () => {},
            l3Items: [],
            setL3Items: () => {},
            scrollToSection: () => {},
            registerScrollFn: () => {},
          }}
        >
          <Harness />
        </NavContext.Provider>
      </MemoryRouter>,
    );
    captured.find(l => l.type === 'time')?.onRun?.();
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
