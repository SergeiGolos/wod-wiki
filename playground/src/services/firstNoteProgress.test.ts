import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { clearProgress, getProgress, writeProgress } from './firstNoteProgress';

const STORAGE_KEY = 'wodwiki.firstNoteProgress.v1';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('firstNoteProgress', () => {
  describe('getProgress', () => {
    it('returns empty defaults when storage is empty', () => {
      expect(getProgress()).toEqual({
        step: 0,
        goal: null,
        units: null,
        pinnedEffort: '',
      });
    });

    it('returns empty defaults when the stored JSON is malformed', () => {
      window.localStorage.setItem(STORAGE_KEY, '{not valid json');
      expect(getProgress()).toEqual({
        step: 0,
        goal: null,
        units: null,
        pinnedEffort: '',
      });
    });

    it('round-trips a complete progress blob', () => {
      writeProgress({
        step: 2,
        goal: 'sport',
        units: 'kg',
        pinnedEffort: 'Pullups',
      });
      expect(getProgress()).toEqual({
        step: 2,
        goal: 'sport',
        units: 'kg',
        pinnedEffort: 'Pullups',
      });
    });

    it('coerces unknown keys to the empty defaults (schema evolution)', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step: 1, futureFlag: true, removedField: 'old' }),
      );
      expect(getProgress()).toEqual({
        step: 1,
        goal: null,
        units: null,
        pinnedEffort: '',
      });
    });

    it('clamps step to [0, 2] in case the schema grows', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 7 }));
      expect(getProgress().step).toBe(2);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: -3 }));
      expect(getProgress().step).toBe(0);
    });

    it('rejects unknown goal / units values', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ goal: 'made-up', units: 'stones' }),
      );
      expect(getProgress()).toEqual({
        step: 0,
        goal: null,
        units: null,
        pinnedEffort: '',
      });
    });

    it('rejects non-string pinnedEffort', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pinnedEffort: 42 }),
      );
  });

  describe('writeProgress', () => {
    it('persists the blob to localStorage', () => {
      writeProgress({
        step: 1,
        goal: 'hybrid',
        units: 'lb',
        pinnedEffort: 'Row',
      });
      const raw = window.localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!)).toEqual({
        step: 1,
        goal: 'hybrid',
        units: 'lb',
        pinnedEffort: 'Row',
      });
    });
  });

  describe('clearProgress', () => {
    it('removes the storage key entirely', () => {
      writeProgress({
        step: 2,
        goal: 'sport',
        units: 'kg',
        pinnedEffort: 'Pullups',
      });
      clearProgress();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('is a no-op when storage is already empty', () => {
      clearProgress();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
})
  });
});