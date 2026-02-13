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
import type { Notebook } from '../../types/notebook';
import { toNotebookTag, fromNotebookTag } from '../../types/notebook';
import { notebookService } from '../../services/NotebookService';
import { matchesId } from '../../lib/idUtils';

interface NotebookContextState {
    notebooks: Notebook[];
    activeNotebookId: string | null; // null = "All"
    activeNotebook: Notebook | null;

    setActiveNotebook: (id: string | null) => void;
    createNotebook: (name: string, description?: string, icon?: string) => Notebook;
    deleteNotebook: (id: string) => void;
    updateNotebook: (id: string, patch: Partial<Pick<Notebook, 'name' | 'description' | 'icon'>>) => void;
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

export const useNotebooks = (): NotebookContextState => {
    const ctx = useContext(NotebookContext);
    if (!ctx) throw new Error('useNotebooks must be used within a NotebookProvider');
    return ctx;
};

interface NotebookProviderProps {
    children: React.ReactNode;
}

export const NotebookProvider: React.FC<NotebookProviderProps> = ({ children }) => {
    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [activeNotebookId, setActiveNotebookIdState] = useState<string | null>(null);

    const refreshNotebooks = useCallback(() => {
        setNotebooks(notebookService.getAll());
    }, []);

    // Initialize on mount
    useEffect(() => {
        notebookService.ensureDefault();
        setNotebooks(notebookService.getAll());
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
            notebookService.touchNotebook(targetId);
            refreshNotebooks();
        }
    }, [refreshNotebooks]);

    const createNotebook = useCallback((name: string, description = '', icon = '📓'): Notebook => {
        const nb = notebookService.create(name, description, icon);
        refreshNotebooks();
        return nb;
    }, [refreshNotebooks]);

    const deleteNotebook = useCallback((id: string) => {
        notebookService.delete(id);
        refreshNotebooks();
        if (activeNotebookId === id) {
            const remaining = notebookService.getAll();
            setActiveNotebookIdState(remaining.length > 0 ? remaining[0].id : null);
        }
    }, [activeNotebookId, refreshNotebooks]);

    const updateNotebook = useCallback((id: string, patch: Partial<Pick<Notebook, 'name' | 'description' | 'icon'>>) => {
        notebookService.update(id, patch);
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
