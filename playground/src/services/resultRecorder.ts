/**
 * resultRecorder — the single playground seam for persisting a workout result.
 *
 * Owns identity resolution + the write. Callers pass a run block, a blockId
 * (section position), a pre-computed version number, and a destination NoteRef.
 *
 * Identity policy:
 *  - noteId          = destination.raw        (canonical playground id)
 *  - blockId         = section.id             (position in the note)
 *  - blockContentId  = runBlock.contentId     (content hash at recording time)
 *  - version         = computed by caller     (content generation at this position)
 *
 * Version is computed by the pure `computeVersion()` function, which the caller
 * invokes with the already-loaded results for the note. The recorder itself
 * stays a simple write primitive.
 */
import { indexedDBService } from '@/services/db/IndexedDBService';
export { computeVersion } from '@/utils/computeVersion';
import type { WorkoutResult } from '@/types/storage';
import type { WorkoutResults, ScriptBlock } from '@/components/Editor/types';
import type { NoteRef } from '../lib/noteIdentity';

/** Minimal write primitive the Recorder needs — IndexedDBService satisfies it. */
export interface ResultSink {
  saveResult(result: WorkoutResult): Promise<unknown>;
}

export interface RecordResultInput {
  /** The block that was actually run — carries `contentId` + `content`. */
  runBlock: ScriptBlock;
  /** Section position identity — which block in the note. */
  blockId: string;
  /** Content generation at this position. Compute via `computeVersion()`. */
  version: number;
  /** The destination note; `raw` becomes the result's `noteId`. */
  destination: NoteRef;
  /** Stable id for this result (the runtimeId). */
  resultId: string;
  /** The outcome data. */
  data: WorkoutResults;
  /** Completion timestamp (Unix ms). */
  completedAt: number;
}

export interface ResultRecorder {
  record(input: RecordResultInput): Promise<WorkoutResult>;
}


/**
 * Build a Recorder over an injected sink. Tests pass an in-memory sink;
 * production uses the pre-wired `playgroundRecorder` below.
 */
export function createResultRecorder(sink: ResultSink): ResultRecorder {
  return {
    record({ runBlock, blockId, version, destination, resultId, data, completedAt }) {
      const result: WorkoutResult = {
        id: resultId,
        noteId: destination.raw,
        blockId,
        blockContentId: runBlock.contentId,
        version,
        data,
        completedAt,
      };
      return sink.saveResult(result).then(() => result);
    },
  };
}

/** Pre-wired Recorder over the IndexedDB results store — the one callers use. */
export const playgroundRecorder = createResultRecorder(indexedDBService);
