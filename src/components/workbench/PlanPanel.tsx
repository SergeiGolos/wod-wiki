import React from 'react';
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
  readOnly = false,
  provider,
}) => {
  const handleActiveBlockChange = (block: WodBlock | null) => {
    setActiveBlockId(block?.id || null);
  };

  return (
    <div className="h-full w-full relative flex flex-col">
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
