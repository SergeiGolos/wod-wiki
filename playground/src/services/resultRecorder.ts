/**
 * resultRecorder — the single playground seam for persisting a workout result.
 *
 * Replaces the three ad-hoc write paths (JournalPage's direct
 * `indexedDBService.saveResult`, WallClockPage's `notePersistence.mutateNote`,
 * and the NoteEditor in-memory build), each of which re-derived the result's
 * identity (noteId, blockContentId) per call-site. The Recorder
 * owns that identity resolution + the write, so callers pass a run block and a
 * destination NoteRef and get a correctly-keyed result.
 *
 * Identity policy (additive — never orphans historical results):
 *  - noteId         = destination.raw        (canonical playground id)
 *  - blockContentId  = runBlock.contentId    (stable across clone/reorder; the
 *                                             preferred join key)
 *
 * Tested through `createResultRecorder` with an in-memory sink — no IndexedDB.
 */
import { indexedDBService } from '@/services/db/IndexedDBService';
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
    record({ runBlock, destination, resultId, data, completedAt }) {
      const result: WorkoutResult = {
        id: resultId,
        noteId: destination.raw,
        // Content-stable identity — the preferred join key; survives the run
        // block being cloned/reordered relative to its source.
        blockContentId: runBlock.contentId,
        data,
        completedAt,
      };
      return sink.saveResult(result).then(() => result);
    },
  };
}

/** Pre-wired Recorder over the IndexedDB results store — the one callers use. */
export const playgroundRecorder = createResultRecorder(indexedDBService);
