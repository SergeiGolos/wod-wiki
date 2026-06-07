import React from 'react';
import { cn } from '@/lib/utils';
import { FolderOpen, Dumbbell, Tag } from 'lucide-react';
import type { WodCollection } from '@/hooks/useWodCollections';

export interface CollectionsFilterProps {
    collections: WodCollection[];
    activeCollectionId: string | null;
    onCollectionSelect: (id: string | null) => void;
    className?: string;
}

export const CollectionsFilter: React.FC<CollectionsFilterProps> = ({
    collections,
    activeCollectionId,
    onCollectionSelect,
    className,
}) => {
    const collectionBtn = (col: WodCollection) => (
        <button
            key={col.id}
            onClick={() => onCollectionSelect(col.id)}
            className={cn(
                "w-full text-left text-sm py-1.5 rounded transition-colors flex items-center gap-2 px-2",
                activeCollectionId === col.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <span className="shrink-0 opacity-50">📍</span>
            <span className="truncate flex-1">{col.name}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{col.items.length}</span>
        </button>
    );

    return (
        <div className={cn("flex flex-col gap-6", className)}>
            {/* Collections Section */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                    <FolderOpen className="h-3 w-3" />
                    Collections
                </h3>
                <div className="space-y-0.5">
                    <button
                        onClick={() => onCollectionSelect(null)}
                        className={cn(
                            "w-full text-left text-sm px-2 py-1.5 rounded transition-colors flex items-center gap-2",
                            activeCollectionId === null
                                ? "bg-accent text-accent-foreground font-medium"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <FolderOpen className="h-3 w-3 shrink-0 opacity-50" />
                        <span className="truncate flex-1">All Collections</span>
                    </button>
                    {collections.map(col => (
                        <React.Fragment key={col.id}>
                            {collectionBtn(col)}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Placeholder Sections */}
            <div className="space-y-4 opacity-50">
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <Dumbbell className="h-3 w-3" />
                        Equipment
                    </h3>
                    <div className="text-xs text-muted-foreground px-2 italic">No filters</div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <Tag className="h-3 w-3" />
                        Tags
                    </h3>
                    <div className="text-xs text-muted-foreground px-2 italic">No filters</div>
                </div>
            </div>
        </div>
    );
};
