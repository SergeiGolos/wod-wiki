/**
 * WorkoutPreviewPanel
 *
 * A read-only preview panel that displays the note content using SectionEditor
 * in non-editable mode. Used on the Track view when no workout block has been
 * selected yet, replacing the old redirect-to-Plan behavior.
 *
 * Supports an optional `filter` prop that restricts which section types are
 * displayed. On the Track view, the default filter is `['wod']` so only
 * runnable WOD blocks are visible.
 */

import React from 'react';
import type { SectionType } from '../../markdown-editor/types/section';
import type { WodBlock } from '../../markdown-editor/types';
import { SectionEditor } from '../../markdown-editor/SectionEditor';
import { cn } from '@/lib/utils';
import { Dumbbell } from 'lucide-react';

export interface WorkoutPreviewPanelProps {
  /** Raw markdown content of the note */
  content: string;

  /**
   * Optional list of section types to display.
   * When set, only sections whose `type` is in this array are rendered.
   * Defaults to undefined (show all sections).
   */
  filter?: SectionType[];

  /** Called when the user clicks "Run" on a WOD block */
  onStartWorkout?: (block: WodBlock) => void;

  /** Callback when blocks change (parsed from content) */
  onBlocksChange?: (blocks: any[]) => void;

  /** Optional CSS class */
  className?: string;
}

export const WorkoutPreviewPanel: React.FC<WorkoutPreviewPanelProps> = ({
  content,
  filter,
  onStartWorkout,
  onBlocksChange,
  className,
}) => {
  if (!content) {
    return (
      <div className={cn('h-full w-full flex items-center justify-center text-muted-foreground italic', className)}>
        No workout content loaded.
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full flex flex-col bg-background overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Dumbbell className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Select a Workout</h2>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        <SectionEditor
          value={content}
          editable={false}
          mode="preview"
          showLineNumbers={false}
          onStartWorkout={onStartWorkout}
          onBlocksChange={onBlocksChange}
          filter={filter}
          height="100%"
        />
      </div>
    </div>
  );
};
