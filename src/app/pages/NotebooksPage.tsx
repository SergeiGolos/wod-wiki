import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PanelGrid } from '@/components/layout/panel-system/PanelGrid';
import { createHistoryView } from '@/components/layout/panel-system/viewDescriptors';
import { ListFilter } from '@/components/workbench/ListFilter';
import { ListOfNotes } from '@/components/workbench/ListOfNotes';
import { NotePreview } from '@/components/workbench/NotePreview';
import { AnalyzePanel } from '@/components/workbench/AnalyzePanel';
import type { IContentProvider } from '@/types/content-provider';
import { useHistorySelection } from '@/hooks/useHistorySelection';
import { useCommandPalette } from '@/components/command-palette/CommandContext';
import { WodNavigationStrategy } from '@/components/command-palette/strategies/WodNavigationStrategy';
import { useCreateWorkoutEntry } from '@/hooks/useCreateWorkoutEntry';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';
import { HistoryDetailsPanel } from '@/components/workbench/HistoryDetailsPanel';
import { useTutorialStore } from '@/hooks/useTutorialStore';
import type { PanelSpan } from '@/components/layout/panel-system/types';
import { useNotebooks } from '@/components/notebook/NotebookContext';
import { CreateNotebookDialog } from '@/components/notebook/CreateNotebookDialog';
import { toNotebookTag } from '@/types/notebook';
import { toShortId } from '@/lib/idUtils';
import { planPath, trackPath } from '@/lib/routes';
import { NewPostButton } from '@/components/history/NewPostButton';
import { createNoteFromMarkdown } from '@/services/ExportImportService';
import { HistoryLayout } from '@/components/history/HistoryLayout';

interface NotebooksContentProps {
    provider: IContentProvider;
}

