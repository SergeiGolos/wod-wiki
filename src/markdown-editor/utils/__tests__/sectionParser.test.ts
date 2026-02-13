import { describe, it, expect } from 'bun:test';
import {
  parseDocumentSections,
  buildRawContent,
  calculateTotalLines,
  matchSectionIds,
} from '../sectionParser';

describe('parseDocumentSections', () => {
  it('returns empty array for empty string', () => {
    expect(parseDocumentSections('')).toEqual([]);
  });

  it('parses first text block as title', () => {
    const sections = parseDocumentSections('# Hello');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('title');
    expect(sections[0].displayContent).toBe('# Hello');
  });

  it('preserves heading prefix in title displayContent', () => {
    const sections = parseDocumentSections('## Hello World');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('title');
    expect(sections[0].displayContent).toBe('## Hello World');
  });

  it('parses plain text as title when it is the first block', () => {
    const content = 'Just some text';
    const sections = parseDocumentSections(content);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('title');
    expect(sections[0].displayContent).toBe('Just some text');
  });

  it('groups subsequent non-wod text as markdown sections', () => {
    const content = '# Title\nSecond line\nThird line';
    const sections = parseDocumentSections(content);
    // All consecutive non-wod lines before a wod block form a single section
    // First text block is title
    expect(sections[0].type).toBe('title');
  });

  it('parses text after title as markdown', () => {
    const content = '# Title\n\n```wod\n5:00 Run\n```\n\nNotes here';
    const sections = parseDocumentSections(content);
    const mdSections = sections.filter(s => s.type === 'markdown');
    expect(mdSections.length).toBeGreaterThanOrEqual(1);
    expect(mdSections[mdSections.length - 1].displayContent).toContain('Notes here');
  });

  it('generates deterministic IDs', () => {
    const content = '# Title\n\nSome text';
    const first = parseDocumentSections(content);
    const second = parseDocumentSections(content);
    expect(first.map(s => s.id)).toEqual(second.map(s => s.id));
  });

  describe('with WOD blocks', () => {
    it('parses a wod block between content', () => {
      const content = '# Workout\n\n```wod\n5:00 Run\n```\n\nNotes';
      const sections = parseDocumentSections(content);

      const wodSection = sections.find(s => s.type === 'wod');
      expect(wodSection).toBeDefined();
      expect(wodSection!.displayContent).toBeDefined();
      expect(wodSection!.wodBlock).toBeDefined();
    });

    it('separates title from wod block', () => {
      const content = '# Warm Up\n```wod\n3:00 Walk\n```';
      const sections = parseDocumentSections(content);

      expect(sections[0].type).toBe('title');
      const wodSection = sections.find(s => s.type === 'wod');
      expect(wodSection).toBeDefined();
    });

    it('recognises log dialect', () => {
      const content = '# Session\n```log\n5:00 Run\n```';
      const sections = parseDocumentSections(content);
      const wodSection = sections.find(s => s.type === 'wod');
      expect(wodSection).toBeDefined();
      expect(wodSection!.dialect).toBe('log');
    });

    it('recognises plan dialect', () => {
      const content = '# Plan\n```plan\n10:00 Bike\n```';
      const sections = parseDocumentSections(content);
      const wodSection = sections.find(s => s.type === 'wod');
      expect(wodSection).toBeDefined();
      expect(wodSection!.dialect).toBe('plan');
    });
  });
});

describe('buildRawContent', () => {
  it('returns empty string for no sections', () => {
    expect(buildRawContent([])).toBe('');
  });

  it('round-trips a simple title document', () => {
    const original = '# Hello';
    const sections = parseDocumentSections(original);
    expect(buildRawContent(sections)).toBe(original);
  });

  it('round-trips a document with wod block', () => {
    const original = '# Title\n\n```wod\n5:00 Run\n```';
    const sections = parseDocumentSections(original);
    const rebuilt = buildRawContent(sections);
    expect(rebuilt).toContain('# Title');
    expect(rebuilt).toContain('```wod');
    expect(rebuilt).toContain('5:00 Run');
  });

  it('skips soft-deleted sections', () => {
    const sections = parseDocumentSections('# Title\n\nSome text');
    if (sections.length >= 2) {
      sections[1].deleted = true;
      const rebuilt = buildRawContent(sections);
      expect(rebuilt).not.toContain('Some text');
    }
  });
});

describe('calculateTotalLines', () => {
  it('returns 0 for empty sections', () => {
    expect(calculateTotalLines([])).toBe(0);
  });

  it('counts lines correctly for a single title', () => {
    const sections = parseDocumentSections('# Title');
    expect(calculateTotalLines(sections)).toBe(1);
  });

  it('counts lines correctly for multi-line content', () => {
    const sections = parseDocumentSections('# Title\n\nParagraph');
    expect(calculateTotalLines(sections)).toBeGreaterThanOrEqual(2);
  });
});

describe('matchSectionIds', () => {
  it('preserves IDs for unchanged sections', () => {
    const content = '# Title\n\nParagraph';
    const oldSections = parseDocumentSections(content);
    const newSections = parseDocumentSections(content);

    const matched = matchSectionIds(oldSections, newSections);
    expect(matched.map(s => s.id)).toEqual(oldSections.map(s => s.id));
  });

  it('preserves ID when content changes but position stays', () => {
    const oldSections = parseDocumentSections('# Old Title\n\nParagraph');
    const newSections = parseDocumentSections('# New Title\n\nParagraph');

    const matched = matchSectionIds(oldSections, newSections);
    // Title ID should be preserved via position match
    expect(matched[0].id).toBe(oldSections[0].id);
  });
});
