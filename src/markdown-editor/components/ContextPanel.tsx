/**
 * ContextPanel - Displays parsed WOD block information and controls
 */

import React, { useState } from 'react';
import { WodBlock } from '../types';
import { EditableStatementList } from './EditableStatementList';
import { WorkoutTimerDialog } from './WorkoutTimerDialog';
import { Button } from '@/components/ui/button';
import { Play, BookOpen } from 'lucide-react';

export interface ContextPanelProps {
  /** Block data to display */
  block: WodBlock;
  
  /** Whether panel is in compact mode */
  compact?: boolean;
  
  /** Whether to show fragment editor */
  showEditor?: boolean;
  
  /** Callback when adding a statement */
  onAddStatement?: (text: string) => void;
  
  /** Callback when editing a statement */
  onEditStatement?: (index: number, text: string) => void;
  
  /** Callback when deleting a statement */
  onDeleteStatement?: (index: number) => void;

  /** Callback when track button is clicked */
  onTrack?: () => void;

  /** Whether the panel is read-only */
  readonly?: boolean;

  /** Whether to render in mobile mode */
  mobile?: boolean;
}

/**
 * Panel showing parsed workout information
 */
export const ContextPanel: React.FC<ContextPanelProps> = ({
  block,
  compact = false,
  showEditor = true,
  onAddStatement,
  onEditStatement,
  onDeleteStatement,
  onTrack,
  readonly = false,
  mobile = false
}) => {
  const hasStatements = block.statements && block.statements.length > 0;
  const hasErrors = block.errors && block.errors.length > 0;
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false);

  // Track button handler
  const handleTrack = () => {
    if (onTrack) {
      onTrack();
    } else {
      setIsTimerDialogOpen(true);
    }
  };

  return (
    <div className={`context-panel bg-background h-full overflow-y-auto ${mobile ? '' : 'border-l border-border'}`}>
      {/* Header */}
      <div className={`border-b border-border bg-muted/50 ${mobile ? 'p-6' : 'p-4'}`}>
        <h3 className={`${mobile ? 'text-lg' : 'text-sm'} font-semibold text-foreground`}>
          WOD Block Context
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Lines {block.startLine + 1} - {block.endLine + 1}
        </p>
      </div>

      {/* Content */}
      <div className={`${mobile ? 'p-6' : 'p-4'}`}>
        {/* Parsing Status */}
        {block.state === 'parsing' && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-sm text-blue-700 dark:text-blue-300">Parsing workout...</p>
          </div>
        )}

        {/* Parse Errors */}
        {hasErrors && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded">
            <h4 className="text-sm font-semibold text-destructive mb-2">
              Parse Errors
            </h4>
            {block.errors!.map((error, idx) => (
              <div key={idx} className="text-xs text-destructive mb-1">
                {error.line && <span className="font-mono">Line {error.line}: </span>}
                {error.message}
              </div>
            ))}
          </div>
        )}

        {/* Unified Editable Statement List */}
        {hasStatements && !hasErrors && showEditor && (
          <div>
            <h4 className={`${mobile ? 'text-base' : 'text-sm'} font-semibold text-gray-700 mb-3`}>
              Workout
            </h4>
            <EditableStatementList
              statements={block.statements || []}
              onAddStatement={onAddStatement}
              onEditStatement={onEditStatement}
              onDeleteStatement={onDeleteStatement}
              readonly={readonly}
            />
          </div>
        )}

        {/* Empty State */}
        {!hasStatements && !hasErrors && block.state !== 'parsing' && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No workout content yet
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Start typing to see parsed fragments
            </p>
          </div>
        )}

        {/* Block Info - Hidden on mobile unless requested */}
        {!compact && !mobile && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">
              Block Information
            </h4>
            <dl className="text-xs space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">State:</dt>
                <dd className="text-gray-700 font-mono">{block.state}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Statements:</dt>
                <dd className="text-gray-700">{block.statements?.length || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Content Length:</dt>
                <dd className="text-gray-700">{block.content.length} chars</dd>
              </div>
            </dl>
          </div>
        )}
        
        {/* Mobile Track Button (if not handled by parent) */}
        {mobile && hasStatements && (
           <div className="mt-8">
             <Button className="w-full" size="lg" onClick={handleTrack}>
               <Play className="mr-2 h-5 w-5" /> Start Workout
             </Button>
           </div>
        )}
      </div>

      {/* Workout Timer Dialog */}
      <WorkoutTimerDialog
        open={isTimerDialogOpen}
        onOpenChange={setIsTimerDialogOpen}
        block={block}
      />
    </div>
  );
};
