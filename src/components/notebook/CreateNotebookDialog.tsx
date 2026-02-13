/**
 * CreateNotebookDialog — Modal for creating a new notebook.
 *
 * Fields: name (required), description (optional), icon (emoji picker grid).
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../headless/Dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotebookService } from '../../services/NotebookService';

const ICONS = NotebookService.ICONS;

interface CreateNotebookDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string, description: string, icon: string) => void;
}

export const CreateNotebookDialog: React.FC<CreateNotebookDialogProps> = ({
    open,
    onOpenChange,
    onCreate,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('📓');

    const handleCreate = () => {
        if (!name.trim()) return;
        onCreate(name.trim(), description.trim(), selectedIcon);
        setName('');
        setDescription('');
        setSelectedIcon('📓');
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && name.trim()) {
            e.preventDefault();
            handleCreate();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-popover text-popover-foreground border border-border">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Create Notebook</DialogTitle>
                    <DialogDescription>
                        Organize your workouts into collections.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Icon Picker */}
                    <div>
                        <label className="text-sm font-medium text-foreground/80 mb-2 block">
                            Icon
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {ICONS.map(icon => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setSelectedIcon(icon)}
                                    className={cn(
                                        'w-9 h-9 rounded-md flex items-center justify-center text-lg transition-all',
                                        'hover:bg-accent hover:scale-110',
                                        selectedIcon === icon
                                            ? 'bg-primary/20 ring-2 ring-primary scale-110'
                                            : 'bg-muted/50'
                                    )}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="text-sm font-medium text-foreground/80 mb-1 block">
                            Name <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g., Morning Routines"
                            autoFocus
                            className={cn(
                                'w-full px-3 py-2 rounded-md text-sm',
                                'bg-background border border-border',
                                'text-foreground placeholder:text-muted-foreground',
                                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                                'transition-colors'
                            )}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-foreground/80 mb-1 block">
                            Description <span className="text-muted-foreground text-xs">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="A brief description of this notebook..."
                            rows={2}
                            className={cn(
                                'w-full px-3 py-2 rounded-md text-sm resize-none',
                                'bg-background border border-border',
                                'text-foreground placeholder:text-muted-foreground',
                                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                                'transition-colors'
                            )}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleCreate}
                            disabled={!name.trim()}
                        >
                            Create
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
