/** @jsxImportSource react */
import { ISpanDuration } from "@/core/ISpanDuration";
import { useClockRegistry, getClockState } from "@/hooks";
import { OutputEvent } from "@/core/OutputEvent";
import React, { useEffect } from "react";
import { ClockContext } from "@/contexts/ClockContext";
import { cn } from "@/core/utils";
import { TimerState } from "@/core/runtime/outputs/SetTimerStateAction";

export interface WodTimerProps {
  className?: string;
  /** Default primary time span */
  primary?: ISpanDuration;
  /** Default total time span */
  total?: ISpanDuration;
  /** Stream of events for updating clocks */
  events?: OutputEvent[];
  /** Child components to render (typically ClockAnchors) */
  children?: React.ReactNode;
}

export const WodTimer: React.FC<WodTimerProps> = ({
  className,
  primary,
  total,
  events = [],
  children,
}) => {
  // Use the clock registry to get the latest durations and states from events
  const clockRegistry = useClockRegistry(events);
    // Initialize registry with props if provided
  useEffect(() => {
    if (!clockRegistry) return;
    
    // The useClockRegistry hook manages the registry state
    // Initial values from props would need to be handled differently
    // For now, the registry is managed entirely by events
  }, [primary, total, clockRegistry]);

  // Determine if timer is running based on state
  const primaryState = getClockState(clockRegistry, 'primary');
  const isRunning = primaryState === TimerState.RUNNING_COUNTDOWN || 
                     primaryState === TimerState.RUNNING_COUNTUP;
  
  // Determine if timer is showing countdown or countup
  const isCountdown = primaryState === TimerState.RUNNING_COUNTDOWN;
  // Provide the clock registry to all children via context
  return (
    <ClockContext.Provider value={{ 
      registry: {
        durations: clockRegistry.durations,
        states: clockRegistry.states,
        efforts: clockRegistry.efforts
      },
      isRunning,
      isCountdown
    }}>
      <div className={cn("w-full flex flex-col items-center justify-center py-2 pb-2 px-1 bg-white", className ?? "")}>
        {children}
      </div>
    </ClockContext.Provider>
  );
};
