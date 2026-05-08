import type { AttachmentCreateInput, IContentProvider, ContentProviderMode } from '../../types/content-provider';
import { v4 as uuidv4 } from 'uuid';
import { HistoryEntry, ProviderCapabilities, EntryQuery } from '../../types/history';
import { Attachment } from '../../types/storage';

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
    private attachments: Map<string, Attachment[]> = new Map();

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
        const id = uuidv4();
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

        const id = uuidv4();
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

    // --- Attachments ---

    async getAttachments(noteId: string): Promise<Attachment[]> {
        return this.attachments.get(noteId) || [];
    }

    async saveAttachment(noteId: string, attachment: AttachmentCreateInput): Promise<Attachment> {
        const id = attachment.id ?? uuidv4();
        const now = Date.now();
        const fullAttachment: Attachment = {
            ...attachment,
            id,
            noteId,
            createdAt: now,
        } as Attachment;

        const current = this.attachments.get(noteId) || [];
        this.attachments.set(noteId, [...current, fullAttachment]);
        
        return fullAttachment;
    }

    async deleteAttachment(id: string): Promise<void> {
        for (const [noteId, atts] of this.attachments.entries()) {
            if (atts.some(a => a.id === id)) {
                this.attachments.set(noteId, atts.filter(a => a.id !== id));
                break;
            }
        }
    }
}
