/**
 * Migration Service
 * 
 * Handles one-time migration from LocalStorage to IndexedDB V4.
 * Legacy script records are converted to NoteSegments.
 */

import { v7 as uuidv7 } from 'uuid';
import { storageService } from '@/services/storage';
import { toEventRows, toSummaryEventRows } from '@bitcobblers/wod-wiki-wql';
import type { StoredOutputStatement } from '@/components/Editor/types';
import { Note, NoteSegment, Session } from '../../types/storage';
import { HistoryEntry } from '../../types/history';

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
        if (localStorage.getItem(MIGRATION_FLAG)) {
            console.log('[Migration] Already migrated to V4.');
            return;
        }

        console.log('[Migration] Starting migration to IndexedDB V4...');
        let count = 0;

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith(KEY_PREFIX)) continue;

                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) continue;

                    const entry = JSON.parse(raw) as HistoryEntry;
                    if (!entry.id || !entry.rawContent) continue;

                    // 1. Create a single whole-document segment
                    const segmentId = uuidv7();
                    const segment: NoteSegment = {
                        id: segmentId,
                        version: 1,
                        noteId: entry.id,
                        dataType: 'markdown',
                        data: null,
                        rawContent: entry.rawContent,
                        createdAt: entry.updatedAt || Date.now(),
                    };

                    // 2. Create Note
                    const note: Note = {
                        id: entry.id, // Preserve ID
                        title: entry.title || 'Untitled',
                        createdAt: entry.createdAt || Date.now(),
                        sourceId: legacySourceId(entry),
                    };

                    // 3. Migrate Result (if exists) — the legacy inline
                    // `entry.results` logs become a flattened Session row
                    // plus unified event rows (detail + summary), exactly
                    // what the results→sessions V26 store migration does.
                    if (entry.results) {
                        const logs = entry.results as unknown as StoredOutputStatement[];
                        const startedAt = entry.createdAt || Date.now();
                        const result: Session = {
                            id: uuidv7(),
                            blockContentId: segmentId,
                            noteId: entry.id,
                            segmentId,
                            segmentVersion: 1,
                            startTime: startedAt,
                            endTime: entry.updatedAt || startedAt,
                            duration: (entry.updatedAt || startedAt) - startedAt,
                            completed: true,
                            createdAt: entry.updatedAt || startedAt,
                        };
                        await storageService.saveSession(result);
                        const identity = {
                            noteId: entry.id,
                            resultId: result.id,
                            segmentId,
                            segmentVersion: 1,
                            blockContentId: segmentId,
                            workoutTimestamp: result.endTime,
                        };
                        await storageService.appendEvents?.(toEventRows(logs, identity));
                        await storageService.finalizeSummaries?.(result.id, toSummaryEventRows(logs, identity));
                    }

                    await storageService.saveNote(note);
                    await storageService.saveSegment(segment as NoteSegment);
                    count++;

                } catch (err) {
                    console.error('[Migration] Failed to migrate entry:', key, err);
                }
            }

            localStorage.setItem(MIGRATION_FLAG, 'true');
            console.log(`[Migration] Completed. Migrated ${count} entries to V4.`);
        } catch (err) {
            console.error('[Migration] Fatal error during migration:', err);
        }
    }
};
