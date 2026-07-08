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
  });

  it('tolerates malformed stored JSON', () => {
    window.localStorage.setItem('wodwiki.profile.v1', '{not valid json');
    expect(getProfile()).toEqual({});
  });
});
