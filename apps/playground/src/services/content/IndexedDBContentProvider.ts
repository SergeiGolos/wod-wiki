/**
 * IndexedDBContentProvider — V4 Multi-Source Data Lens
 * 
 * Implements IContentProvider using IndexedDB as the backing store.
 * Manages the Note -> NoteSegment (versioned) hierarchy.
 */

import { v7 as uuidv7 } from 'uuid';
import { formatPlaygroundTimestampId } from '../../lib/playgroundDisplay';
import type { AttachmentCreateInput, IContentProvider, ContentProviderMode, NoteSaveInput } from '../../types/content-provider';
import type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';
import { resolveLatestSegment, segmentRowId, storageService, type StorageService } from '@/services/storage';
import { Note, NoteSegment, Session, SegmentDataType, Attachment, ResultOrigin, type Page, type PageNote } from '../../types/storage';
import { parseDocumentSections, type Section, type SectionType, type ScriptBlock } from '@bitcobblers/wod-wiki-core';
import { extractFrontmatterTags, extractTypedFrontmatterTags, type TypedTagItem, parseFrontmatter, serializeFrontmatter } from '../../lib/frontmatter';
import { toEventRows, toSummaryEventRows } from '@bitcobblers/wod-wiki-wql';
import { sessionToPayload } from '../persistence/sessionPayload';

const MAX_TIMESTAMP_ID_SUFFIX_ATTEMPTS = 100;

/** Local-calendar YYYY-MM-DD — same key space as Page.date (formatDateKey). */
function localDateKey(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Junction order convention: explicit position first, then earliest link. */
function linkOrder(a: PageNote, b: PageNote): number {
    return (a.position ?? Infinity) - (b.position ?? Infinity) || a.createdAt - b.createdAt;
}

/**
 * pageId/journalDate/slug resolve independently: primary link, first calendar
 * page, first named page — a note may sit on both page flavors at once.
 */
async function projectNotePages(db: StorageService, noteId: string): Promise<{ pageId?: string; journalDate?: string; slug?: string }> {
    const links = [...(await db.getNotePages(noteId))].sort(linkOrder);
    let pageId: string | undefined;
    let journalDate: string | undefined;
    let slug: string | undefined;
    for (const link of links) {
        const page = await db.getPage(link.pageId);
        if (!page) continue;
        if (!pageId) pageId = page.id;
        if (!journalDate && page.date) journalDate = page.date;
        if (!slug && page.slug && !page.date) slug = page.slug;
    }
    return { pageId, journalDate, slug };
}

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
 * Reconstruct one stored segment's document fragment. getEntry and
 * getEntries share this so list and single-note reads can never drift.
 *
 * Segments store section DISPLAY content: wod segments hold the bare script
 * (fences re-added here) and frontmatter segments hold the inner YAML
 * (--- delimiters re-added here). Without the frontmatter wrap, rawContent
 * consumers (dashboard-note discovery, canvas) see `dashboard: "true"…`
 * with no delimiters — an unparseable Dashboard Note.
 */
function segmentToRawFragment(s: NoteSegment): string {
    if (s.dataType === 'wod') {
        const block = s.data as ScriptBlock | null;
        const dialect = block?.dialect ?? 'time';
        const fenceTag = block?.sport ? `${dialect}:${block.sport}` : dialect;
        return `\`\`\`${fenceTag}\n${s.rawContent}\n\`\`\``;
    }
    if (s.dataType === 'frontmatter') {
        return `---\n${s.rawContent}\n---`;
    }
    return s.rawContent;
}

function sectionSourceFragments(content: string, sections: readonly Section[]): string[] {
    const starts = [0];
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '\n') starts.push(i + 1);
    }
    return sections.map((section, index) => content.slice(
        starts[section.startLine],
        index + 1 < sections.length ? starts[sections[index + 1].startLine] : content.length,
    ));
}

