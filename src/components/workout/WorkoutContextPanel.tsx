/**
 * WorkoutContextPanel - Composable component for displaying workout context
 * 
 * Supports three modes:
 * 1. Edit Mode - Shows statements with edit/delete buttons
 * 2. Run Mode - Shows active statements in read-only with real-time execution tracking
 * 3. Analysis Mode - Shows completed statements with historical metrics from repository
 */

import React from 'react';
import { WodBlock } from '../../markdown-editor/types';
import { EditableStatementList } from '../../markdown-editor/components/EditableStatementList';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

export type WorkoutContextMode = 'edit' | 'run' | 'analyze';

export interface WorkoutContextPanelProps {
  /** The workout block to display */
  block: WodBlock | null;
  
  /** Display mode */
  mode: WorkoutContextMode;
  
  /** Whether to show the start button (edit mode only) */
  showStartButton?: boolean;
  
  /** Callback when start button is clicked */
  onStart?: () => void;
  
  /** Callback when editing a statement (edit mode only) */
  onEditStatement?: (index: number, text: string) => void;
  
  /** Callback when deleting a statement (edit mode only) */
  onDeleteStatement?: (index: number) => void;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main workout context panel component
 */
export const WorkoutContextPanel: React.FC<WorkoutContextPanelProps> = ({
  block,
  mode,
  showStartButton = false,
  onStart,
  onEditStatement,
  onDeleteStatement,
  className = ''
}) => {
  if (!block) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-muted-foreground ${className}`}>
        <p className="text-sm">No workout selected</p>
      </div>
    );
  }

  const readonly = mode !== 'edit';
  const hasStatements = block.statements && block.statements.length > 0;

  return (
    <div className={`border-t border-border bg-muted/10 flex flex-col min-h-[200px] ${className}`}>
      {/* Header */}
      <div className="p-2 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center bg-muted/20">
        <span>
          {mode === 'edit' && 'Workout Context'}
          {mode === 'run' && 'Active Context'}
          {mode === 'analyze' && 'Workout Summary'}
        </span>
        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
          {readonly ? 'READ ONLY' : 'EDITABLE'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 font-mono text-sm relative flex-1">
        {mode === 'run' && (
          // Visual connector for run mode
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-background border border-border rotate-45 z-10"></div>
        )}
        
        {hasStatements ? (
          <EditableStatementList 
            statements={block.statements || []} 
            onEditStatement={readonly ? undefined : onEditStatement}
            onDeleteStatement={readonly ? undefined : onDeleteStatement}
            readonly={readonly} 
          />
        ) : (
          <div className="text-muted-foreground italic">
            {mode === 'edit' && '// No parsed statements available'}
            {mode === 'run' && '// Waiting for workout to start'}
            {mode === 'analyze' && '// No data available'}
          </div>
        )}
      </div>

      {/* Start Button (Edit Mode) */}
      {mode === 'edit' && showStartButton && hasStatements && onStart && (
        <div className="p-4 border-t border-border bg-background">
          <Button onClick={onStart} className="w-full" size="lg">
            <Play className="mr-2 h-5 w-5" />
            Start Workout
          </Button>
        </div>
      )}
    </div>
  );
};
