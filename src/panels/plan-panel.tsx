import React, { useMemo } from 'react';
import type { WodBlock, WorkoutResults } from '@/components/Editor/types';
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor';
import { useTheme } from '@/components/theme/ThemeProvider';

export interface PlanPanelProps {
  initialContent?: string;
  value?: string;
  /** @deprecated Ignored — sections are parsed internally by UnifiedEditor */
  sections?: any[] | null;
  onStartWorkout: (block: WodBlock) => void;
  onCompleteWorkout?: (blockId: string, results: WorkoutResults) => void;
  /** @deprecated Ignored — active block tracking is handled by the overlay */
  setActiveBlockId?: (blockId: string | null) => void;
  setBlocks: (blocks: any[]) => void;
  setContent: (content: string) => void;
  readOnly?: boolean;
  /** @deprecated Ignored — content provider not needed by UnifiedEditor */
  provider?: any;
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

  return (
    <div className="h-full w-full relative flex flex-col group/plan-panel">
      <div className="flex-1 min-h-0 relative">
        <UnifiedEditor
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
