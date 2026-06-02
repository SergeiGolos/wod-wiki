import React from 'react';
import { Trash2, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';
import type { IContentProvider } from '@/types/content-provider';
import { exportNote } from '@/hooks/useWorkbenchServices';
import { NoteMetadata } from '@/components/organisms/workbench/NoteMetadata';
import { NotebooksSection } from '@/components/organisms/workbench/NotebooksSection';
import { DatesTagsSection } from '@/components/organisms/workbench/DatesTagsSection';
import { LinkedNotesSection } from '@/components/organisms/workbench/LinkedNotesSection';
import { PreferencesSection } from '@/components/organisms/workbench/PreferencesSection';
import { useNotebooks } from '@/components/organisms/notebook/NotebookContext';

export interface NoteDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entry: HistoryEntry | null;
  provider?: IContentProvider;
  onEntryUpdate?: (updated: HistoryEntry) => void;
  onClone?: (targetDate?: number) => void;
}

export const NoteDetailsPanel: React.FC<NoteDetailsPanelProps> = ({
  isOpen,
  entry,
  provider,
  onEntryUpdate,
  onClone,
}) => {
  const navigate = useNavigate();
  const { buildNotebookTag } = useNotebooks();

  if (!entry) return null;

  const canWrite = provider?.capabilities.canWrite ?? false;

  const handleNotebookToggle = async (notebookId: string, isAdding: boolean) => {
    const nbTag = buildNotebookTag(notebookId);
    const newTags = isAdding
      ? [...entry.tags, nbTag]
      : entry.tags.filter((t) => t !== nbTag);
    if (provider) {
      try {
        const updated = await provider.updateEntry(entry.id, { tags: newTags });
        onEntryUpdate?.(updated);
      } catch (err) {
        console.error('Failed to update entry:', err);
      }
    }
  };

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

  const handleExportNote = async () => {
    try {
      await exportNote(entry);
    } catch (error) {
      console.error('Failed to export note:', error);
      alert('Failed to export note');
    }
  };

  return (
    <div
      className={cn(
        'absolute top-0 right-0 h-full w-80 bg-background border-l border-border shadow-xl z-20 transition-transform duration-300 ease-in-out transform',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Note Details</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <NoteMetadata title={entry.title} />

          <NotebooksSection
            entryTags={entry.tags}
            canWrite={canWrite}
            onToggle={handleNotebookToggle}
          />

          <DatesTagsSection
            entry={entry}
            provider={provider}
            onEntryUpdate={onEntryUpdate}
          />

          <LinkedNotesSection
            entry={entry}
            provider={provider}
            onClone={onClone}
          />

          <PreferencesSection provider={provider} />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/20 space-y-2">
          <button
            onClick={handleExportNote}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <FileDown className="w-4 h-4" />
            Export Note
          </button>
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
