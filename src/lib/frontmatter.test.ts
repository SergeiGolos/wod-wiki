import { describe, it, expect } from 'bun:test';
import {
  parseFrontmatter,
  stripFrontmatter,
  getScalar,
  getList,
  parseFrontmatterCategories,
  parseFlatProperties,
  parseFrontmatterProps,
  extractYouTubeVideoId,
  extractLinkWidgets,
} from './frontmatter';

describe('parseFrontmatter', () => {
  it('extracts scalar key-value pairs from frontmatter', () => {
    const raw = '---\nDifficulty: beginner\nCategory: Cardio\n---\nContent';
    expect(parseFrontmatter(raw)).toEqual({
      meta: { Difficulty: 'beginner', Category: 'Cardio' },
      body: 'Content',
    });
  });

  it('strips matched wrapping quotes from values', () => {
    const raw = '---\ntitle: "WOD 761"\nlabel: \'Quoted\'\n---\nContent';
    expect(parseFrontmatter(raw).meta).toEqual({
      title: 'WOD 761',
      label: 'Quoted',
    });
  });

  it('only removes matching wrapping quotes from metadata values', () => {
    const { meta } = parseFrontmatter(`---\ntitle: "Matched"\nsubtitle: "Mismatched'\n---\nBody\n`);
    expect(meta.title).toBe('Matched');
    expect(meta.subtitle).toBe(`"Mismatched'`);
  });

  it('handles flat nested keys', () => {
    const raw = '---\nbook.title: "Kettlebell Simple \u0026 Sinister"\n---\nContent';
    expect(parseFrontmatter(raw).meta).toEqual({
      'book.title': 'Kettlebell Simple \u0026 Sinister',
    });
  });

  it('keeps empty values as empty strings', () => {
    const raw = '---\nkey: value\nempty:\n---\nContent';
    expect(parseFrontmatter(raw).meta).toEqual({
      key: 'value',
      empty: '',
    });
  });

  it('parses numeric strings as numbers', () => {
    const raw = '---\norder: 1\ntitle: WOD\n---\nContent';
    expect(parseFrontmatter(raw).meta).toEqual({ order: 1, title: 'WOD' });
  });

  it('parses block lists as string arrays with case preserved', () => {
    const raw = '---\ncategory:\n  - Kettlebell\n  - strength\ntitle: WOD\n---\nContent';
    expect(parseFrontmatter(raw).meta).toEqual({
      category: ['Kettlebell', 'strength'],
      title: 'WOD',
    });
  });

  it('keeps inline [a, b] lists as plain scalar strings', () => {
    const raw = '---\ntags: [a, b]\n---\nContent';
    expect(parseFrontmatter(raw).meta).toEqual({ tags: '[a, b]' });
  });

  it('ignores indented nested-map lines', () => {
    const raw = '---\nbaseAttributes:\n  met: 4\nlabel: Squat\n---\nContent';
    expect(parseFrontmatter(raw).meta).toEqual({
      baseAttributes: '',
      label: 'Squat',
    });
  });

  it('returns empty meta and the raw body when no frontmatter', () => {
    const raw = 'Just plain content';
    expect(parseFrontmatter(raw)).toEqual({ meta: {}, body: raw });
  });

  it('handles CRLF line endings while preserving the body', () => {
    const raw = [
      '---',
      'title: "Quoted Title"',
      "subtitle: 'Quoted subtitle'",
      'order: 1',
      'empty:',
      '---',
      'Body',
      '',
    ].join('\r\n');
    const { meta, body } = parseFrontmatter(raw);

    expect(meta).toEqual({
      title: 'Quoted Title',
      subtitle: 'Quoted subtitle',
      order: 1,
      empty: '',
    });
    expect(body).toBe('Body\r\n');
  });
});

describe('stripFrontmatter', () => {
  it('strips leading YAML frontmatter from editor source content', () => {
    const raw = `---
search: hidden
title: Just a Movement
section: statement
order: 1
---
\`\`\`wod
Pushups
\`\`\`
`;

    expect(stripFrontmatter(raw)).toBe(`\`\`\`wod
Pushups
\`\`\`
`);
  });

  it('leaves content without leading frontmatter unchanged', () => {
    const raw = `\`\`\`wod
---
Pushups
---
\`\`\`
`;

    expect(stripFrontmatter(raw)).toBe(raw);
  });
});

describe('getScalar / getList', () => {
  const meta = parseFrontmatter('---\ntitle: WOD\norder: 2\ncategory:\n  - a\n  - b\n---\nBody').meta;

  it('getScalar returns string and number values', () => {
    expect(getScalar(meta, 'title')).toBe('WOD');
    expect(getScalar(meta, 'order')).toBe(2);
  });

  it('getScalar returns undefined for lists and absent keys', () => {
    expect(getScalar(meta, 'category')).toBeUndefined();
    expect(getScalar(meta, 'missing')).toBeUndefined();
  });

  it('getList returns lists and [] otherwise', () => {
    expect(getList(meta, 'category')).toEqual(['a', 'b']);
    expect(getList(meta, 'title')).toEqual([]);
    expect(getList(meta, 'missing')).toEqual([]);
  });
});

