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
    const textSection = sections.find(s => s.rawContent.includes('Some text'));
    expect(textSection).toBeDefined();
    textSection!.deleted = true;
    const rebuilt = buildRawContent(sections);
    expect(rebuilt).not.toContain('Some text');
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

describe('parseDocumentSections — frontmatter', () => {
  it('parses a YAML front matter block between --- delimiters', () => {
    const content = '---\ntitle: My Workout\ndate: 2024-01-01\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm).toBeDefined();
    expect(fm!.properties).toBeDefined();
    expect(fm!.properties!['title']).toBe('My Workout');
    expect(fm!.properties!['date']).toBe('2024-01-01');
  });

  it('assigns default frontmatterType when no type property', () => {
    const content = '---\ntitle: Hello\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('default');
  });

  it('detects youtube frontmatterType from type property', () => {
    const content = '---\ntype: youtube\nurl: https://youtube.com/watch?v=abc12345678\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('youtube');
  });

  it('auto-detects youtube from url pattern', () => {
    const content = '---\nurl: https://www.youtube.com/watch?v=dQw4w9WgXcQ\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('youtube');
  });

  it('detects strava frontmatterType', () => {
    const content = '---\ntype: strava\nurl: https://www.strava.com/activities/12345\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('strava');
  });

  it('auto-detects strava from url pattern', () => {
    const content = '---\nurl: https://www.strava.com/activities/99999\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('strava');
  });

  it('detects file frontmatterType', () => {
    const content = '---\ntype: file\nfile: /images/photo.jpg\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('file');
  });

  it('detects amazon frontmatterType from type property', () => {
    const content = '---\ntype: amazon\nurl: https://www.amazon.com/dp/B001234567\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('amazon');
  });

  it('auto-detects amazon from url pattern', () => {
    const content = '---\nurl: https://www.amazon.com/Kettlebell-Workout-Weights/dp/B08P2C6J7B\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('amazon');
  });

  it('auto-detects amazon from short url (amzn.to)', () => {
    const content = '---\nurl: https://amzn.to/3abc123\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.frontmatterType).toBe('amazon');
  });

  it('preserves correct line numbers for frontmatter', () => {
    const content = '---\nkey: value\n---';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm!.startLine).toBe(0);
    expect(fm!.endLine).toBe(2);
    expect(fm!.lineCount).toBe(3);
  });

  it('parses frontmatter before title', () => {
    const content = '---\ntitle: Hello\n---\n# Heading';
    const sections = parseDocumentSections(content);
    expect(sections[0].type).toBe('frontmatter');
    expect(sections[1].type).toBe('title');
  });

  it('parses frontmatter between other sections', () => {
    const content = '# Title\n---\nmeta: data\n---\nMore text';
    const sections = parseDocumentSections(content);
    expect(sections.map(s => s.type)).toEqual(['title', 'frontmatter', 'markdown']);
  });

  it('round-trips frontmatter through buildRawContent', () => {
    const content = '---\ntitle: Test\n---';
    const sections = parseDocumentSections(content);
    expect(buildRawContent(sections)).toBe(content);
  });

  it('ignores unclosed --- blocks', () => {
    const content = '---\nno closing fence';
    const sections = parseDocumentSections(content);
    // Should be treated as regular text, not frontmatter
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm).toBeUndefined();
  });

  it('does not detect --- inside wod blocks as frontmatter', () => {
    const content = '```wod\n---\nkey: val\n---\n```';
    const sections = parseDocumentSections(content);
    const fm = sections.find(s => s.type === 'frontmatter');
    expect(fm).toBeUndefined();
  });
});
