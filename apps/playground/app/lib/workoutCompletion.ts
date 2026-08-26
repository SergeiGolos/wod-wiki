/**
 * workoutCompletion — resolve where a completed workout run maps back to.
 *
 * The completion handler in JournalDatePage has two entry paths:
 *   1. Editor-run  — NoteEditor's own timer completes; the editor already
 *      inserted the ```query:table block and threads the result id + block
 *      identity through `onCompleteWorkout`.
 *   2. Page-level  — `?autoStart` / note Play runs a pending runtime block;
 *      NoteEditor is not involved, so the block id embeds the SOURCE page's
 *      doc line and this page must resolve everything itself.
 *
 * Every run must land on the note that owns the block, keyed by the SAME
 * result id the query:table references, or the inline table is empty.
 * This helper is the single place that mapping is decided, so both paths
 * (and their edge cases) are unit-testable.
 */
import type { ScriptBlock } from '@/components/Editor/types';

export type CompletionBlock = Pick<ScriptBlock, 'id' | 'contentId'> & { startLine?: number };

export interface ResolveCompletionTargetsOptions {
  /** Section/block id the run reported (editor `time-<line>-<hash>`, runtime `wod-<line>-…`). */
  blockId: string;
  /** Block identity threaded from NoteEditor's own completion hook (path 1). */
  editorRunBlock?: CompletionBlock | null;
  /** Compiled blocks from onBlocksChange — this page's own blocks. */
  blocks: ScriptBlock[];
  /** Note UUID for pending autoStart runs; null for editor-run completions. */
  activeNoteId: string | null;
  /** The block a pending autoStart run was launched with (path 2). */
  timerBlock: ScriptBlock | null;
  /** Pending runtime result id (path 2); editor-run results carry their own. */
  activeRuntimeId: string | null;
  /** Result id threaded from the editor (path 1) — wins when present. */
  editorResultId?: string;
  /** Map a 1-based doc line to the owning note uuid. */
  resolveNoteUuid: (startLine: number) => string;
}

export interface ResolvedCompletionTargets {
  /** Block the run belongs to — drives noteId + blockContentId identity. */
  runBlock: CompletionBlock;
  /** Owning note uuid for persistence. */
  noteId: string;
  /** Result id — MUST equal the id embedded in the note's rows query. */
  resultId: string;
}

/**
 * Resolve the persistence targets for a completed run, or null when the
 * completed block cannot be attributed to this page's document (nothing to
 * record against — e.g. an autoStart block that no longer exists and has no
 * page-level timer handle).
 */
export function resolveCompletionTargets(
  opts: ResolveCompletionTargetsOptions,
): ResolvedCompletionTargets | null {
  const { blockId, editorRunBlock, blocks, activeNoteId, timerBlock, activeRuntimeId, editorResultId, resolveNoteUuid } = opts;

  // Path 1: the editor already knows the exact block (contentId survives moves).
  // Path 2: the page-level timer's own block is authoritative when its id
  // matches; a content-id match covers ids that diverged (line moves).
  const runBlock =
    editorRunBlock ??
    blocks.find((b) => b.id === blockId) ??
    (activeNoteId !== null && timerBlock?.id === blockId
      ? timerBlock
      : timerBlock
        ? blocks.find((b) => b.contentId && b.contentId === timerBlock.contentId) ?? timerBlock
        : undefined);
  if (!runBlock) return null;

  // Note: the running note (path 2) wins, else map the block's line — editor
  // section ids embed a 1-based line (`time-<line>-<hash>`), runtime ids the
  // source doc line (`wod-<line>-…`). Fail open to the first boundary so a
  // single-note date always lands, even when the line is off by bookkeeping.
  const noteId =
    activeNoteId ??
    (() => {
      const match = blockId.match(/^(?:wod|time|log)-(\d+)-/);
      if (match) return resolveNoteUuid(parseInt(match[1], 10));
      if (typeof runBlock.startLine === 'number') return resolveNoteUuid(runBlock.startLine + 1);
      return resolveNoteUuid(0);
    })();

  const resultId = editorResultId ?? activeRuntimeId ?? crypto.randomUUID();

  return { runBlock, noteId, resultId };
}