function segmentsToRawContent(segments: readonly NoteSegment[], tags: string[]): string {
    const content = segments.map((segment, index) => segment.sourceContent
        ?? (segmentToRawFragment(segment) + (index + 1 < segments.length ? '\n' : ''))).join('');
    return segments.some(segment => segment.sourceContent === undefined)
        ? ensureFrontmatterTags(content, tags)
        : content;
}

/**
 * Tags declared in the frontmatter sections of a document (T4 bridge).
 * Accepts parser Sections (`type`) and stored NoteSegments (`dataType`).
 */
function frontmatterTagsOf(parts: readonly { type: string; rawContent: string }[], knownTypeNames: string[] = []): TypedTagItem[] {
    const tags = parts
        .filter(part => part.type === 'frontmatter')
        .flatMap(part => extractTypedFrontmatterTags(part.rawContent, knownTypeNames));
    return tags;
}

/**
 * Ensure frontmatter metadata contains the note's tags when tags exist.
 */
function ensureFrontmatterTags(rawContent: string, tags: string[]): string {
    if (!tags || tags.length === 0) return rawContent;
    const fmTags = extractFrontmatterTags(rawContent);
    if (fmTags.length > 0) return rawContent;
    const { meta, body } = parseFrontmatter(rawContent);
    const mergedMeta = { ...meta, tags };
    return `---\n${serializeFrontmatter(mergedMeta)}\n---\n${body}`;
}

/**
 * Convert a Section to a V11 SegmentDataType. Heading level is encoded in the
 * type itself (h1–h6) — the separate `level` field is gone (S-04/S-06).
 */
