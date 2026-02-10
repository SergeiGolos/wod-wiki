/**
 * TimerIndexPanel - Live execution history for Track view
 * 
 * Uses RuntimeHistoryLog for a structured, indented view of the workout history.
 */

import React from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { RuntimeHistoryLog } from '../history/RuntimeHistoryLog';

export interface TimerIndexPanelProps {
  /** Active runtime for live tracking */
  runtime: ScriptRuntime | null;

  /** Currently active segment IDs (blocks on stack) */
  activeSegmentIds?: Set<number>;

  /** Currently active statement IDs */
  activeStatementIds?: Set<number>;

  /** Block key that is currently being hovered (from timer display) */
  highlightedBlockKey?: string | null;

  /** Whether to auto-scroll to newest entries */
  autoScroll?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Children to render (e.g., connector visuals) */
  children?: React.ReactNode;

  /** Workout start time (timestamp when execution began) */
  workoutStartTime?: number | null;
}

/**
 * TimerIndexPanel Component
 */
export const TimerIndexPanel: React.FC<TimerIndexPanelProps> = ({
  runtime,
  activeStatementIds,
  highlightedBlockKey,
  autoScroll = true,
  className = '',
  workoutStartTime
}) => {
  return (
    <RuntimeHistoryLog
      runtime={runtime}
      activeStatementIds={activeStatementIds}
      highlightedBlockKey={highlightedBlockKey}
      autoScroll={autoScroll}
      className={className}
      workoutStartTime={workoutStartTime}
      showActive={false}
    />
  );
};

export default TimerIndexPanel;
