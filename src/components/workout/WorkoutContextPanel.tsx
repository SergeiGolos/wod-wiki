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
  
  /** Active statement IDs (blocks currently on the stack) */
  activeStatementIds?: Set<number>;
  
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
  activeStatementIds = new Set(),
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
    <div className={`bg-muted/10 flex flex-col min-h-[200px] ${className}`}>
      {/* Content */}
      <div className="p-4 font-mono text-sm relative flex-1">
        {hasStatements ? (
          <EditableStatementList 
            statements={block.statements || []} 
            onEditStatement={readonly ? undefined : onEditStatement}
            onDeleteStatement={readonly ? undefined : onDeleteStatement}
            readonly={readonly}
            activeStatementIds={activeStatementIds}
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
