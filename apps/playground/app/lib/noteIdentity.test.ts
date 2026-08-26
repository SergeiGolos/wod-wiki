import { describe, expect, it } from 'bun:test';
import { parseNoteId } from '@/lib/noteIdentity';
import { noteRefToPath } from './noteIdentity';
import { journalEntryPath, playgroundPath, workoutPath } from './routes';

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
