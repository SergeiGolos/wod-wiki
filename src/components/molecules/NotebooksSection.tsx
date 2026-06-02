import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toShortId } from '@/lib/idUtils';
import { useNotebooks } from '@/components/notebook/NotebookContext';
import { AddToNotebookButton } from '@/components/notebook/AddToNotebookButton';

interface NotebooksSectionProps {
  entryTags: string[];
  canWrite: boolean;
  onToggle: (notebookId: string, isAdding: boolean) => void;
}

export const NotebooksSection: React.FC<NotebooksSectionProps> = ({
  entryTags,
  canWrite,
  onToggle,
}) => {
  const navigate = useNavigate();
  const { getEntryNotebooks } = useNotebooks();
  const belongingNotebooks = getEntryNotebooks(entryTags);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <label className="text-xs font-medium text-muted-foreground">Notebooks</label>
        </div>
        {canWrite && (
          <AddToNotebookButton
            entryTags={entryTags}
            onToggle={onToggle}
            variant="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          />
        )}
      </div>
      {belongingNotebooks.length > 0 ? (
        <div className="space-y-1">
          {belongingNotebooks.map((nb) => (
            <button
              key={nb.id}
              onClick={() => navigate(`/?notebook=${toShortId(nb.id)}`)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm bg-primary/10 text-foreground hover:bg-primary/20 transition-colors text-left group"
            >
              <span className="w-5 text-center text-sm">{nb.icon}</span>
              <span className="flex-1 truncate">{nb.name}</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Not in any notebook</div>
      )}
    </div>
  );
};
