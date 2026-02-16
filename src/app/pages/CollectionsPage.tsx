import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HistoryLayout } from '@/components/history/HistoryLayout';
import { useWodCollections } from '@/hooks/useWodCollections';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FolderOpen, Play, Copy } from 'lucide-react';
import { ListOfNotes } from '@/components/workbench/ListOfNotes';
import { NotePreview } from '@/components/workbench/NotePreview';
import type { IContentProvider } from '@/types/content-provider';
import type { HistoryEntry } from '@/types/history';
import { toShortId } from '@/lib/idUtils';
import { planPath, trackPath } from '@/lib/routes';
import { createHistoryView } from '@/components/layout/panel-system/viewDescriptors';
import { PanelGrid } from '@/components/layout/panel-system/PanelGrid';
import type { PanelSpan } from '@/components/layout/panel-system/types';

export const CollectionsPage: React.FC<{ provider: IContentProvider }> = ({ provider }) => {
    const navigate = useNavigate();
    const { collections, activeCollectionId, activeCollectionItems, setActiveCollection } = useWodCollections();

    // If an ID is selected, we show the list of items + preview
    // If not, we show the grid of collections

    // Convert current collection items to HistoryEntry[]
    const collectionEntries = useMemo((): HistoryEntry[] => {
        if (!activeCollectionId) return [];
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
    }, [activeCollectionId, activeCollectionItems]);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleBack = () => {
        setActiveCollection(null);
        setSelectedId(null);
    };

    // View 1: Collection Grid
    if (!activeCollectionId) {
        return (
            <HistoryLayout>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto h-full">
                    {collections.map(collection => (
                        <Card
                            key={collection.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors shadow-sm hover:shadow"
                            onClick={() => setActiveCollection(collection.id)}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FolderOpen className="w-5 h-5 text-primary" />
                                    {collection.name}
                                </CardTitle>
                                {collection.description && (
                                    <CardDescription>{collection.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    {collection.items.length} items
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {collections.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-12">
                            No collections found.
                        </div>
                    )}
                </div>
            </HistoryLayout>
        );
    }

    // View 2: Collection Items (Split View)
    // Similar to NotebooksPage but no Left Filter, instead just List + Preview

    const mainPanel = (
        <div className="flex flex-col h-full bg-background border-r border-border">
            <div className="h-12 flex items-center px-4 border-b border-border gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 pl-1">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
                <div className="h-4 w-px bg-border mx-2" />
                <span className="font-semibold text-sm">{collections.find(c => c.id === activeCollectionId)?.name}</span>
            </div>
            <div className="flex-1 overflow-hidden">
                <ListOfNotes
                    entries={collectionEntries}
                    selectedIds={new Set(selectedId ? [selectedId] : [])}
                    onToggleEntry={(id) => setSelectedId(id)}
                    activeEntryId={selectedId}
                    enriched={false}
                    // Actions for collection items
                    onClone={async (id) => {
                        // Find item
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
        </div>
    );

    const entryToShow = collectionEntries.find(e => e.id === selectedId);

    const previewPanel = entryToShow ? (
        <NotePreview
            entry={entryToShow}
            onStartWorkout={async (blockId) => {
                // Clone and start
                if (provider.capabilities.canWrite) {
                    const cloned = await provider.cloneEntry(entryToShow.id);
                    navigate(trackPath(toShortId(cloned.id), blockId));
                }
            }}
            onAddToPlan={async () => {
                if (provider.capabilities.canWrite) {
                    const cloned = await provider.cloneEntry(entryToShow.id);
                    navigate(planPath(toShortId(cloned.id)));
                }
            }}
            onClone={async (targetDate) => {
                if (provider.capabilities.canWrite) {
                    const cloned = await provider.cloneEntry(entryToShow.id, targetDate);
                    navigate(planPath(toShortId(cloned.id)));
                }
            }}
            provider={provider}
        />
    ) : null;

    // Custom layout: List on Left, Preview on Right (standard splti)
    const historyView = createHistoryView(mainPanel, previewPanel);
    const layoutState = {
        viewId: 'collections',
        panelSpans: historyView.panels.reduce((acc, p) => {
            acc[p.id] = p.defaultSpan as PanelSpan;
            return acc;
        }, {} as Record<string, PanelSpan>),
        expandedPanelId: null,
    };

    return (
        <HistoryLayout>
            <PanelGrid
                panels={historyView.panels}
                layoutState={layoutState}
                className="h-full"
            />
        </HistoryLayout>
    );
};
