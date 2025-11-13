/**
 * Unit tests for block detection utilities
 */

import { describe, it, expect } from 'vitest';
import { detectWodBlocks, findBlockAtLine, extractBlockContent } from './blockDetection';

describe('detectWodBlocks', () => {
  it('should detect a single WOD block', () => {
    const content = `# My Workout

\`\`\`wod
20:00 AMRAP
  + 5 Pullups
\`\`\`

Some text after`;

    const blocks = detectWodBlocks(content);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startLine).toBe(2);
    expect(blocks[0].endLine).toBe(5);
    expect(blocks[0].content).toBe('20:00 AMRAP\n  + 5 Pullups');
    expect(blocks[0].state).toBe('idle');
    expect(blocks[0].id).toMatch(/^wod-block-/);
  });

  it('should detect multiple WOD blocks', () => {
    const content = `\`\`\`wod
(21-15-9)
  Thrusters
\`\`\`

Some text

\`\`\`wod
10:00
  Run
\`\`\``;

    const blocks = detectWodBlocks(content);
    
    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toBe('(21-15-9)\n  Thrusters');
    expect(blocks[1].content).toBe('10:00\n  Run');
  });

  it('should handle empty document', () => {
    const blocks = detectWodBlocks('');
    expect(blocks).toHaveLength(0);
  });

  it('should handle document with no WOD blocks', () => {
    const content = `# Just markdown

Some text here
- List item
- Another item`;

    const blocks = detectWodBlocks(content);
    expect(blocks).toHaveLength(0);
  });

  it('should handle incomplete block (no closing backticks)', () => {
    const content = `\`\`\`wod
20:00 AMRAP
  + 5 Pullups`;

    const blocks = detectWodBlocks(content);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startLine).toBe(0);
    expect(blocks[0].endLine).toBe(2);
    expect(blocks[0].content).toBe('20:00 AMRAP\n  + 5 Pullups');
  });

  it('should handle WOD blocks with extra spaces after ```wod', () => {
    const content = `\`\`\`wod   
20:00 AMRAP
\`\`\``;

    const blocks = detectWodBlocks(content);
    expect(blocks).toHaveLength(1);
  });

  it('should not detect code blocks that are not wod', () => {
    const content = `\`\`\`javascript
const x = 5;
\`\`\`

\`\`\`wod
20:00 AMRAP
\`\`\``;

    const blocks = detectWodBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('20:00 AMRAP');
  });

  it('should handle empty WOD block', () => {
    const content = `\`\`\`wod
\`\`\``;

    const blocks = detectWodBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('');
  });
});

describe('findBlockAtLine', () => {
  const content = `# Title
\`\`\`wod
20:00 AMRAP
\`\`\`
Text
\`\`\`wod
10:00
\`\`\``;

  const blocks = detectWodBlocks(content);

  it('should find block at start line', () => {
    const block = findBlockAtLine(blocks, 1);
    expect(block).toBeTruthy();
    expect(block?.startLine).toBe(1);
  });

  it('should find block at middle line', () => {
    const block = findBlockAtLine(blocks, 2);
    expect(block).toBeTruthy();
    expect(block?.startLine).toBe(1);
  });

  it('should find block at end line', () => {
    const block = findBlockAtLine(blocks, 3);
    expect(block).toBeTruthy();
    expect(block?.startLine).toBe(1);
  });

  it('should return null for line outside blocks', () => {
    const block = findBlockAtLine(blocks, 0);
    expect(block).toBeNull();
  });

  it('should find second block', () => {
    const block = findBlockAtLine(blocks, 5);
    expect(block).toBeTruthy();
    expect(block?.startLine).toBe(5);
  });
});

describe('extractBlockContent', () => {
  it('should extract content without backticks', () => {
    const content = `# Title
\`\`\`wod
20:00 AMRAP
  + 5 Pullups
\`\`\`
Text`;

    const extracted = extractBlockContent(content, 1, 4);
    expect(extracted).toBe('20:00 AMRAP\n  + 5 Pullups');
  });

  it('should handle single line block', () => {
    const content = `\`\`\`wod
20:00
\`\`\``;

    const extracted = extractBlockContent(content, 0, 2);
    expect(extracted).toBe('20:00');
  });

  it('should handle empty block', () => {
    const content = `\`\`\`wod
\`\`\``;

    const extracted = extractBlockContent(content, 0, 1);
    expect(extracted).toBe('');
  });
});
