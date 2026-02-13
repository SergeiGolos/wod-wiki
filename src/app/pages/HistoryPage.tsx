import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

const provider = new LocalStorageContentProvider();

const HistoryContent: React.FC = () => {
    const navigate = useNavigate();
    const historySelection = useHistorySelection();
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const { setIsOpen, setStrategy } = useCommandPalette();
    const { activeNotebookId, activeNotebook } = useNotebooks();

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

    // Load entries
    useEffect(() => {
        provider.getEntries().then(setHistoryEntries);
    }, []);

    // Filter entries by active notebook
    const filteredEntries = useMemo(() => {
        if (!activeNotebookId) return historyEntries; // "All" mode
        const tag = toNotebookTag(activeNotebookId);
        return historyEntries.filter(e => e.tags.includes(tag));
    }, [historyEntries, activeNotebookId]);

    const { createNewEntry, canCreate } = useCreateWorkoutEntry({
        provider,
        historySelection,
        setHistoryEntries,
        setContent: () => { }, // No-op for standalone history view
    });

    // Wrap createNewEntry to auto-tag with active notebook
    const createEntryInNotebook = useCallback(async () => {
        await createNewEntry();
        // After creation, reload entries so the new one shows up
        const entries = await provider.getEntries();
        setHistoryEntries(entries);
    }, [createNewEntry]);

    const activeEntry = useMemo(() => {
        return filteredEntries.find(e => e.id === historySelection.activeEntryId);
    }, [filteredEntries, historySelection.activeEntryId]);

    const selectedEntries = useMemo(() => {
        return filteredEntries.filter(e => historySelection.selectedIds.has(e.id));
    }, [filteredEntries, historySelection.selectedIds]);

    const stripMode = historySelection.stripMode;

    // Display label for active notebook
    const notebookLabel = activeNotebook ? activeNotebook.name : 'All Workouts';

    // View Components
    const filterPanel = (
        <ListFilter
            calendarDate={historySelection.calendarDate}
            onCalendarDateChange={historySelection.setCalendarDate}
            entryDates={new Set(filteredEntries.map(e => new Date(e.updatedAt).toISOString().split('T')[0]))}
            selectedIds={historySelection.selectedIds}
            onSelectAll={() => historySelection.selectAll(filteredEntries.map(e => e.id))}
            onClearSelection={historySelection.clearSelection}
            onCreateNewEntry={createEntryInNotebook}
            canCreate={canCreate}
            className="p-4"
        />
    );

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

    const listPanel = (
        <ListOfNotes
            entries={filteredEntries}
            selectedIds={historySelection.selectedIds}
            onToggleEntry={historySelection.toggleEntry}
            onOpenEntry={(id) => navigate(`/note/${id}/plan`)}
            activeEntryId={historySelection.activeEntryId}
            enriched={false}
            onNotebookToggle={handleNotebookToggle}
        />
    );

    const previewPanel = useMemo(() => {
        if (stripMode === 'multi-select' && selectedEntries.length >= 2) {
            return <AnalyzePanel selectedEntries={selectedEntries} />;
        }
        return (
            <NotePreview
                entry={activeEntry}
                onStartWorkout={() => {
                    if (activeEntry) {
                        navigate(`/note/${activeEntry.id}/plan`);
                    }
                }}
            />
        );
    }, [stripMode, activeEntry, selectedEntries, navigate]);

    const historyView = createHistoryView(
        filterPanel,
        listPanel,
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
                    onExpandPanel={() => { }}
                    onCollapsePanel={() => { }}
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
