/**
 * IndexedDBContentProvider
 * 
 * Implements IContentProvider using IndexedDB as the backing store.
 * Manages the Note -> Script -> Version hierarchy.
 */

import { v4 as uuidv4 } from 'uuid';
import { toShortId } from '../../lib/idUtils';
import type { IContentProvider, ContentProviderMode } from '../../types/content-provider';
import type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';
import { indexedDBService } from '../db/IndexedDBService';
import { Note, Script, WorkoutResult } from '../../types/storage';

export class IndexedDBContentProvider implements IContentProvider {
    readonly mode: ContentProviderMode = 'history';
    readonly capabilities: ProviderCapabilities = {
        canWrite: true,
        canDelete: true,
        canFilter: true,
        canMultiSelect: true,
        supportsHistory: true,
    };

    async getEntries(query?: EntryQuery): Promise<HistoryEntry[]> {
        const notes = await indexedDBService.getAllNotes();
        // const entries: HistoryEntry[] = []; // Removed unused variable

        // Convert Notes to HistoryEntries
        // Note: This is N+1 if we fetch scripts for every note. 
        // Optimization: For the list view, we might only need Note metadata + maybe a snippet.
        // For now, to match the interface, we'll try to get the latest script for each.

        // We can do this in parallel
        const entryPromises = notes.map(async (note) => {
            const latestScript = await indexedDBService.getLatestScriptForNote(note.id);
            if (!latestScript) return null; // Should not happen for valid notes

            // Get results context if needed (omitted for speed in list view usually)

            return {
                id: note.id,
                title: note.title,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                rawContent: latestScript.content, // Show latest content
                tags: note.tags,
                schemaVersion: 1,
                // Results are typically loaded on demand or summarized. 
                // ex: results: ... (fetch if query requires it)
            } as HistoryEntry;
        });

        const resolved = (await Promise.all(entryPromises)).filter((e): e is HistoryEntry => e !== null);

        // Client-side filtering (IndexedDB indexes are used for getAll, but complex filtering is here)
        let filtered = resolved;

        if (query) {
            if (query.tags && query.tags.length > 0) {
                filtered = filtered.filter(e => query.tags!.every(t => e.tags.includes(t)));
            }
            // Date range, etc.
        }

        // Sort by updated desc
        filtered.sort((a, b) => b.updatedAt - a.updatedAt);

        return filtered;
    }

    async getEntry(id: string): Promise<HistoryEntry | null> {
        let note = await indexedDBService.getNote(id);

        // Resolution fallback (for short IDs or titles passed from URL)
        if (!note) {
            const allNotes = await indexedDBService.getAllNotes();
            const resolved = allNotes.find((n: Note) => toShortId(n.id) === id || n.title.toLowerCase() === id.toLowerCase());
            note = resolved || undefined;
        }

        if (!note) return null;

        const latestScript = await indexedDBService.getLatestScriptForNote(note.id);
        if (!latestScript) return null;

        // TODO: Load results for this note/script if needed
        // const results = await indexedDBService.getResultsForNote(note.id);

        return {
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            rawContent: latestScript.content,
            tags: note.tags,
            schemaVersion: 1,
            // results: ...
        };
    }

    async saveEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<HistoryEntry> {
        // This is typically "Create New" or "Save as New" from the UI perspective for a totally new note
        // BUT the UI might call this for an existing note if it doesn't pass ID? 
        // The type definition implies ID is optional aka 'create'.

        const noteId = uuidv4();
        const now = Date.now();

        const note: Note = {
            id: noteId,
            title: entry.title,
            rawContent: entry.rawContent, // Draft/Latest
            tags: entry.tags,
            createdAt: now,
            updatedAt: now
        };

        const script: Script = {
            id: uuidv4(),
            noteId: noteId,
            content: entry.rawContent,
            versionHash: this.hashContent(entry.rawContent),
            createdAt: now
        };

        await indexedDBService.saveNote(note);
        await indexedDBService.saveScript(script);

        return {
            ...entry,
            id: noteId,
            createdAt: now,
            updatedAt: now,
            schemaVersion: 1
        };
    }

    async updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title'>>): Promise<HistoryEntry> {
        let note = await indexedDBService.getNote(id);

        // Resolution fallback (for short IDs or titles passed from URL)
        if (!note) {
            const allNotes = await indexedDBService.getAllNotes();
            const resolved = allNotes.find((n: Note) => toShortId(n.id) === id || n.title.toLowerCase() === id.toLowerCase());
            note = resolved || undefined;
        }

        if (!note) throw new Error(`Note not found: ${id}`);

        const now = Date.now();
        let latestScript = await indexedDBService.getLatestScriptForNote(id);

        // Update Note Metadata
        if (patch.title) note.title = patch.title;
        if (patch.tags) note.tags = patch.tags;

        // Handle Content Changes (Versioning)
        if (patch.rawContent !== undefined) {
            note.rawContent = patch.rawContent; // Update current draft state

            const newHash = this.hashContent(patch.rawContent);

            // Strict Versioning: If hash is different from LATEST script, create new script.
            // Debounce logic in UI prevents this from happening on every keystroke.
            if (!latestScript || latestScript.versionHash !== newHash) {
                const newScript: Script = {
                    id: uuidv4(),
                    noteId: id,
                    content: patch.rawContent,
                    versionHash: newHash,
                    createdAt: now
                };
                await indexedDBService.saveScript(newScript);
                latestScript = newScript;
            }
        }

        // Handle Results Saving
        if (patch.results) {
            // Ensure we have a script to link to
            if (!latestScript) {
                // Fallback: If no script exists yet (rare, but possible if note was just created empty?), create one
                const content = patch.rawContent || note.rawContent || '';
                latestScript = {
                    id: uuidv4(),
                    noteId: id,
                    content: content,
                    versionHash: this.hashContent(content),
                    createdAt: now
                };
                await indexedDBService.saveScript(latestScript);
            }

            const resultData = patch.results;
            const newResult: WorkoutResult = {
                id: uuidv4(),
                scriptId: latestScript.id,
                noteId: id,
                data: resultData, // Now compatible due to HistoryEntry update
                completedAt: resultData.endTime || now // Use endTime from results or now
            };
            await indexedDBService.saveResult(newResult);
        }

        note.updatedAt = now;
        await indexedDBService.saveNote(note);

        return {
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            rawContent: latestScript ? latestScript.content : note.rawContent,
            tags: note.tags,
            schemaVersion: 1
        };
    }

    async deleteEntry(id: string): Promise<void> {
        await indexedDBService.deleteNote(id);
    }

    // Helper
    private hashContent(content: string): string {
        // Simple robust hash for string content
        const len = content.length;
        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (let i = 0; i < len; i++) {
            let ch = content.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }
}
