import React, { useState, useEffect } from 'react';
import { Plus, Calendar, FilePlus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { planPath } from '@/lib/routes';
import { toShortId } from '@/lib/idUtils';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { WodBlock } from '@/markdown-editor/types';
import type { IContentProvider } from '@/types/content-provider';
import type { HistoryEntry } from '@/types/history';
import { cn } from '@/lib/utils';

interface AddWodToNoteDropdownProps {
    wodBlock: WodBlock;
    provider?: IContentProvider;
    onAddSuccess?: (noteId: string) => void;
    className?: string;
}

export const AddWodToNoteDropdown: React.FC<AddWodToNoteDropdownProps> = ({
    wodBlock,
    provider,
    onAddSuccess,
    className,
}) => {
    const [notes, setNotes] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();


    // Fetch today and future notes when dropdown opens
    useEffect(() => {
        if (!open || !provider) return;

        const loadNotes = async () => {
            setLoading(true);
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Get all entries and filter manually (since provider simple dateRange might be limited)
                const allEntries = await provider.getEntries();
                const relevantNotes = allEntries.filter(e => e.targetDate >= today.getTime() && e.type !== 'template');

                // Sort: Today first, then future ascending
                relevantNotes.sort((a, b) => a.targetDate - b.targetDate);

                setNotes(relevantNotes);
            } catch (err) {
                console.error('Failed to load relevant notes:', err);
            } finally {
                setLoading(false);
            }
        };

        loadNotes();
    }, [open, provider]);

    const handleAddToNote = async (noteId: string) => {
        if (!provider) return;

        try {
            const note = await provider.getEntry(noteId);
            if (!note) return;

            const blockText = `\n\n\`\`\`${wodBlock.dialect || 'wod'}\n${wodBlock.content.trim()}\n\`\`\``;
            const newContent = note.rawContent.trim() + blockText;

            await provider.updateEntry(noteId, { rawContent: newContent });
            onAddSuccess?.(noteId);
            setOpen(false);

            // Navigate to the note in plan mode
            navigate(planPath(toShortId(noteId)));
        } catch (err) {
            console.error('Failed to add block to note:', err);
        }
    };

    const handleCreateNewNote = async () => {
        if (!provider) return;

        try {
            const blockText = `\`\`\`${wodBlock.dialect || 'wod'}\n${wodBlock.content.trim()}\n\`\`\``;
            const newEntry = await provider.saveEntry({
                title: 'New Workout',
                rawContent: `# New Workout\n\n${blockText}`,
                targetDate: Date.now(),
                tags: [],
                notes: '',
            });

            onAddSuccess?.(newEntry.id);
            setOpen(false);

            // Navigate to the new note in plan mode
            navigate(planPath(toShortId(newEntry.id)));
        } catch (err) {
            console.error('Failed to create new note from block:', err);
        }
    };

    if (!provider) return null;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Controlled open via onOpenChange
                    }}
                    className={cn(
                        'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors',
                        'text-muted-foreground hover:text-primary hover:bg-primary/10',
                        className
                    )}
                    title="Add to Plan..."
                >
                    <Plus className="h-3 w-3" />
                    <span>Plan</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5" />
                    Add to Plan
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {notes.map(note => {
                                const isToday = new Date(note.targetDate).toDateString() === new Date().toDateString();
                                return (
                                    <DropdownMenuItem
                                        key={note.id}
                                        onClick={() => handleAddToNote(note.id)}
                                        className="flex flex-col items-start gap-0.5 py-2"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Calendar className={cn("h-3 w-3", isToday ? "text-primary" : "text-muted-foreground")} />
                                            <span className="font-medium truncate flex-1">{note.title}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground ml-5">
                                            {isToday ? "Today" : new Date(note.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </DropdownMenuItem>
                                );
                            })}
                        </div>

                        {notes.length > 0 && <DropdownMenuSeparator />}

                        <DropdownMenuItem onClick={handleCreateNewNote} className="gap-2 text-primary font-medium">
                            <FilePlus className="h-4 w-4" />
                            <span>Create New Note</span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
