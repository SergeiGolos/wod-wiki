import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PanelGrid } from '@/components/layout/panel-system/PanelGrid';
import { createHistoryView } from '@/components/layout/panel-system/viewDescriptors';
import { ListFilter } from '@/components/workbench/ListFilter';
import { ListOfNotes } from '@/components/workbench/ListOfNotes';
import { NotePreview } from '@/components/workbench/NotePreview';
import { AnalyzePanel } from '@/components/workbench/AnalyzePanel';
import { LocalStorageContentProvider } from '@/services/content/LocalStorageContentProvider';
import { useHistorySelection } from '@/hooks/useHistorySelection';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { CommitGraph } from '@/components/ui/CommitGraph';
import { Search, Github, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandProvider, useCommandPalette } from '@/components/command-palette/CommandContext';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { WodNavigationStrategy } from '@/components/command-palette/strategies/WodNavigationStrategy';
import { useCreateWorkoutEntry } from '@/hooks/useCreateWorkoutEntry';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';
import type { PanelSpan } from '@/components/layout/panel-system/types';
import { NotebookMenu } from '@/components/notebook/NotebookMenu';
import { useNotebooks } from '@/components/notebook/NotebookContext';
import { toNotebookTag } from '@/types/notebook';
import { toShortId } from '@/lib/idUtils';

const provider = new LocalStorageContentProvider();

const HistoryContent: React.FC = () => {
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
    const { activeNotebookId, activeNotebook, setActiveNotebook, notebooks } = useNotebooks();

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
    }, [activeNotebookId, filterMode, customDates, dateRange, historySelection.calendarDate, setSearchParams]);

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
            return;
        }

        // Simple Click -> Select Single Date ('list' mode of 1)
        setCustomDates(new Set([dateKey]));
        setFilterMode('list');
    }, [lastClickedDate, filterMode]);

    // Handle Month Change -> Reset to Month Mode
    const handleCalendarDateChange = useCallback((date: Date) => {
        historySelection.setCalendarDate(date);
        setFilterMode('month');
        // Clear specific selections when changing month to view that whole month
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
                const d = new Date(e.updatedAt);
                return d.getFullYear() === year && d.getMonth() === month;
            });
        } else if (filterMode === 'range' && dateRange) {
            entries = entries.filter(e => {
                const d = new Date(e.updatedAt).toISOString().split('T')[0];
                return d >= dateRange.start && d <= dateRange.end;
            });
        } else if (filterMode === 'list') {
            entries = entries.filter(e => {
                const d = new Date(e.updatedAt).toISOString().split('T')[0];
                return customDates.has(d);
            });
        }

        return entries;
    }, [historyEntries, activeNotebookId, filterMode, dateRange, customDates, historySelection.calendarDate]);

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

    const createEntryInNotebook = useCallback(async () => {
        await createNewEntry();
        const entries = await provider.getEntries();
        setHistoryEntries(entries);
    }, [createNewEntry]);


    const selectedEntries = useMemo(() => {
        // Selection persists across filters, so check against ALL history entries
        return historyEntries.filter(e => historySelection.selectedIds.has(e.id));
    }, [historyEntries, historySelection.selectedIds]);

    const notebookLabel = activeNotebook ? activeNotebook.name : 'All Workouts';

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

    // Combined Main Panel (Filter + List)
    const mainPanel = (
        <div className="flex h-full divide-x divide-border">
            {/* Filter Sidebar */}
            <div className="w-[280px] flex-shrink-0 bg-muted/10 h-full overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <ListFilter
                        calendarDate={historySelection.calendarDate}
                        onCalendarDateChange={handleCalendarDateChange}
                        entryDates={new Set(historyEntries.map(e => new Date(e.updatedAt).toISOString().split('T')[0]))}
                        selectedDates={visualSelectedDates}
                        onDateSelect={handleDateSelect}
                        selectedIds={historySelection.selectedIds}
                        onSelectAll={() => historySelection.selectAll(filteredEntries.map(e => e.id))}
                        onClearSelection={historySelection.clearSelection}
                        notebooks={notebooks}
                        activeNotebookId={activeNotebookId}
                        onNotebookSelect={setActiveNotebook}
                        onResetFilters={() => {
                            setActiveNotebook(null);
                            setFilterMode('month');
                            setCustomDates(new Set());
                            setDateRange(null);
                            historySelection.setCalendarDate(new Date()); // Reset calendar to today too? User said "reset everything to full view".
                            // Usually full view implies default view which is today's month.
                            // But maybe current month is fine.
                            // I'll stick to clearing filters for now, keeping current calendar view unless user wants "Home".
                            // User said "reset everything to full view". Maybe just clear filters.
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
                    onToggleEntry={historySelection.toggleEntry}
                    onOpenEntry={historySelection.toggleEntry}
                    activeEntryId={historySelection.activeEntryId}
                    enriched={false}
                    onNotebookToggle={handleNotebookToggle}
                    onEdit={(id) => navigate(`/note/${toShortId(id)}/plan`)}
                    className="h-full overflow-y-auto"
                />
            </div>
        </div>
    );

    const previewPanel = useMemo(() => {
        // Case 1: No explicit selection -> Analyze ALL visible (filtered) entries (default view)
        if (selectedEntries.length === 0) {
            if (filteredEntries.length === 0) return null;
            return <AnalyzePanel selectedEntries={filteredEntries} />;
        }

        // Case 2: Multi-selection -> Analyze SELECTED entries
        if (selectedEntries.length >= 2) {
            return <AnalyzePanel selectedEntries={selectedEntries} />;
        }

        // Case 3: Single selection -> Preview
        const entryToShow = selectedEntries[0];
        if (!entryToShow) return null;

        return (
            <NotePreview
                entry={entryToShow}
                onStartWorkout={() => {
                    navigate(`/note/${toShortId(entryToShow.id)}/plan`);
                }}
            />
        );
    }, [selectedEntries, filteredEntries, navigate]);

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
            <div className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
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

                    <div className="h-6 w-px bg-border mx-2" />

                    <Button
                        variant="default"
                        size="sm"
                        onClick={createEntryInNotebook}
                        className="gap-2 hidden md:flex"
                    >
                        <Plus className="h-4 w-4" />
                        New Workout
                    </Button>

                    <ThemeToggle />
                    {!isMobile && (
                        <a
                            href="https://github.com/SergeiGolos/wod-wiki"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Github className="h-5 w-5" />
                        </a>
                    )}
                    <NotebookMenu />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <PanelGrid
                    panels={historyView.panels}
                    layoutState={layoutState}

                    className="h-full"
                />
            </div>

            <CommandPalette />
        </div>
    );
};

export const HistoryPage: React.FC = () => {
    return (
        <ThemeProvider defaultTheme="system" storageKey="wod-wiki-theme">
            <CommandProvider>
                <HistoryContent />
            </CommandProvider>
        </ThemeProvider>
    );
};

export default HistoryPage;