const NotebooksContent: React.FC<NotebooksContentProps> = ({ provider }) => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse initial calendar date from URL 'month' param
    const initialCalendarDate = useMemo(() => {
        const monthParam = searchParams.get('month'); // YYYY-MM
        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            const [y, m] = monthParam.split('-').map(Number);
            return new Date(y, m - 1, 1);
        }
        return undefined;
    }, []);

    const historySelection = useHistorySelection(null, initialCalendarDate);
    const navigate = useNavigate();
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const { setStrategy } = useCommandPalette();
    const { activeNotebookId, setActiveNotebook, notebooks, createNotebook } = useNotebooks();
    const [showCreateNotebook, setShowCreateNotebook] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    }, [searchParams, setActiveNotebook]);

    // Sync URL with Filter State
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        // Notebook
        if (activeNotebookId) {
            params.set('notebook', toShortId(activeNotebookId));
        } else {
            params.delete('notebook');
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
            const d = historySelection.calendarDate;
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            params.set('month', monthStr);
        }

        setSearchParams(params, { replace: true });
    }, [activeNotebookId, filterMode, customDates, dateRange, historySelection.calendarDate, setSearchParams]);

    // Calendar Date Selection Handler
    const handleDateSelect = useCallback((date: Date, modifiers: { shiftKey: boolean; ctrlKey: boolean }) => {
        const dateKey = date.toISOString().split('T')[0];
        setLastClickedDate(date);

        if (modifiers.shiftKey && lastClickedDate) {
            // Range selection
            const d1 = lastClickedDate < date ? lastClickedDate : date;
            const d2 = lastClickedDate < date ? date : lastClickedDate;

            setDateRange({
                start: d1.toISOString().split('T')[0],
                end: d2.toISOString().split('T')[0]
            });
            setFilterMode('range');
            return;
        }

        if (modifiers.ctrlKey) {
            // Toggle selection
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
            return;
        }

        // Simple Click
        setCustomDates(new Set([dateKey]));
        setFilterMode('list');
    }, [lastClickedDate, filterMode]);

    // Handle Month Change
    const handleCalendarDateChange = useCallback((date: Date) => {
        historySelection.setCalendarDate(date);
        setFilterMode('month');
        setCustomDates(new Set());
        setDateRange(null);
    }, [historySelection]);

    // Load entries
    useEffect(() => {
        provider.getEntries().then(setHistoryEntries);
    }, []);

    // Filter Logic
    const filteredEntries = useMemo(() => {
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
    }, [historyEntries, activeNotebookId, filterMode, dateRange, customDates, historySelection.calendarDate]);

    // Visuals
    const visualSelectedDates = useMemo(() => {
        if (filterMode === 'month') return undefined;
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
        // If created in month view, ensure we are in month view or switch to it if handy?
        // Existing behavior seemed fine.
    }, [createNewEntry, provider]);

    const handleImportMarkdown = useCallback(async (markdown: string) => {
        try {
            const noteData = createNoteFromMarkdown(markdown);
            const newEntry = await provider.saveEntry(noteData);
            const entries = await provider.getEntries();
            setHistoryEntries(entries);
            navigate(planPath(toShortId(newEntry.id)));
        } catch (error) {
            console.error('Failed to import markdown:', error);
            alert('Failed to import markdown: ' + (error instanceof Error ? error.message : String(error)));
        }
    }, [provider, navigate]);


    const selectedEntries = useMemo(() => {
        return historyEntries.filter(e => historySelection.selectedIds.has(e.id));
    }, [historyEntries, historySelection.selectedIds]);

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
            const cloned = await provider.cloneEntry(entryId, targetDate);
            navigate(planPath(toShortId(cloned.id)));
        } catch (err) {
            console.error('Failed to clone entry:', err);
        }
    }, [provider, navigate]);

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

    // Panels
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
                    onNotebookToggle={handleNotebookToggle}
                    onEdit={(id) => navigate(planPath(toShortId(id)))}
                    onClone={handleClone}
                    provider={provider}
                    className="h-full overflow-y-auto"
                />
            </div>
        </div>
    );

    const previewPanel = useMemo(() => {
        if (selectedEntries.length === 0) {
            if (filteredEntries.length === 0) return null;
            return <AnalyzePanel selectedEntries={filteredEntries} />;
        }

        if (selectedEntries.length >= 2) {
            return <AnalyzePanel selectedEntries={selectedEntries} />;
        }

        const entryToShow = selectedEntries[0];
        if (!entryToShow) return null;

        return (
            <NotePreview
                entry={entryToShow}
                onStartWorkout={async (blockId) => {
                    navigate(trackPath(toShortId(entryToShow.id), blockId));
                }}
                onAddToPlan={async () => {
                    if (!provider.capabilities.canWrite) return;
                    const cloned = await provider.cloneEntry(entryToShow.id);
                    navigate(planPath(toShortId(cloned.id)));
                }}
                onClone={(targetDate?: number) => handleClone(entryToShow.id, targetDate)}
                onEdit={() => navigate(planPath(toShortId(entryToShow.id)))}
                onDelete={provider.capabilities.canDelete && !entryToShow.results ? () => handleDelete(entryToShow.id) : undefined}
                provider={provider}
            />
        );
    }, [selectedEntries, filteredEntries, navigate, handleDelete]);

    const historyView = createHistoryView(mainPanel, previewPanel);

    const layoutState = {
        viewId: 'notebooks',
        panelSpans: historyView.panels.reduce((acc, p) => {
            acc[p.id] = p.defaultSpan as PanelSpan;
            return acc;
        }, {} as Record<string, PanelSpan>),
        expandedPanelId: null,
    };

    return (
        <HistoryLayout
            isMobile={isMobile}
            onOpenDetails={() => setIsDetailsOpen(!isDetailsOpen)}
            isDetailsOpen={isDetailsOpen}
            headerExtras={
                <div id="tutorial-new-workout" className="hidden md:flex">
                    <NewPostButton
                        onCreate={createEntryInNotebook}
                        onImportMarkdown={handleImportMarkdown}
                    />
                </div>
            }
        >
            <PanelGrid
                panels={historyView.panels}
                layoutState={layoutState}
                className="h-full"
            />
            <HistoryDetailsPanel
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                // Collections not relevant here
                collections={[]}
                activeCollectionId={null}
                onCollectionSelect={() => { }}
                onNotebookClear={() => setActiveNotebook(null)}
            />

            <CreateNotebookDialog
                open={showCreateNotebook}
                onOpenChange={setShowCreateNotebook}
                onCreate={(name, description, icon) => {
                    createNotebook(name, description, icon);
                    setShowCreateNotebook(false);
                }}
            />
        </HistoryLayout>
    );
};

export const NotebooksPage: React.FC<{ provider: IContentProvider }> = ({ provider }) => {
    return (
        <NotebooksContent provider={provider} />
    );
};
