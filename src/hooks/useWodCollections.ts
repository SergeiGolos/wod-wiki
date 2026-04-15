/**
 * useWodCollections — React hook for accessing WOD collections
 * derived from markdown/collections/ subdirectories.
 */
import { useMemo, useCallback } from 'react';
import { useQueryState } from 'nuqs';
import { getWodCollections, getWodCollection } from '@/repositories/wod-collections';
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections';

export type { WodCollection, WodCollectionItem };

export interface UseWodCollectionsReturn {
    /** All available collections */
    collections: WodCollection[];
    /** Currently selected collection ID (null = none) */
    activeCollectionId: string | null;
    /** Currently selected collection object */
    activeCollection: WodCollection | null;
    /** Items in the active collection */
    activeCollectionItems: WodCollectionItem[];
    /** Select a collection */
    setActiveCollection: (id: string | null) => void;
}

export function useWodCollections(): UseWodCollectionsReturn {
    const collections = useMemo(() => getWodCollections(), []);
    const [activeCollectionId, setActiveCollectionId] = useQueryState('col', {
        defaultValue: null,
        clearOnDefault: true,
    });

    const activeCollection = useMemo(() => {
        if (!activeCollectionId) return null;
        return getWodCollection(activeCollectionId) ?? null;
    }, [activeCollectionId]);

    const activeCollectionItems = useMemo(() => {
        return activeCollection?.items ?? [];
    }, [activeCollection]);

    const setActiveCollection = useCallback((id: string | null) => {
        setActiveCollectionId(id);
    }, []);

    return {
        collections,
        activeCollectionId,
        activeCollection,
        activeCollectionItems,
        setActiveCollection,
    };
}
