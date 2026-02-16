import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CommitGraph } from '@/components/ui/CommitGraph';
import { Button } from '@/components/ui/button';
import { Search, HelpCircle, PanelRightOpen, Calendar, Book, Library, LayoutGrid, ChevronDown } from 'lucide-react';
import { useCommandPalette } from '@/components/command-palette/CommandContext';
import { useTutorialStore } from '@/hooks/useTutorialStore';
import { NewPostButton } from '@/components/history/NewPostButton';
import { useNotebooks } from '@/components/notebook/NotebookContext';
import { DebugButton } from '@/components/layout/DebugModeContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface HistoryLayoutProps {
    children: React.ReactNode;
    isMobile?: boolean; // Can pass down or detect
    onOpenDetails?: () => void;
    isDetailsOpen?: boolean;
    headerExtras?: React.ReactNode; // For "New Note" buttons etc
}

export const HistoryLayout: React.FC<HistoryLayoutProps> = ({
    children,
    isMobile = false,
    onOpenDetails,
    isDetailsOpen,
    headerExtras
}) => {
    const { setIsOpen } = useCommandPalette();
    const { startTutorial } = useTutorialStore();
    const { activeNotebookId, activeNotebook, notebooks, setActiveNotebook } = useNotebooks();

    // Navigation Items
    const navItems = [
        { path: '/notebooks', label: 'Notebooks', icon: Book },
        { path: '/collections', label: 'Collections', icon: Library },
        { path: '/feed', label: 'Feed', icon: LayoutGrid },
    ];

    const notebookLabel = activeNotebook ? activeNotebook.name : 'All Workouts';

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div id="history-header" className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
                <div className="font-bold flex items-center gap-4">
                    {/* Logo */}
                    <NavLink to="/" className={cn(
                        'h-10 flex items-center hover:opacity-80 transition-opacity',
                        isMobile ? 'w-[150px]' : 'w-[200px]'
                    )}>
                        <CommitGraph
                            text={isMobile ? 'WOD.WIKI' : 'WOD.WIKI++'}
                            rows={16}
                            cols={isMobile ? 60 : 70}
                            gap={1}
                            padding={0}
                            fontScale={0.8}
                            fontWeight={200}
                            letterSpacing={1.6}
                        />
                    </NavLink>

                    {/* Navigation Buttons */}
                    <div className="flex bg-muted/50 p-1 rounded-lg gap-1">
                        {/* Notebooks Dropdown Trigger if active, else Link */}
                        <div className="flex">
                            <DropdownMenu>
                                <div className="flex items-stretch">
                                    <NavLink
                                        to="/notebooks"
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                            isActive ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                        )}
                                    >
                                        <Book className="w-4 h-4" />
                                        <span className="hidden md:inline">Notebooks</span>
                                    </NavLink>

                                    {/* Only show dropdown trigger if Notebooks is somewhat relevant or always? 
                                        User asked for "notebook button being a dropdown"
                                    */}
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="px-1 h-auto ml-0 border-l border-transparent hover:bg-background/50 rounded-r-md rounded-l-none -ml-1">
                                            <ChevronDown className="h-3 w-3 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </div>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuLabel>Select Notebook</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setActiveNotebook(null)}>
                                        All Workouts
                                    </DropdownMenuItem>
                                    {notebooks.map(nb => (
                                        <DropdownMenuItem key={nb.id} onClick={() => setActiveNotebook(nb.id)}>
                                            {nb.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>


                        {/* Collections */}
                        <NavLink
                            to="/collections"
                            className={({ isActive }) => cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                isActive ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                            )}
                        >
                            <Library className="w-4 h-4" />
                            <span className="hidden md:inline">Collections</span>
                        </NavLink>

                        {/* Feed */}
                        <NavLink
                            to="/feed"
                            className={({ isActive }) => cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                isActive ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="hidden md:inline">Feed</span>
                        </NavLink>
                    </div>

                    {/* Active Notebook Label (Context) */}
                    {!isMobile && activeNotebookId && (
                        <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase ml-2">
                            {notebookLabel}
                        </span>
                    )}
                </div>

                <div className="flex gap-2 items-center">
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="text-muted-foreground hover:text-foreground">
                        <Search className="h-4 w-4" />
                    </Button>

                    <DebugButton />

                    <Button variant="ghost" size="icon" onClick={() => startTutorial('history')} className="text-muted-foreground hover:text-foreground">
                        <HelpCircle className="h-5 w-5" />
                    </Button>

                    <div className="h-6 w-px bg-border mx-2" />

                    {headerExtras}

                    {onOpenDetails && (
                        <button
                            onClick={onOpenDetails}
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
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
                {children}
            </div>
        </div>
    );
};
