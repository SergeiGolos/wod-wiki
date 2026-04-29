import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWodCollections } from '@/hooks/useWodCollections';
import { ListOfNotes } from '@/components/workbench/ListOfNotes';
import { NotePreview } from '@/components/workbench/NotePreview';
import type { IContentProvider } from '@/types/content-provider';
import type { HistoryEntry } from '@/types/history';
import { toShortId } from '@/lib/idUtils';
import { planPath, trackPath } from '@/lib/routes';
import { CollectionsFilter } from '@/components/history/CollectionsFilter';
import { cn } from '@/lib/utils';

export const CollectionsPage: React.FC<{ provider: IContentProvider }> = ({ provider }) => {
    const navigate = useNavigate();
    const { collections, activeCollectionId, activeCollectionItems, setActiveCollection } = useWodCollections();

    // Convert current collection items to HistoryEntry[]
    // If no active collection, flatten ALL collections
    const collectionEntries = useMemo((): HistoryEntry[] => {
        if (!activeCollectionId) {
            // Flatten all collections
            return collections.flatMap(col =>
                col.items.map(item => ({
                    id: `collection:${col.id}:${item.id}`,
                    title: item.name,
                    createdAt: 0,
                    updatedAt: 0,
                    targetDate: 0,
                    rawContent: item.content,
                    tags: [`collection:${col.id}`],
                    type: 'template',
                    notes: '',
                    schemaVersion: 1,
                }))
            );
        }

        return activeCollectionItems.map(item => ({
            id: `collection:${activeCollectionId}:${item.id}`,
            title: item.name,
            createdAt: 0,
            updatedAt: 0,
            targetDate: 0,
            rawContent: item.content,
            tags: [`collection:${activeCollectionId}`],
            type: 'template',
            notes: '',
            schemaVersion: 1,
        }));
    }, [activeCollectionId, activeCollectionItems, collections]);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Filter Panel (Left)
    const filterPanel = (
        <div className="w-[280px] flex-shrink-0 bg-muted/10 h-full overflow-hidden flex flex-col p-4 border-r border-border">
            <CollectionsFilter
                collections={collections}
                activeCollectionId={activeCollectionId}
                onCollectionSelect={(id) => {
                    setActiveCollection(id);
                    setSelectedId(null);
                }}
            />
        </div>
    );

    // List Panel (Middle) -- ALWAYS LIST
    const listPanel = (
        <div className="flex-1 min-w-0 bg-background h-full overflow-hidden flex flex-col">
            <div className="h-10 flex items-center px-4 border-b border-border gap-2 shrink-0">
                <span className="font-semibold text-sm">
                    {activeCollectionId
                        ? (() => {
                            const col = collections.find(c => c.id === activeCollectionId);
                            if (!col) return activeCollectionId;
                            if (col.parent) {
                                const parent = collections.find(c => c.id === col.parent);
                                return `${parent?.name ?? col.parent} › ${col.name}`;
                            }
                            return col.name;
                        })()
                        : "All Collections"
                    }
                </span>
            </div>
            <ListOfNotes
                entries={collectionEntries}
                selectedIds={new Set(selectedId ? [selectedId] : [])}
                onToggleEntry={(id) => setSelectedId(id)}
                activeEntryId={selectedId}
                enriched={false}
                onClone={async (id) => {
                    const entry = collectionEntries.find(e => e.id === id);
                    if (entry && provider.capabilities.canWrite) {
                        const newEntry = await provider.saveEntry({
                            title: entry.title,
                            rawContent: entry.rawContent,
                            targetDate: Date.now(),
                            tags: [],
                            notes: ''
                        });
                        navigate(planPath(toShortId(newEntry.id)));
                    }
                }}
                provider={provider}
                className="h-full overflow-y-auto"
            />
        </div>
    );

    const mainPanel = (
        <div className="flex h-full w-full">
            {filterPanel}
            {listPanel}
        </div>
    );

    const entryToShow = collectionEntries.find(e => e.id === selectedId);

    // Preview Panel (Right)
    const previewPanel = useMemo(() => {
        if (!entryToShow) return null;
        return (
            <NotePreview
                entry={entryToShow}
                onStartWorkout={async (blockId) => {
                    if (provider.capabilities.canWrite) {
                        const newEntry = await provider.saveEntry({
                            title: entryToShow.title,
                            rawContent: entryToShow.rawContent,
                            targetDate: Date.now(),
                            tags: [],
                            notes: ''
                        });
                        navigate(trackPath(toShortId(newEntry.id), blockId));
                    }
                }}
                onAddToPlan={async () => {
                    if (provider.capabilities.canWrite) {
                        const newEntry = await provider.saveEntry({
                            title: entryToShow.title,
                            rawContent: entryToShow.rawContent,
                            targetDate: Date.now(),
                            tags: [],
                            notes: ''
                        });
                        navigate(planPath(toShortId(newEntry.id)));
                    }
                }}
                onClone={async (targetDate) => {
                    if (provider.capabilities.canWrite) {
                        const newEntry = await provider.saveEntry({
                            title: entryToShow.title,
                            rawContent: entryToShow.rawContent,
                            targetDate: targetDate || Date.now(),
                            tags: [],
                            notes: ''
                        });
                        navigate(planPath(toShortId(newEntry.id)));
                    }
                }}
                provider={provider}
            />
        );
    }, [entryToShow, navigate, provider]);

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Left: filter + list (full width when nothing selected, half when preview open) */}
            <div className={cn(
                "flex flex-col h-full transition-all duration-200",
                entryToShow ? "w-1/2 border-r border-border" : "w-full"
            )}>
                {mainPanel}
            </div>

            {/* Right: preview panel (only rendered when an entry is selected) */}
            {entryToShow && (
                <div className="w-1/2 h-full overflow-hidden">
                    {previewPanel}
                </div>
            )}
        </div>
    );
};
