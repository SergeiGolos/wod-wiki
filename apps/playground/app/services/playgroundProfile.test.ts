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
    updateProfile({ completionCelebrated: true });
    expect(getProfile()).toEqual({ completionCelebrated: true });
  });

  it('tolerates malformed stored JSON', () => {
    window.localStorage.setItem('wodwiki.profile.v1', '{not valid json');
    expect(getProfile()).toEqual({});
  });

  it('completionCelebrated round-trips through updateProfile + getProfile', () => {
    updateProfile({ completionCelebrated: true });
    expect(getProfile().completionCelebrated).toBe(true);
  });
});
