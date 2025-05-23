/** @jsxImportSource react */
import { ISpanDuration } from "@/core/ISpanDuration";
import { useClockRegistry } from "@/hooks";
import { OutputEvent } from "@/core/OutputEvent";
import React, { useState, useEffect } from "react";
import { ClockContext } from "@/contexts/ClockContext";
import { cn } from "@/core/utils";

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
  // Use the clock registry to get the latest durations from events
  const clockRegistry = useClockRegistry(events);
  
  // Initialize registry with props if provided
  useEffect(() => {
    if (!clockRegistry || !primary || !total) return;
    
    // Create a new map to avoid mutating state directly
    const newRegistry = new Map(clockRegistry);
    let hasChanges = false;
    
    if (primary && !newRegistry.has('primary')) {
      newRegistry.set('primary', primary);
      hasChanges = true;
    }
    
    if (total && !newRegistry.has('total')) {
      newRegistry.set('total', total);
      hasChanges = true;
    }
    
    // Update interval is managed by useClockRegistry hook
  }, [primary, total, clockRegistry]);

  // Provide the clock registry to all children via context
  return (
    <ClockContext.Provider value={{ registry: clockRegistry }}>
      <div className={cn("w-full flex flex-col items-center justify-center py-2 pb-2 px-1 bg-white", className)}>
        {children}
      </div>
    </ClockContext.Provider>
  );
};
