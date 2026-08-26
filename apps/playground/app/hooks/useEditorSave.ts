/**
 * useEditorSave — Generic editor save timing mechanics.
 *
 * Handles WHEN to save. Callers decide HOW to save via the `onSave` callback.
 *
 * Save triggers:
 *   - Line change: flush pending save for previous line immediately, then
 *     arm an idle timer for the new line (fires after `lineIdleMs` of no edits).
 *   - Blur: flush immediately.
 *   - pagehide / visibilitychange→hidden: flush synchronously (best-effort).
 *   - flush(): callable by parent for button clicks, navigation guards, etc.
 *
 * No-op if content hasn't changed since the last save.
 */

import { useCallback, useEffect, useRef } from 'react';

export interface UseEditorSaveOptions {
  /** Called with the latest content whenever a save should occur. */
  onSave: (content: string) => void | Promise<void>;
  /**
   * Idle time (ms) after the last keystroke on a given line before saving.
   * Default: 800ms.
   */
  lineIdleMs?: number;
}

export interface UseEditorSaveResult {
  /** Wire to the editor's onChange. Tracks content + active line. */
  onChange: (value: string) => void;
  /**
   * Wire to the editor's onCursorPositionChange (line, column).
   * A line change flushes any pending save for the old line immediately.
   */
  onLineChange: (line: number, column: number) => void;
  /** Wire to the editor's onBlur. Flushes immediately. */
  onBlur: () => void;
  /**
   * Force an immediate save. Returns a Promise that resolves when the
   * save completes (or immediately if there's nothing pending).
   */
  flush: () => Promise<void>;
}

export function useEditorSave({
  onSave,
  lineIdleMs = 800,
}: UseEditorSaveOptions): UseEditorSaveResult {
  // Latest content seen — used by flush to always save the right value
  const contentRef = useRef<string | null>(null);
  // Content at the last completed save — used for change detection
  const lastSavedRef = useRef<string | null>(null);
  // Active line number being edited
  const activeLineRef = useRef<number | null>(null);
  // Pending idle timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // In-flight save promise (so flush can chain)
  const inflightRef = useRef<Promise<void>>(Promise.resolve());
  // Stable ref to onSave so effects/closures don't stale
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Core save: write content if it changed, chain onto any in-flight write. */
  const doSave = useCallback((value: string): Promise<void> => {
    if (value === lastSavedRef.current) return inflightRef.current;
    lastSavedRef.current = value;
    const result = inflightRef.current.then(() => {
      // Double-check: by the time the chain runs, another save may have overtaken
      if (value !== lastSavedRef.current) return;
      return onSaveRef.current(value) ?? undefined;
    });
    inflightRef.current = result.then(() => {});
    return result.then(() => {});
  }, []);

  /** Arm (or re-arm) the idle timer for the current line. */
  const armTimer = useCallback((_value: string) => {
    cancelTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (contentRef.current !== null) {
        doSave(contentRef.current);
      }
    }, lineIdleMs);
  }, [cancelTimer, doSave, lineIdleMs]);

  const onChange = useCallback((value: string) => {
    contentRef.current = value;
    armTimer(value);
  }, [armTimer]);

  const onLineChange = useCallback((line: number, _column: number) => {
    if (activeLineRef.current !== null && line !== activeLineRef.current) {
      // Crossed a line boundary — flush the pending save immediately
      cancelTimer();
      if (contentRef.current !== null) {
        doSave(contentRef.current);
      }
    }
    activeLineRef.current = line;
  }, [cancelTimer, doSave]);

  const onBlur = useCallback(() => {
    cancelTimer();
    if (contentRef.current !== null) {
      doSave(contentRef.current);
    }
  }, [cancelTimer, doSave]);

  const flush = useCallback((): Promise<void> => {
    cancelTimer();
    if (contentRef.current !== null) {
      return doSave(contentRef.current);
    }
    return inflightRef.current;
  }, [cancelTimer, doSave]);

  // Flush on page unload (tab close, hard navigation)
  useEffect(() => {
    const handlePageHide = () => {
      cancelTimer();
      const value = contentRef.current;
      if (value !== null && value !== lastSavedRef.current) {
        lastSavedRef.current = value;
        // Synchronous best-effort — IDB transactions survive pagehide
        onSaveRef.current(value);
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [cancelTimer]);

  // Flush on SPA unmount
  useEffect(() => {
    return () => { flush(); };
    // flush is stable (no deps change), but eslint would complain — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { onChange, onLineChange, onBlur, flush };
}
