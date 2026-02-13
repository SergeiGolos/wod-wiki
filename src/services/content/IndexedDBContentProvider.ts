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
import { Note, WorkoutResult, SectionHistory } from '../../types/storage';
import { parseDocumentSections } from '../../markdown-editor/utils/sectionParser';
import { Section } from '../../markdown-editor/types/section';

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
                targetDate: note.targetDate || note.createdAt,
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

        // Sort by targetDate desc
        filtered.sort((a, b) => b.targetDate - a.targetDate);

        return filtered;
    }

    async getEntry(id: string): Promise<HistoryEntry | null> {
        let note = await indexedDBService.getNote(id);

        if (!note) {
            const allNotes = await indexedDBService.getAllNotes();
            const resolved = allNotes.find((n: Note) => toShortId(n.id) === id || n.title.toLowerCase() === id.toLowerCase());
            note = resolved || undefined;
        }

        if (!note) return null;

        let rawContent = '';
        let segments: SectionHistory[] = [];
        if (note.segmentIds && note.segmentIds.length > 0) {
            // Reconstruct from segments
            const fetchedSegments = await indexedDBService.getLatestSegments(note.segmentIds);
            // Sort segments according to segmentIds order
            segments = note.segmentIds.map(sid => fetchedSegments.find(s => s.sectionId === sid)).filter((s): s is SectionHistory => !!s);

            // Rebuild rawContent
            rawContent = segments.map(s => {
                if (s.type === 'wod') return `\`\`\`wod\n${s.content}\n\`\`\``;
                if (s.type === 'heading') {
                    const prefix = '#'.repeat(s.level || 1);
                    return `${prefix} ${s.content}`;
                }
                return s.content;
            }).join('\n\n');
        } else {
            // Legacy Note (no segmentIds) — fallback to script storage
            const latestScript = await indexedDBService.getLatestScriptForNote(note.id);
            if (latestScript) {
                rawContent = latestScript.content;
            } else {
                rawContent = note.rawContent || '';
            }
        }

        // Map SectionHistory to Section types for the editor
        const sections: Section[] = segments.map(s => ({
            id: s.sectionId,
            type: s.type,
            rawContent: s.type === 'wod' ? `\`\`\`wod\n${s.content}\n\`\`\`` : (s.type === 'heading' ? `${'#'.repeat(s.level || 1)} ${s.content}` : s.content),
            displayContent: s.content,
            level: s.level,
            wodBlock: s.wodBlock,
            version: s.version,
            createdAt: s.timestamp,
            // lines will be recomputed by the hook
            startLine: 0,
            endLine: 0,
            lineCount: 0
        }));

        return {
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            targetDate: note.targetDate || note.createdAt,
            rawContent,
            sections,
            tags: note.tags,
            schemaVersion: 1,
        };
    }

    async saveEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<HistoryEntry> {
        const noteId = uuidv4();
        const now = Date.now();

        // TRANSITION TO SEGMENTS
        const sections = parseDocumentSections(entry.rawContent);
        const segmentIds: string[] = [];

        for (const section of sections) {
            const segment: SectionHistory = {
                sectionId: section.id,
                version: 1,
                noteId: noteId,
                content: section.displayContent,
                type: section.type,
                level: section.level,
                wodBlock: section.wodBlock,
                timestamp: now
            };
            await indexedDBService.saveSectionHistory(segment);
            segmentIds.push(section.id);
        }

        const note: Note = {
            id: noteId,
            title: entry.title,
            rawContent: entry.rawContent,
            tags: entry.tags,
            createdAt: now,
            updatedAt: now,
            targetDate: entry.targetDate || now,
            segmentIds
        };

        await indexedDBService.saveNote(note);

        return {
            ...entry,
            id: noteId,
            createdAt: now,
            updatedAt: now,
            targetDate: entry.targetDate || now,
            schemaVersion: 1
        };
    }

    async updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title'>>): Promise<HistoryEntry> {
        let note = await indexedDBService.getNote(id);

        if (!note) {
            const allNotes = await indexedDBService.getAllNotes();
            const resolved = allNotes.find((n: Note) => toShortId(n.id) === id || n.title.toLowerCase() === id.toLowerCase());
            note = resolved || undefined;
        }

        if (!note) throw new Error(`Note not found: ${id}`);

        const now = Date.now();

        // Update Metadata
        if (patch.title) note.title = patch.title;
        if (patch.tags) note.tags = patch.tags;

        let finalRawContent = note.rawContent;

        if (patch.rawContent !== undefined) {
            finalRawContent = patch.rawContent;

            // TRANSITION TO SEGMENTS
            // Parse into sections to identify units
            const sections = parseDocumentSections(patch.rawContent);
            const newSegmentIds: string[] = [];

            // Fetch current segments to compare versions
            const currentSegments = note.segmentIds && note.segmentIds.length > 0
                ? await indexedDBService.getLatestSegments(note.segmentIds)
                : [];

            for (const section of sections) {
                const existingSegment = currentSegments.find(s => s.sectionId === section.id);

                // Content changed or new segment
                if (!existingSegment || existingSegment.content !== section.displayContent) {
                    const newVersion = (existingSegment?.version || 0) + 1;
                    const segment: SectionHistory = {
                        sectionId: section.id,
                        version: newVersion,
                        noteId: note.id,
                        content: section.displayContent,
                        type: section.type,
                        level: section.level,
                        wodBlock: section.wodBlock,
                        timestamp: now
                    };
                    await indexedDBService.saveSectionHistory(segment);
                }
                newSegmentIds.push(section.id);
            }

            note.segmentIds = newSegmentIds;
            note.rawContent = patch.rawContent; // Keep cache updated
        }

        // Handle Results (linked to latest version state of note)
        if (patch.results) {
            const resultData = patch.results;
            const newResult: WorkoutResult = {
                id: uuidv4(),
                scriptId: id, // Link to note ID as the base versioning unit now
                noteId: id,
                data: resultData,
                completedAt: resultData.endTime || now
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
            targetDate: note.targetDate || note.createdAt,
            rawContent: finalRawContent,
            tags: note.tags,
            schemaVersion: 1
        };
    }

    async deleteEntry(id: string): Promise<void> {
        await indexedDBService.deleteNote(id);
    }
}
