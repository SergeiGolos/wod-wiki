import React from 'react';
import { HistoryPostList } from '../history/HistoryPostList';
import { HistoryEntry } from '@/types/history';
import { cn } from '@/lib/utils';

export interface ListOfNotesProps {
    entries: HistoryEntry[];
    selectedIds: Set<string>;
    onToggleEntry: (id: string) => void;
    onOpenEntry?: (id: string) => void;
    activeEntryId?: string | null;
    enriched?: boolean;
    className?: string;
}

export const ListOfNotes: React.FC<ListOfNotesProps> = ({
    entries,
    selectedIds,
    onToggleEntry,
    onOpenEntry,
    activeEntryId,
    enriched = false,
    className,
}) => {
    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* In compact mode, HistoryPanel put the Create button in the sidebar (top part). 
           If using ListOfNotes in a context where we want internal headers or actions, we can add them here.
           For now, it delegates mainly to HistoryPostList.
       */}

            {/* If we wanted to inject the create button inside the list flow for compact views, we could do it here,
           but HistoryPanel logic separated it. We'll keep it flexible.
       */}

            <HistoryPostList
                entries={entries}
                selectedIds={selectedIds}
                onToggle={onToggleEntry}
                onOpen={onOpenEntry}
                activeEntryId={activeEntryId}
                enriched={enriched}
            />
        </div>
    );
};
