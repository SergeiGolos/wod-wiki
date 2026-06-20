import { describe, it, expect } from 'bun:test';
import { noteToMarkdown } from './NoteMarkdownSerializer';
import { frozenNow } from '@/runtime/INowProvider';
import type { HistoryEntry } from '@/types/history';

describe('noteToMarkdown', () => {
    const fixedDate = new Date('2025-06-01T12:00:00.000Z');
    const clock = frozenNow(fixedDate);
    const ts = fixedDate.getTime();

    const baseEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
        id: 'entry-1',
        title: 'Test Entry',
        createdAt: ts,
        updatedAt: ts,
        targetDate: ts,
        rawContent: 'Some workout content.',
        tags: ['tag1', 'tag2'],
        schemaVersion: 1,
        ...overrides,
    });

    it('serializes a basic entry to markdown with all sections', () => {
        const entry = baseEntry();
        const md = noteToMarkdown(entry, clock);
        expect(md).toContain('# Test Entry');
        expect(md).toContain('## Metadata');
        expect(md).toContain('- **ID**: entry-1');
        expect(md).toContain(`- **Created**: ${fixedDate.toISOString()}`);
        expect(md).toContain(`- **Updated**: ${fixedDate.toISOString()}`);
        expect(md).toContain(`- **Target Date**: ${fixedDate.toISOString()}`);
        expect(md).toContain('- **Tags**: tag1, tag2');
        expect(md).toContain('## Content');
        expect(md).toContain('Some workout content.');
    });

    it('includes Cloned From line when templateId is present', () => {
        const entry = baseEntry({ templateId: 'template-abc' });
        const md = noteToMarkdown(entry, clock);
        expect(md).toContain('- **Cloned From**: template-abc');
    });

    it('includes Cloned To line when clonedIds are present', () => {
        const entry = baseEntry({ clonedIds: ['clone-1', 'clone-2'] });
        const md = noteToMarkdown(entry, clock);
        expect(md).toContain('- **Cloned To**: clone-1, clone-2');
    });

    it('shows None when entry has no tags', () => {
        const entry = baseEntry({ tags: [] });
        const md = noteToMarkdown(entry, clock);
        expect(md).toContain('- **Tags**: None');
    });

    it('round-trips key fields through markdown', () => {
        const entry = baseEntry({
            title: 'Round Trip Test',
            id: 'rt-123',
            templateId: 'orig-456',
            clonedIds: ['c1', 'c2'],
            rawContent: 'Original content here.',
        });
        const md = noteToMarkdown(entry, clock);
        expect(md).toContain('# Round Trip Test');
        expect(md).toContain('- **ID**: rt-123');
        expect(md).toContain('- **Cloned From**: orig-456');
        expect(md).toContain('- **Cloned To**: c1, c2');
        expect(md).toContain('Original content here.');
    });
});
