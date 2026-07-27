/**
 * useScrollQuests.test.ts — unit tests for the ```scroll stage-quest hook:
 * each stage fires its declared `quest` id when scrolled into view.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useScrollQuests } from './useScrollQuests';
import type { ScrollStage } from './parseCanvasMarkdown';

const STORAGE_KEY = 'wodwiki.quests.v1';
const PAGE_ROUTE = '/guide/syntax/basics';

const pageQuests = [
  { id: 'basics-movement', label: 'Add a movement' },
  { id: 'basics-reps', label: 'Add a rep count' },
];

const STAGES: ScrollStage[] = [
  { id: 'movement', range: [0, 0.16], quest: 'basics-movement' },
  { id: 'three-rules', range: [0.16, 0.34], quest: 'basics-reps' },
  { id: 'measurements', range: [0.34, 0.5], quest: 'basics-load' }, // not declared on the page
  { id: 'next', range: [0.88, 1] }, // no quest
];

function readLedger(): Record<string, Record<string, boolean>> {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useScrollQuests', () => {
  it('marks the stage quest complete when the stage scrolls into view', () => {
    const { result } = renderHook(() => useScrollQuests(PAGE_ROUTE, pageQuests, STAGES));

    act(() => result.current('movement'));

    expect(readLedger()[PAGE_ROUTE]?.['basics-movement']).toBe(true);
    expect(readLedger()[PAGE_ROUTE]?.['basics-reps']).toBeUndefined();
  });

  it('is a no-op for stages whose quest is not declared on the page', () => {
    const { result } = renderHook(() => useScrollQuests(PAGE_ROUTE, pageQuests, STAGES));

    act(() => result.current('measurements'));

    expect(readLedger()[PAGE_ROUTE]).toBeUndefined();
  });

  it('is a no-op for stages without a quest', () => {
    const { result } = renderHook(() => useScrollQuests(PAGE_ROUTE, pageQuests, STAGES));

    act(() => result.current('next'));

    expect(readLedger()[PAGE_ROUTE]).toBeUndefined();
  });

  it('is idempotent — revisiting a stage keeps the quest complete', () => {
    const { result } = renderHook(() => useScrollQuests(PAGE_ROUTE, pageQuests, STAGES));

    act(() => {
      result.current('three-rules');
      result.current('three-rules');
    });

    expect(readLedger()[PAGE_ROUTE]?.['basics-reps']).toBe(true);
  });
});
