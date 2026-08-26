/**
 * runAffordance — the single shared gating resolver (#891, decided #894).
 * 'time' → 'run' · 'log' → 'log' · anything else → null.
 * The :sport suffix never reaches it (suffix scopes the DialectStack only).
 */

import { describe, expect, it } from 'bun:test';
import { runAffordance } from './section';

describe('runAffordance', () => {
  it('time is runnable', () => {
    expect(runAffordance('time')).toBe('run');
  });

  it('log gets the log affordance', () => {
    expect(runAffordance('log')).toBe('log');
  });

  it('unknown tags get no affordance', () => {
    expect(runAffordance('wod')).toBeNull();
    expect(runAffordance('plan')).toBeNull();
    expect(runAffordance('markdown')).toBeNull();
    expect(runAffordance('')).toBeNull();
  });
});
