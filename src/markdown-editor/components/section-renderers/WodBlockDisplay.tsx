/**
 * WodBlockDisplay
 * 
 * Read-only renderer for WOD block sections.
 * Renders parsed statements using existing fragment display components
 * when available, or falls back to raw content for unparsed blocks.
 * 
 * Includes a play button for launching workout execution.
 */

import React from 'react';
import type { Section } from '../../types/section';
import type { WodBlock } from '../../types';
import { SECTION_LINE_HEIGHT } from '../SectionContainer';
import { StatementDisplay } from '@/components/fragments/StatementDisplay';
import { Play, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddWodToNoteDropdown } from '@/components/workbench/AddWodToNoteDropdown';
import type { IContentProvider } from '@/types/content-provider';

export interface WodBlockDisplayProps {
  section: Section;
  onStartWorkout?: (wodBlock: WodBlock) => void;
  onAddToPlan?: (wodBlock: WodBlock) => void;
  provider?: IContentProvider;
  mode?: 'preview' | 'template';
  className?: string;
}

export const WodBlockDisplay: React.FC<WodBlockDisplayProps> = ({
  section,
  onStartWorkout,
  onAddToPlan,
  provider,
  mode = 'preview',
  className,
}) => {
  const wodBlock = section.wodBlock;
  const hasParsedStatements = wodBlock?.statements && wodBlock.statements.length > 0;
  const hasErrors = wodBlock?.errors && wodBlock.errors.length > 0;
  const isTemplate = mode === 'template';

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wodBlock && onStartWorkout) {
      onStartWorkout(wodBlock);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wodBlock && onAddToPlan) {
      onAddToPlan(wodBlock);
    }
  };

  return (
    <div
      className={cn(
        'group relative rounded-md border border-border/50 bg-card/50',
        'overflow-hidden',
        className,
      )}
    >
      {/* Fence top indicator */}
      <div
        className="flex items-center gap-2 px-2 text-[10px] text-muted-foreground/60 font-mono border-b border-border/30 bg-muted/30"
        style={{ height: SECTION_LINE_HEIGHT, lineHeight: `${SECTION_LINE_HEIGHT}px` }}
      >
        <span>{section.dialect ?? 'wod'}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onStartWorkout && wodBlock && (
            <button
              onClick={handlePlayClick}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
                'text-muted-foreground hover:text-primary hover:bg-primary/10',
                isTemplate && 'bg-primary/10 text-primary font-medium'
              )}
              title={isTemplate ? "Clone & Run" : "Run this workout"}
            >
              <Play className="h-3 w-3" />
              <span>Run</span>
            </button>
          )}

          {isTemplate && wodBlock && (
            provider ? (
              <AddWodToNoteDropdown
                wodBlock={wodBlock}
                provider={provider}
              />
            ) : onAddToPlan ? (
              <button
                onClick={handleAddClick}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
                  'text-muted-foreground hover:text-primary hover:bg-primary/10'
                )}
                title="Clone & Add to Plan"
              >
                <Plus className="h-3 w-3" />
                <span>Plan</span>
              </button>
            ) : null
          )}
        </div>
      </div>

      {/* Block content */}
      <div className="px-2">
        {hasParsedStatements ? (
          // Render parsed statements with fragment visualization
          <div className="py-1 space-y-0.5">
            {wodBlock!.statements!.map((stmt, i) => (
              <StatementDisplay
                key={i}
                statement={stmt}
                compact
                isGrouped
              />
            ))}
          </div>
        ) : hasErrors ? (
          // Show raw content + error indicator
          <div>
            <pre
              className="text-sm font-mono text-destructive/80 whitespace-pre-wrap"
              style={{ lineHeight: `${SECTION_LINE_HEIGHT}px` }}
            >
              {section.displayContent}
            </pre>
            <div className="text-[10px] text-destructive py-1">
              {wodBlock!.errors!.map((err, i) => (
                <div key={i}>⚠ {err.message}</div>
              ))}
            </div>
          </div>
        ) : (
          // Unparsed — show raw content
          <pre
            className="text-sm font-mono text-foreground/70 whitespace-pre-wrap py-1"
            style={{ lineHeight: `${SECTION_LINE_HEIGHT}px` }}
          >
            {section.displayContent || '\u00A0'}
          </pre>
        )}
      </div>

      {/* Fence bottom indicator */}
      <div
        className="px-2 text-[10px] text-muted-foreground/40 font-mono border-t border-border/30 bg-muted/30"
        style={{ height: SECTION_LINE_HEIGHT, lineHeight: `${SECTION_LINE_HEIGHT}px` }}
      >
        {/* Closing fence line — visually minimal */}
      </div>
    </div>
  );
};
