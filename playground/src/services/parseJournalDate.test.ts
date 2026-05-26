import { describe, expect, it } from 'bun:test';
import { parseJournalDate } from './parseJournalDate';

describe('parseJournalDate', () => {
  it('parses valid YYYY-MM-DD dates', () => {
    const result = parseJournalDate('2024-06-15');

    expect(result).not.toBeNull();
    expect(result?.dateKey).toBe('2024-06-15');
    expect(result?.date.getFullYear()).toBe(2024);
    expect(result?.date.getMonth()).toBe(5);
    expect(result?.date.getDate()).toBe(15);
  });

  it('returns null for malformed input', () => {
    expect(parseJournalDate('06-15-2024')).toBeNull();
    expect(parseJournalDate('not-a-date')).toBeNull();
    expect(parseJournalDate('2024-6-15')).toBeNull();
  });

  it('returns null for impossible calendar dates', () => {
    expect(parseJournalDate('2024-02-30')).toBeNull();
    expect(parseJournalDate('2023-04-31')).toBeNull();
  });
});
