import { describe, it, expect } from 'bun:test';
import {
  parseFrontmatter,
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
      Difficulty: 'beginner',
      Category: 'Cardio',
    });
  });

  it('strips surrounding quotes from values', () => {
    const raw = '---\ntitle: "WOD 761"\nlabel: \'Quoted\'\n---\nContent';
    expect(parseFrontmatter(raw)).toEqual({
      title: 'WOD 761',
      label: 'Quoted',
    });
  });

  it('handles flat nested keys', () => {
    const raw = '---\nbook.title: "Kettlebell Simple \u0026 Sinister"\n---\nContent';
    expect(parseFrontmatter(raw)).toEqual({
      'book.title': 'Kettlebell Simple \u0026 Sinister',
    });
  });

  it('skips empty values', () => {
    const raw = '---\nkey: value\nempty:\n---\nContent';
    expect(parseFrontmatter(raw)).toEqual({
      key: 'value',
    });
  });

  it('returns empty object when no frontmatter', () => {
    const raw = 'Just plain content';
    expect(parseFrontmatter(raw)).toEqual({});
  });

  it('handles empty frontmatter block', () => {
    const raw = '---\n---\nContent';
    expect(parseFrontmatter(raw)).toEqual({});
  });

  it('ignores array lines', () => {
    const raw = '---\ncategory:\n  - kettlebell\n  - strength\ntitle: WOD\n---\nContent';
    expect(parseFrontmatter(raw)).toEqual({
      title: 'WOD',
    });
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
