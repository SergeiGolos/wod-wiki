import React, { useState, useEffect } from 'react';
import { GitFork, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toShortId } from '@/lib/idUtils';
import type { HistoryEntry } from '@/types/history';
import type { IContentProvider } from '@/types/content-provider';
import { CloneDateDropdown } from '@/components/workbench/CloneDateDropdown';

interface LinkedNotesSectionProps {
  entry: HistoryEntry;
  provider?: IContentProvider;
  onClone?: (targetDate?: number) => void;
}

export const LinkedNotesSection: React.FC<LinkedNotesSectionProps> = ({
  entry,
  provider,
  onClone,
}) => {
  const navigate = useNavigate();
  const [sourceEntry, setSourceEntry] = useState<HistoryEntry | null>(null);
  const [clonedEntries, setClonedEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!entry || !provider) {
      setSourceEntry(null);
      setClonedEntries([]);
      return;
    }

    if (entry.templateId) {
      provider.getEntry(entry.templateId).then((e) => setSourceEntry(e ?? null)).catch(() => setSourceEntry(null));
    } else {
      setSourceEntry(null);
    }

    if (entry.clonedIds && entry.clonedIds.length > 0) {
      Promise.all(entry.clonedIds.map((id) => provider.getEntry(id)))
        .then((entries) => setClonedEntries(entries.filter((e): e is HistoryEntry => e !== null)))
        .catch(() => setClonedEntries([]));
    } else {
      setClonedEntries([]);
    }
  }, [entry?.id, entry?.templateId, entry?.clonedIds?.length, provider]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-muted-foreground block">
          <span className="flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5" />
            Linked Notes
          </span>
        </label>
        {onClone && (
          <CloneDateDropdown
            onClone={onClone}
            provider={provider}
            variant="icon"
            showLabel={false}
            title="Clone/Use Template"
            className="h-6 w-6"
          />
        )}
      </div>

      {entry.templateId && (
        <div className="bg-muted/30 rounded-md p-2.5 border border-border/50">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
            Cloned From
          </div>
          <button
            onClick={() => navigate(`/note/${toShortId(entry.templateId!)}/plan`)}
            className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 hover:underline w-full text-left group"
          >
            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate flex-1">{sourceEntry?.title || 'Original Template'}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
          </button>
          {sourceEntry && (
            <div className="text-[10px] text-muted-foreground mt-1 ml-5">
              {new Date(sourceEntry.targetDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          )}
        </div>
      )}

      {clonedEntries.length > 0 && (
        <div className="bg-muted/30 rounded-md p-2.5 border border-border/50">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
            Cloned To ({clonedEntries.length})
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {clonedEntries.map((clone) => (
              <button
                key={clone.id}
                onClick={() => navigate(`/note/${toShortId(clone.id)}/plan`)}
                className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 hover:underline w-full text-left group"
              >
                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{clone.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(clone.targetDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!entry.templateId && (!entry.clonedIds || entry.clonedIds.length === 0) && (
        <div className="text-xs text-muted-foreground italic">No linked notes</div>
      )}
    </div>
  );
};
