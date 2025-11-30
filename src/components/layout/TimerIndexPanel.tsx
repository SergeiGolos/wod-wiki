/**
 * TimerIndexPanel - Live execution history for Track view
 * 
 * Uses RuntimeEventLog for a linear, sectioned view of the workout.
 */

import React from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { WodBlock } from '../../markdown-editor/types';
import { RuntimeEventLog } from '../workout/RuntimeEventLog';

export interface TimerIndexPanelProps {
  /** Active runtime for live tracking */
  runtime: ScriptRuntime | null;
  
  /** Active workout block (for context display) */
  activeBlock?: WodBlock | null;
  
  /** Currently active segment IDs (blocks on stack) */
  activeSegmentIds?: Set<number>;
  
  /** Currently active statement IDs */
  activeStatementIds?: Set<number>;
  
  /** Block key that is currently being hovered (from timer display) */
  highlightedBlockKey?: string | null;
  
  /** Whether to auto-scroll to newest entries */
  autoScroll?: boolean;
  
  /** Whether to render in mobile mode */
  mobile?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Children to render (e.g., connector visuals) */
  children?: React.ReactNode;
  
  /** Workout start time (timestamp when execution began) */
  workoutStartTime?: number | null;
  
  /** Hide the parsed workout view (shown in debugger instead) */
  hideContextPanel?: boolean;
}

/**
 * TimerIndexPanel Component
 */
export const TimerIndexPanel: React.FC<TimerIndexPanelProps> = ({
  runtime,
  activeBlock,
  activeStatementIds,
  highlightedBlockKey,
  autoScroll = true,
  mobile = false,
  className = '',
  workoutStartTime,
  hideContextPanel = false
}) => {
  return (
    <RuntimeEventLog
      runtime={runtime}
      activeBlock={activeBlock}
      activeStatementIds={activeStatementIds}
      highlightedBlockKey={highlightedBlockKey}
      autoScroll={autoScroll}
      mobile={mobile}
      className={className}
      workoutStartTime={workoutStartTime}
      hideContextPanel={hideContextPanel}
    />
  );
};

export default TimerIndexPanel;
