import React from "react";
import { DisplayBlock } from "../../lib/timer.types";
import { Timestamp } from "../../lib/timer.types";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";
import { useTimer } from "../../hooks/useTimer";

export interface WodTimerProps {
  timestamps: Timestamp[];
  block: DisplayBlock;
  onTimerUpdate?: (elapsedTime: number) => void;
  onTimerEvent?: (event: string, data?: any) => void;
  elapsedTime?: number;  
}

export const WodTimer: React.FC<WodTimerProps> = ({
  timestamps,
  block,
  onTimerUpdate,
  onTimerEvent,
}) => {
  const {
    elapsedTime,
    isRunning,
    handleStart,
    handleStop,
    handleLap
  } = useTimer({
    timestamps,
    block,
    onTimerUpdate,
    onTimerEvent
  });
  
  return (
    <div className="w-full flex flex-col items-center justify-center p-6 bg-white rounded-sm shadow-lg space-y-6">
      <TimerDisplay block={block} elapsedTime={elapsedTime} />
      <TimerControls
        isRunning={isRunning}
        onStart={handleStart}
        onStop={handleStop}
        onLap={handleLap}
      />
    </div>
  );
};
