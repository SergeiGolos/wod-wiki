/**
 * usePlaygroundContent — Loads workout content with IndexedDB-first strategy.
 *
 * Owns WHAT to load and HOW to persist. Delegates WHEN to save to useEditorSave.
 *
 * 1. If the page exists in IndexedDB → return the stored content.
 * 2. If not → return the original MD content and seed IndexedDB for next time.
 * 3. On edits (onChange) → persist to IndexedDB.
 *    - Saves after the user leaves the current editing line (line-idle debounce).
 *    - Saves immediately on blur, navigation, pagehide, or flush() call.
 *    - Skips write if content hasn't changed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { playgroundContent, pageId as makePageId } from '../services/playgroundContent';
import { useEditorSave } from './useEditorSave';

interface UsePlaygroundContentOptions {
  category: string;
  name: string;
  /** Original markdown content from the build-time glob */
  mdContent: string;
}

/** Cap on the initial IndexedDB read before falling back to bundled content. */
export const LOAD_TIMEOUT_MS = 8000;

interface UsePlaygroundContentResult {
  /** The current content (from IndexedDB or MD fallback) */
  content: string;
  /** Whether the initial load from IndexedDB is still pending */
  loading: boolean;
  /** Call when the editor content changes */
  onChange: (value: string) => void;
  /**
   * Call when the cursor moves to a new line (wire to NoteEditor's
   * onCursorPositionChange). Triggers an immediate flush of any pending save.
   */
  onLineChange: (line: number, column: number) => void;
  /** Call when the editor loses focus. Flushes immediately. */
  onBlur: () => void;
  /** Reset this page back to the original MD content */
  resetToOriginal: () => Promise<void>;
  /** Whether the content has been modified from the original MD */
  isModified: boolean;
  /** Force an immediate save. Returns a Promise that resolves when done. */
  flush: () => Promise<void>;
}

export function usePlaygroundContent({
  category,
  name,
  mdContent,
}: UsePlaygroundContentOptions): UsePlaygroundContentResult {
  const pageId = makePageId(category, name);
  const [content, setContent] = useState(mdContent);
  const [loading, setLoading] = useState(true);
  const [isModified, setIsModified] = useState(false);

  // Stable refs so the save callback never goes stale
  const pageIdRef = useRef(pageId);
  const categoryRef = useRef(category);
  const nameRef = useRef(name);
  useEffect(() => { pageIdRef.current = pageId; }, [pageId]);
  useEffect(() => { categoryRef.current = category; }, [category]);
  useEffect(() => { nameRef.current = name; }, [name]);

  // mdContent ref for isModified tracking inside the save callback
  const mdContentRef = useRef(mdContent);
  useEffect(() => { mdContentRef.current = mdContent; }, [mdContent]);

  const handleSave = useCallback(async (value: string) => {
    await playgroundContent.savePage({
      id: pageIdRef.current,
      category: categoryRef.current,
      name: nameRef.current,
      content: value,
      updatedAt: Date.now(),
    });
  }, []);

  const { onChange: editorOnChange, onLineChange, onBlur, flush } = useEditorSave({
    onSave: handleSave,
    lineIdleMs: 500,
  });

  // Load from IndexedDB on mount (or when page identity changes)
  useEffect(() => {
    let cancelled = false;

    // A blocked IndexedDB open (e.g. a stale tab holding the DB during a
    // schema upgrade) never settles — without this cap the page would spin
    // "Loading…" forever. Fall back to the bundled content; the late load is
    // cancelled so it can't clobber the fallback.
    const timer = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      console.warn(
        `[usePlaygroundContent] load of ${pageId} timed out after ${LOAD_TIMEOUT_MS}ms — falling back to bundled content. ` +
        'If this repeats, close other tabs of this app: a stale tab may be holding the IndexedDB connection.',
      );
      setContent(mdContent);
      setIsModified(false);
      setLoading(false);
    }, LOAD_TIMEOUT_MS);

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      const elapsed = () => Math.round(performance.now() - t0);
      try {
        const page = await playgroundContent.getPage(pageId);
        // Diagnostic: fires even after the timeout fallback — distinguishes a
        // slow read from a never-settling one, and pinpoints the stuck step.
        console.info(`[usePlaygroundContent] getPage(${pageId}) settled at ${elapsed()}ms`);
        if (cancelled) return;

        if (page) {
          setContent(page.content);
          setIsModified(page.content !== mdContent);
        } else {
          setContent(mdContent);
          setIsModified(false);
          // Seed IDB so block IDs get locked in
          await playgroundContent.savePage({
            id: pageId,
            category,
            name,
            content: mdContent,
            updatedAt: Date.now(),
          });
          console.info(`[usePlaygroundContent] seed savePage(${pageId}) settled at ${elapsed()}ms`);
          if (cancelled) return;
        }
      } catch {
        if (!cancelled) {
          setContent(mdContent);
          setIsModified(false);
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pageId, mdContent, category, name]);

  const onChange = useCallback(
    (value: string) => {
      setContent(value);
      setIsModified(value !== mdContentRef.current);
      editorOnChange(value);
    },
    [editorOnChange],
  );

  const resetToOriginal = useCallback(async () => {
    setContent(mdContent);
    setIsModified(false);
    await playgroundContent.savePage({
      id: pageId,
      category,
      name,
      content: mdContent,
      updatedAt: Date.now(),
    });
  }, [pageId, category, name, mdContent]);

  // Flush any pending debounced save on unmount (navigation away, route change, etc.)
  // Uses refs so the cleanup always sees the latest pageId/category/name.
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  return { content, loading, onChange, onLineChange, onBlur, resetToOriginal, isModified, flush };
}
