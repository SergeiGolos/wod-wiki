import { describe, expect, it } from 'bun:test';

/**
 * Unit tests for wod-feeds.ts helper functions
 *
 * Tests cover:
 * - Frontmatter parsing with various formats
 * - Display name conversion from slugs
 * - Filename to display name conversion
 * - Date key extraction and sorting
 * - Edge cases (empty inputs, malformed data, etc.)
 *
 * Note: getWodFeeds(), getWodFeed(), and getWodFeedItem() depend on
 * import.meta.glob which requires Vite build context. The helper functions
 * below are replicated here for unit testing since they contain important
 * business logic.
 */

// Helper functions replicated from wod-feeds.ts for unit testing
function parseFrontmatterCategories(raw: string): string[] {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [];

  const lines = match[1].split('\n');
  let inCategory = false;
  const categories: string[] = [];

  for (const line of lines) {
    if (/^category\s*:/.test(line)) {
      inCategory = true;
      continue;
    }
    if (inCategory) {
      const item = line.match(/^\s+-\s+(.+)$/);
      if (item) {
        categories.push(item[1].trim().toLowerCase());
      } else if (/^\S/.test(line)) {
        break;
      }
    }
  }

  return categories;
}

function toDisplayName(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function fileToDisplayName(filename: string): string {
  const base = filename.replace(/\.md$/, '');
  if (base.toUpperCase() === 'README') return 'Overview';
  const cleaned = base.replace(/^day-\d+-/, '');
  return cleaned
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getFeedDateKeys(feed: { items: { feedDate: string }[] }): string[] {
  return Array.from(new Set(feed.items.map(i => i.feedDate))).sort().reverse();
}

describe('parseFrontmatterCategories', () => {
  it('should parse categories from YAML front matter with list format', () => {
    const input = `---
category:
  - crossfit
  - conditioning
---
# Content`;
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual(['crossfit', 'conditioning']);
  });

  it('should return empty array when no front matter exists', () => {
    const input = '# Just content\n\nNo front matter here.';
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual([]);
  });

  it('should return empty array when front matter has no category field', () => {
    const input = `---
title: Some Title
date: 2024-01-15
---
# Content`;
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual([]);
  });

  it('should handle single category without list syntax', () => {
    const input = `---
category: crossfit
---
# Content`;
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual([]);
  });

  it('should handle categories with mixed case and convert to lowercase', () => {
    const input = `---
category:
  - CrossFit
  - CONDITIONING
---
# Content`;
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual(['crossfit', 'conditioning']);
  });

  it('should handle categories with extra whitespace', () => {
    const input = `---
category:
  -  crossfit
  - conditioning
---
# Content`;
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual(['crossfit', 'conditioning']);
  });

  it('should stop parsing categories when encountering a new top-level field', () => {
    const input = `---
category:
  - crossfit
  - conditioning
title: Some Title
---
# Content`;
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual(['crossfit', 'conditioning']);
  });

  it('should handle empty category list', () => {
    const input = `---
category:
---
# Content`;
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual([]);
  });

  it('should handle front matter with Windows line endings (\\r\\n)', () => {
    const input = `---\r\ncategory:\r\n  - crossfit\r\n---\r\n# Content`;
    const result = parseFrontmatterCategories(input);
    expect(result).toEqual(['crossfit']);
  });
});

describe('toDisplayName', () => {
  it('should convert hyphen-separated slug to title case', () => {
    expect(toDisplayName('crossfit-programming')).toBe('Crossfit Programming');
  });

  it('should convert underscore-separated slug to title case', () => {
    expect(toDisplayName('olympic_lifting')).toBe('Olympic Lifting');
  });

  it('should convert mixed hyphen and underscore separators', () => {
    expect(toDisplayName('strength-conditioning_wod')).toBe('Strength Conditioning Wod');
  });

  it('should handle single word', () => {
    expect(toDisplayName('gymnastics')).toBe('Gymnastics');
  });

  it('should handle multiple consecutive hyphens', () => {
    expect(toDisplayName('strength--conditioning')).toBe('Strength Conditioning');
  });

  it('should handle leading and trailing hyphens', () => {
    expect(toDisplayName('-strength-conditioning-')).toBe('Strength Conditioning');
  });

  it('should handle empty string', () => {
    expect(toDisplayName('')).toBe('');
  });

  it('should handle spaces as separators', () => {
    expect(toDisplayName('strength conditioning wod')).toBe('Strength Conditioning Wod');
  });

  it('should capitalize each word correctly', () => {
    expect(toDisplayName('the-quick-brown-fox')).toBe('The Quick Brown Fox');
  });

  it('should handle single character words', () => {
    expect(toDisplayName('a-b-c')).toBe('A B C');
  });
});

describe('fileToDisplayName', () => {
  it('should convert markdown filename to display name', () => {
    expect(fileToDisplayName('monday-strength.md')).toBe('Monday Strength');
  });

  it('should convert README.md to Overview', () => {
    expect(fileToDisplayName('README.md')).toBe('Overview');
  });

  it('should handle readme.md (case insensitive)', () => {
    expect(fileToDisplayName('readme.md')).toBe('Overview');
  });

  it('should handle README in uppercase', () => {
    expect(fileToDisplayName('README')).toBe('Overview');
  });

  it('should strip day prefix from filename', () => {
    expect(fileToDisplayName('day-01-warmup.md')).toBe('Warmup');
    expect(fileToDisplayName('day-12-strength.md')).toBe('Strength');
  });

  it('should strip day prefix even when it leaves an empty string', () => {
    expect(fileToDisplayName('day-01-.md')).toBe('');
  });

  it('should handle filename without extension', () => {
    expect(fileToDisplayName('monday-strength')).toBe('Monday Strength');
  });

  it('should handle single word filename', () => {
    expect(fileToDisplayName('warmup.md')).toBe('Warmup');
  });

  it('should handle filename with multiple hyphens', () => {
    expect(fileToDisplayName('morning-strength-wod.md')).toBe('Morning Strength Wod');
  });

  it('should handle underscore separators in filename', () => {
    expect(fileToDisplayName('morning_strength_wod.md')).toBe('Morning Strength Wod');
  });

  it('should handle two-digit day numbers', () => {
    expect(fileToDisplayName('day-10-warmup.md')).toBe('Warmup');
    expect(fileToDisplayName('day-31-workout.md')).toBe('Workout');
  });
});

describe('getFeedDateKeys', () => {
  it('should return empty array for feed with no items', () => {
    const feed = { items: [] };
    const dates = getFeedDateKeys(feed);
    expect(dates).toEqual([]);
  });

  it('should return single date for feed with one item', () => {
    const feed = {
      items: [{ feedDate: '2024-01-15' }],
    };
    const dates = getFeedDateKeys(feed);
    expect(dates).toEqual(['2024-01-15']);
  });

  it('should return unique dates when multiple items share same date', () => {
    const feed = {
      items: [
        { feedDate: '2024-01-15' },
        { feedDate: '2024-01-15' },
        { feedDate: '2024-01-15' },
      ],
    };
    const dates = getFeedDateKeys(feed);
    expect(dates).toEqual(['2024-01-15']);
  });

  it('should return dates sorted in descending order (most recent first)', () => {
    const feed = {
      items: [
        { feedDate: '2024-01-10' },
        { feedDate: '2024-01-20' },
        { feedDate: '2024-01-15' },
      ],
    };
    const dates = getFeedDateKeys(feed);
    expect(dates).toEqual(['2024-01-20', '2024-01-15', '2024-01-10']);
  });

  it('should return all unique dates for multiple items across different dates', () => {
    const feed = {
      items: [
        { feedDate: '2024-01-10' },
        { feedDate: '2024-01-15' },
        { feedDate: '2024-01-20' },
      ],
    };
    const dates = getFeedDateKeys(feed);
    expect(dates).toHaveLength(3);
    expect(dates).toContain('2024-01-10');
    expect(dates).toContain('2024-01-15');
    expect(dates).toContain('2024-01-20');
  });

  it('should handle dates from different months and years', () => {
    const feed = {
      items: [
        { feedDate: '2023-12-31' },
        { feedDate: '2024-01-01' },
        { feedDate: '2024-12-31' },
      ],
    };
    const dates = getFeedDateKeys(feed);
    expect(dates).toEqual(['2024-12-31', '2024-01-01', '2023-12-31']);
  });

  it('should maintain date string format (YYYY-MM-DD)', () => {
    const feed = {
      items: [{ feedDate: '2024-01-01' }],
    };
    const dates = getFeedDateKeys(feed);
    expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
