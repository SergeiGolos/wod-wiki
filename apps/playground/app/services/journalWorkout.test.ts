import { describe, expect, it } from 'bun:test';
import { createJournalNoteFromWorkout } from './journalWorkout';

describe('createJournalNoteFromWorkout', () => {
  it('exports the UUID-first creation Module', () => {
    expect(typeof createJournalNoteFromWorkout).toBe('function');
  });
});
