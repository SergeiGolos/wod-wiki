/**
 * useEffortContent — Load/save effort documents with IDB-first fallback.
 *
 *   1. Try IndexedDB effort store (user edits, clones)
 *   2. Fall back to markdown file (bundled efforts)
 *   3. Debounced save → registry.upsert() + IDB
 *
 * The document format is YAML frontmatter + body (effortYaml.ts).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorSave } from './useEditorSave';
import { effortToDocument, documentToEffort } from '../components/efforts/effortYaml';
import { useEffortRegistry } from '../components/efforts/EffortRegistryContext';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { getEffortMarkdown } from '@/repositories/effort-markdown';
import type { IEffort } from '@/effort-registry';
import { toast } from '@/hooks/use-toast';

export interface UseEffortContentResult {
  /** The full document (YAML frontmatter + body) for NoteEditor */
  document: string;
  /** Set document directly (e.g. from NoteEditor onChange) */
  setDocument: (value: string) => void;
  /** Whether the initial load is complete */
  isLoading: boolean;
  /** The resolved effort (bundled or user) */
  effort: IEffort | null;
  /** Whether this effort is editable (user-created or cloned) */
  isEditable: boolean;
  /** Save hooks result for manual flush */
  flush: () => Promise<void>;
  /** Clone a bundled effort so it becomes editable */
  cloneForEdit: () => IEffort | null;
  /** Error if load failed */
  error: string | null;
}

/**
 * Load the effort document for a given slug.
 *
 * Priority:
 *   1. User effort from IndexedDB (has been edited before)
 *   2. Bundled effort from registry (resolved, has body from markdown)
 *   3. Markdown file fallback (for bundled efforts without IDB entry)
 */
export function useEffortContent(slug: string | undefined): UseEffortContentResult {
  const { registry, isReady, refresh } = useEffortRegistry();
  const [document, setDocumentState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effort, setEffort] = useState<IEffort | null>(null);
  const isEditable = effort?.registrySource === 'user';
  const hasClonedRef = useRef(false);

  // Load effort on mount / slug change
  useEffect(() => {
    if (!isReady || !slug) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    hasClonedRef.current = false;

    async function load() {
      try {
        // 1. Try IDB first (user edits)
        const idbEffort = await indexedDBService.getEffort(slug);
        if (idbEffort && !cancelled) {
          const ie = idbEffort as unknown as IEffort;
          setEffort(ie);
          setDocumentState(effortToDocument(ie));
          setIsLoading(false);
          return;
        }

        // 2. Try registry (bundled or user)
        const regEffort = registry.resolve(slug);
        if (regEffort && !cancelled) {
          setEffort(regEffort);
          // If it has a body, use it; otherwise try markdown file
          if (regEffort.body) {
            setDocumentState(effortToDocument(regEffort));
          } else {
            // 3. Fallback to markdown file
            const md = await getEffortMarkdown(slug);
            if (md && !cancelled) {
              setDocumentState(md);
            } else if (!cancelled) {
              setDocumentState(effortToDocument(regEffort));
            }
          }
          setIsLoading(false);
          return;
        }

        // 4. Try markdown file as last resort
        const md = await getEffortMarkdown(slug);
        if (md && !cancelled) {
          setDocumentState(md);
          setIsLoading(false);
          return;
        }

        if (!cancelled) {
          setError(`Effort "${slug}" not found.`);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load effort.');
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug, isReady, registry]);

  // Debounced save to registry + IDB
  const handleSave = useCallback(async (value: string) => {
    if (!slug || !effort) return;

    // Parse document back to effort
    const { effort: parsed, errors } = documentToEffort(value, effort);
    if (errors.length > 0) {
      toast({
        title: 'Invalid YAML',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    // Normalize
    parsed.slug = parsed.slug.trim().toLowerCase().replace(/\s+/g, '-');
    parsed.label = parsed.label.trim();
    parsed.updatedAt = new Date().toISOString();

    // If bundled, auto-clone on first edit
    if (parsed.registrySource === 'bundled') {
      parsed.id = `effort-user-${crypto.randomUUID()}`;
      parsed.slug = `${parsed.slug}-custom`;
      parsed.label = `${parsed.label} (Custom)`;
      parsed.registrySource = 'user';
      parsed.derivation = {
        parentSlug: effort.slug,
        coefficients: {},
        hardOverrides: {},
      };
      hasClonedRef.current = true;
    }

    try {
      await registry.upsert(parsed);
      await indexedDBService.saveEffort(parsed as any);
      await refresh();
      setEffort(parsed);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Failed to save effort.',
        variant: 'destructive',
      });
    }
  }, [slug, effort, registry, refresh]);

  const { onChange, onLineChange, onBlur, flush } = useEditorSave({
    onSave: handleSave,
    lineIdleMs: 1200,
  });

  // Wrap setDocument to also trigger save mechanics
  const setDocument = useCallback((value: string) => {
    setDocumentState(value);
    onChange(value);
  }, [onChange]);

  // Clone helper for bundled efforts
  const cloneForEdit = useCallback((): IEffort | null => {
    if (!effort || effort.registrySource !== 'bundled') return null;
    const cloned: IEffort = {
      ...effort,
      id: `effort-user-${crypto.randomUUID()}`,
      slug: `${effort.slug}-custom`,
      label: `${effort.label} (Custom)`,
      registrySource: 'user',
      derivation: {
        parentSlug: effort.slug,
        coefficients: {},
        hardOverrides: {},
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEffort(cloned);
    setDocumentState(effortToDocument(cloned));
    hasClonedRef.current = true;
    return cloned;
  }, [effort]);

  return {
    document,
    setDocument,
    isLoading,
    effort,
    isEditable,
    flush,
    cloneForEdit,
    error,
  };
}
