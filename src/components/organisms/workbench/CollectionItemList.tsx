/**
 * CollectionItemList — Displays markdown files from a WOD collection.
 * Shown in the list area when a collection is selected.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import type { WodCollectionItem } from '@/repositories/wod-collections';
import { ListView, collectionItemToListItem } from '@/components/list';
import type { IListItem } from '@/components/list';

export interface CollectionItemListProps {
    items: WodCollectionItem[];
    activeItemId?: string | null;
    onSelectItem: (item: WodCollectionItem) => void;
    className?: string;
}

export const CollectionItemList: React.FC<CollectionItemListProps> = ({
    items,
    activeItemId,
    onSelectItem,
    className,
}) => {
    const listItems = items.map(collectionItemToListItem).map(item => ({
        ...item,
        isActive: item.id === activeItemId,
    }));

    return (
        <div className={cn('flex flex-col h-full', className)}>
            <ListView
                items={listItems}
                onSelect={(item: IListItem<WodCollectionItem>) => onSelectItem(item.payload)}
                emptyState={
                    <div className="text-sm text-muted-foreground text-center py-8">
                        No sessions in this collection
                    </div>
                }
            />
        </div>
    );
};
