/**
 * useScriptCollections — React hook for accessing WOD collections
 * derived from markdown/collections/ subdirectories.
 */
import { useMemo, useCallback } from 'react';
import { useQueryState } from 'nuqs';
import { getScriptCollections, getScriptCollection } from '@/repositories/script-collections';
import type { ScriptCollection, ScriptCollectionItem } from '@/repositories/script-collections';

export type { ScriptCollection, ScriptCollectionItem };

export interface UseScriptCollectionsReturn {
    /** All available collections */
    collections: ScriptCollection[];
    /** Currently selected collection ID (null = none) */
    activeCollectionId: string | null;
    /** Currently selected collection object */
    activeCollection: ScriptCollection | null;
    /** Items in the active collection */
    activeCollectionItems: ScriptCollectionItem[];
    /** Select a collection */
    setActiveCollection: (id: string | null) => void;
}

export function useScriptCollections(): UseScriptCollectionsReturn {
    const collections = useMemo(() => getScriptCollections(), []);
    const [activeCollectionId, setActiveCollectionId] = useQueryState('col', {
        defaultValue: '',
        clearOnDefault: true,
    });

    const activeCollection = useMemo(() => {
        if (!activeCollectionId) return null;
        return getScriptCollection(activeCollectionId) ?? null;
    }, [activeCollectionId]);

    const activeCollectionItems = useMemo(() => {
        return activeCollection?.items ?? [];
    }, [activeCollection]);

    const setActiveCollection = useCallback((id: string | null) => {
        setActiveCollectionId(id ?? '');
    }, []);

    return {
        collections,
        activeCollectionId,
        activeCollection,
        activeCollectionItems,
        setActiveCollection,
    };
}
