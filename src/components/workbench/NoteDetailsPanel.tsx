import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Calendar, Clock, Tag, Trash2, Link as LinkIcon, GitFork, ExternalLink, ArrowRightLeft, Plus, BookOpen, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';
import type { IContentProvider } from '@/types/content-provider';
import { toShortId } from '@/lib/idUtils';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { isNotebookTag } from '@/types/notebook';
import { useNotebooks } from '@/components/notebook/NotebookContext';

export interface NoteDetailsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    entry: HistoryEntry | null;
    provider?: IContentProvider;
    onEntryUpdate?: (updated: HistoryEntry) => void;
}

export const NoteDetailsPanel: React.FC<NoteDetailsPanelProps> = ({
    isOpen,
    onClose,
    entry,
    provider,
    onEntryUpdate,
}) => {
    const navigate = useNavigate();
    const [sourceEntry, setSourceEntry] = useState<HistoryEntry | null>(null);
    const [clonedEntries, setClonedEntries] = useState<HistoryEntry[]>([]);

    // Calendar popup state
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    // Tag input state
    const [tagInput, setTagInput] = useState('');
    const [isTagInputVisible, setIsTagInputVisible] = useState(false);
    const tagInputRef = useRef<HTMLInputElement>(null);

    // Notebook context
    const { notebooks, entryBelongsToNotebook, buildNotebookTag } = useNotebooks();

    // Close calendar on outside click
    useEffect(() => {
        if (!isCalendarOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        const id = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCalendarOpen]);

    // Focus tag input when shown
    useEffect(() => {
        if (isTagInputVisible && tagInputRef.current) {
            tagInputRef.current.focus();
        }
    }, [isTagInputVisible]);

    // Resolve linked entries when entry changes
    useEffect(() => {
        if (!entry || !provider) {
            setSourceEntry(null);
            setClonedEntries([]);
            return;
        }

        // Resolve source template
        if (entry.templateId) {
            provider.getEntry(entry.templateId).then(e => setSourceEntry(e ?? null)).catch(() => setSourceEntry(null));
        } else {
            setSourceEntry(null);
        }

        // Resolve cloned entries
        if (entry.clonedIds && entry.clonedIds.length > 0) {
            Promise.all(entry.clonedIds.map(id => provider.getEntry(id)))
                .then(entries => setClonedEntries(entries.filter((e): e is HistoryEntry => e !== null)))
                .catch(() => setClonedEntries([]));
        } else {
            setClonedEntries([]);
        }
    }, [entry?.id, entry?.templateId, entry?.clonedIds?.length, provider]);

    // Persist helper: update entry, notify parent
    const persistUpdate = useCallback(async (patch: Parameters<IContentProvider['updateEntry']>[1]) => {
        if (!entry || !provider) return;
        try {
            const updated = await provider.updateEntry(entry.id, patch);
            onEntryUpdate?.(updated);
        } catch (err) {
            console.error('Failed to update entry:', err);
        }
    }, [entry, provider, onEntryUpdate]);

    if (!entry) return null;

    const formatDate = (ms: number) =>
        new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

    const formatDay = (ms: number) =>
        new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' });

    // ---- Date handlers ----
    const handleDateSelect = async (date: Date) => {
        // Set to noon to avoid timezone edge-case shifts
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).getTime();
        await persistUpdate({ targetDate });
        setIsCalendarOpen(false);
    };

    // ---- Tag handlers ----
    // Filter out notebook tags for display — those are managed separately
    const displayTags = entry.tags.filter(t => !isNotebookTag(t));

    const handleAddTag = async () => {
        const tag = tagInput.trim().toLowerCase();
        if (!tag || entry.tags.includes(tag)) {
            setTagInput('');
            return;
        }
        const newTags = [...entry.tags, tag];
        await persistUpdate({ tags: newTags });
        setTagInput('');
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        const newTags = entry.tags.filter(t => t !== tagToRemove);
        await persistUpdate({ tags: newTags });
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === 'Escape') {
            setTagInput('');
            setIsTagInputVisible(false);
        }
    };

    // ---- Notebook handlers ----
    const handleNotebookToggle = async (notebookId: string, isAdding: boolean) => {
        const nbTag = buildNotebookTag(notebookId);
        const newTags = isAdding
            ? [...entry.tags, nbTag]
            : entry.tags.filter(t => t !== nbTag);
        await persistUpdate({ tags: newTags });
    };

    // ---- Delete handler ----
    const handleDelete = async () => {
        if (!provider || !confirm('Are you sure you want to delete this note? This action cannot be undone.')) return;
        try {
            await provider.deleteEntry(entry.id);
            navigate('/');
        } catch (error) {
            console.error('Failed to delete entry:', error);
            alert('Failed to delete entry');
        }
    };

    const canWrite = provider?.capabilities.canWrite ?? false;

    return (
        <div
            className={cn(
                "absolute top-0 right-0 h-full w-80 bg-background border-l border-border shadow-xl z-20 transition-transform duration-300 ease-in-out transform",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Note Details</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Name</label>
                        <div className="text-sm font-medium">{entry.title}</div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Created</label>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{formatDate(entry.createdAt)}</span>
                            </div>
                        </div>

                        {/* Target Date — with Move button + calendar popup */}
                        <div className="relative">
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Target Date</label>
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="flex-1">{formatDay(entry.targetDate)}</span>
                                {canWrite && (
                                    <button
                                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                        className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors",
                                            isCalendarOpen
                                                ? "bg-primary/20 text-primary"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                        title="Move to different date"
                                    >
                                        <ArrowRightLeft className="w-3 h-3" />
                                        Move
                                    </button>
                                )}
                            </div>
                            {/* Calendar popup */}
                            {isCalendarOpen && (
                                <div
                                    ref={calendarRef}
                                    className="absolute right-0 top-full mt-1 z-30 rounded-md border bg-popover shadow-lg"
                                >
                                    <CalendarDatePicker
                                        selectedDate={new Date(entry.targetDate)}
                                        onDateSelect={handleDateSelect}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Last Updated</label>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{formatDate(entry.updatedAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tags — interactive add/remove */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-muted-foreground">Tags</label>
                            {canWrite && (
                                <button
                                    onClick={() => setIsTagInputVisible(!isTagInputVisible)}
                                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Add tag"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        {displayTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {displayTags.map(tag => (
                                    <span
                                        key={tag}
                                        className="group inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border"
                                    >
                                        <Tag className="w-3 h-3 mr-1" />
                                        {tag}
                                        {canWrite && (
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                                title={`Remove tag "${tag}"`}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic">No tags</div>
                        )}
                        {/* Tag input */}
                        {isTagInputVisible && (
                            <div className="flex items-center gap-1.5 mt-2">
                                <input
                                    ref={tagInputRef}
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    onBlur={() => {
                                        if (!tagInput.trim()) setIsTagInputVisible(false);
                                    }}
                                    placeholder="Add tag…"
                                    className="flex-1 min-w-0 px-2 py-1 rounded-md border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                />
                                <button
                                    onClick={handleAddTag}
                                    disabled={!tagInput.trim()}
                                    className="px-2 py-1 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Notebooks — toggle membership */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                            <label className="text-xs font-medium text-muted-foreground">Notebooks</label>
                        </div>
                        {notebooks.length > 0 ? (
                            <div className="space-y-1">
                                {notebooks.map(nb => {
                                    const belongs = entryBelongsToNotebook(entry.tags, nb.id);
                                    return (
                                        <button
                                            key={nb.id}
                                            onClick={() => canWrite && handleNotebookToggle(nb.id, !belongs)}
                                            disabled={!canWrite}
                                            className={cn(
                                                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                                                belongs
                                                    ? "bg-primary/10 text-foreground"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                                !canWrite && "cursor-default"
                                            )}
                                        >
                                            <span className="w-5 text-center text-sm">{nb.icon}</span>
                                            <span className="flex-1 truncate">{nb.name}</span>
                                            {belongs && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic">No notebooks available</div>
                        )}
                    </div>

                    {/* Linked Notes */}
                    <div className="space-y-3">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                            <span className="flex items-center gap-1.5">
                                <GitFork className="w-3.5 h-3.5" />
                                Linked Notes
                            </span>
                        </label>

                        {/* Cloned From (source) */}
                        {entry.templateId && (
                            <div className="bg-muted/30 rounded-md p-2.5 border border-border/50">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Cloned From</div>
                                <button
                                    onClick={() => navigate(`/note/${toShortId(entry.templateId!)}/plan`)}
                                    className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 hover:underline w-full text-left group"
                                >
                                    <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate flex-1">
                                        {sourceEntry?.title || 'Original Template'}
                                    </span>
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                                </button>
                                {sourceEntry && (
                                    <div className="text-[10px] text-muted-foreground mt-1 ml-5">
                                        {new Date(sourceEntry.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Cloned To (children) */}
                        {clonedEntries.length > 0 && (
                            <div className="bg-muted/30 rounded-md p-2.5 border border-border/50">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
                                    Cloned To ({clonedEntries.length})
                                </div>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                    {clonedEntries.map(clone => (
                                        <button
                                            key={clone.id}
                                            onClick={() => navigate(`/note/${toShortId(clone.id)}/plan`)}
                                            className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 hover:underline w-full text-left group"
                                        >
                                            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate flex-1">{clone.title}</span>
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                {new Date(clone.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No linked notes */}
                        {!entry.templateId && (!entry.clonedIds || entry.clonedIds.length === 0) && (
                            <div className="text-xs text-muted-foreground italic">
                                No linked notes
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-muted/20">
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Note
                    </button>
                </div>
            </div>
        </div>
    );
};
