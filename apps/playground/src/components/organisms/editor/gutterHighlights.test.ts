import { describe, expect, it } from 'bun:test';
import { createParser } from '@bitcobblers/wod-wiki-engine';
import { sourceIdsToContentLines } from './gutterHighlights';

const CONTENT = '5x5 Back Squat @100kg\n\n10 Pullups';

describe('sourceIdsToContentLines (real parser seam)', () => {
  it('collapses parent and inline child statements sharing one source line', () => {
    const script = createParser().read(CONTENT);
    const line1 = script.statements.filter(s => (s.meta?.line ?? s.line) === 1);

    const ids = line1.map(s => s.id);

    expect(sourceIdsToContentLines(script, ids)).toEqual([1]);
  });

  it('resolves a sibling after a blank line to its real source line, not its ID', () => {
    const script = createParser().read(CONTENT);
    const sibling = script.statements.find(s => (s.meta?.line ?? s.line) === 3);
    expect(sibling).toBeDefined();
    expect(sourceIdsToContentLines(script, [sibling.id])).toEqual([3]);
  });

  it('returns no lines for unknown statement IDs', () => {
    const script = createParser().read(CONTENT);
    expect(sourceIdsToContentLines(script, [999999])).toEqual([]);
  });
});
