import React, { useMemo, useEffect, useCallback } from 'react';
import type { WodBlock, WorkoutResults } from '@/components/Editor/types';
import { NoteEditor } from '@/components/Editor/NoteEditor';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useCollectionImport } from '@/hooks/useCollectionImport';
import type { WodBlockExtract } from '@/lib/wodBlockExtract';
import type { IContentProvider } from '@/types/content-provider';
import { Download } from 'lucide-react';

export interface PlanPanelProps {
  initialContent?: string;
  value?: string;
  /** @deprecated Ignored — sections are parsed internally by NoteEditor */
  sections?: any[] | null;
  onStartWorkout: (block: WodBlock) => void;
  onCompleteWorkout?: (blockId: string, results: WorkoutResults) => void;
  /** @deprecated Ignored — active block tracking is handled by the overlay */
  setActiveBlockId?: (blockId: string | null) => void;
  setBlocks: (blocks: any[]) => void;
  setContent: (content: string) => void;
  readOnly?: boolean;
  /** Content provider — used for history import */
  provider?: IContentProvider;
  /** @deprecated Ignored */
  sourceNoteId?: string;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
  initialContent,
  value,
  onStartWorkout,
  onCompleteWorkout,
  setBlocks,
  setContent,
  readOnly = false,
  sourceNoteId,
  provider,
}) => {
  const { theme } = useTheme();

  const resolvedTheme = useMemo(() => {
    if (theme === 'dark') return 'vs-dark';
    if (theme === 'light') return 'vs';
    // "system" — detect from prefers-color-scheme
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'vs-dark';
    }
    return 'vs';
  }, [theme]);

  // Build insert handler — appends each block as a wod fence to current content
  const handleInsert = useCallback((blocks: WodBlockExtract[]) => {
    const currentContent = value ?? initialContent ?? '';
    const appended = blocks
      .map(b => `\n\n\`\`\`${b.dialect}\n${b.content.trim()}\n\`\`\``)
      .join('');
    setContent(currentContent.trimEnd() + appended);
  }, [setContent, value, initialContent]);

  const { openCollectionImport, openHistoryImport } = useCollectionImport({
    onInsert: handleInsert,
    provider,
  });

  // Keyboard shortcuts: Cmd+Shift+I → collection import, Cmd+Shift+H → history import
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        openCollectionImport();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        openHistoryImport();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCollectionImport, openHistoryImport]);

  return (
    <div className="h-full w-full relative flex flex-col group/plan-panel">
      {/* Import toolbar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 border-b border-border/40 bg-muted/30">
        <button
          type="button"
          onClick={openCollectionImport}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Import from collection (Ctrl+Shift+I)"
        >
          <Download className="h-3 w-3" />
          <span>From Collection</span>
        </button>
        {provider && (
          <button
            type="button"
            onClick={openHistoryImport}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Import from history (Ctrl+Shift+H)"
          >
            <Download className="h-3 w-3" />
            <span>From History</span>
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 relative">
        <NoteEditor
          noteId={sourceNoteId}
          value={value ?? initialContent ?? ''}
          onChange={setContent}
          onBlocksChange={setBlocks}
          onStartWorkout={onStartWorkout}
          onCompleteWorkout={onCompleteWorkout}
          readonly={readOnly}
          showLineNumbers={true}
          theme={resolvedTheme}
          enableOverlay={false}
          enablePreview={true}
          enableLinting={true}
          className="h-full"
        />
      </div>
    </div>
  );
};
