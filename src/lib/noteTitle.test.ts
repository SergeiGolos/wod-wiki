import { describe, expect, it } from 'bun:test';
import { normalizeNoteTitle } from './noteTitle';

describe('normalizeNoteTitle', () => {
    it('strips leading Markdown heading markers', () => {
        expect(normalizeNoteTitle('# Welcome workout')).toBe('Welcome workout');
        expect(normalizeNoteTitle('## Warm-up run')).toBe('Warm-up run');
    });

    it('leaves clean titles unchanged', () => {
        expect(normalizeNoteTitle('Fran')).toBe('Fran');
        expect(normalizeNoteTitle('Heavy squat day')).toBe('Heavy squat day');
    });

    it('returns an empty string for blank or whitespace-only titles', () => {
        expect(normalizeNoteTitle('')).toBe('');
        expect(normalizeNoteTitle('   ')).toBe('');
        expect(normalizeNoteTitle(null)).toBe('');
        expect(normalizeNoteTitle(undefined)).toBe('');
    });

    it('does not strip hashes without following whitespace', () => {
        expect(normalizeNoteTitle('#hashtag')).toBe('#hashtag');
    });
});
