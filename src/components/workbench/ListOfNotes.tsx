import React from 'react';
import { HistoryPostList } from '../history/HistoryPostList';
import { HistoryEntry } from '@/types/history';
import { cn } from '@/lib/utils';

export interface ListOfNotesProps {
    entries: HistoryEntry[];
    selectedIds: Set<string>;
    onToggleEntry: (id: string, modifiers?: { ctrlKey: boolean; shiftKey: boolean }) => void;
    activeEntryId?: string | null;
    enriched?: boolean;
    className?: string;
    onNotebookToggle?: (entryId: string, notebookId: string, isAdding: boolean) => void;
    onEdit?: (id: string) => void;
}

export const ListOfNotes: React.FC<ListOfNotesProps> = ({
    entries,
    selectedIds,
    onToggleEntry,
    activeEntryId,
    enriched = false,
    className,
    onNotebookToggle,
    onEdit,
}) => {
    return (
        <div className={cn("flex flex-col h-full", className)}>
            <HistoryPostList
                entries={entries}
                selectedIds={selectedIds}
                onToggle={onToggleEntry}
                activeEntryId={activeEntryId}
                enriched={enriched}
                onNotebookToggle={onNotebookToggle}
                onEdit={onEdit}
            />
        </div>
    );
};
