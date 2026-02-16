import { IContentProvider, ContentProviderMode } from '../../types/content-provider';
import { HistoryEntry, ProviderCapabilities, EntryQuery } from '../../types/history';

/**
 * MockContentProvider
 * 
 * In-memory content provider for Storybook and tests.
 * Allows seeding with a specific set of entries.
 */
export class MockContentProvider implements IContentProvider {
    readonly mode: ContentProviderMode = 'static';

    readonly capabilities: ProviderCapabilities = {
        canWrite: true,
        canDelete: true,
        canFilter: true,
        canMultiSelect: true,
        supportsHistory: true
    };

    private entries: Map<string, HistoryEntry> = new Map();

    constructor(initialEntries: HistoryEntry[] = []) {
        initialEntries.forEach(entry => this.entries.set(entry.id, entry));
    }

    async getEntries(query?: EntryQuery): Promise<HistoryEntry[]> {
        let results = Array.from(this.entries.values());

        // Basic sorting by targetDate desc
        results.sort((a, b) => b.targetDate - a.targetDate);

        if (query?.limit) {
            results = results.slice(0, query.limit);
        }

        return results;
    }

    async getEntry(id: string): Promise<HistoryEntry | null> {
        return this.entries.get(id) || null;
    }

    async saveEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<HistoryEntry> {
        const id = crypto.randomUUID();
        const now = Date.now();

        const newEntry: HistoryEntry = {
            ...entry,
            id,
            createdAt: now,
            updatedAt: now,
            schemaVersion: 1
        };

        this.entries.set(id, newEntry);
        return newEntry;
    }

    async cloneEntry(sourceId: string, targetDate?: number): Promise<HistoryEntry> {
        const source = this.entries.get(sourceId);
        if (!source) throw new Error(`Entry ${sourceId} not found`);

        const id = crypto.randomUUID();
        const now = Date.now();

        const newEntry: HistoryEntry = {
            ...source,
            id,
            createdAt: now,
            updatedAt: now,
            targetDate: targetDate || now,
            results: undefined, // Don't clone results
            title: `${source.title} (Copy)`,
            clonedIds: [],
            templateId: source.id
        };

        this.entries.set(id, newEntry);

        // Update source clonedIds
        const updatedSource = {
            ...source,
            clonedIds: [...(source.clonedIds || []), id]
        }
        this.entries.set(sourceId, updatedSource);

        return newEntry;
    }

    async updateEntry(id: string, patch: any): Promise<HistoryEntry> {
        const entry = this.entries.get(id);
        if (!entry) throw new Error(`Entry ${id} not found`);

        const updatedEntry = {
            ...entry,
            ...patch,
            updatedAt: Date.now()
        };

        this.entries.set(id, updatedEntry);
        return updatedEntry;
    }

    async deleteEntry(id: string): Promise<void> {
        this.entries.delete(id);
    }
}
