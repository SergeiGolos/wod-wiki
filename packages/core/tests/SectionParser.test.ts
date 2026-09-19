import { describe, expect, it } from 'bun:test';
import {
  parseDocumentSections,
  buildRawContent,
  calculateTotalLines,
  matchSectionIds,
  generateSectionId,
  isWorkoutSectionType,
  detectScriptBlocks,
} from '../src';

describe('packages/core sectionParser', () => {
  it('parses empty string to empty array', () => {
    expect(parseDocumentSections('')).toEqual([]);
  });

  it('parses first text block as title', () => {
    const sections = parseDocumentSections('# Hello');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('title');
    expect(sections[0].displayContent).toBe('# Hello');
    expect(sections[0].startLine).toBe(0);
    expect(sections[0].endLine).toBe(0);
  });

  it('parses workout fences with canonical section IDs and contentId', () => {
    const content = '# Title\n\n```time\n5:00 Run\n```\n\nSome notes';
    const sections = parseDocumentSections(content);
    expect(sections).toHaveLength(5); // title, empty markdown, workout, empty markdown, notes markdown

    const workout = sections.find((s) => isWorkoutSectionType(s.type));
    expect(workout).toBeDefined();
    expect(workout!.type).toBe('time');
    expect(workout!.contentId).toBeDefined();
    expect(workout!.id).toMatch(/^time-\d+-[0-9a-f]{8}$/);
    expect(workout!.scriptBlock).toBeDefined();
    expect(workout!.scriptBlock!.id).toBe(workout!.id);
    expect(workout!.scriptBlock!.contentId).toBe(workout!.contentId);
  });

  it('preserves section IDs across re-parsing with matchSectionIds', () => {
    const content1 = '# Title\n\n```time\n5:00 Run\n```';
    const first = parseDocumentSections(content1);
    const second = parseDocumentSections(content1);

    const matched = matchSectionIds(first, second);
    expect(matched[0].id).toBe(first[0].id);
    expect(matched.find((s) => s.type === 'time')!.id).toBe(
      first.find((s) => s.type === 'time')!.id
    );
  });

  it('round-trips raw content with buildRawContent', () => {
    const content = '# Title\n\n```time\n5:00 Run\n```';
    const sections = parseDocumentSections(content);
    expect(buildRawContent(sections)).toBe(content);
  });

  it('calculates total lines accurately', () => {
    const content = '# Title\n\nParagraph\n';
    const sections = parseDocumentSections(content);
    expect(calculateTotalLines(sections)).toBeGreaterThanOrEqual(3);
  });

  it('detects WOD blocks with detectScriptBlocks', () => {
    const content = '```time:running\n10:00 Run\n```';
    const blocks = detectScriptBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('time');
    expect(blocks[0].sport).toBe('running');
  });
});
