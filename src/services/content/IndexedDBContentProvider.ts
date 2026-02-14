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
import { Section, SectionType } from '../../markdown-editor/types/section';

/**
 * Migrate legacy section types stored in IndexedDB to the new model.
 * 'heading' → 'title', 'paragraph' | 'empty' → 'markdown', others pass through.
 */
function migrateSectionType(storedType: string): SectionType {
    switch (storedType) {
        case 'heading': return 'title';
        case 'paragraph':
        case 'empty':
            return 'markdown';
        default:
            return storedType as SectionType;
    }
}

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
            // Prefer rawContent cached on the note (segment-based model),
            // fall back to latest Script record (legacy model).
            let rawContent = note.rawContent || '';
            if (!rawContent) {
                const latestScript = await indexedDBService.getLatestScriptForNote(note.id);
                if (latestScript) {
                    rawContent = latestScript.content;
                }
            }

            return {
                id: note.id,
                title: note.title,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                targetDate: note.targetDate || note.createdAt,
                rawContent,
                tags: note.tags,
                schemaVersion: 1,
            } as HistoryEntry;
        });

        const resolved = (await Promise.all(entryPromises)).filter((e): e is HistoryEntry => e !== null);

        // Client-side filtering (IndexedDB indexes are used for getAll, but complex filtering is here)
        let filtered = resolved;

        if (query) {
            if (query.tags && query.tags.length > 0) {
                filtered = filtered.filter(e => query.tags!.every(t => e.tags.includes(t)));
            }

            // Date range filtering
            let dateRange = query.dateRange;
            if (!dateRange && query.daysBack != null) {
                const now = Date.now();
                dateRange = { start: now - query.daysBack * 86_400_000, end: now };
            }
            if (dateRange) {
                filtered = filtered.filter(
                    e => e.targetDate >= dateRange!.start && e.targetDate <= dateRange!.end
                );
            }
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
                const resolvedType = migrateSectionType(s.type);
                if (resolvedType === 'wod') {
                    const dialect = s.wodBlock?.dialect ?? 'wod';
                    return `\`\`\`${dialect}\n${s.content}\n\`\`\``;
                }
                if (resolvedType === 'title') {
                    // Title sections may have been stored with heading prefix stripped; reconstruct
                    const prefix = '#'.repeat(s.level || 1);
                    return `${prefix} ${s.content}`;
                }
                return s.content;
            }).join('\n');
        } else {
            // Legacy Note (no segmentIds) — fallback to script storage
            const latestScript = await indexedDBService.getLatestScriptForNote(note.id);
            if (latestScript) {
                rawContent = latestScript.content;
            } else {
                rawContent = note.rawContent || '';
            }
        }

        // Fetch latest result for this note
        const latestResults = await indexedDBService.getResultsForNote(note.id);
        const latestResult = latestResults.length > 0
            ? latestResults.sort((a, b) => b.completedAt - a.completedAt)[0]
            : undefined;

        // Map SectionHistory to Section types for the editor
        const sections: Section[] = segments.map(s => {
            const resolvedType = migrateSectionType(s.type);
            const dialect = s.wodBlock?.dialect ?? 'wod';
            return {
                id: s.sectionId,
                type: resolvedType,
                rawContent: resolvedType === 'wod'
                    ? `\`\`\`${dialect}\n${s.content}\n\`\`\``
                    : (resolvedType === 'title' ? `${'#'.repeat(s.level || 1)} ${s.content}` : s.content),
                displayContent: s.content,
                dialect: resolvedType === 'wod' ? dialect : undefined,
                level: s.level,
                wodBlock: s.wodBlock,
                version: s.version,
                createdAt: s.timestamp,
                // lines will be recomputed by the hook
                startLine: 0,
                endLine: 0,
                lineCount: 0
            };
        });

        return {
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            targetDate: note.targetDate || note.createdAt,
            rawContent,
            sections,
            results: latestResult?.data,
            tags: note.tags,
            type: (note.type as any) || 'note',
            schemaVersion: 1,
        };
    }

    async cloneEntry(sourceId: string, targetDate?: number): Promise<HistoryEntry> {
        const source = await this.getEntry(sourceId);
        if (!source) throw new Error(`Source entry not found: ${sourceId}`);

        return this.saveEntry({
            title: source.title,
            rawContent: source.rawContent,
            tags: source.tags,
            targetDate: targetDate || Date.now(),
            type: 'note' // Cloned templates become notes
        });
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
            type: entry.type || 'note',
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

    async updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title' | 'type'>>): Promise<HistoryEntry> {
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
        if (patch.type) note.type = patch.type;

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
                // Match by position + type first (stable across content changes),
                // then fall back to exact sectionId match.
                const existingSegment =
                    currentSegments.find(s => s.sectionId === section.id) ||
                    currentSegments.find((s, idx) => {
                        const samePosition = idx === newSegmentIds.length; // same ordinal
                        const sameType = s.type === section.type || migrateSectionType(s.type) === section.type;
                        return samePosition && sameType;
                    });

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
                } else if (existingSegment.sectionId !== section.id) {
                    // Same content, different ID — carry forward under the new ID
                    const segment: SectionHistory = {
                        sectionId: section.id,
                        version: existingSegment.version,
                        noteId: note.id,
                        content: existingSegment.content,
                        type: section.type,
                        level: section.level,
                        wodBlock: section.wodBlock,
                        timestamp: existingSegment.timestamp
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
            type: (note.type as any) || 'note',
            schemaVersion: 1
        };
    }

    async deleteEntry(id: string): Promise<void> {
        await indexedDBService.deleteNote(id);
    }
}
