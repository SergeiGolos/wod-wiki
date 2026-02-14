import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalStorageContentProvider } from '../LocalStorageContentProvider';
import { HistoryEntry } from '../../../types/history';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        key: (i: number) => Object.keys(store)[i] || null,
        get length() { return Object.keys(store).length; },
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Note Management', () => {
    let provider: LocalStorageContentProvider;

    beforeEach(() => {
        localStorage.clear();
        provider = new LocalStorageContentProvider();
    });

    it('should save a template entry', async () => {
        const entry = await provider.saveEntry({
            title: 'My Template',
            rawContent: '# Template',
            tags: ['template'],
            type: 'template',
            blocks: [], // Legacy field from test mock if needed, or update provider to not need it
            // Note: provider expects Omit<..., 'blocks' | 'sections'>... wait, let's check input type
            // The input type is Omit<HistoryEntry, ...> & { ... }
            // HistoryEntry has sections, optional blocks (deprecated/removed from my interface?)
            // Start again: HistoryEntry has sections.
            sections: [],
        } as any); // cast for simplicity if types mismatch in test setup

        expect(entry.type).toBe('template');
        expect(entry.id).toBeDefined();

        const fetched = await provider.getEntry(entry.id);
        expect(fetched?.type).toBe('template');
    });

    it('should clone a template into a note', async () => {
        // 1. Create Template
        const template = await provider.saveEntry({
            title: 'Benchmark WOD',
            rawContent: '21-15-9',
            tags: ['benchmark'],
            type: 'template',
            sections: [],
        } as any);

        // 2. Clone it
        const cloned = await provider.cloneEntry(template.id);

        // 3. Verify Clone
        expect(cloned.id).not.toBe(template.id);
        expect(cloned.templateId).toBe(template.id);
        expect(cloned.type).toBe('note');
        expect(cloned.title).toBe('Benchmark WOD'); // Title preserved
        expect(cloned.rawContent).toBe('21-15-9');

        // Verify it's effectively "Open" (today's date)
        const isToday = new Date(cloned.targetDate).toDateString() === new Date().toDateString();
        expect(isToday).toBe(true);
    });

    it('should clone a note into another note', async () => {
        // 1. Create Note
        const source = await provider.saveEntry({
            title: 'Yesterday Run',
            rawContent: 'Run 5k',
            tags: [],
            type: 'note',
            targetDate: Date.now() - 86400000, // Yesterday
            sections: [],
        } as any);

        // 2. Clone it
        const cloned = await provider.cloneEntry(source.id);

        // 3. Verify Clone
        expect(cloned.templateId).toBe(source.id);
        expect(cloned.type).toBe('note');
        // Should be today
        expect(new Date(cloned.targetDate).toDateString()).toBe(new Date().toDateString());
    });
});
