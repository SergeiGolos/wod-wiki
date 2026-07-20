/**
 * IndexedDBContentProvider — V4 Multi-Source Data Lens
 * 
 * Implements IContentProvider using IndexedDB as the backing store.
 * Manages the Note -> NoteSegment (versioned) hierarchy.
 */

import { v4 as uuidv4 } from 'uuid';
import { formatPlaygroundTimestampId } from '../../lib/playgroundDisplay';
import type { AttachmentCreateInput, IContentProvider, ContentProviderMode, NoteSaveInput } from '../../types/content-provider';
import type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';
import { indexedDBService, type IndexedDBService } from '@/services/db/IndexedDBService';
import { Note, NoteSegment, WorkoutResult, SegmentDataType, Attachment, ResultOrigin } from '../../types/storage';
import { parseDocumentSections } from '../../components/Editor/utils/sectionParser';
import { Section, SectionType, ScriptBlock } from '../../components/Editor/types/section';

const MAX_TIMESTAMP_ID_SUFFIX_ATTEMPTS = 100;

/**
 * Map stored SegmentDataType values to section types: h1–h6 → 'title'
 * (heading level is encoded in the type, S-06); everything else passes through.
 */
function migrateSectionType(storedType: string): SectionType {
    if (levelFromDataType(storedType) !== undefined) return 'title';
    return storedType as SectionType;
}

/** Heading level back out of an h1–h6 dataType; undefined for non-headings. */
function levelFromDataType(dataType: string): number | undefined {
    const match = /^h([1-6])$/.exec(dataType);
    return match ? Number(match[1]) : undefined;
}

/**
 * Convert a Section to a V11 SegmentDataType. Heading level is encoded in the
 * type itself (h1–h6) — the separate `level` field is gone (S-04/S-06).
 */
function toSegmentDataType(section: Pick<Section, 'type' | 'level'>): SegmentDataType {
    switch (section.type) {
        case 'wod': return 'wod';
        case 'title': {
            const level = Math.min(6, Math.max(1, section.level ?? 1));
            return `h${level}` as SegmentDataType;
        }
        case 'frontmatter': return 'frontmatter';
        case 'markdown':
        default:
            return 'markdown';
    }
}

export class IndexedDBContentProvider implements IContentProvider {
    /**
     * @param db storage backing — injectable so tests can supply a real
     * service instance when the module-level singleton is registry-mocked.
     */
    constructor(private readonly db: IndexedDBService = indexedDBService) {}

    readonly mode: ContentProviderMode = 'history';
    readonly persistenceBackend = 'indexed-db' as const;
    readonly capabilities: ProviderCapabilities = {

        canWrite: true,
        canDelete: true,
        canFilter: true,
        canMultiSelect: true,
        supportsHistory: true,
    };

