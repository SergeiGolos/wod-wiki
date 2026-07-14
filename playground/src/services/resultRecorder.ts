/**
 * resultRecorder — the single seam for persisting a workout result.
 *
 * Owns identity resolution (noteId · blockId · blockContentId · version) and
 * delegates the write to an INotePersistence port. Placement A per
 * `docs/adr/cross-note-result-aggregation.md`: the Recorder sits ABOVE the two
 * persistence adapters so a single identity policy feeds both IndexedDB-full
 * (with analytics + attachments) and provider-delegated (demo) backends.
 */
import { notePersistence } from '@/services/persistence';
import { computeVersion } from '@/utils/computeVersion';
import type { HistoryEntry } from '@/types/history';
import type { WorkoutResult } from '@/types/storage';
import type { WorkoutResults, ScriptBlock } from '@/components/Editor/types';
import type { Segment } from '@/core/models/AnalyticsModels';

/** Re-export so callers (e.g. Canvas Runtime) can compute in tests / fallback paths. */
export { computeVersion } from '@/utils/computeVersion';

/**
 * Writer port the Recorder needs.
 *
 * `IndexedDBNotePersistence` and `ContentProviderNotePersistence` both satisfy
 * this. Kept narrow so the Recorder's true collaborator set is visible.
 */
export interface ResultMutation {
  workoutResult?: {
    id?: string;
    blockId?: string;
    blockContentId?: string;
    version?: number;
    segmentId?: string;
    data: WorkoutResults;
    completedAt?: number;
    analyticsSegments?: Segment[];
  };
}

export interface ResultWriter {
  getNote?(locator: { id: string }, options: { resultSelection: { mode: 'all-for-note' } }): Promise<HistoryEntry>;
  mutateNote(locator: { id: string }, mutation: ResultMutation): Promise<unknown>;
}

export interface RecordResultInput {
  /** The block that was actually run — carries `contentId` + `content`. */
  runBlock: ScriptBlock;
  /** Section position identity — which block in the note. */
  blockId: string;
  /** Canonical UUID of the owning Note. */
  noteId: string;
  /** Stable id for this result (the runtimeId). */
  resultId: string;
  /** The outcome data. */
  data: WorkoutResults;
  /** Completion timestamp (Unix ms). */
  completedAt: number;
  /** Optional analytics segments to persist atomically with this result. */
  analyticsSegments?: Segment[];
}

export interface ResultRecorder {
  record(input: RecordResultInput): Promise<WorkoutResult>;
}

/**
 * Build a Recorder over an injected writer. Tests pass a stub writer;
 * production uses `playgroundRecorder` (wired to `notePersistence`).
 */
export function createResultRecorder(writer: ResultWriter): ResultRecorder {
  return {
    async record({ runBlock, blockId, noteId, resultId, data, completedAt, analyticsSegments }) {
      // Identity in one place: Note UUID + note-scoped block + content + version.
      const entry = await writer.getNote?.({ id: noteId }, { resultSelection: { mode: 'all-for-note' } });
      const existing = entry?.extendedResults ?? [];
      const version = computeVersion(blockId, runBlock.contentId, existing);

      // Delegate the write through the chosen writer (INotePersistence.mutateNote).
      // The writer routes through the adapter that backs it — IndexedDB-full for
      // production, provider-delegated for demos — but identity policy is unified here.
      await writer.mutateNote(
        { id: noteId },
        {
          workoutResult: {
            id: resultId,
            blockId,
            blockContentId: runBlock.contentId,
            version,
            segmentId: runBlock.id,
            data,
            completedAt,
            analyticsSegments,
          },
        },
      );

      const result: WorkoutResult = {
        id: resultId,
        noteId,
        blockId,
        blockContentId: runBlock.contentId,
        version,
        data,
        completedAt,
      };
      return result;
    },
  };
}

/**
 * Pre-wired Recorder over the default persistence adapter — the one callers use.
 * Sits above IndexedDBNotePersistence (which writes results atomically with
 * analytics + attachments) so a single identity policy feeds both adapters.
 */
export const playgroundRecorder = createResultRecorder(notePersistence);
