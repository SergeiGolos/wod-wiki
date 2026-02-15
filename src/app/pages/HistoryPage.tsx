import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PanelGrid } from '@/components/layout/panel-system/PanelGrid';
import { createHistoryView } from '@/components/layout/panel-system/viewDescriptors';
import { ListFilter } from '@/components/workbench/ListFilter';
import { ListOfNotes } from '@/components/workbench/ListOfNotes';
import { NotePreview } from '@/components/workbench/NotePreview';
import { AnalyzePanel } from '@/components/workbench/AnalyzePanel';
import type { IContentProvider } from '@/types/content-provider';
import { LocalStorageContentProvider } from '@/services/content/LocalStorageContentProvider';
import { useHistorySelection } from '@/hooks/useHistorySelection';
import { CommitGraph } from '@/components/ui/CommitGraph';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandProvider, useCommandPalette } from '@/components/command-palette/CommandContext';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { WodNavigationStrategy } from '@/components/command-palette/strategies/WodNavigationStrategy';
import { useCreateWorkoutEntry } from '@/hooks/useCreateWorkoutEntry';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';
import { HistoryDetailsPanel } from '@/components/workbench/HistoryDetailsPanel';
import { PanelRightOpen, HelpCircle } from 'lucide-react';
import { useTutorialStore } from '@/hooks/useTutorialStore';

import type { PanelSpan } from '@/components/layout/panel-system/types';
// import { NotebookMenu } from '@/components/notebook/NotebookMenu';
import { useNotebooks } from '@/components/notebook/NotebookContext';
import { CreateNotebookDialog } from '@/components/notebook/CreateNotebookDialog';
import { toNotebookTag } from '@/types/notebook';
import { toShortId } from '@/lib/idUtils';
import { planPath, trackPath } from '@/lib/routes';
import { useWodCollections } from '@/hooks/useWodCollections';
import { NewPostButton } from '@/components/history/NewPostButton';
import { createNoteFromMarkdown } from '@/services/ExportImportService';



interface HistoryContentProps {
    provider: IContentProvider;
}