    async getEntries(query?: EntryQuery): Promise<HistoryEntry[]> {
        const notes = await this.db.getAllNotes();

        // Batch the derived-field lookups (V11): journalDate comes from the
        // page, tags from note_tags + tags, content from segments (one
        // getAll, grouped client-side — listNotes search reads rawContent).
        const pageIds = Array.from(new Set(notes.map(n => n.pageId).filter((id): id is string => !!id)));
        const pages = new Map<string, string | undefined>();
        await Promise.all(pageIds.map(async id => {
            pages.set(id, (await this.db.getPage(id))?.date);
        }));
        const tagsByNote = new Map<string, string[]>();
        await Promise.all(notes.map(async note => {
            tagsByNote.set(note.id, (await this.db.getTagsForNote(note.id)).map(t => t.label));
        }));

        const allSegments = await (this.db as IndexedDBService).getAllSegments();
        const latestByNote = new Map<string, Map<string, NoteSegment>>();
        for (const segment of allSegments) {
            let byId = latestByNote.get(segment.noteId);
            if (!byId) { byId = new Map(); latestByNote.set(segment.noteId, byId); }
            const current = byId.get(segment.id);
            if (!current || segment.version > current.version) byId.set(segment.id, segment);
        }
        const rawContentFor = (noteId: string): string => {
            const byId = latestByNote.get(noteId);
            if (!byId) return '';
            return [...byId.values()]
                .sort((a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt))
                .map(s => migrateSectionType(s.dataType) === 'wod'
                    ? `\`\`\`${(s.data as ScriptBlock | null)?.dialect ?? 'wod'}\n${s.rawContent}\n\`\`\``
                    : s.rawContent)
                .join('\n');
        };

        const resolved = notes.map(note => ({
            id: note.id,
            title: note.title,
            slug: note.slug,
            createdAt: note.createdAt,
            updatedAt: note.createdAt,
            targetDate: note.createdAt,
            journalDate: note.pageId ? pages.get(note.pageId) : undefined,
            rawContent: rawContentFor(note.id),
            tags: tagsByNote.get(note.id) ?? [],
            type: note.type || 'note',
            sourceId: note.sourceId,
            schemaVersion: 1,
        } as HistoryEntry));

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
        let note = await this.db.getNote(id);
        if (!note) {
            note = await this.db.getNoteBySlug(id);
        }

        if (!note) return null;

        // V11 — content always reconstructs from segments (note.rawContent is gone).
        const segments = await this.db.getLatestSegmentsForNote(note.id);
        const rawContent = segments.map(s => {
            const resolvedType = migrateSectionType(s.dataType);
            if (resolvedType === 'wod') {
                const dialect = (s.data as ScriptBlock | null)?.dialect ?? 'wod';
                return `\`\`\`${dialect}\n${s.rawContent}\n\`\`\``;
            }
            // Title and markdown sections: content already includes heading prefix (e.g. "# Hello")
            return s.rawContent;
        }).join('\n');

        // Derived projection fields (removed from the Note row in V11).
        const [page, tags] = await Promise.all([
            note.pageId ? this.db.getPage(note.pageId) : undefined,
            this.db.getTagsForNote(note.id),
        ]);

        // Fetch latest result for this note
        const latestResults = await this.db.getResultsForNote(note.id);
        const latestResult = latestResults.length > 0
            ? latestResults.sort((a, b) => b.createdAt - a.createdAt)[0]
            : undefined;

        // Map NoteSegment to Section types for the editor
        const sections: Section[] = segments.map(s => {
            const resolvedType = migrateSectionType(s.dataType);
            const block = s.data as ScriptBlock | null;
            const dialect = block?.dialect ?? 'wod';
            return {
                id: s.id,
                type: resolvedType,
                rawContent: resolvedType === 'wod'
                    ? `\`\`\`${dialect}\n${s.rawContent}\n\`\`\``
                    : s.rawContent,
                displayContent: s.rawContent,
                dialect: resolvedType === 'wod' ? dialect : undefined,
                level: levelFromDataType(s.dataType),
                scriptBlock: block ?? undefined,
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
            slug: note.slug,
            createdAt: note.createdAt,
            updatedAt: note.createdAt, // V11 — note.updatedAt removed; derive
            targetDate: note.createdAt, // V11 — note.targetDate removed; derive
            journalDate: page?.date,
            rawContent,
            sections,
            results: latestResult?.data,
            tags: tags.map(t => t.label),
            type: note.type ?? 'note',
            sourceId: note.sourceId,
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
            sourceId: source.id,  // Track which entry this was cloned from
        });

        return cloned;
    }

    async saveEntry(entry: NoteSaveInput): Promise<HistoryEntry> {
        const now = Date.now();
        // Preserve a recovered id (export → import round-trip) so a re-imported
        // note overwrites its original instead of duplicating. Absent on the
        // normal create path → mint a fresh id (playground uses timestamp ids).
        let noteId = entry.id;
        if (!noteId) {
            noteId = entry.type === 'playground' ? formatPlaygroundTimestampId(now) : uuidv4();
        }
        if (entry.type === 'playground' && !entry.id) {
            const baseNoteId = noteId;
            let attempt = 0;
            while (await this.db.getNote(noteId)) {
                attempt += 1;
                if (attempt > MAX_TIMESTAMP_ID_SUFFIX_ATTEMPTS) {
                    throw new Error('Unable to allocate unique playground timestamp ID');
                }
                noteId = `${baseNoteId}-${attempt}`;
            }
        }

        // Preserve recovered timestamps; mint fresh when absent.
        const createdAt = entry.createdAt ?? now;

        // Journal-dated notes join their calendar page (N-02).
        const pageId = entry.journalDate
            ? (await this.db.getOrCreatePageForDate(entry.journalDate)).id
            : undefined;

        // TRANSITION TO SEGMENTS — content lives only here (N-03/N-04).
        const sections = parseDocumentSections(entry.rawContent);

        let position = 0;
        for (const section of sections) {
            const segment: NoteSegment = {
                id: section.id,
                version: 1,
                noteId: noteId,
                position: position++,
                pageId,
                dataType: toSegmentDataType(section),
                data: section.scriptBlock || null,
                rawContent: section.displayContent,
                createdAt,
                updatedAt: createdAt,
                isHistory: false,
            };
            await this.db.saveSegment(segment);
        }

        const note: Note = {
            id: noteId,
            slug: entry.slug,
            pageId,
            title: entry.title,
            type: entry.type || 'note',
            sourceId: entry.sourceId,
            createdAt,
        };

        await this.db.saveNote(note);
        if (entry.tags.length > 0) {
            await this.db.setNoteTags(noteId, entry.tags);
        }

        return {
            ...entry,
            id: noteId,
            createdAt,
            updatedAt: createdAt,
            targetDate: createdAt,
            type: note.type,
            slug: note.slug,
            journalDate: entry.journalDate,
            schemaVersion: 1
        };

    }

    async updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title' | 'journalDate' | 'slug' | 'type' | 'sourceId'>> & { sectionId?: string; resultId?: string; blockId?: string; blockContentId?: string; version?: number; segmentId?: string; origin?: ResultOrigin }): Promise<HistoryEntry> {
        let note = await this.db.getNote(id);

        if (!note) {
            note = await this.db.getNoteBySlug(id);
        }

        if (!note) throw new Error(`Note not found: ${id}`);

        const now = Date.now();

        // Update Metadata — the slim V11 note row. journalDate patches map to
        // page linkage (N-02); tags go to note_tags (N-06).
        if (patch.title) note.title = patch.title;
        if (patch.type) note.type = patch.type;
        if (patch.slug !== undefined) note.slug = patch.slug;
        if (patch.sourceId !== undefined) note.sourceId = patch.sourceId;
        if (patch.journalDate !== undefined) {
            note.pageId = patch.journalDate
                ? (await this.db.getOrCreatePageForDate(patch.journalDate)).id
                : undefined;
        }
        if (patch.tags) {
            await this.db.setNoteTags(note.id, patch.tags);
        }

        const metadataChanged = Boolean(
            patch.title || patch.type || patch.slug !== undefined
            || patch.sourceId !== undefined || patch.journalDate !== undefined
            || patch.tags || patch.rawContent !== undefined,
        );

        let finalRawContent = '';

        if (patch.rawContent !== undefined) {
            finalRawContent = patch.rawContent;

            // TRANSITION TO SEGMENTS
            // Parse into sections to identify units
            const sections = parseDocumentSections(patch.rawContent);
            let position = 0;

            // Fetch current segments to compare versions
            const currentSegments = await this.db.getLatestSegmentsForNote(note.id);

            for (const section of sections) {
                // Match by exact id first, then by position + type (stable
                // across content changes at the same ordinal).
                const existingSegment =
                    currentSegments.find(s => s.id === section.id) ||
                    currentSegments.find(s => {
                        const samePosition = s.position === position;
                        const sameType = s.dataType === toSegmentDataType(section) || migrateSectionType(s.dataType) === section.type;
                        return samePosition && sameType;
                    });

                // Content changed or new segment
                if (!existingSegment || existingSegment.rawContent !== section.displayContent) {
                    const newVersion = (existingSegment?.version || 0) + 1;
                    const segment: NoteSegment = {
                        id: section.id,
                        version: newVersion,
                        noteId: note.id,
                        position,
                        pageId: note.pageId,
                        dataType: toSegmentDataType(section),
                        data: section.scriptBlock || null,
                        rawContent: section.displayContent,
                        createdAt: now,
                        updatedAt: now,
                        isHistory: false,
                    };
                    await this.db.saveSegment(segment);
                    if (existingSegment) {
                        // The bumped incarnation supersedes the previous latest.
                        await this.db.saveSegment({ ...existingSegment, isHistory: true, updatedAt: now });
                    }
                } else if (existingSegment.id !== section.id) {
                    // Same content, different ID — carry forward under the new ID
                    const segment: NoteSegment = {
                        id: section.id,
                        version: existingSegment.version,
                        noteId: note.id,
                        position,
                        pageId: note.pageId,
                        dataType: toSegmentDataType(section),
                        data: section.scriptBlock || null,
                        rawContent: existingSegment.rawContent,
                        createdAt: existingSegment.createdAt,
                        updatedAt: now,
                        isHistory: existingSegment.isHistory ?? false,
                    };
                    await this.db.saveSegment(segment);
                }
                position++;
            }
        }

        // Handle Results (linked to latest version state of note)
        if (patch.results) {
            const resultData = patch.results;
            // Key the segment lookup by segmentId (positional section id) —
            // previously looked up by blockContentId (a content hash), which
            // never matched and left every result's segmentVersion undefined.
            const latestSegment = patch.segmentId
                ? await this.db.getLatestSegmentVersion(patch.segmentId)
                : undefined;
            const newResult: WorkoutResult = {
                id: patch.resultId || uuidv4(),
                segmentId: patch.segmentId,
                segmentVersion: latestSegment?.version,
                noteId: note.id,   // Use resolved UUID (not raw route param)
                pageId: note.pageId,
                blockId: patch.blockId,
                blockContentId: patch.blockContentId,
                version: patch.version,
                origin: patch.origin,
                data: resultData,
                createdAt: resultData.endTime || now
            };
            await this.db.saveResult(newResult);
        }

        // Persist the mutated note when metadata/content changed (updateEntry
        // previously never saved it). Pure result writes skip the save so
        // recording a workout doesn't churn the note row.
        if (metadataChanged) await this.db.saveNote(note);

        // Derived projection fields for the returned entry.
        const [page, tags] = await Promise.all([
            note.pageId ? this.db.getPage(note.pageId) : undefined,
            this.db.getTagsForNote(note.id),
        ]);

        return {
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.createdAt,
            targetDate: note.createdAt,
            journalDate: page?.date,
            slug: note.slug,
            rawContent: finalRawContent,
            tags: tags.map(t => t.label),
            type: note.type ?? 'note',
            sourceId: note.sourceId,
            schemaVersion: 1
        };
    }

    async deleteEntry(id: string): Promise<void> {
        await this.db.deleteNote(id);
    }

    // --- Attachments ---

    async getAttachments(noteId: string): Promise<Attachment[]> {
        return this.db.getAttachmentsForNote(noteId);
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
        await this.db.saveAttachment(fullAttachment);
        return fullAttachment;
    }

    async deleteAttachment(id: string): Promise<void> {
        await this.db.deleteAttachment(id);
    }
}
