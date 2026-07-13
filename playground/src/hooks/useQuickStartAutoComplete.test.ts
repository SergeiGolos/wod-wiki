/**
 * useQuickStartAutoComplete.test.ts — Unit tests for the home-page Quick-Start
 * auto-completion hook.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useQuickStartAutoComplete } from './useQuickStartAutoComplete';

const STORAGE_KEY = 'wodwiki.quests.v1';
const PAGE_ROUTE = '/';
const INITIAL_SOURCE = '10 Pushups';

const quickStartQuests = [
  { id: 'qs-arrive', label: 'Welcome to WOD Wiki', desc: 'Arrived' },
  { id: 'qs-edit', label: 'Change the workout', desc: 'Edit' },
];

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useQuickStartAutoComplete', () => {
  it('auto-completes qs-arrive on mount', () => {
    renderHook(() =>
      useQuickStartAutoComplete({
        pageRoute: PAGE_ROUTE,
        quests: quickStartQuests,
        initialSource: INITIAL_SOURCE,
        currentSource: INITIAL_SOURCE,
      }),
    );

    const ledger = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(ledger[PAGE_ROUTE]?.['qs-arrive']).toBe(true);
    expect(ledger[PAGE_ROUTE]?.['qs-edit']).toBeUndefined();
  });

  it('does not auto-complete qs-arrive when disabled', () => {
    renderHook(() =>
      useQuickStartAutoComplete({
        pageRoute: PAGE_ROUTE,
        quests: quickStartQuests,
        initialSource: INITIAL_SOURCE,
        currentSource: INITIAL_SOURCE,
        enabled: false,
      }),
    );

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('is a no-op when the page has no quick-start quests', () => {
    renderHook(() =>
      useQuickStartAutoComplete({
        pageRoute: '/guide/syntax/basics',
        quests: [{ id: 'basics-movement', label: 'Add a movement' }],
        initialSource: INITIAL_SOURCE,
        currentSource: INITIAL_SOURCE,
      }),
    );

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('auto-completes qs-edit when current source diverges from initial', () => {
    const { rerender } = renderHook(
      ({ currentSource }) =>
        useQuickStartAutoComplete({
          pageRoute: PAGE_ROUTE,
          quests: quickStartQuests,
          initialSource: INITIAL_SOURCE,
          currentSource,
        }),
      { initialProps: { currentSource: INITIAL_SOURCE } },
    );

    act(() => rerender({ currentSource: '12 Pushups' }));

    const ledger = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(ledger[PAGE_ROUTE]?.['qs-arrive']).toBe(true);
    expect(ledger[PAGE_ROUTE]?.['qs-edit']).toBe(true);
  });

  it('does not auto-complete qs-edit when source only changes whitespace', () => {
    const { rerender } = renderHook(
      ({ currentSource }) =>
        useQuickStartAutoComplete({
          pageRoute: PAGE_ROUTE,
          quests: quickStartQuests,
          initialSource: INITIAL_SOURCE,
          currentSource,
        }),
      { initialProps: { currentSource: INITIAL_SOURCE } },
    );

    act(() => rerender({ currentSource: `  ${INITIAL_SOURCE}  ` }));

    const ledger = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(ledger[PAGE_ROUTE]?.['qs-edit']).toBeUndefined();
  });
});
