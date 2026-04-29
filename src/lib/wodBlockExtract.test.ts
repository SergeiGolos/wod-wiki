import { describe, it, expect } from 'bun:test';
import { extractWodBlocks, normalizeDialect } from './wodBlockExtract';

const FRAN_MD = `
# Fran

Classic CrossFit benchmark.

\`\`\`wod
21-15-9
Thrusters 95/65lb
Pull-ups
\`\`\`
`;

const MULTI_MD = `
# Two WODs

\`\`\`wod
10 rounds
10 push-ups
\`\`\`

Some text.

\`\`\`crossfit
3 rounds
400m run
\`\`\`
`;

describe('extractWodBlocks', () => {
  it('extracts a single block', () => {
    const blocks = extractWodBlocks(FRAN_MD);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('wod');
    expect(blocks[0].content).toContain('Thrusters');
  });

  it('labels block from preceding heading', () => {
    const blocks = extractWodBlocks(FRAN_MD);
    expect(blocks[0].label).toBe('Fran');
  });

  it('extracts multiple blocks with different dialects', () => {
    const blocks = extractWodBlocks(MULTI_MD);
    expect(blocks).toHaveLength(2);
    expect(blocks[1].dialect).toBe('crossfit');
  });

  it('returns empty array for markdown with no wod fences', () => {
    expect(extractWodBlocks('# Just text\nNo blocks here.')).toHaveLength(0);
  });

  it('uses "Block 1" fallback label when no heading precedes the block', () => {
    const md = `\`\`\`wod\n10 push-ups\n\`\`\``;
    const blocks = extractWodBlocks(md);
    expect(blocks[0].label).toBe('Block 1');
  });

  it('extracts log and plan dialect fences', () => {
    const md = `\`\`\`log\nDone Fran\n\`\`\`\n\`\`\`plan\nFran tomorrow\n\`\`\``;
    const blocks = extractWodBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].dialect).toBe('log');
    expect(blocks[1].dialect).toBe('plan');
  });

  it('handles fences with trailing info text (e.g. ```wod my-label)', () => {
    const md = `\`\`\`wod my-label\n10 burpees\n\`\`\``;
    const blocks = extractWodBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('10 burpees');
  });

  it('handles uppercase dialect (e.g. ```WOD)', () => {
    const md = `\`\`\`WOD\n5 pull-ups\n\`\`\``;
    const blocks = extractWodBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('wod');
  });
});

describe('normalizeDialect', () => {
  it('passes through editor-supported dialects unchanged', () => {
    expect(normalizeDialect('wod')).toBe('wod');
    expect(normalizeDialect('log')).toBe('log');
    expect(normalizeDialect('plan')).toBe('plan');
  });

  it('normalizes unsupported dialects to "wod"', () => {
    expect(normalizeDialect('crossfit')).toBe('wod');
    expect(normalizeDialect('amrap')).toBe('wod');
    expect(normalizeDialect('emom')).toBe('wod');
    expect(normalizeDialect('tabata')).toBe('wod');
  });
});