function toSegmentDataType(section: Pick<Section, 'type' | 'level'>): SegmentDataType {
    switch (section.type) {
        case 'time':
        case 'log':
            return 'wod';
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
    constructor(private readonly db: StorageService = storageService) {}

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

        // Batch the derived-field lookups (V22): journalDate and slug come
        // from the pages via the page_notes junction (resolved independently —
        // a note may sit on both flavors), tags from note_tags + tags, content
        // from segments (one getAll, grouped client-side).
        const allPageNotes = await this.db.getAllPageNotes();
        const linksByNote = new Map<string, PageNote[]>();
        for (const pn of allPageNotes) {
            const links = linksByNote.get(pn.noteId);
            if (links) links.push(pn);
            else linksByNote.set(pn.noteId, [pn]);
        }
        for (const links of linksByNote.values()) links.sort(linkOrder);
        const pageIds = Array.from(new Set(allPageNotes.map(pn => pn.pageId)));
        const pages = new Map<string, Page | undefined>();
        await Promise.all(pageIds.map(async id => {
            pages.set(id, await this.db.getPage(id));
        }));
        const tagsByNote = new Map<string, string[]>();
        await Promise.all(notes.map(async note => {
            tagsByNote.set(note.id, (await this.db.getTagsForNote(note.id)).map(t => t.label));
        }));

        const allSegments = await this.db.getAllSegments();
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
            const segments = [...byId.values()]
                .filter((s) => !s.isHistory)
                .sort((a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt));
            return segmentsToRawContent(segments, tagsByNote.get(noteId) ?? []);
        };

        const resolved = notes.map(note => {
            // Primary page (pageId): first link by position, or earliest
            // createdAt; journalDate/slug resolve independently per flavor.
            let pageId: string | undefined;
            let journalDate: string | undefined;
            let slug: string | undefined;
            for (const pn of linksByNote.get(note.id) ?? []) {
                const page = pages.get(pn.pageId);
                if (!page) continue;
                if (!pageId) pageId = page.id;
                if (!journalDate && page.date) journalDate = page.date;
                if (!slug && page.slug && !page.date) slug = page.slug;
            }
            return {
                id: note.id,
                title: note.title,
                slug,
                pageId,
                createdAt: note.createdAt,
                updatedAt: note.createdAt,
                targetDate: note.date ?? note.createdAt,
                journalDate,
                rawContent: rawContentFor(note.id),
                tags: tagsByNote.get(note.id) ?? [],
                type: note.type || 'note',
                sourceId: note.sourceId,
                catalog: note.catalog,
                schemaVersion: 1,
            } as HistoryEntry;
        });

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
            // Slug fallback: look up the page by slug, then find its first note.
            const page = await this.db.getPageBySlug(id);
            if (page) {
                const links = await this.db.getPageNotes(page.id);
                if (links.length > 0) {
                    note = await this.db.getNote(links[0].noteId);
                }
            }
        }

        if (!note) return null;

        // V11 — content always reconstructs from segments (note.rawContent is gone).
        const segments = await this.db.getLatestSegmentsForNote(note.id);

        // Derived projection fields (V22 — junction; journalDate/slug resolve
        // independently when the note sits on both page flavors).
        const [projection, tags] = await Promise.all([
            projectNotePages(this.db, note.id),
            this.db.getTagsForNote(note.id),
        ]);
        const rawContent = segmentsToRawContent(segments, tags.map(t => t.label));

        // Fetch latest result for this note
        const latestResults = await this.db.getResultsForNote(note.id);
        const latestResult = latestResults.length > 0
            ? latestResults.sort((a, b) => b.createdAt - a.createdAt)[0]
            : undefined;
        const latestEvents = latestResult ? await this.db.getEventsByResult(latestResult.id) : [];

        // Map NoteSegment to Section types for the editor
        const sections: Section[] = segments.map(s => {
            const isWorkout = s.dataType === 'wod';
            const block = s.data as ScriptBlock | null;
            const dialect = block?.dialect ?? 'time';
            const fenceTag = block?.sport ? `${dialect}:${block.sport}` : dialect;
            return {
                id: s.id,
                type: isWorkout ? dialect : migrateSectionType(s.dataType),
                rawContent: isWorkout
                    ? `\`\`\`${fenceTag}\n${s.rawContent}\n\`\`\``
                    : s.rawContent,
                displayContent: s.rawContent,
                sport: isWorkout ? block?.sport : undefined,
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
            slug: projection.slug,
            pageId: projection.pageId,
            catalog: note.catalog,
            createdAt: note.createdAt,
            updatedAt: note.createdAt, // V11 — note.updatedAt removed; derive
            targetDate: note.date ?? note.createdAt, // V22 — domain date falls back to createdAt
            journalDate: projection.journalDate,
            rawContent,
            sections,
            results: latestResult ? sessionToPayload(latestResult, latestEvents) : undefined,
            tags: tags.map(t => t.label),
            type: note.type ?? 'note',
            sourceId: note.sourceId,
            schemaVersion: 1,
        };
    }

    async cloneEntry(sourceId: string, targetDate?: number): Promise<HistoryEntry> {
        const source = await this.getEntry(sourceId);
        if (!source) throw new Error(`Source entry not found: ${sourceId}`);

        const date = targetDate ?? Date.now();
        // Journal clones join the local-calendar page for the chosen date and
        // re-save as fresh segments — independent content, no results or
        // attachments copied; sourceId keeps the lineage.
        return this.saveEntry({
            title: source.title,
            rawContent: source.rawContent,
            tags: source.tags,
            targetDate: date,
            journalDate: localDateKey(date),
            type: 'journal',
            sourceId: source.id,
        });
    }

    async saveEntry(entry: NoteSaveInput): Promise<HistoryEntry> {
        const now = Date.now();
        // Preserve a recovered id (export → import round-trip) so a re-imported
        // note overwrites its original instead of duplicating. Absent on the
        // normal create path → mint a fresh id (playground uses timestamp ids).
        let noteId = entry.id;
        if (!noteId) {
            noteId = entry.type === 'playground' ? formatPlaygroundTimestampId(now) : uuidv7();
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

        const existingNote = entry.id ? await this.db.getNote(entry.id) : undefined;
        // Preserve recovered timestamps; mint fresh when absent.
        const createdAt = entry.createdAt ?? now;

        // Journal-dated notes join their calendar page (V22 — N:M junction).
        let pageId: string | undefined;
        if (entry.journalDate) {
            const page = await this.db.getOrCreatePageForDate(entry.journalDate);
            pageId = page.id;
            await this.db.addNoteToPage(noteId, pageId);
        }

        // Slug-named pages join their custom page (V22).
        if (entry.slug) {
            let page = await this.db.getPageBySlug(entry.slug);
            if (!page) {
                page = { id: uuidv7(), slug: entry.slug, title: entry.title, createdAt };
                await this.db.savePage(page);
            }
            await this.db.addNoteToPage(noteId, page.id);
        }

        // TRANSITION TO SEGMENTS — content lives only here (N-03/N-04).
        const sections = parseDocumentSections(entry.rawContent);
        const sourceFragments = sectionSourceFragments(entry.rawContent, sections);

        if (existingNote) {
            await this.updateEntry(noteId, { rawContent: entry.rawContent });
        } else {
            let position = 0;
            for (const section of sections) {
                const segment: NoteSegment = {
                    id: segmentRowId(noteId, section.id),
                    version: 1,
                    noteId: noteId,
                    position,
                    pageId,
                    dataType: toSegmentDataType(section),
                    data: section.scriptBlock || null,
                    rawContent: section.displayContent,
                    sourceContent: sourceFragments[position++],
                    createdAt,
                    updatedAt: createdAt,
                    isHistory: false,
                };
                await this.db.saveSegment(segment);
            }
        }
        if (!existingNote) await this.db.rebuildBlockIndexForNote?.(noteId);

        const note: Note = {
            id: noteId,
            title: entry.title,
            type: entry.type || 'note',
            sourceId: entry.sourceId,
            date: entry.targetDate ?? createdAt,
            createdAt,
        };

        await this.db.saveNote(note);
        // T4 bridge: frontmatter `tags:` and typed tags are additive into the note's tag set.
        const knownTypes = (await this.db.getAllTagTypes?.().catch(() => []))?.map(t => t.name) ?? [];
        const fmTags = frontmatterTagsOf(sections, knownTypes);
        const mergedTags: Array<string | TypedTagItem> = [
            ...entry.tags,
            ...fmTags.map(t => (t.type ? t : t.label)),
        ];
        if (mergedTags.length > 0) {
            await this.db.setNoteTags(noteId, mergedTags);
        }

        return {
            ...entry,
            id: noteId,
            createdAt,
            updatedAt: createdAt,
            targetDate: note.date ?? createdAt,
            type: note.type,
            journalDate: entry.journalDate,
            schemaVersion: 1
        };

    }

    async updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title' | 'targetDate' | 'type'>> & { journalDate?: string | null; sourceId?: string | null; slug?: string | null; sectionId?: string; resultId?: string; blockId?: string; blockContentId?: string; version?: number; segmentId?: string; origin?: ResultOrigin }): Promise<HistoryEntry> {
        let note = await this.db.getNote(id);

        if (!note) {
            // Slug fallback: look up the page by slug, then find its first note.
            const page = await this.db.getPageBySlug(id);
            if (page) {
                const links = await this.db.getPageNotes(page.id);
                if (links.length > 0) {
                    note = await this.db.getNote(links[0].noteId);
                }
            }
        }

        if (!note) throw new Error(`Note not found: ${id}`);

        const now = Date.now();

        // Update Metadata — the slim V22 note row. journalDate patches map to
        // page_notes junction; slug patches move named-page membership (never
        // renaming a shared page); targetDate syncs the domain date; tags go
        // to note_tags (N-06). `sourceId: null` clears the source bucket.
        if (patch.title !== undefined) note.title = patch.title;
        if (patch.type) note.type = patch.type;
        if (patch.targetDate !== undefined) note.date = patch.targetDate;
        if (patch.sourceId !== undefined) note.sourceId = patch.sourceId ?? undefined;

        // journalDate → update page_notes junction (calendar page membership).
        // The destination page is secured BEFORE old links are dropped, so a
        // failed lookup can never strand the note without its calendar
        // membership; `null` clears that flavor only.
        if (patch.journalDate !== undefined) {
            const destination = patch.journalDate
                ? await this.db.getOrCreatePageForDate(patch.journalDate)
                : undefined;
            // Remove existing calendar-page links (pages with a date)
            const existingLinks = await this.db.getNotePages(note.id);
            for (const link of existingLinks) {
                const linkedPage = await this.db.getPage(link.pageId);
                if (linkedPage?.date) {
                    await this.db.removeNoteFromPage(note.id, link.pageId);
                }
            }
            if (destination) await this.db.addNoteToPage(note.id, destination.id);
        }

        // slug → move THIS note's named-page membership (page_notes junction).
        // A shared slug page is never renamed — sibling notes on it keep their
        // page. The note detaches from its old slug page(s) only after the
        // target page exists; `null` clears the named-page flavor only.
        if (patch.slug !== undefined) {
            let destination: Page | undefined;
            if (patch.slug) {
                destination = await this.db.getPageBySlug(patch.slug);
                if (!destination) {
                    destination = { id: uuidv7(), slug: patch.slug, title: note.title, createdAt: now };
                    await this.db.savePage(destination);
                }
            }
            const existingLinks = await this.db.getNotePages(note.id);
            for (const link of existingLinks) {
                const linkedPage = await this.db.getPage(link.pageId);
                // Named-page flavor: has a slug, no date.
                if (linkedPage?.slug && !linkedPage.date && linkedPage.id !== destination?.id) {
                    await this.db.removeNoteFromPage(note.id, link.pageId);
                }
            }
            if (destination) await this.db.addNoteToPage(note.id, destination.id);
        }

        const metadataChanged = Boolean(
            patch.title !== undefined || patch.type || patch.slug !== undefined
            || patch.sourceId !== undefined || patch.journalDate !== undefined
            || patch.targetDate !== undefined
            || patch.tags || patch.rawContent !== undefined,
        );

        // Re-project relationships AFTER the writes above: segment stamping and
        // the returned entry must reflect the new memberships, not the stale
        // pre-patch primary page (journalDate/slug resolve independently).
        const projection = await projectNotePages(this.db, note.id);
        const primaryPageId = projection.pageId;

        let finalRawContent = '';
        // Tags parsed out of the new content's frontmatter sections (T4).
        const knownTypes = (await this.db.getAllTagTypes?.().catch(() => []))?.map(t => t.name) ?? [];
        let frontmatterTags: TypedTagItem[] | undefined;

        if (patch.rawContent !== undefined) {
            finalRawContent = patch.rawContent;

            // TRANSITION TO SEGMENTS
            // Parse into sections to identify units
            const sections = parseDocumentSections(patch.rawContent);
            frontmatterTags = frontmatterTagsOf(sections, knownTypes);
            const sourceFragments = sectionSourceFragments(patch.rawContent, sections);
            let position = 0;

            // Fetch current segments to compare versions — the full lineage
            // (retired rows included) so resurrect / retire-sweep semantics
            // see every live AND historical incarnation.
            const currentSegments = await this.db.getLatestSegmentsForNote(note.id, { includeHistory: true });
            const consumed = new Set<NoteSegment>();
            const retired = new Set<NoteSegment>();

            // The position+type fallback supersedes at most one row per
            // section, so supersession is completed by the sweep below.
            const retire = async (segment: NoteSegment) => {
                if (segment.isHistory || retired.has(segment)) return;
                retired.add(segment);
                await this.db.saveSegment({ ...segment, isHistory: true, updatedAt: now });
            };

            for (const section of sections) {
                // Match by exact id first, then by position + type (stable
                // across content changes at the same ordinal). The fallback
                // only considers live, unconsumed rows — content-addressed
                // ids change with content, so a retired row must never be
                // re-matched (that re-minted every save at version+1 and
                // left the other live rows to pile up, #705).
                const existingSegment =
                    currentSegments.find(s => !consumed.has(s) && s.id === segmentRowId(note.id, section.id)) ||
                    currentSegments.find(s => {
                        if (consumed.has(s) || s.isHistory) return false;
                        const samePosition = s.position === position;
                        const sameType = s.dataType === toSegmentDataType(section) || migrateSectionType(s.dataType) === section.type;
                        return samePosition && sameType;
                    });
                if (existingSegment) consumed.add(existingSegment);

                // Content changed or new segment
                if (!existingSegment || existingSegment.rawContent !== section.displayContent
                    || (existingSegment.sourceContent !== undefined && existingSegment.sourceContent !== sourceFragments[position])) {
                    const newVersion = (existingSegment?.version || 0) + 1;
                    const segment: NoteSegment = {
                        id: segmentRowId(note.id, section.id),
                        version: newVersion,
                        noteId: note.id,
                        position,
                        pageId: primaryPageId,
                        dataType: toSegmentDataType(section),
                        data: section.scriptBlock || null,
                        rawContent: section.displayContent,
                        sourceContent: sourceFragments[position],
                        createdAt: now,
                        updatedAt: now,
                        isHistory: false,
                    };
                    await this.db.saveSegment(segment);
                    if (existingSegment) {
                        // The bumped incarnation supersedes the previous latest.
                        await retire(existingSegment);
                    }
                } else if (existingSegment.id !== segmentRowId(note.id, section.id)) {
                    // Same content, different ID — carry forward under the new ID
                    const segment: NoteSegment = {
                        id: segmentRowId(note.id, section.id),
                        version: existingSegment.version,
                        noteId: note.id,
                        position,
                        pageId: primaryPageId,
                        dataType: toSegmentDataType(section),
                        data: section.scriptBlock || null,
                        rawContent: existingSegment.rawContent,
                        sourceContent: sourceFragments[position],
                        createdAt: existingSegment.createdAt,
                        updatedAt: now,
                        isHistory: false,
                    };
                    await this.db.saveSegment(segment);
                    // The old-id row is superseded — retired by the sweep below.
                } else {
                    const data = section.scriptBlock ? {
                        ...section.scriptBlock,
                        createdAt: existingSegment.data?.createdAt ?? existingSegment.createdAt,
                        version: existingSegment.data?.version ?? existingSegment.version,
                    } : null;
                    const dataType = toSegmentDataType(section);
                    const sourceContent = sourceFragments[position];
                    if (existingSegment.isHistory || existingSegment.position !== position
                        || existingSegment.dataType !== dataType || existingSegment.sourceContent !== sourceContent
                        || JSON.stringify(existingSegment.data) !== JSON.stringify(data)) {
                        await this.db.saveSegment({
                            ...existingSegment, position, dataType, data, sourceContent,
                            isHistory: false, updatedAt: now,
                        });
                    }
                }
                position++;
            }

            // Retire every live row not carried into the new document. Without
            // this sweep, stale live rows accumulate across saves and
            // reconstruction joins them into duplicated content (#705).
            const keptIds = new Set(sections.map(s => segmentRowId(note.id, s.id)));
            for (const segment of currentSegments) {
                if (!keptIds.has(segment.id)) await retire(segment);
            }
            // V14 — rebuild derived block index after segment changes.
            await this.db.rebuildBlockIndexForNote?.(note.id);
        }

        // T4 bridge — frontmatter `tags:` union into note_tags. Frontmatter is
        // ADDITIVE ONLY: a label present in content is (re-)added on every
        // save; removing it from frontmatter never deletes the note_tag
        // (note_tags carry no provenance, so destructive sync could delete
        // manual tags sharing the label). Manual editors still replace the
        // manual portion via patch.tags.
        if (patch.tags || patch.rawContent !== undefined) {
            const latestSegments = await this.db.getLatestSegmentsForNote(note.id);
            const fmTags: TypedTagItem[] = frontmatterTags
                ?? frontmatterTagsOf(
                    latestSegments.map(segment => ({ type: segment.dataType, rawContent: segment.rawContent })),
                    knownTypes,
                );

            const existingTags = await this.db.getTagsForNote(note.id);
            const retainedExisting = existingTags
                .filter(t => !t.type || !knownTypes.includes(t.type))
                .map(t => ({ label: t.label, type: t.type }));

            const baseManual = patch.tags
                ? patch.tags
                : retainedExisting.map(t => (t.type ? t : t.label));
            await this.db.setNoteTags(note.id, [
                ...baseManual,
                ...fmTags.map(t => (t.type ? t : t.label)),
            ]);
        }

        // Handle Results (linked to latest version state of note)
        if (patch.results) {
            const resultData = patch.results;
            // Key the segment lookup by segmentId (positional section id) —
            // previously looked up by blockContentId (a content hash), which
            // never matched and left every result's segmentVersion undefined.
            const latestSegment = await resolveLatestSegment(this.db, note.id, patch.segmentId);
            const newSession: Session = {
                id: patch.resultId || uuidv7(),
                segmentId: latestSegment?.id ?? patch.segmentId,
                segmentVersion: latestSegment?.version,
                noteId: note.id,   // Use resolved UUID (not raw route param)
                pageId: primaryPageId,
                blockId: patch.blockId,
                blockContentId: patch.blockContentId,
                version: patch.version,
                origin: patch.origin,
                startTime: resultData.startTime,
                endTime: resultData.endTime,
                duration: resultData.duration ?? 0,
                roundsCompleted: resultData.roundsCompleted,
                totalRounds: resultData.totalRounds,
                repsCompleted: resultData.repsCompleted,
                completed: resultData.completed,
                // V16 write-path lifecycle (ticket 005): completion writes are
                // 'completed'; unmount partial saves (completed === false) are
                // 'in-progress' — swept by the 30-day GC if never finalized.
                status: resultData.completed === false ? 'in-progress' : 'completed',
                createdAt: resultData.endTime || now
            };
            await this.db.saveSession(newSession);

            // Stream raw statements directly to the unified event store (V21: data.logs eliminated)
            if (resultData.logs?.length && this.db.appendEvents && this.db.finalizeSummaries) {
                const identity = {
                    noteId: note.id,
                    resultId: newSession.id,
                    segmentId: newSession.segmentId,
                    segmentVersion: newSession.segmentVersion,
                    blockContentId: newSession.blockContentId,
                    origin: newSession.origin,
                    pageId: newSession.pageId,
                    workoutTimestamp: newSession.endTime || now,
                };
                try {
                    await this.db.appendEvents(toEventRows(resultData.logs, identity));
                    await this.db.finalizeSummaries(newSession.id, toSummaryEventRows(resultData.logs, identity));
                } catch (err) {
                    console.warn(`[IndexedDBContentProvider] event projection failed for session ${newSession.id}`, err);
                }
            }
        }

        // Persist the mutated note when metadata/content changed (updateEntry
        // previously never saved it). Pure result writes skip the save so
        // recording a workout doesn't churn the note row.
        if (metadataChanged) await this.db.saveNote(note);

        // Derived projection fields for the returned entry (V22 — junction).
        const tags = await this.db.getTagsForNote(note.id);
        // Metadata-only patches (date/slug moves) must still return the note's
        // body — consumers treat the return as the fresh entry state.
        const rawContent = patch.rawContent === undefined
            ? segmentsToRawContent(await this.db.getLatestSegmentsForNote(note.id), tags.map(t => t.label))
            : finalRawContent;

        return {
            id: note.id,
            title: note.title,
            createdAt: note.createdAt,
            updatedAt: note.createdAt,
            targetDate: note.date ?? note.createdAt,
            journalDate: projection.journalDate,
            slug: projection.slug,
            pageId: projection.pageId,
            rawContent,
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
        const id = attachment.id ?? uuidv7();
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
