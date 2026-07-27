import { describe, it, expect } from 'bun:test';
import {
  levenshteinDistance,
  normalizeForFuzzy,
  isWithinThreshold,
  findBestFuzzyMatch,
} from '../fuzzyMatch';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('rowing', 'rowing')).toBe(0);
  });

  it('returns length for empty first string', () => {
    expect(levenshteinDistance('', 'rowing')).toBe(6);
  });

  it('returns length for empty second string', () => {
    expect(levenshteinDistance('rowing', '')).toBe(6);
  });

  it('computes single substitution', () => {
    expect(levenshteinDistance('rowing', 'rowing')).toBe(0);
    expect(levenshteinDistance('rowing', 'rowinc')).toBe(1);
  });

  it('computes single insertion', () => {
    expect(levenshteinDistance('rowing', 'roweing')).toBe(1);
  });

  it('computes single deletion', () => {
    expect(levenshteinDistance('rowing', 'rowng')).toBe(1);
  });

  it('computes distance 2 for "rwo" vs "row" (transpose)', () => {
    // Transpose requires 2 ops: delete 'w', insert 'w' after 'o'
    expect(levenshteinDistance('rwo', 'row')).toBe(2);
  });

  it('computes distance 4 for "rwo" vs "rowing"', () => {
    expect(levenshteinDistance('rwo', 'rowing')).toBe(4);
  });

  it('handles case sensitivity', () => {
    expect(levenshteinDistance('Rowing', 'rowing')).toBe(1);
  });
});

describe('normalizeForFuzzy', () => {
  it('lowercases input', () => {
    expect(normalizeForFuzzy('Rowing')).toBe('rowing');
  });

  it('trims whitespace', () => {
    expect(normalizeForFuzzy('  rowing  ')).toBe('rowing');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeForFuzzy('rowing  machine')).toBe('rowing machine');
  });
});

describe('isWithinThreshold', () => {
  it('exact match is within threshold', () => {
    expect(isWithinThreshold('rowing', 'rowing', 2)).toBe(true);
  });

  it('distance 1 is within threshold 2', () => {
    expect(isWithinThreshold('rowing', 'rowinc', 2)).toBe(true);
  });

  it('distance 3 is outside threshold 2', () => {
    expect(isWithinThreshold('rowing', 'xyz', 2)).toBe(false);
  });

  it('normalizes before comparing', () => {
    expect(isWithinThreshold('  Rowing  ', 'rowing', 2)).toBe(true);
  });

  it('fast-path rejects large length difference', () => {
    expect(isWithinThreshold('rowing', 'rowingmachine', 2)).toBe(false);
  });
});

describe('findBestFuzzyMatch', () => {
  const candidates = ['rowing', 'rower', 'running', 'cycling'];

  it('returns exact match with distance 0', () => {
    const result = findBestFuzzyMatch('rowing', candidates, 2);
    expect(result).not.toBeNull();
    expect(result!.target).toBe('rowing');
    expect(result!.distance).toBe(0);
  });

  it('returns best fuzzy match within threshold', () => {
    const result = findBestFuzzyMatch('rowin', candidates, 2);
    expect(result).not.toBeNull();
    expect(result!.target).toBe('rowing');
    expect(result!.distance).toBe(1);
  });

  it('returns null when no match within threshold', () => {
    const result = findBestFuzzyMatch('xyz', candidates, 2);
    expect(result).toBeNull();
  });

  it('prefers closer match when multiple candidates qualify', () => {
    const result = findBestFuzzyMatch('row', candidates, 2);
    expect(result).not.toBeNull();
    expect(result!.distance).toBeLessThanOrEqual(2);
  });

  it('normalizes query before matching', () => {
    const result = findBestFuzzyMatch('  Rowing  ', candidates, 2);
    expect(result).not.toBeNull();
    expect(result!.target).toBe('rowing');
    expect(result!.distance).toBe(0);
  });
});
