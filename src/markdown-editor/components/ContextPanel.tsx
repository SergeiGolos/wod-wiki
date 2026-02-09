/**
 * ContextPanel - Monaco editor overlay adapter for WorkoutContextPanel
 * 
 * DEPRECATED: Use WorkoutContextPanel directly.
 * This component wraps WorkoutContextPanel with Monaco-specific defaults for backward compatibility.
 */

import React from 'react';
import { WodBlock } from '../types';
import { WorkoutContextPanel, WorkoutContextPanelProps } from '@/components/workout/WorkoutContextPanel';
import { WorkoutTimerDialog } from './WorkoutTimerDialog';

export interface ContextPanelProps {
  /** Block data to display */
  block: WodBlock;
  
  /** Whether panel is in compact mode */
  compact?: boolean;
  
  /** Whether to show fragment editor (ignored - always shown) */
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
 * Panel showing parsed workout information (Monaco editor adapter)
 * 
 * @deprecated Use WorkoutContextPanel directly with mode='edit' and appropriate callbacks
 */
export const ContextPanel: React.FC<ContextPanelProps> = ({
  block,
  compact = false,
  onAddStatement,
  onEditStatement,
  onDeleteStatement,
  onTrack,
  readonly = false,
  mobile = false
}) => {
  const [isTimerDialogOpen, setIsTimerDialogOpen] = React.useState(false);

  // Track button handler
  const handleTrack = () => {
    if (onTrack) {
      onTrack();
    } else {
      setIsTimerDialogOpen(true);
    }
  };

  // Convert old props to new WorkoutContextPanel props
  const workoutPanelProps: WorkoutContextPanelProps = {
    block,
    mode: readonly ? 'run' : 'edit',
    showStartButton: false,
    onEditStatement,
    onDeleteStatement,
    onAddStatement,
    showErrors: true,
    showMetadata: !compact && !mobile,
    mobile,
    compact,
    className: `context-panel bg-background h-full overflow-y-auto ${mobile ? '' : 'border-l border-border'}`
  };

  return (
    <>
      <WorkoutContextPanel {...workoutPanelProps} />
      {/* Timer dialog for Monaco integration */}
      <WorkoutTimerDialog
        open={isTimerDialogOpen}
        onOpenChange={setIsTimerDialogOpen}
        block={block}
      />
    </>
  );
};
