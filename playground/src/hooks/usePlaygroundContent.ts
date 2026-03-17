/**
 * usePlaygroundContent — Loads workout content with IndexedDB-first strategy.
 *
 * 1. If the page exists in IndexedDB → return the stored content.
 * 2. If not → return the original MD content and seed IndexedDB for next time.
 * 3. On edits (onChange) → persist to IndexedDB so block IDs remain stable.
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

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
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

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { content, loading, onChange, resetToOriginal, isModified };
}
