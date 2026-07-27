import { formatDateKey } from './dateUtils';

export interface ParsedJournalDate {
  dateKey: string;
  date: Date;
}

/**
 * Parse and validate a journal route date in YYYY-MM-DD format.
 * Returns null for malformed or impossible calendar dates.
 */
export function parseJournalDate(dateString: string): ParsedJournalDate | null {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(year, month, day);
  const dateKey = formatDateKey(date);

  if (dateKey !== dateString) return null;

  return { dateKey, date };
}
