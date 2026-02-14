import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { SaveState } from '../layout/WorkbenchContext';
import { WodBlock } from '../../markdown-editor/types';
import { SectionEditor } from '../../markdown-editor/SectionEditor';
import type { IContentProvider } from '../../types/content-provider';

export interface PlanPanelProps {
  initialContent?: string;
  value?: string;
  sections?: any[] | null; // Use any[] temporarily if Section is not imported, or import it
  onStartWorkout: (block: WodBlock) => void;
  setActiveBlockId: (blockId: string | null) => void;
  setBlocks: (blocks: any[]) => void;
  setContent: (content: string) => void;
  saveState: SaveState;
  readOnly?: boolean;
  provider?: IContentProvider;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
  initialContent,
  value,
  sections,
  onStartWorkout,
  setActiveBlockId,
  setBlocks,
  setContent,
  saveState,
  readOnly = false,
  provider,
}) => {
  const handleActiveBlockChange = (block: WodBlock | null) => {
    setActiveBlockId(block?.id || null);
  };

  return (
    <div className="h-full w-full relative flex flex-col">
      {/* Save Status Indicator */}
      <div className="absolute top-4 right-8 z-50 flex items-center gap-2 pointer-events-none transition-opacity duration-300">
        {saveState === 'changed' && (
          <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground shadow-sm">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span>Changed</span>
          </div>
        )}
        {saveState === 'saving' && (
          <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
        {saveState === 'saved' && (
          <div className="bg-background/80 backdrop-blur-sm border border-input rounded-full px-3 py-1 flex items-center gap-2 text-xs text-emerald-500 shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <Check className="h-3 w-3" />
            <span>Saved</span>
          </div>
        )}
        {saveState === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-full px-3 py-1 flex items-center gap-2 text-xs text-destructive shadow-sm">
            <AlertCircle className="h-3 w-3" />
            <span>Save Failed</span>
          </div>
        )}
      </div>

      {/* Section-based editor with padding */}
      <div className="flex-1 min-h-0 px-6 py-4">
        <SectionEditor
          initialContent={initialContent}
          initialSections={sections || undefined}
          value={value}
          onContentChange={setContent}
          onBlocksChange={setBlocks}
          onActiveBlockChange={handleActiveBlockChange}
          onStartWorkout={onStartWorkout}
          height="100%"
          editable={!readOnly}
          showLineNumbers={true}
          provider={provider}
        />
      </div>
    </div>
  );
};
