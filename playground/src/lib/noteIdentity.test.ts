import { describe, expect, it } from 'bun:test';
import { parseNoteId, noteRefToPath } from './noteIdentity';
import { journalEntryPath, playgroundPath, workoutPath } from './routes';

describe('parseNoteId', () => {
  it('parses a journal noteId', () => {
    expect(parseNoteId('journal/2026-06-20')).toEqual({
      kind: 'journal',
      id: '2026-06-20',
      raw: 'journal/2026-06-20',
    });
  });

  it('parses a playground noteId', () => {
    expect(parseNoteId('playground/my-note')).toEqual({
      kind: 'playground',
      id: 'my-note',
      raw: 'playground/my-note',
    });
  });

  it('parses a collection noteId as the workout catch-all', () => {
    expect(parseNoteId('crossfit-girls/fran')).toEqual({
      kind: 'workout',
      category: 'crossfit-girls',
      id: 'fran',
      raw: 'crossfit-girls/fran',
    });
  });

  it('parses an effort noteId as the workout catch-all', () => {
    expect(parseNoteId('effort/fran-slug')).toEqual({
      kind: 'workout',
      category: 'effort',
      id: 'fran-slug',
      raw: 'effort/fran-slug',
    });
  });

  it('falls back to workout with no category for a bare id', () => {
    expect(parseNoteId('bare')).toEqual({ kind: 'workout', id: 'bare', raw: 'bare' });
  });

  it('preserves the original string as raw (storage-key invariant)', () => {
    for (const noteId of ['journal/2026-06-20', 'feed/slug/2026-06-20/item', 'x']) {
      expect(parseNoteId(noteId).raw).toBe(noteId);
    }
  });
});

describe('noteRefToPath', () => {
  it('routes journal → /journal/:id', () => {
    expect(noteRefToPath(parseNoteId('journal/2026-06-20'))).toBe(journalEntryPath('2026-06-20'));
  });

  it('routes playground → /playground/:id', () => {
    expect(noteRefToPath(parseNoteId('playground/my-note'))).toBe(playgroundPath('my-note'));
  });

  it('routes a workout id → /collections/:cat/:name', () => {
    expect(noteRefToPath(parseNoteId('crossfit-girls/fran'))).toBe(workoutPath('crossfit-girls', 'fran'));
  });

  it('routes a bare id → / (preserves the prior fallback)', () => {
    expect(noteRefToPath(parseNoteId('bare'))).toBe('/');
  });
});
