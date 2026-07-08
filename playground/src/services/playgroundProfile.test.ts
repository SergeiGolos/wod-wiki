import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getProfile, updateProfile } from './playgroundProfile';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('playgroundProfile', () => {
  it('returns an empty profile by default', () => {
    expect(getProfile()).toEqual({});
  });

  it('updateProfile merges and persists', () => {
    updateProfile({ trainingGoal: 'sport' });
    updateProfile({ defaultUnits: 'kg', pinnedEffort: 'Pullups' });
    expect(getProfile()).toEqual({
      trainingGoal: 'sport',
      defaultUnits: 'kg',
      pinnedEffort: 'Pullups',
    });
    // updateProfile also writes the profileInitialized flag, read by
    // useProfileInitialized to gate the First-Note Wizard's re-appearance.
    expect(window.localStorage.getItem('wodwiki.profileInitialized.v1')).toBe('true');
  });

  it('tolerates malformed stored JSON', () => {
    window.localStorage.setItem('wodwiki.profile.v1', '{not valid json');
    expect(getProfile()).toEqual({});
  });

  it('firstNoteUsedAt round-trips through updateProfile + getProfile', () => {
    updateProfile({ firstNoteUsedAt: 1234567890 });
    expect(getProfile().firstNoteUsedAt).toBe(1234567890);
  });

  it('completionCelebrated round-trips through updateProfile + getProfile', () => {
    updateProfile({ completionCelebrated: true });
    expect(getProfile().completionCelebrated).toBe(true);
  });
});
