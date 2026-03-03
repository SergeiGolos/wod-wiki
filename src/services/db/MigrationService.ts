/**
 * Migration Service
 * 
 * Handles one-time migration from LocalStorage to IndexedDB V4.
 * Legacy script records are converted to NoteSegments.
 */

import { v4 as uuidv4 } from 'uuid';
import { indexedDBService } from './IndexedDBService';
import { Note, NoteSegment, WorkoutResult } from '../../types/storage';
import { HistoryEntry } from '../../types/history';

const KEY_PREFIX = 'wodwiki:history:';
const MIGRATION_FLAG = 'wodwiki:migrated-to-idb-v4';

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
                    const segmentId = uuidv4();
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
                        rawContent: entry.rawContent,
                        tags: entry.tags || [],
                        createdAt: entry.createdAt || Date.now(),
                        updatedAt: entry.updatedAt || Date.now(),
                        targetDate: entry.targetDate || entry.createdAt || Date.now(),
                        segmentIds: [segmentId],
                    };

                    // 3. Migrate Result (if exists)
                    if (entry.results) {
                        // @ts-ignore - Handle potential type mismatch during migration
                        const legacyResult = entry.results as any;

                        const result: WorkoutResult = {
                            id: uuidv4(),
                            segmentId: segmentId,
                            noteId: entry.id,
                            data: legacyResult,
                            completedAt: legacyResult.completedAt || legacyResult.endTime || Date.now()
                        };
                        await indexedDBService.saveResult(result);
                    }

                    await indexedDBService.saveNote(note);
                    await indexedDBService.saveSegment(segment);
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
