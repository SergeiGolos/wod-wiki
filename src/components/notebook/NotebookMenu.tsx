/**
 * NotebookMenu — BookOpen labeled dropdown for notebook selection.
 *
 * On History pages (no entry context):
 *   - Notebook rows act as selectors (checkmark for active)
 *
 * On Workbench pages (entry context provided):
 *   - Notebook rows show +/× to add/remove the current entry
 *   - Active notebook still marked with a checkmark on the left
 */

import React, { useState } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useNotebooks } from './NotebookContext';
import { CreateNotebookDialog } from './CreateNotebookDialog';

interface NotebookMenuProps {
    /** When provided, shows +/× per notebook for the current entry */
    entryTags?: string[];
    /** Callback when toggling notebook membership for the current entry */
    onEntryToggle?: (notebookId: string, isAdding: boolean) => void;
}

export const NotebookMenu: React.FC<NotebookMenuProps> = ({
    entryTags,
    onEntryToggle,
}) => {
    const {
        notebooks,
        activeNotebookId,
        setActiveNotebook,
        createNotebook,
        entryBelongsToNotebook,
    } = useNotebooks();

    const navigate = useNavigate();
    const [showCreate, setShowCreate] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const hasEntryContext = !!entryTags && !!onEntryToggle;

    const handleCreate = (name: string, description: string, icon: string) => {
        const nb = createNotebook(name, description, icon);
        setActiveNotebook(nb.id);
    };

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Switch notebook"
                    >
                        <BookOpen className="h-4 w-4" />
                        <span className="ml-1.5">Notebook</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <span>Notebooks</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* "All" option — always acts as notebook selector */}
                    <DropdownMenuItem
                        onClick={() => {
                            setActiveNotebook(null);
                            setMenuOpen(false);
                            navigate('/');
                        }}
                        className={cn("gap-2", activeNotebookId === null && "bg-accent text-accent-foreground")}
                    >
                        <span className="w-5 text-center">📚</span>
                        <span className="flex-1">All Workouts</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Notebook list */}
                    {notebooks.map(nb => {
                        const isActive = activeNotebookId === nb.id;
                        const belongs = hasEntryContext ? entryBelongsToNotebook(entryTags!, nb.id) : false;

                        return (
                            <DropdownMenuItem
                                key={nb.id}
                                onClick={() => {
                                    setActiveNotebook(nb.id);
                                    if (!hasEntryContext) {
                                        setMenuOpen(false);
                                    }
                                    navigate('/');
                                }}
                                className={cn("gap-2 group", isActive && "bg-accent text-accent-foreground")}
                            >
                                <span className="w-5 text-center">{nb.icon}</span>
                                <span className="flex-1 truncate">
                                    {nb.name}
                                </span>

                                {/* Entry toggle (+/×) — shown only when entry context is provided */}
                                {hasEntryContext && (
                                    <button
                                        className={`shrink-0 rounded p-0.5 transition-colors ${belongs
                                            ? 'text-destructive hover:bg-destructive/10'
                                            : 'text-primary hover:bg-primary/10'
                                            }`}
                                        title={belongs ? `Remove from ${nb.name}` : `Add to ${nb.name}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEntryToggle!(nb.id, !belongs);
                                        }}
                                    >
                                        {belongs
                                            ? <X className="h-3.5 w-3.5" />
                                            : <Plus className="h-3.5 w-3.5" />
                                        }
                                    </button>
                                )}
                            </DropdownMenuItem>
                        );
                    })}

                    {notebooks.length === 0 && (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                            No notebooks yet
                        </div>
                    )}

                    <DropdownMenuSeparator />

                    {/* Create button */}
                    <DropdownMenuItem
                        onClick={() => {
                            setShowCreate(true);
                            setMenuOpen(false);
                        }}
                        className="gap-2 text-primary"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Notebook</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu >

            <CreateNotebookDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreate={handleCreate}
            />
        </>
    );
};
