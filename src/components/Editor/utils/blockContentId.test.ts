import { describe, expect, it } from 'bun:test';
import { blockContentId } from './sectionParser';

describe('blockContentId', () => {
  it('is deterministic for identical content', () => {
    const c = '21-15-9\nThrusters 95lb\nPull-ups';
    expect(blockContentId(c)).toBe(blockContentId(c));
  });

  it('produces a bc-<8 hex> id', () => {
    expect(blockContentId('For time: Run 5k')).toMatch(/^bc-[0-9a-f]{8}$/);
  });

  it('ignores surrounding whitespace', () => {
    expect(blockContentId('10 Push-ups')).toBe(blockContentId('  10 Push-ups\n'));
  });

  it('distinguishes content that differs only past a long shared prefix', () => {
    // The whole block is hashed, so a late difference must change the id —
    // this is the property that makes the id survive clone/reorder and the
    // reason it beats a prefix-only hash for identity.
    const a = 'AMRAP 20\n10 Thrusters\n10 Pull-ups\n10 Box Jumps';
    const b = 'AMRAP 20\n10 Thrusters\n10 Pull-ups\n10 Burpees';
    expect(blockContentId(a)).not.toBe(blockContentId(b));
  });

  it('shares an id for identical content (the "same workout" contract)', () => {
    const feed = '21-15-9\nThrusters 95lb\nPull-ups';
    const journal = '21-15-9\nThrusters 95lb\nPull-ups';
    expect(blockContentId(feed)).toBe(blockContentId(journal));
  });

  it('is stable for empty content', () => {
    expect(blockContentId('')).toBe(blockContentId('   '));
    expect(blockContentId('')).toMatch(/^bc-[0-9a-f]{8}$/);
  });
});
