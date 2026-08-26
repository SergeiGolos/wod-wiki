/**
 * CollectionItemList — Displays markdown files from a WOD collection.
 * Shown in the list area when a collection is selected.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import type { ScriptCollectionItem } from '@/repositories/script-collections';
import { ListView, collectionItemToListItem } from '@/components/molecules/list-index';
import type { IListItem } from '@/components/molecules/list-index';

export interface CollectionItemListProps {
    items: ScriptCollectionItem[];
    activeItemId?: string | null;
    onSelectItem: (item: ScriptCollectionItem) => void;
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
                onSelect={(item: IListItem<ScriptCollectionItem>) => onSelectItem(item.payload)}
                emptyState={
                    <div className="text-sm text-muted-foreground text-center py-8">
                        No sessions in this collection
                    </div>
                }
            />
        </div>
    );
};
