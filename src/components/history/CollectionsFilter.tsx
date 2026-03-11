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

/** Group flat collection list into parent → children map for display */
function groupCollections(collections: WodCollection[]): {
    tops: WodCollection[];
    children: Map<string, WodCollection[]>;
    /** Parent IDs that have children but no top-level collection */
    orphanParents: string[];
} {
    const tops: WodCollection[] = [];
    const children = new Map<string, WodCollection[]>();
    const topIds = new Set<string>();

    for (const col of collections) {
        if (!col.parent) {
            tops.push(col);
            topIds.add(col.id);
        } else {
            const siblings = children.get(col.parent) ?? [];
            siblings.push(col);
            children.set(col.parent, siblings);
        }
    }

    // Orphan parents: have children but no top-level collection
    const orphanParents = [...children.keys()].filter(pid => !topIds.has(pid)).sort();
    return { tops, children, orphanParents };
}

export const CollectionsFilter: React.FC<CollectionsFilterProps> = ({
    collections,
    activeCollectionId,
    onCollectionSelect,
    className,
}) => {
    const { tops, children, orphanParents } = groupCollections(collections);

    const collectionBtn = (col: WodCollection, indent = false) => (
        <button
            key={col.id}
            onClick={() => onCollectionSelect(col.id)}
            className={cn(
                "w-full text-left text-sm py-1.5 rounded transition-colors flex items-center gap-2",
                indent ? "px-5" : "px-2",
                activeCollectionId === col.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <span className="shrink-0 opacity-50">{indent ? '·' : '📍'}</span>
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
                    {tops.map(col => (
                        <React.Fragment key={col.id}>
                            {collectionBtn(col)}
                            {(children.get(col.id) ?? []).map(child => collectionBtn(child, true))}
                        </React.Fragment>
                    ))}
                    {/* Orphan groups: children whose parent has no direct files (e.g. swimming/) */}
                    {orphanParents.map(parentId => (
                        <React.Fragment key={`orphan-${parentId}`}>
                            <div className="pt-1 pb-0.5 px-2 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                                {parentId.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </div>
                            {(children.get(parentId) ?? []).map(child => collectionBtn(child, true))}
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
