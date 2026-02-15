/**
 * AddToNotebookButton — Reusable dropdown to assign entries to notebooks.
 *
 * Shows a list of notebooks with toggle checkmarks.
 * Calls onToggle(notebookId, isAdding) to let the parent persist the change.
 */

import React, { useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNotebooks } from './NotebookContext';

interface AddToNotebookButtonProps {
    /** Current tags on the entry (to show which notebooks it belongs to) */
    entryTags: string[];
    /** Callback when toggling notebook membership */
    onToggle: (notebookId: string, isAdding: boolean) => void;
    /** Optional variant: 'icon' for icon-only, 'labeled' for icon+text */
    variant?: 'icon' | 'labeled';
    /** Optional class override */
    className?: string;
}

export const AddToNotebookButton: React.FC<AddToNotebookButtonProps> = ({
    entryTags,
    onToggle,
    variant = 'icon',
    className,
}) => {
    const { notebooks, entryBelongsToNotebook } = useNotebooks();
    const [open, setOpen] = useState(false);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size={variant === 'icon' ? 'icon' : 'sm'}
                    className={className ?? 'text-muted-foreground hover:text-foreground'}
                    aria-label="Add to notebook"
                    onClick={(e) => e.stopPropagation()}
                >
                    <BookOpen className="h-4 w-4" />
                    {variant === 'labeled' && <span className="ml-1.5">Notebook</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Add to notebook</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notebooks.map(nb => {
                    const belongs = entryBelongsToNotebook(entryTags, nb.id);
                    return (
                        <DropdownMenuItem
                            key={nb.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(nb.id, !belongs);
                                setOpen(false);
                            }}
                            className="gap-2"
                        >
                            <span className="w-5 text-center">{nb.icon}</span>
                            <span className="flex-1 truncate">{nb.name}</span>
                            {belongs && <Check className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                    );
                })}

                {notebooks.length === 0 && (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                        No notebooks available
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
