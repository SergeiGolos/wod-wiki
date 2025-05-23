/** @jsxImportSource react */
import { ISpanDuration } from "@/core/ISpanDuration";
import { useClockRegistry, getClockDuration, getClockState } from "@/hooks";
import { OutputEvent } from "@/core/OutputEvent";
import React, { useEffect } from "react";
import { ClockContext } from "@/contexts/ClockContext";
import { cn } from "@/core/utils";
import { TimerState } from "@/core/runtime/outputs/SetTimerStateAction";

export interface WodTimerProps {
  className?: string;
  /** Optional default label */
  label?: string; 
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
  label,
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
    
    // Create new maps to avoid mutating state directly
    const newDurations = new Map(clockRegistry.durations);
    let hasChanges = false;
    
    if (primary && !newDurations.has('primary')) {
      newDurations.set('primary', primary);
      hasChanges = true;
    }
    
    if (total && !newDurations.has('total')) {
      newDurations.set('total', total);
      hasChanges = true;
    }
    
    // Update interval is managed by useClockRegistry hook
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
      registry: clockRegistry,
      isRunning,
      isCountdown
    }}>
      <div className={cn("w-full flex flex-col items-center justify-center py-2 pb-2 px-1 bg-white", className)}>
        {children}
      </div>
    </ClockContext.Provider>
  );
};
