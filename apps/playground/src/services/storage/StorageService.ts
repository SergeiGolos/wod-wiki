import type {
  Attachment,
  BlockIndexRow,
  EventRecord,
  Note,
  NoteSegment,
  NoteTag,
  Page,
  Session,
  Tag,
} from '@/types/storage';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';
import type { IStorage } from './IStorage';
import type { NotePersistenceStorage } from '../persistence/types';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class StorageService implements NotePersistenceStorage {
  constructor(private readonly storage: IStorage) {}

  // ---------------------------------------------------------------------------
  // Notes
  // ---------------------------------------------------------------------------

  async getNote(id: string): Promise<Note | undefined> {
    return this.storage.readonly('notes').get(id);
  }

  async getNoteBySlug(slug: string): Promise<Note | undefined> {
    const matches = await this.storage.readonly('notes').getAllFromIndex('by-slug', slug);
    return matches[0];
  }

  async getAllNotes(): Promise<Note[]> {
    return this.storage.readonly('notes').getAll();
  }

  async saveNote(note: Note): Promise<string> {
    await this.storage.readwrite('notes').put(note);
    return note.id;
  }

  async deleteNote(id: string): Promise<void> {
    await this.storage.transaction(
      ['notes', 'segments', 'results', 'sessions', 'attachments', 'events', 'note_tags', 'block_index'],
      'readwrite',
      async (tx) => {
        await tx.readwrite('notes').delete(id);

        const deleteFromStoreByIndex = async (
          storeName: 'segments' | 'results' | 'sessions' | 'attachments' | 'note_tags' | 'block_index'
        ) => {
          const store = tx.readwrite(storeName);
          const rows = await store.getAllFromIndex('by-note', id);
          for (const row of rows) {
            if (row && typeof row === 'object' && 'id' in row) {
              const key = row.id as IDBValidKey;
              if (key !== undefined) {
                await store.delete(key);
              }
            }
          }
        };

        await deleteFromStoreByIndex('segments');
        await deleteFromStoreByIndex('results');
        await deleteFromStoreByIndex('sessions');
        await deleteFromStoreByIndex('attachments');
        await deleteFromStoreByIndex('note_tags');
        await deleteFromStoreByIndex('block_index');

        // Delete events by result
        const eventsStore = tx.readwrite('events');
        const eventRows = await eventsStore.getAll();
        for (const ev of eventRows) {
          if (ev.noteId === id) {
            await eventsStore.delete(ev.id);
          }
        }
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Pages
  // ---------------------------------------------------------------------------

  async getPage(id: string): Promise<Page | undefined> {
    return this.storage.readonly('page').get(id);
  }

  async getPageByDate(date: string): Promise<Page | undefined> {
    const matches = await this.storage.readonly('page').getAllFromIndex('by-date', date);
    return matches[0];
  }

  async savePage(page: Page): Promise<string> {
    await this.storage.readwrite('page').put(page);
    return page.id;
  }

  async getOrCreatePageForDate(date: string): Promise<Page> {
    const existing = await this.getPageByDate(date);
    if (existing) return existing;
    const page: Page = { id: generateId(), date, title: date, createdAt: Date.now() };
    try {
      await this.savePage(page);
      return page;
    } catch (err) {
      const winner = await this.getPageByDate(date);
      if (winner) return winner;
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Tags
  // ---------------------------------------------------------------------------

  async getAllTags(): Promise<Tag[]> {
    return this.storage.readonly('tags').getAll();
  }

  async getTagsForNote(noteId: string): Promise<Tag[]> {
    const links = await this.storage.readonly('note_tags').getAllFromIndex('by-note', noteId);
    const tagsStore = this.storage.readonly('tags');
    const tags: Tag[] = [];
    for (const link of links) {
      const tag = await tagsStore.get(link.tagId);
      if (tag) tags.push(tag);
    }
    return tags;
  }
  async getTagByLabel(label: string): Promise<Tag | undefined> {
    const matches = await this.storage.readonly('tags').getAllFromIndex('by-label', label);
    return matches[0];
  }

  async deleteTag(id: string): Promise<void> {
    await this.storage.readwrite('tags').delete(id);
  }


  async getNotesForTag(label: string): Promise<Note[]> {
    const tags = await this.storage.readonly('tags').getAllFromIndex('by-label', label);
    if (!tags[0]) return [];
    const tagId = tags[0].id;
    const links = await this.storage.readonly('note_tags').getAllFromIndex('by-tag', tagId);
    const notesStore = this.storage.readonly('notes');
    const notes: Note[] = [];
    for (const link of links) {
      const note = await notesStore.get(link.noteId);
      if (note) notes.push(note);
    }
    return notes;
  }

  async setNoteTags(noteId: string, labels: string[]): Promise<void> {
    await this.storage.transaction(['tags', 'note_tags'], 'readwrite', async (tx) => {
      const linksStore = tx.readwrite('note_tags');
      const tagsStore = tx.readwrite('tags');
      const existingLinks = await linksStore.getAllFromIndex('by-note', noteId);
      for (const link of existingLinks) {
        await linksStore.delete(link.id);
      }

      const now = Date.now();
      for (const label of Array.from(new Set(labels))) {
        const matchingTags = await tagsStore.getAllFromIndex('by-label', label);
        let tag = matchingTags[0];
        if (!tag) {
          tag = { id: generateId(), label, createdAt: now };
          await tagsStore.put(tag);
        }
        await linksStore.put({ id: generateId(), noteId, tagId: tag.id });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Segments
  // ---------------------------------------------------------------------------

  async getSegment(segmentId: string, version: number): Promise<NoteSegment | undefined> {
    return this.storage.readonly('segments').get([segmentId, version]);
  }

  async getLatestSegmentVersion(segmentId: string): Promise<NoteSegment | undefined> {
    const all = await this.storage.readonly('segments').getAll();
    const matching = all.filter((s) => s.id === segmentId).sort((a, b) => b.version - a.version);
    return matching[0];
  }

  async getAllSegments(): Promise<NoteSegment[]> {
    return this.storage.readonly('segments').getAll();
  }

  async getLatestSegmentsForNote(noteId: string, opts?: { includeHistory?: boolean }): Promise<NoteSegment[]> {
    const rows = await this.storage.readonly('segments').getAllFromIndex('by-note', noteId);
    const latest = new Map<string, NoteSegment>();
    for (const segment of rows) {
      const current = latest.get(segment.id);
      if (!current || segment.version > current.version) {
        latest.set(segment.id, segment);
      }
    }
    return Array.from(latest.values())
      .filter((segment) => opts?.includeHistory || !segment.isHistory)
      .sort((a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt));
  }

  async saveSegment(segment: NoteSegment): Promise<IDBValidKey> {
    return this.storage.readwrite('segments').put(segment);
  }

  // ---------------------------------------------------------------------------
  // Sessions / Results
  // ---------------------------------------------------------------------------

  async saveSession(session: Session): Promise<string> {
    await this.storage.readwrite('sessions').put(session);
    return session.id;
  }

  async saveResult(result: Session): Promise<string> {
    return this.saveSession(result);
  }

  async getSessionById(sessionId: string): Promise<Session | undefined> {
    return this.storage.readonly('sessions').get(sessionId);
  }

  async getResultById(resultId: string): Promise<Session | undefined> {
    return this.getSessionById(resultId);
  }

  async getSessionsForNote(noteId: string): Promise<Session[]> {
    return this.storage.readonly('sessions').getAllFromIndex('by-note', noteId);
  }

  async getResultsForNote(noteId: string): Promise<Session[]> {
    return this.getSessionsForNote(noteId);
  }

  async getSessionsByContentId(blockContentId: string): Promise<Session[]> {
    return this.storage.readonly('sessions').getAllFromIndex('by-content', blockContentId);
  }

  async getResultsByContentId(blockContentId: string): Promise<Session[]> {
    return this.getSessionsByContentId(blockContentId);
  }

  async getSessionsForSection(noteId: string, sectionId: string): Promise<Session[]> {
    const sessions = await this.getSessionsForNote(noteId);
    return sessions.filter((s) => s.blockContentId === sectionId);
  }

  async getResultsForSection(noteId: string, sectionId: string): Promise<Session[]> {
    return this.getSessionsForSection(noteId, sectionId);
  }

  async getRecentSessions(limit = 20): Promise<Session[]> {
    const all = await this.storage.readonly('sessions').getAll();
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  async getRecentResults(limit = 20): Promise<Session[]> {
    return this.getRecentSessions(limit);
  }

  // ---------------------------------------------------------------------------
  // Attachments
  // ---------------------------------------------------------------------------

  async saveAttachment(attachment: Attachment): Promise<string> {
    await this.storage.readwrite('attachments').put(attachment);
    return attachment.id;
  }

  async getAttachmentsForNote(noteId: string): Promise<Attachment[]> {
    return this.storage.readonly('attachments').getAllFromIndex('by-note', noteId);
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.storage.readwrite('attachments').delete(id);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  async appendEvents(rows: EventRecord[]): Promise<void> {
    if (rows.length === 0) return;
    await this.storage.transaction(['events'], 'readwrite', async (tx) => {
      const store = tx.readwrite('events');
      for (const row of rows) {
        await store.put(row);
      }
    });
  }

  async finalizeSummaries(resultId: string, rows: EventRecord[]): Promise<void> {
    await this.storage.transaction(['events'], 'readwrite', async (tx) => {
      const store = tx.readwrite('events');
      const existing = await store.getAllFromIndex('by-result-grain', [resultId, 'summary']);
      for (const row of existing) {
        await store.delete(row.id);
      }
      for (const row of rows) {
        await store.put(row);
      }
    });
  }

  async deleteEvents(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.storage.transaction(['events'], 'readwrite', async (tx) => {
      const store = tx.readwrite('events');
      for (const id of ids) {
        await store.delete(id);
      }
    });
  }

  async getEventsForNote(noteId: string): Promise<EventRecord[]> {
    const sessions = await this.getResultsForNote(noteId);
    const resultIds = new Set(sessions.map((s) => s.id));
    resultIds.add(`wellness:${noteId}`);
    const events: EventRecord[] = [];
    const store = this.storage.readonly('events');
    for (const resultId of resultIds) {
      const forResult = await store.getAllFromIndex('by-result-grain', [resultId, 'summary']);
      events.push(...forResult);
    }
    return events;
  }

  async getEventsByResult(resultId: string): Promise<EventRecord[]> {
    const all = await this.storage.readonly('events').getAll();
    return all.filter((ev) => ev.resultId === resultId);
  }

  async getEventsByTimeRange(start: number, end: number): Promise<EventRecord[]> {
    const all = await this.storage.readonly('events').getAll();
    return all.filter((ev) => ev.timestamp >= start && ev.timestamp <= end);
  }

  async getEventsByMetricDates(dates: readonly string[]): Promise<EventRecord[]> {
    const dateSet = new Set(dates);
    const all = await this.storage.readonly('events').getAll();
    return all.filter((ev) => ev.metricDateKeys?.some((d) => dateSet.has(d)));
  }

  async getEventsByContent(blockContentId: string): Promise<EventRecord[]> {
    const all = await this.storage.readonly('events').getAll();
    return all.filter((ev) => ev.blockContentId === blockContentId);
  }

  async scanAll(): Promise<EventRecord[]> {
    return this.storage.readonly('events').getAll();
  }

  async countEvents(): Promise<number> {
    return this.storage.readonly('events').count();
  }

  // ---------------------------------------------------------------------------
  // Block Index
  // ---------------------------------------------------------------------------

  async getAllBlockIndex(): Promise<BlockIndexRow[]> {
    return this.storage.readonly('block_index').getAll();
  }

  async rebuildBlockIndexForNote(noteId: string): Promise<void> {
    const note = await this.getNote(noteId);
    const noteTitle = note?.title ?? '';
    const segments = await this.getLatestSegmentsForNote(noteId);

    await this.storage.transaction(['block_index'], 'readwrite', async (tx) => {
      const store = tx.readwrite('block_index');
      const existing = await store.getAllFromIndex('by-note', noteId);
      for (const row of existing) {
        await store.delete(row.id);
      }
      for (const segment of segments) {
        if (segment.isHistory) continue;
        const blockContentId = segment.data?.contentId ?? undefined;
        await store.put({
          id: `${noteId}:${segment.id}:${segment.version}`,
          noteId,
          segmentId: segment.id,
          segmentVersion: segment.version,
          position: segment.position,
          dataType: segment.dataType,
          blockContentId,
          rawContent: segment.rawContent,
          noteTitle,
          createdAt: segment.createdAt,
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Efforts
  // ---------------------------------------------------------------------------

  async getEffort(slug: string): Promise<IEffort | undefined> {
    return this.storage.readonly('efforts').get(slug);
  }

  async getAllEfforts(): Promise<IEffort[]> {
    return this.storage.readonly('efforts').getAll();
  }

  async saveEffort(effort: IEffort): Promise<string> {
    await this.storage.readwrite('efforts').put(effort);
    return effort.slug;
  }

  // ---------------------------------------------------------------------------
  // Seed Content
  // ---------------------------------------------------------------------------

  async getSeedContent(): Promise<Array<{ path: string; raw: string }>> {
    const notes = await this.storage.readonly('notes').getAll();
    const segments = await this.storage.readonly('segments').getAll();
    const latestSegmentByNote = new Map<string, NoteSegment>();
    for (const segment of segments) {
      const current = latestSegmentByNote.get(segment.noteId);
      if (!current || segment.version > current.version) {
        latestSegmentByNote.set(segment.noteId, segment);
      }
    }
    const out: Array<{ path: string; raw: string }> = [];
    for (const note of notes) {
      if (note.seedOrigin !== 'seed' || !note.slug) continue;
      const latest = latestSegmentByNote.get(note.id);
      if (latest?.rawContent) {
        out.push({ path: note.slug, raw: latest.rawContent });
      }
    }
    return out;
  }

  async wipe(): Promise<void> {
    await this.storage.wipe();
  }
}
