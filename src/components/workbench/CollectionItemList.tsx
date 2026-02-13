/**
 * CollectionItemList — Displays markdown files from a WOD collection.
 * Shown in the list area when a collection is selected.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import type { WodCollectionItem } from '@/app/wod-collections';

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
    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="flex-1 overflow-y-auto">
                {items.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
                        No workouts in this collection
                    </div>
                )}
                {items.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onSelectItem(item)}
                        className={cn(
                            "w-full text-left px-4 py-3 border-b border-border transition-colors",
                            "hover:bg-muted/50 flex items-center gap-3",
                            activeItemId === item.id
                                ? "bg-accent/50 border-l-2 border-l-primary"
                                : ""
                        )}
                    >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{item.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
