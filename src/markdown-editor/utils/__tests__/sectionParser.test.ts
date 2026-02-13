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

  it('parses a single heading', () => {
    const sections = parseDocumentSections('# Hello');
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('heading');
    expect(sections[0].displayContent).toBe('Hello');
    expect(sections[0].level).toBe(1);
    expect(sections[0].startLine).toBe(0);
    expect(sections[0].endLine).toBe(0);
    expect(sections[0].lineCount).toBe(1);
  });

  it('parses headings at different levels', () => {
    const content = '# H1\n## H2\n### H3';
    const sections = parseDocumentSections(content);
    expect(sections).toHaveLength(3);
    expect(sections[0].level).toBe(1);
    expect(sections[1].level).toBe(2);
    expect(sections[2].level).toBe(3);
  });

  it('parses a paragraph', () => {
    const content = 'This is a paragraph\nwith two lines';
    const sections = parseDocumentSections(content);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('paragraph');
    expect(sections[0].displayContent).toBe(content);
    expect(sections[0].startLine).toBe(0);
    expect(sections[0].endLine).toBe(1);
    expect(sections[0].lineCount).toBe(2);
  });

  it('separates paragraphs by empty lines', () => {
    const content = 'Paragraph one\n\nParagraph two';
    const sections = parseDocumentSections(content);
    // First paragraph absorbs the empty line
    expect(sections).toHaveLength(2);
    expect(sections[0].type).toBe('paragraph');
    expect(sections[1].type).toBe('paragraph');
    expect(sections[1].displayContent).toBe('Paragraph two');
  });

  it('absorbs trailing empty lines into the previous section', () => {
    const content = '# Title\n\nSome text';
    const sections = parseDocumentSections(content);
    // Heading absorbs the empty line, then paragraph
    expect(sections).toHaveLength(2);
    expect(sections[0].type).toBe('heading');
    expect(sections[0].rawContent).toBe('# Title\n');
    expect(sections[0].lineCount).toBe(2); // line 0 + empty line 1
    expect(sections[1].type).toBe('paragraph');
    expect(sections[1].startLine).toBe(2);
  });

  it('creates empty sections for leading blank lines', () => {
    const content = '\n# Title';
    const sections = parseDocumentSections(content);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0].type).toBe('empty');
    expect(sections[1].type).toBe('heading');
  });

  it('breaks paragraph at heading boundary', () => {
    const content = 'Introductory text\n# New Section';
    const sections = parseDocumentSections(content);
    expect(sections).toHaveLength(2);
    expect(sections[0].type).toBe('paragraph');
    expect(sections[0].displayContent).toBe('Introductory text');
    expect(sections[1].type).toBe('heading');
    expect(sections[1].displayContent).toBe('New Section');
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

    it('separates heading from wod block', () => {
      const content = '# Warm Up\n```wod\n3:00 Walk\n```';
      const sections = parseDocumentSections(content);

      expect(sections[0].type).toBe('heading');
      const wodSection = sections.find(s => s.type === 'wod');
      expect(wodSection).toBeDefined();
    });
  });
});

describe('buildRawContent', () => {
  it('returns empty string for no sections', () => {
    expect(buildRawContent([])).toBe('');
  });

  it('round-trips a simple heading document', () => {
    const original = '# Hello';
    const sections = parseDocumentSections(original);
    expect(buildRawContent(sections)).toBe(original);
  });

  it('round-trips a mixed-section document', () => {
    const original = '# Title\n\nParagraph one\nwith second line\n\n## Section\n\nMore text';
    const sections = parseDocumentSections(original);
    expect(buildRawContent(sections)).toBe(original);
  });

  it('round-trips a document with only headings', () => {
    const original = '# H1\n## H2\n### H3';
    const sections = parseDocumentSections(original);
    expect(buildRawContent(sections)).toBe(original);
  });

  it('round-trips a document with leading empty lines', () => {
    const original = '\n# Title';
    const sections = parseDocumentSections(original);
    expect(buildRawContent(sections)).toBe(original);
  });
});

describe('calculateTotalLines', () => {
  it('returns 0 for empty sections', () => {
    expect(calculateTotalLines([])).toBe(0);
  });

  it('counts lines correctly for a single heading', () => {
    const sections = parseDocumentSections('# Title');
    expect(calculateTotalLines(sections)).toBe(1);
  });

  it('counts lines correctly for multi-line content', () => {
    const sections = parseDocumentSections('# Title\n\nParagraph');
    expect(calculateTotalLines(sections)).toBe(3);
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
    // Heading ID should be preserved via position match
    expect(matched[0].id).toBe(oldSections[0].id);
  });

  it('assigns new IDs when no match found', () => {
    const oldSections = parseDocumentSections('# Title');
    const newSections = parseDocumentSections('Paragraph only');

    const matched = matchSectionIds(oldSections, newSections);
    // No type match (heading vs paragraph), so new ID kept
    expect(matched[0].id).toBe(newSections[0].id);
  });
});
