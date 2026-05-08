/**
 * IndexedDBContentProvider — V4 Multi-Source Data Lens
 * 
 * Implements IContentProvider using IndexedDB as the backing store.
 * Manages the Note -> NoteSegment (versioned) hierarchy.
 */

import { v4 as uuidv4 } from 'uuid';
import { formatPlaygroundTimestampId } from '../../lib/playgroundDisplay';
import { toShortId } from '../../lib/idUtils';
import type { AttachmentCreateInput, IContentProvider, ContentProviderMode } from '../../types/content-provider';
import type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { Note, NoteSegment, WorkoutResult, SegmentDataType, Attachment } from '../../types/storage';
import { parseDocumentSections } from '../../components/Editor/utils/sectionParser';
import { Section, SectionType } from '../../components/Editor/types/section';

const MAX_TIMESTAMP_ID_SUFFIX_ATTEMPTS = 100;

/**
 * Map legacy SectionType values stored in older DBs to current types.
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

/**
 * Convert a SectionType to a V4 SegmentDataType.
 */
function toSegmentDataType(sectionType: SectionType): SegmentDataType {
    switch (sectionType) {
        case 'wod': return 'wod';
        case 'title': return 'title';
        case 'frontmatter': return 'frontmatter';
        case 'markdown':
        default:
            return 'markdown';
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
            // Prefer rawContent cached on the note (segment-based model).
            const rawContent = note.rawContent || '';

            return {
                id: note.id,
                title: note.title,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                targetDate: note.targetDate || note.createdAt,
                rawContent,
                tags: note.tags,
                type: note.type || 'note',
                templateId: note.templateId,
                clonedIds: note.clonedIds,
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
        let segments: NoteSegment[] = [];
        if (note.segmentIds && note.segmentIds.length > 0) {
            // Reconstruct from segments
            const fetchedSegments = await indexedDBService.getLatestSegments(note.segmentIds);
            // Sort segments according to segmentIds order
            segments = note.segmentIds.map(sid => fetchedSegments.find(s => s.id === sid)).filter((s): s is NoteSegment => !!s);

            // Rebuild rawContent
            rawContent = segments.map(s => {
                const resolvedType = migrateSectionType(s.dataType);
                if (resolvedType === 'wod') {
                    const dialect = s.wodBlock?.dialect ?? 'wod';
                    return `\`\`\`${dialect}\n${s.rawContent}\n\`\`\``;
                }
                // Title and markdown sections: content already includes heading prefix (e.g. "# Hello")
                return s.rawContent;
            }).join('\n');
        } else {
            // Legacy Note (no segmentIds) — fallback to rawContent on note
            rawContent = note.rawContent || '';
        }

        // Fetch latest result for this note
        const latestResults = await indexedDBService.getResultsForNote(note.id);
        const latestResult = latestResults.length > 0
            ? latestResults.sort((a, b) => b.completedAt - a.completedAt)[0]
            : undefined;

        // Map NoteSegment to Section types for the editor
        const sections: Section[] = segments.map(s => {
            const resolvedType = migrateSectionType(s.dataType);
            const dialect = s.wodBlock?.dialect ?? 'wod';
            return {
                id: s.id,
                type: resolvedType,
                rawContent: resolvedType === 'wod'
                    ? `\`\`\`${dialect}\n${s.rawContent}\n\`\`\``
                    : s.rawContent,
                displayContent: s.rawContent,
                dialect: resolvedType === 'wod' ? dialect : undefined,
                level: s.level,
                wodBlock: s.wodBlock,
                version: s.version,
                createdAt: s.createdAt,
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
            templateId: note.templateId,
            clonedIds: note.clonedIds,
            schemaVersion: 1,
        };
    }

    async cloneEntry(sourceId: string, targetDate?: number): Promise<HistoryEntry> {
        const source = await this.getEntry(sourceId);
        if (!source) throw new Error(`Source entry not found: ${sourceId}`);

        const cloned = await this.saveEntry({
            title: source.title,
            rawContent: source.rawContent,
            tags: source.tags,
            targetDate: targetDate || Date.now(),
            type: 'note',
            templateId: source.id,  // Track which entry this was cloned from
        });

        // Update source entry's clonedIds to track this clone
        const updatedClonedIds = [...(source.clonedIds || []), cloned.id];
        await this.updateEntry(sourceId, { clonedIds: updatedClonedIds });

        return cloned;
    }

    async saveEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<HistoryEntry> {
        const now = Date.now();
        let noteId = entry.type === 'playground' ? formatPlaygroundTimestampId(now) : uuidv4();
        if (entry.type === 'playground') {
            const baseNoteId = noteId;
            let attempt = 0;
            while (await indexedDBService.getNote(noteId)) {
                attempt += 1;
                if (attempt > MAX_TIMESTAMP_ID_SUFFIX_ATTEMPTS) {
                    throw new Error('Unable to allocate unique playground timestamp ID');
                }
                noteId = `${baseNoteId}-${attempt}`;
            }
        }

        // TRANSITION TO SEGMENTS
        const sections = parseDocumentSections(entry.rawContent);
        const segmentIds: string[] = [];

        for (const section of sections) {
            const segment: NoteSegment = {
                id: section.id,
                version: 1,
                noteId: noteId,
                dataType: toSegmentDataType(section.type),
                data: section.wodBlock || null,
                rawContent: section.displayContent,
                level: section.level,
                wodBlock: section.wodBlock,
                createdAt: now,
            };
            await indexedDBService.saveSegment(segment);
            segmentIds.push(section.id);
        }

        const note: Note = {
            id: noteId,
            title: entry.title,
            rawContent: entry.rawContent,
            tags: entry.tags,
            type: entry.type || 'note',
            templateId: entry.templateId,
            clonedIds: entry.clonedIds,
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

    async updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title' | 'type' | 'clonedIds' | 'targetDate'>> & { sectionId?: string; resultId?: string }): Promise<HistoryEntry> {
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
        if (patch.clonedIds) note.clonedIds = patch.clonedIds;
        if (patch.targetDate !== undefined) note.targetDate = patch.targetDate;

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
                    currentSegments.find(s => s.id === section.id) ||
                    currentSegments.find((s, idx) => {
                        const samePosition = idx === newSegmentIds.length; // same ordinal
                        const sameType = s.dataType === toSegmentDataType(section.type) || migrateSectionType(s.dataType) === section.type;
                        return samePosition && sameType;
                    });

                // Content changed or new segment
                if (!existingSegment || existingSegment.rawContent !== section.displayContent) {
                    const newVersion = (existingSegment?.version || 0) + 1;
                    const segment: NoteSegment = {
                        id: section.id,
                        version: newVersion,
                        noteId: note.id,
                        dataType: toSegmentDataType(section.type),
                        data: section.wodBlock || null,
                        rawContent: section.displayContent,
                        level: section.level,
                        wodBlock: section.wodBlock,
                        createdAt: now,
                    };
                    await indexedDBService.saveSegment(segment);
                } else if (existingSegment.id !== section.id) {
                    // Same content, different ID — carry forward under the new ID
                    const segment: NoteSegment = {
                        id: section.id,
                        version: existingSegment.version,
                        noteId: note.id,
                        dataType: toSegmentDataType(section.type),
                        data: section.wodBlock || null,
                        rawContent: existingSegment.rawContent,
                        level: section.level,
                        wodBlock: section.wodBlock,
                        createdAt: existingSegment.createdAt,
                    };
                    await indexedDBService.saveSegment(segment);
                }
                newSegmentIds.push(section.id);
            }

            note.segmentIds = newSegmentIds;
            note.rawContent = patch.rawContent; // Keep cache updated
        }

        // Handle Results (linked to latest version state of note)
        if (patch.results) {
            const resultData = patch.results;
            const latestSegment = patch.sectionId
                ? await indexedDBService.getLatestSegmentVersion(patch.sectionId)
                : undefined;
            const newResult: WorkoutResult = {
                id: patch.resultId || uuidv4(),
                segmentId: patch.sectionId, // Link to the NoteSegment that was executed
                segmentVersion: latestSegment?.version,
                noteId: note.id,   // Use resolved UUID (not raw route param)
                sectionId: patch.sectionId, // Legacy compat
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

    // --- Attachments ---

    async getAttachments(noteId: string): Promise<Attachment[]> {
        return indexedDBService.getAttachmentsForNote(noteId);
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
        await indexedDBService.saveAttachment(fullAttachment);
        return fullAttachment;
    }

    async deleteAttachment(id: string): Promise<void> {
        await indexedDBService.deleteAttachment(id);
    }
}
