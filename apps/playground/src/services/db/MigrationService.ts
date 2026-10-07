import { v7 as uuidv7 } from 'uuid';
import { storageService } from '@/services/storage';
import { toEventRows, toSummaryEventRows } from '@bitcobblers/wod-wiki-wql';
import type { Note, NoteSegment, Session } from '../../types/storage';
import type { HistoryEntry } from '../../types/history';

const KEY_PREFIX = 'wodwiki:history:';
const MIGRATION_FLAG = 'wodwiki:migrated-to-idb-v4';

function legacySourceId(entry: unknown): string | undefined {
    if (!entry || typeof entry !== 'object') return undefined;
    const e = entry as Record<string, unknown>;
    if (typeof e.sourceId === 'string') return e.sourceId;
    if (typeof e.templateId === 'string') return e.templateId;
    const createdFrom = e.createdFrom;
    if (createdFrom && typeof createdFrom === 'object') {
        const ref = (createdFrom as Record<string, unknown>).ref;
        if (typeof ref === 'string') return ref;
    }
    return undefined;
}

export const migrationService = {
    async runMigration() {
        if (localStorage.getItem(MIGRATION_FLAG)) return;
        const failures: unknown[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith(KEY_PREFIX)) continue;
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            try {
            const entry = JSON.parse(raw) as HistoryEntry;
            if (!entry.id || !entry.rawContent) continue;
            const segmentId = uuidv7();
            const segment: NoteSegment = {
                id: segmentId, version: 1, noteId: entry.id,
                dataType: 'markdown', data: null, rawContent: entry.rawContent,
                createdAt: entry.updatedAt ?? Date.now(),
            };
            const note: Note = {
                id: entry.id, title: entry.title || 'Untitled',
                createdAt: entry.createdAt ?? Date.now(), sourceId: legacySourceId(entry),
            };
            await storageService.withTransaction(['notes', 'segments', 'sessions', 'events'], async scoped => {
                if (await scoped.getNote(entry.id)) return;
                await scoped.saveNote(note);
                await scoped.saveSegment(segment);
                if (!entry.results) return;
                const logs = entry.results.logs ?? [];
                const session: Session = {
                    id: uuidv7(), blockContentId: segmentId, noteId: entry.id,
                    segmentId, segmentVersion: 1,
                    startTime: entry.results.startTime, endTime: entry.results.endTime,
                    duration: entry.results.duration, completed: entry.results.completed,
                    createdAt: entry.updatedAt ?? entry.results.endTime,
                };
                await scoped.saveSession(session);
                const identity = {
                    noteId: entry.id, resultId: session.id, segmentId,
                    segmentVersion: 1, blockContentId: segmentId,
                    workoutTimestamp: session.endTime,
                };
                await scoped.appendEvents(toEventRows(logs, identity));
                await scoped.finalizeSummaries(session.id, toSummaryEventRows(logs, identity));
            });
            } catch (error) {
                failures.push(error);
            }
        }
        if (failures.length) throw new AggregateError(failures, 'Legacy migration could not save every entry');
        localStorage.setItem(MIGRATION_FLAG, 'true');
    },
};
