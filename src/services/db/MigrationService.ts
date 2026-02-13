/**
 * Migration Service
 * 
 * Handles one-time migration from LocalStorage to IndexedDB.
 */

import { v4 as uuidv4 } from 'uuid';
import { indexedDBService } from './IndexedDBService';
import { Note, Script, WorkoutResult } from '../../types/storage';
import { HistoryEntry } from '../../types/history';

const KEY_PREFIX = 'wodwiki:history:';
const MIGRATION_FLAG = 'wodwiki:migrated-to-idb-v1';

export const migrationService = {
    async runMigration() {
        if (localStorage.getItem(MIGRATION_FLAG)) {
            console.log('[Migration] Already migrated.');
            return;
        }

        console.log('[Migration] Starting migration to IndexedDB...');
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

                    // 1. Create Note
                    const note: Note = {
                        id: entry.id, // Preserve ID
                        title: entry.title || 'Untitled',
                        rawContent: entry.rawContent,
                        tags: entry.tags || [],
                        createdAt: entry.createdAt || Date.now(),
                        updatedAt: entry.updatedAt || Date.now()
                    };

                    // 2. Create Initial Script Version
                    // Migration assumes current content is the "latest" version
                    const scriptId = uuidv4();
                    const script: Script = {
                        id: scriptId,
                        noteId: entry.id,
                        content: entry.rawContent,
                        versionHash: 'migrated', // Placeholder hash
                        createdAt: entry.updatedAt || Date.now()
                    };

                    // 3. Migrate Result (if exists)
                    // If the entry has results, they are linked to this script version
                    if (entry.results) {
                        // @ts-ignore - Handle potential type mismatch during migration
                        const legacyResult = entry.results as any;

                        const result: WorkoutResult = {
                            id: uuidv4(),
                            scriptId: scriptId,
                            noteId: entry.id,
                            data: legacyResult, // Trusting legacy data structure
                            completedAt: legacyResult.completedAt || legacyResult.endTime || Date.now()
                        };
                        await indexedDBService.saveResult(result);
                    }

                    await indexedDBService.saveNote(note);
                    await indexedDBService.saveScript(script);
                    count++;

                } catch (err) {
                    console.error('[Migration] Failed to migrate entry:', key, err);
                }
            }

            localStorage.setItem(MIGRATION_FLAG, 'true');
            console.log(`[Migration] Completed. Migrated ${count} entries.`);
        } catch (err) {
            console.error('[Migration] Fatal error during migration:', err);
        }
    }
};
