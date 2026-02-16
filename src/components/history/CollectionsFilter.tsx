import React from 'react';
import { cn } from '@/lib/utils';
import { FolderOpen, Dumbbell, Tag, X } from 'lucide-react';
import type { WodCollection } from '@/hooks/useWodCollections';
import { Button } from '@/components/ui/button';

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
    return (
        <div className={cn("flex flex-col gap-6", className)}>
            {/* "All" button or generic header if needed? 
                Notebooks has Calendar + "Reset Filters" at top.
                We might not need Calendar here, but "Reset" could be useful.
             */}

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
                        <button
                            key={col.id}
                            onClick={() => onCollectionSelect(col.id)}
                            className={cn(
                                "w-full text-left text-sm px-2 py-1.5 rounded transition-colors flex items-center gap-2",
                                activeCollectionId === col.id
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span>{/* Icon placeholder or custom icon if collection had one */}📍</span>
                            <span className="truncate flex-1">{col.name}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{col.items.length}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Placeholder Sections (matching NotebooksPage) */}
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
