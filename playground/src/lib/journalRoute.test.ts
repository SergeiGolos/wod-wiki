import { describe, expect, it } from 'bun:test';
import { resolveJournalRoute } from './journalRoute';

describe('resolveJournalRoute', () => {
  it('distinguishes the index, date group, canonical Note, UUID alias, and slug alias', () => {
    expect(resolveJournalRoute('/journal')).toEqual({ kind: 'index' });
    expect(resolveJournalRoute('/journal/2026-07-13/')).toEqual({ kind: 'date', journalDate: '2026-07-13' });
    expect(resolveJournalRoute('/journal/2026-07-13/550e8400-e29b-41d4-a716-446655440000')).toEqual({
      kind: 'note',
      journalDate: '2026-07-13',
      noteId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(resolveJournalRoute('/journal/550e8400-e29b-41d4-a716-446655440000')).toEqual({
      kind: 'uuid-alias',
      noteId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(resolveJournalRoute('/journal/my-fran')).toEqual({ kind: 'slug-alias', slug: 'my-fran' });
  });

  it('rejects malformed date and extra path segments', () => {
    expect(resolveJournalRoute('/journal/2026-02-31')).toEqual({ kind: 'slug-alias', slug: '2026-02-31' });
    expect(resolveJournalRoute('/journal/2026-07-13/not-a-uuid')).toEqual({ kind: 'invalid' });
    expect(resolveJournalRoute('/journal/a/b/c')).toEqual({ kind: 'invalid' });
  });
});
