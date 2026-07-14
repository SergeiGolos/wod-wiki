import { parseJournalDate } from '../services/parseJournalDate';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type JournalRoute =
  | { kind: 'index' }
  | { kind: 'date'; journalDate: string }
  | { kind: 'note'; journalDate: string; noteId: string }
  | { kind: 'uuid-alias'; noteId: string }
  | { kind: 'slug-alias'; slug: string }
  | { kind: 'invalid' };

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function isValidJournalDate(value: string): boolean {
  if (!parseJournalDate(value)) return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3]);
}

export function resolveJournalRoute(pathname: string): JournalRoute {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (normalized === '/journal') return { kind: 'index' };
  if (!normalized.startsWith('/journal/')) return { kind: 'invalid' };

  const encodedSegments = normalized.slice('/journal/'.length).split('/');
  const segments = encodedSegments.map(decodeSegment);
  if (segments.some(segment => segment == null)) return { kind: 'invalid' };
  const values = segments as string[];

  if (values.length === 1) {
    const value = values[0];
    if (isValidJournalDate(value)) return { kind: 'date', journalDate: value };
    if (UUID_PATTERN.test(value)) return { kind: 'uuid-alias', noteId: value };
    return value ? { kind: 'slug-alias', slug: value } : { kind: 'invalid' };
  }

  if (values.length === 2) {
    const [journalDate, noteId] = values;
    if (isValidJournalDate(journalDate) && UUID_PATTERN.test(noteId)) {
      return { kind: 'note', journalDate, noteId };
    }
  }

  return { kind: 'invalid' };
}

export function journalDatePath(journalDate: string): string {
  return `/journal/${encodeURIComponent(journalDate)}/`;
}

export function journalNotePath(journalDate: string, noteId: string): string {
  return `/journal/${encodeURIComponent(journalDate)}/${encodeURIComponent(noteId)}`;
}
