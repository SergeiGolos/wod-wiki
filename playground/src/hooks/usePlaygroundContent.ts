/**
 * usePlaygroundContent — Loads workout content with IndexedDB-first strategy.
 *
 * 1. If the page exists in IndexedDB → return the stored content.
 * 2. If not → return the original MD content and seed IndexedDB for next time.
 * 3. On edits (onChange) → persist to IndexedDB so block IDs remain stable.
 * 4. On unmount (navigation away) → flush any pending debounced save immediately
 *    so no edits are lost when the user navigates before the debounce fires.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { playgroundDB, PlaygroundDBService } from '../services/playgroundDB';

interface UsePlaygroundContentOptions {
  category: string;
  name: string;
  /** Original markdown content from the build-time glob */
  mdContent: string;
}

interface UsePlaygroundContentResult {
  /** The current content (from IndexedDB or MD fallback) */
  content: string;
  /** Whether the initial load from IndexedDB is still pending */
  loading: boolean;
  /** Call when the editor content changes */
  onChange: (value: string) => void;
  /** Reset this page back to the original MD content */
  resetToOriginal: () => void;
  /** Whether the content has been modified from the original MD */
  isModified: boolean;
  /** Force an immediate save (skips debounce). Safe to call anytime. */
  flush: () => void;
}

export function usePlaygroundContent({
  category,
  name,
  mdContent,
}: UsePlaygroundContentOptions): UsePlaygroundContentResult {
  const pageId = PlaygroundDBService.pageId(category, name);
  const [content, setContent] = useState(mdContent);
  const [loading, setLoading] = useState(true);
  const [isModified, setIsModified] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the latest unsaved content so the unmount flush can write the right value
  const pendingContentRef = useRef<string | null>(null);
  // Stable refs for use in the unmount cleanup (avoids stale closure)
  const pageIdRef = useRef(pageId);
  const categoryRef = useRef(category);
  const nameRef = useRef(name);
  useEffect(() => { pageIdRef.current = pageId; }, [pageId]);
  useEffect(() => { categoryRef.current = category; }, [category]);
  useEffect(() => { nameRef.current = name; }, [name]);

  // Load from IndexedDB on mount (or when page identity changes)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const page = await playgroundDB.getPage(pageId);
        if (cancelled) return;

        if (page) {
          // Found in IndexedDB — use persisted content
          setContent(page.content);
          setIsModified(page.content !== mdContent);
        } else {
          // Not in IndexedDB — seed it from MD so block IDs get locked in
          setContent(mdContent);
          setIsModified(false);
          await playgroundDB.savePage({
            id: pageId,
            category,
            name,
            content: mdContent,
            updatedAt: Date.now(),
          });
        }
      } catch {
        // IndexedDB unavailable — fall back to MD
        if (!cancelled) {
          setContent(mdContent);
          setIsModified(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [pageId, mdContent, category, name]);

  // Debounced save on content change
  const onChange = useCallback(
    (value: string) => {
      setContent(value);
      setIsModified(value !== mdContent);
      pendingContentRef.current = value;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        pendingContentRef.current = null;
        playgroundDB.savePage({
          id: pageId,
          category,
          name,
          content: value,
          updatedAt: Date.now(),
        });
      }, 500);
    },
    [pageId, category, name, mdContent],
  );

  /** Immediately persist any buffered edit (cancel + flush the debounce). */
  const flush = useCallback(() => {
    if (saveTimerRef.current === null) return; // nothing pending
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const value = pendingContentRef.current;
    pendingContentRef.current = null;
    if (value !== null) {
      playgroundDB.savePage({
        id: pageIdRef.current,
        category: categoryRef.current,
        name: nameRef.current,
        content: value,
        updatedAt: Date.now(),
      });
    }
  }, []);

  const resetToOriginal = useCallback(() => {
    setContent(mdContent);
    setIsModified(false);
    playgroundDB.savePage({
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
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        const value = pendingContentRef.current;
        if (value !== null) {
          playgroundDB.savePage({
            id: pageIdRef.current,
            category: categoryRef.current,
            name: nameRef.current,
            content: value,
            updatedAt: Date.now(),
          });
        }
      }
    };
  }, []);

  return { content, loading, onChange, resetToOriginal, isModified, flush };
}