const HistoryContent: React.FC<HistoryContentProps> = ({ provider }) => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse initial calendar date from URL 'month' param
    const initialCalendarDate = useMemo(() => {
        const monthParam = searchParams.get('month'); // YYYY-MM
        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            const [y, m] = monthParam.split('-').map(Number);
            return new Date(y, m - 1, 1);
        }
        return undefined; // useHistorySelection defaults to new Date()
    }, []); // Empty dependency array to only run once on mount

    const historySelection = useHistorySelection(null, initialCalendarDate);
    const navigate = useNavigate();
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const { setIsOpen, setStrategy } = useCommandPalette();
    const { activeNotebookId, activeNotebook, setActiveNotebook, notebooks, createNotebook } = useNotebooks();
    const { collections, activeCollectionId, activeCollection, activeCollectionItems, setActiveCollection } = useWodCollections();
    const [showCreateNotebook, setShowCreateNotebook] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const { startTutorial } = useTutorialStore();

    // Clear history selection when collection changes
    useEffect(() => {
        historySelection.clearSelection();
    }, [activeCollectionId]);

    // Filter State
    type FilterMode = 'month' | 'list' | 'range';
    const [filterMode, setFilterMode] = useState<FilterMode>(() => {
        if (searchParams.has('range')) return 'range';
        if (searchParams.has('dates')) return 'list';
        return 'month';
    });

    const [customDates, setCustomDates] = useState<Set<string>>(() => {
        const datesParam = searchParams.get('dates');
        return datesParam ? new Set(datesParam.split(',')) : new Set();
    });

    const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(() => {
        const rangeParam = searchParams.get('range');
        if (rangeParam) {
            const [start, end] = rangeParam.split(',');
            return { start, end };
        }
        return null;
    });

    const [lastClickedDate, setLastClickedDate] = useState<Date | null>(null);

    const commandStrategy = useMemo(() => new WodNavigationStrategy(navigate), [navigate]);

    useEffect(() => {
        setStrategy(commandStrategy);
    }, [commandStrategy, setStrategy]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync Notebook with URL
    useEffect(() => {
        const notebookParam = searchParams.get('notebook');
        if (notebookParam !== activeNotebookId) {
            setActiveNotebook(notebookParam || null);
        }
        const collectionParam = searchParams.get('collection');
        if (collectionParam !== activeCollectionId) {
            setActiveCollection(collectionParam || null);
        }
    }, [searchParams, setActiveNotebook, setActiveCollection]);

    // Sync URL with Filter State
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        // Notebook
        if (activeNotebookId) {
            params.set('notebook', toShortId(activeNotebookId));
        } else {
            params.delete('notebook');
        }

        // Collection
        if (activeCollectionId) {
            params.set('collection', activeCollectionId);
        } else {
            params.delete('collection');
        }

        // Dates
        if (filterMode === 'list' && customDates.size > 0) {
            params.set('dates', Array.from(customDates).sort().join(','));
            params.delete('range');
            params.delete('month');
        } else if (filterMode === 'range' && dateRange) {
            params.set('range', `${dateRange.start},${dateRange.end}`);
            params.delete('dates');
            params.delete('month');
        } else {
            // 'month' mode (default)
            params.delete('dates');
            params.delete('range');

            // Sync calendar month to URL
            // Format: YYYY-MM
            const d = historySelection.calendarDate;
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            // Optional: Don't set if it's current month? 
            // User said: "going back and forth between month... doesn't update the filter in the URL".
            // Implies they want it updated.
            params.set('month', monthStr);
        }

        setSearchParams(params, { replace: true });
    }, [activeNotebookId, activeCollectionId, filterMode, customDates, dateRange, historySelection.calendarDate, setSearchParams]);

    // Calendar Date Selection Handler
    const handleDateSelect = useCallback((date: Date, modifiers: { shiftKey: boolean; ctrlKey: boolean }) => {
        const dateKey = date.toISOString().split('T')[0];
        setLastClickedDate(date);

        if (modifiers.shiftKey && lastClickedDate) {
            // Range selection (Shift+Click)
            const d1 = lastClickedDate < date ? lastClickedDate : date;
            const d2 = lastClickedDate < date ? date : lastClickedDate;

            setDateRange({
                start: d1.toISOString().split('T')[0],
                end: d2.toISOString().split('T')[0]
            });
            setFilterMode('range');
            setActiveCollection(null);
            return;
        }

        if (modifiers.ctrlKey) {
            // Toggle selection (Ctrl+Click) -> 'list' mode
            setCustomDates(prev => {
                const next = new Set(filterMode === 'list' ? prev : []);
                if (next.has(dateKey)) {
                    next.delete(dateKey);
                } else {
                    next.add(dateKey);
                }
                return next;
            });
            setFilterMode('list');
            setActiveCollection(null);
            return;
        }

        // Simple Click -> Select Single Date ('list' mode of 1)
        setCustomDates(new Set([dateKey]));
        setFilterMode('list');
        setActiveCollection(null);
    }, [lastClickedDate, filterMode, setActiveCollection]);

    // Handle Month Change -> Reset to Month Mode
    const handleCalendarDateChange = useCallback((date: Date) => {
        historySelection.setCalendarDate(date);
        setFilterMode('month');
        // Clear specific selections when changing month to view that whole month
        setCustomDates(new Set());
        setDateRange(null);
        setActiveCollection(null);
    }, [historySelection, setActiveCollection]);

    // Load entries
    useEffect(() => {
        provider.getEntries().then(setHistoryEntries);
    }, []);

    // Convert collection items to HistoryEntry[] for unified list rendering
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

    // Filter Logic
    const filteredEntries = useMemo(() => {
        // When a collection is active, show collection entries (no date/notebook filtering)
        if (activeCollectionId) {
            return collectionEntries;
        }

        let entries = historyEntries;

        // 1. Notebook Filter
        if (activeNotebookId) {
            const tag = toNotebookTag(activeNotebookId);
            entries = entries.filter(e => e.tags.includes(tag));
        }

        // 2. Date Filter
        if (filterMode === 'month') {
            const year = historySelection.calendarDate.getFullYear();
            const month = historySelection.calendarDate.getMonth();
            entries = entries.filter(e => {
                const d = new Date(e.targetDate);
                return d.getFullYear() === year && d.getMonth() === month;
            });
        } else if (filterMode === 'range' && dateRange) {
            entries = entries.filter(e => {
                const d = new Date(e.targetDate).toISOString().split('T')[0];
                return d >= dateRange.start && d <= dateRange.end;
            });
        } else if (filterMode === 'list') {
            entries = entries.filter(e => {
                const d = new Date(e.targetDate).toISOString().split('T')[0];
                return customDates.has(d);
            });
        }

        return entries;
    }, [historyEntries, activeNotebookId, activeCollectionId, collectionEntries, filterMode, dateRange, customDates, historySelection.calendarDate]);

    // Compute Selected Dates for Calendar Visuals
    const visualSelectedDates = useMemo(() => {
        if (filterMode === 'month') return undefined; // No highlight logic "if whole month... don't show selection"

        if (filterMode === 'list') return customDates;

        if (filterMode === 'range' && dateRange) {
            const set = new Set<string>();
            const current = new Date(dateRange.start);
            const end = new Date(dateRange.end);
            while (current <= end) {
                set.add(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
            return set;
        }
        return new Set<string>();
    }, [filterMode, customDates, dateRange]);

    const { createNewEntry } = useCreateWorkoutEntry({
        provider,
        historySelection,
        setHistoryEntries,
        setContent: () => { },
    });

    const createEntryInNotebook = useCallback(async (targetDate?: Date) => {
        await createNewEntry(targetDate);
        const entries = await provider.getEntries();
        setHistoryEntries(entries);
    }, [createNewEntry, provider]);

    const handleImportMarkdown = useCallback(async (markdown: string) => {
        try {
            const noteData = createNoteFromMarkdown(markdown);
            const newEntry = await provider.saveEntry(noteData);
            const entries = await provider.getEntries();
            setHistoryEntries(entries);

            // Navigate to the new entry
            navigate(planPath(toShortId(newEntry.id)));
        } catch (error) {
            console.error('Failed to import markdown:', error);
            alert('Failed to import markdown: ' + (error instanceof Error ? error.message : String(error)));
        }
    }, [provider, navigate]);


    const selectedEntries = useMemo(() => {
        // Search both real history entries and synthetic collection entries
        const allEntries = activeCollectionId ? collectionEntries : historyEntries;
        return allEntries.filter(e => historySelection.selectedIds.has(e.id));
    }, [historyEntries, collectionEntries, activeCollectionId, historySelection.selectedIds]);

    const notebookLabel = activeCollection
        ? activeCollection.name
        : activeNotebook
            ? activeNotebook.name
            : 'All Workouts';

    // Handle notebook tag toggling on entries
    const handleNotebookToggle = useCallback(async (entryId: string, notebookId: string, isAdding: boolean) => {
        const entry = historyEntries.find(e => e.id === entryId);
        if (!entry) return;
        const tag = toNotebookTag(notebookId);
        const newTags = isAdding
            ? [...entry.tags, tag]
            : entry.tags.filter(t => t !== tag);
        await provider.updateEntry(entryId, { tags: newTags });
        const entries = await provider.getEntries();
        setHistoryEntries(entries);
    }, [historyEntries]);

    const handleClone = useCallback(async (entryId: string, targetDate?: number) => {
        if (!provider.capabilities.canWrite) return;
        try {
            // Handle virtual collection entries
            if (entryId.startsWith('collection:')) {
                const entry = collectionEntries.find(e => e.id === entryId);
                if (entry) {
                    // Create a new entry from the collection item
                    const newEntry = await provider.saveEntry({
                        title: entry.title,
                        rawContent: entry.rawContent,
                        targetDate: targetDate || Date.now(),
                        tags: [], // Start fresh without tags
                        notes: '',
                    });
                    navigate(planPath(toShortId(newEntry.id)));
                    return;
                }
            }

            const cloned = await provider.cloneEntry(entryId, targetDate);
            navigate(planPath(toShortId(cloned.id)));
        } catch (err) {
            console.error('Failed to clone entry:', err);
        }
    }, [provider, navigate, collectionEntries]);

    const handleDelete = useCallback(async (entryId: string) => {
        if (!provider.capabilities.canDelete) return;
        try {
            await provider.deleteEntry(entryId);
            const entries = await provider.getEntries();
            setHistoryEntries(entries);
            historySelection.clearSelection();
        } catch (err) {
            console.error('Failed to delete entry:', err);
        }
    }, [provider, historySelection]);

    // Combined Main Panel (Filter + List)
    const mainPanel = (
        <div className="flex h-full divide-x divide-border">
            {/* Filter Sidebar */}
            <div id="tutorial-filters" className="w-[280px] flex-shrink-0 bg-muted/10 h-full overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <ListFilter
                        calendarDate={historySelection.calendarDate}
                        onCalendarDateChange={handleCalendarDateChange}
                        entryDates={new Set(historyEntries.map(e => new Date(e.targetDate).toISOString().split('T')[0]))}
                        selectedDates={visualSelectedDates}
                        onDateSelect={handleDateSelect}
                        selectedIds={historySelection.selectedIds}
                        onSelectAll={() => historySelection.selectAll(filteredEntries.map(e => e.id))}
                        onClearSelection={historySelection.clearSelection}
                        notebooks={notebooks}
                        activeNotebookId={activeNotebookId}
                        onNotebookSelect={setActiveNotebook}
                        onCreateNotebook={() => setShowCreateNotebook(true)}
                        onResetFilters={() => {
                            setActiveNotebook(null);
                            setActiveCollection(null);
                            setFilterMode('month');
                            setCustomDates(new Set());
                            setDateRange(null);
                            historySelection.setCalendarDate(new Date());
                        }}
                        className="p-0"
                        compact={true}
                    />
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 min-w-0 bg-background h-full overflow-hidden flex flex-col">
                <ListOfNotes
                    entries={filteredEntries}
                    selectedIds={historySelection.selectedIds}
                    onToggleEntry={(id, modifiers) => historySelection.handleSelection(id, modifiers || { ctrlKey: false, shiftKey: false }, filteredEntries.map(e => e.id))}
                    activeEntryId={historySelection.activeEntryId}
                    enriched={false}
                    onNotebookToggle={activeCollectionId ? undefined : handleNotebookToggle}
                    onEdit={activeCollectionId ? undefined : (id) => navigate(planPath(toShortId(id)))}
                    onClone={handleClone}
                    provider={provider}
                    className="h-full overflow-y-auto"
                />
            </div>
        </div>
    );

    const previewPanel = useMemo(() => {
        // Case 1: No explicit selection -> Analyze ALL visible (filtered) entries (default view)
        // (skip analytics for collection items since they have no real dates/results)
        if (selectedEntries.length === 0) {
            if (filteredEntries.length === 0) return null;
            if (activeCollectionId) return null;
            return <AnalyzePanel selectedEntries={filteredEntries} />;
        }

        // Case 2: Multi-selection -> Analyze SELECTED entries
        if (selectedEntries.length >= 2 && !activeCollectionId) {
            return <AnalyzePanel selectedEntries={selectedEntries} />;
        }

        // Case 3: Single selection -> Preview
        const entryToShow = selectedEntries[0];
        if (!entryToShow) return null;

        const isCollectionEntry = entryToShow.id.startsWith('collection:');

        return (
            <NotePreview
                entry={entryToShow}
                onStartWorkout={async (blockId) => {
                    if (isCollectionEntry) return;

                    if (entryToShow.type === 'template') {
                        // Template: Clone -> Copy block if needed? -> Track
                        // For now, clone whole entry -> navigate to Track
                        if (provider.capabilities.canWrite) {
                            const cloned = await provider.cloneEntry(entryToShow.id);
                            navigate(trackPath(toShortId(cloned.id), blockId));
                        }
                    } else {
                        // Regular note: Navigate to Track
                        navigate(trackPath(toShortId(entryToShow.id), blockId));
                    }
                }}
                onAddToPlan={async () => {
                    if (isCollectionEntry || !provider.capabilities.canWrite) return;
                    // Template "+": Clone -> Plan
                    const cloned = await provider.cloneEntry(entryToShow.id);
                    navigate(planPath(toShortId(cloned.id)));
                }}
                onClone={entryToShow.type === 'template' ? (targetDate?: number) => handleClone(entryToShow.id, targetDate) : undefined}
                onEdit={entryToShow.type !== 'template' && !isCollectionEntry ? () => navigate(planPath(toShortId(entryToShow.id))) : undefined}
                onDelete={provider.capabilities.canDelete && !entryToShow.results && entryToShow.type !== 'template' ? () => handleDelete(entryToShow.id) : undefined}
                provider={provider}
            />
        );
    }, [selectedEntries, filteredEntries, navigate, activeCollectionId, handleDelete]);

    // Used updated viewDescriptors which expects (mainPanel, previewPanel)
    const historyView = createHistoryView(
        mainPanel,
        previewPanel
    );

    const layoutState = {
        viewId: 'history',
        panelSpans: historyView.panels.reduce((acc, p) => {
            acc[p.id] = p.defaultSpan as PanelSpan;
            return acc;
        }, {} as Record<string, PanelSpan>),
        expandedPanelId: null,
    };

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div id="tutorial-header" className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
                <div className="font-bold flex items-center gap-4">
                    <div
                        className={cn(
                            'h-10 flex items-center cursor-pointer hover:opacity-80 transition-opacity',
                            isMobile ? 'w-[150px]' : 'w-[300px]'
                        )}
                        onClick={() => navigate('/')}
                    >
                        <CommitGraph
                            text={isMobile ? 'WOD.WIKI' : 'WOD.WIKI++'}
                            rows={16}
                            cols={isMobile ? 60 : 90}
                            gap={1}
                            padding={0}
                            fontScale={0.8}
                            fontWeight={200}
                            letterSpacing={1.6}
                        />
                    </div>
                    {!isMobile && (
                        <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase">
                            {notebookLabel}
                        </span>
                    )}
                </div>

                <div className="flex gap-2 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(true)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Search className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startTutorial('history')}
                        className="text-muted-foreground hover:text-foreground"
                        title="Show Help"
                    >
                        <HelpCircle className="h-5 w-5" />
                    </Button>

                    <div className="h-6 w-px bg-border mx-2" />

                    <div id="tutorial-new-workout" className="hidden md:flex">
                        <NewPostButton
                            onCreate={createEntryInNotebook}
                            onImportMarkdown={handleImportMarkdown}
                        />
                    </div>

                    <button
                        id="tutorial-details"
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className={cn(
                            "p-2 rounded-md transition-colors",
                            isDetailsOpen
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        title="Toggle Settings"
                    >
                        <PanelRightOpen className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
                <PanelGrid
                    panels={historyView.panels}
                    layoutState={layoutState}

                    className="h-full"
                />
                <HistoryDetailsPanel
                    isOpen={isDetailsOpen}
                    onClose={() => setIsDetailsOpen(false)}
                    collections={collections}
                    activeCollectionId={activeCollectionId}
                    onCollectionSelect={setActiveCollection}
                    onNotebookClear={() => setActiveNotebook(null)}
                />
            </div>

            <CommandPalette />
            <CreateNotebookDialog
                open={showCreateNotebook}
                onOpenChange={setShowCreateNotebook}
                onCreate={(name, description, icon) => {
                    createNotebook(name, description, icon);
                    setShowCreateNotebook(false);
                }}
            />
        </div>
    );
};

export const HistoryPage: React.FC<{ provider?: IContentProvider }> = ({ provider }) => {
    // Default to LocalStorageContentProvider for now if not provided (backward compat during refactor)
    // In next step, App.tsx will provide IndexedDBContentProvider
    const activeProvider = useMemo(() => provider || new LocalStorageContentProvider(), [provider]);
    return (
        <CommandProvider>
            <HistoryContent provider={activeProvider} />
        </CommandProvider>
    );
};

export default HistoryPage;