describe('parseFrontmatterCategories', () => {
  it('extracts category array from frontmatter', () => {
    const raw = '---\ncategory:\n  - kettlebell\n  - strength\n---\nContent';
    expect(parseFrontmatterCategories(raw)).toEqual(['kettlebell', 'strength']);
  });

  it('returns empty array when no category', () => {
    const raw = '---\ntitle: WOD\n---\nContent';
    expect(parseFrontmatterCategories(raw)).toEqual([]);
  });

  it('returns empty array when no frontmatter', () => {
    const raw = 'No frontmatter here';
    expect(parseFrontmatterCategories(raw)).toEqual([]);
  });

  it('stops at new top-level key', () => {
    const raw = '---\ncategory:\n  - kettlebell\ntitle: WOD\n  - strength\n---\nContent';
    expect(parseFrontmatterCategories(raw)).toEqual(['kettlebell']);
  });

  it('lowercases categories', () => {
    const raw = '---\ncategory:\n  - Kettlebell\n  - STRENGTH\n---\nContent';
    expect(parseFrontmatterCategories(raw)).toEqual(['kettlebell', 'strength']);
  });
});

describe('parseFlatProperties', () => {
  it('extracts key-value pairs from inner content', () => {
    const inner = 'type: youtube\nurl: https://youtu.be/abc123\ntitle: "My Video"';
    expect(parseFlatProperties(inner)).toEqual({
      type: 'youtube',
      url: 'https://youtu.be/abc123',
      title: '"My Video"',
    });
  });

  it('returns empty object for empty string', () => {
    expect(parseFlatProperties('')).toEqual({});
  });

  it('handles CRLF line endings', () => {
    const inner = 'type: youtube\r\nurl: https://youtu.be/abc123';
    expect(parseFlatProperties(inner)).toEqual({
      type: 'youtube',
      url: 'https://youtu.be/abc123',
    });
  });
});

describe('parseFrontmatterProps', () => {
  it('extracts key-value pairs from lines array', () => {
    const lines = ['type: youtube', 'url: https://youtu.be/abc123', 'title: "My Video"'];
    expect(parseFrontmatterProps(lines)).toEqual({
      type: 'youtube',
      url: 'https://youtu.be/abc123',
      title: '"My Video"',
    });
  });

  it('skips lines without colon', () => {
    const lines = ['type: youtube', 'no-colon-here', 'url: test'];
    expect(parseFrontmatterProps(lines)).toEqual({
      type: 'youtube',
      url: 'test',
    });
  });

  it('returns empty object for empty array', () => {
    expect(parseFrontmatterProps([])).toEqual({});
  });
});

describe('extractYouTubeVideoId', () => {
  it('extracts from standard youtube.com URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from short youtu.be URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeVideoId('https://example.com')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractYouTubeVideoId('')).toBeNull();
  });
});

describe('extractLinkWidgets', () => {
  it('extracts youtube widget', () => {
    const props = {
      type: 'youtube',
      url: 'https://youtu.be/dQw4w9WgXcQ',
      title: 'My Video',
    };
    expect(extractLinkWidgets(props)).toEqual([
      { kind: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ', label: 'My Video', videoId: 'dQw4w9WgXcQ' },
    ]);
  });

  it('extracts amazon widget', () => {
    const props = {
      type: 'amazon',
      url: 'https://amazon.com/dp/B08N5WRWNW',
      title: 'Kettlebell',
    };
    expect(extractLinkWidgets(props)).toEqual([
      { kind: 'amazon', url: 'https://amazon.com/dp/B08N5WRWNW', label: 'Kettlebell' },
    ]);
  });

  it('extracts source_url widget', () => {
    const props = {
      source_url: 'https://example.com/source',
    };
    expect(extractLinkWidgets(props)).toEqual([
      { kind: 'source', url: 'https://example.com/source', label: 'Source' },
    ]);
  });

  it('extracts website widget', () => {
    const props = {
      website: 'https://my-site.com',
    };
    expect(extractLinkWidgets(props)).toEqual([
      { kind: 'website', url: 'https://my-site.com', label: 'Website' },
    ]);
  });

  it('extracts book widget', () => {
    const props = {
      book: 'Kettlebell Simple \u0026 Sinister',
    };
    expect(extractLinkWidgets(props)).toEqual([
      { kind: 'book', label: 'Kettlebell Simple \u0026 Sinister' },
    ]);
  });

  it('returns empty array when no widgets match', () => {
    const props = {
      title: 'Just a title',
      difficulty: 'beginner',
    };
    expect(extractLinkWidgets(props)).toEqual([]);
  });

  it('extracts multiple widgets', () => {
    const props = {
      type: 'youtube',
      url: 'https://youtu.be/abc123',
      source_url: 'https://example.com',
      book: 'Some Book',
    };
    expect(extractLinkWidgets(props)).toEqual([
      { kind: 'youtube', url: 'https://youtu.be/abc123', label: '', videoId: 'abc123' },
      { kind: 'source', url: 'https://example.com', label: 'Source' },
      { kind: 'book', label: 'Some Book' },
    ]);
  });

  it('falls back to link when url is missing for youtube', () => {
    const props = {
      type: 'youtube',
      link: 'https://youtu.be/abc123',
    };
    expect(extractLinkWidgets(props)).toEqual([
      { kind: 'youtube', url: 'https://youtu.be/abc123', label: '', videoId: 'abc123' },
    ]);
  });
});
