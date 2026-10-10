/**
 * NotebookContext — React context for notebook management.
 *
 * Provides:
 * - List of all notebooks
 * - Active notebook state
 * - Create, switch, add-to, remove-from operations
 * - Filtered tag helpers for entry queries
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Notebook } from '@/types/notebook';
import { toNotebookTag, fromNotebookTag } from '@/types/notebook';
import { notebookService } from '@/hooks/useBrowserServices';
import { matchesId } from '@/lib/idUtils';
import { toast } from '@/hooks/use-toast';

interface NotebookContextState {
    notebooks: Notebook[];
    activeNotebookId: string | null; // null = "All"
    activeNotebook: Notebook | null;

    setActiveNotebook: (id: string | null) => void;
    /** null when the notebook could not be persisted (failure already toasted). */
    createNotebook: (name: string, description?: string, icon?: string) => Promise<Notebook | null>;
    deleteNotebook: (id: string) => Promise<void>;
    updateNotebook: (id: string, patch: Partial<Pick<Notebook, 'name' | 'description' | 'icon'>>) => Promise<void>;
    refreshNotebooks: () => void;

    /** Get notebook tags for a given entry's tags array */
    getEntryNotebooks: (tags: string[]) => Notebook[];

    /** Build the tag to add when associating an entry with a notebook */
    buildNotebookTag: (notebookId: string) => string;

    /** Check if an entry belongs to a notebook */
    entryBelongsToNotebook: (entryTags: string[], notebookId: string) => boolean;

    /** Get the active notebook's tag for filtering, or null for "All" */
    activeFilterTag: string | null;
}

const NotebookContext = createContext<NotebookContextState | undefined>(undefined);

/** User-initiated persistence failure: logged and toasted — never silent. */
function persistError(action: string, err: unknown) {
  console.error(`[NotebookContext] ${action} failed:`, err);
  toast({
    title: `${action} failed`,
    description: 'The server did not confirm the change — nothing was saved.',
    variant: 'destructive',
  });
}

export const useNotebooks = (): NotebookContextState => {
    const ctx = useContext(NotebookContext);
    if (!ctx) throw new Error('useNotebooks must be used within a NotebookProvider');
    return ctx;
};

interface NotebookProviderProps {
    children: React.ReactNode;
}

export const NotebookProvider: React.FC<NotebookProviderProps> = ({ children }) => {
    const [notebooks, setNotebooks] = useState<Notebook[]>(() => notebookService.getAll());
    const [activeNotebookId, setActiveNotebookIdState] = useState<string | null>(null);

    const refreshNotebooks = useCallback(() => {
        setNotebooks(notebookService.getAll());
    }, []);

    // Initialize on mount
    useEffect(() => {
        notebookService
            .ensureDefault()
            .catch((err) => console.error('[NotebookContext] init failed:', err))
            .finally(() => setNotebooks(notebookService.getAll()));
        // Don't auto-select — let the route determine the active notebook
        // activeNotebookId stays null ("All Workouts") unless the URL says otherwise
    }, []);

    const setActiveNotebook = useCallback((id: string | null) => {
        // Resolve potentially short ID to full ID
        let targetId = id;
        if (id) {
            // We fetch fresh list to ensure resolution is correct
            // (State 'notebooks' might be slightly stale if update hasn't propagated)
            const all = notebookService.getAll();
            const match = all.find(n => matchesId(n.id, id));
            if (match) {
                targetId = match.id;
            }
        }

        setActiveNotebookIdState(targetId);
        if (targetId) {
            // Freshness-only write: a failure is logged, not toasted — the
            // authored notebook data itself is untouched.
            void notebookService.touchNotebook(targetId).catch((err) =>
                console.error('[NotebookContext] touch failed:', err),
            );
            refreshNotebooks();
        }
    }, [refreshNotebooks]);

    const createNotebook = useCallback(async (name: string, description = '', icon = '📓'): Promise<Notebook | null> => {
        try {
            const nb = await notebookService.create(name, description, icon);
            refreshNotebooks();
            return nb;
        } catch (err) {
            persistError('Notebook creation', err);
            return null;
        }
    }, [refreshNotebooks]);

    const deleteNotebook = useCallback(async (id: string) => {
        try {
            await notebookService.delete(id);
        } catch (err) {
            persistError('Notebook deletion', err);
            return;
        }
        refreshNotebooks();
        if (activeNotebookId === id) {
            const remaining = notebookService.getAll();
            setActiveNotebookIdState(remaining.length > 0 ? remaining[0].id : null);
        }
    }, [activeNotebookId, refreshNotebooks]);

    const updateNotebook = useCallback(async (id: string, patch: Partial<Pick<Notebook, 'name' | 'description' | 'icon'>>) => {
        try {
            await notebookService.update(id, patch);
        } catch (err) {
            persistError('Notebook update', err);
            return;
        }
        refreshNotebooks();
    }, [refreshNotebooks]);

    const activeNotebook = notebooks.find(n => n.id === activeNotebookId) ?? null;

    const getEntryNotebooks = useCallback((tags: string[]): Notebook[] => {
        const notebookIds = tags.map(fromNotebookTag).filter((id): id is string => id !== null);
        return notebooks.filter(n => notebookIds.includes(n.id));
    }, [notebooks]);

    const buildNotebookTag = useCallback((notebookId: string): string => {
        return toNotebookTag(notebookId);
    }, []);

    const entryBelongsToNotebook = useCallback((entryTags: string[], notebookId: string): boolean => {
        return entryTags.includes(toNotebookTag(notebookId));
    }, []);

    const activeFilterTag = activeNotebookId ? toNotebookTag(activeNotebookId) : null;

    const value: NotebookContextState = {
        notebooks,
        activeNotebookId,
        activeNotebook,
        setActiveNotebook,
        createNotebook,
        deleteNotebook,
        updateNotebook,
        refreshNotebooks,
        getEntryNotebooks,
        buildNotebookTag,
        entryBelongsToNotebook,
        activeFilterTag,
    };

    return (
        <NotebookContext.Provider value={value}>
            {children}
        </NotebookContext.Provider>
    );
};
