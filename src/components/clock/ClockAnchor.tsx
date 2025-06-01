/** @jsxImportSource react */
import React from 'react';
import { IDuration } from '@/core/IDuration';
import { cn } from '@/core/utils';
import { RuntimeSpan } from '@/core/RuntimeSpan';

export interface ClockDisplayProps {
  duration: IDuration | undefined;
  className?: string;
}

// Moved from WodTimer and enhanced with className support
export const ClockDisplay: React.FC<ClockDisplayProps> = ({
  duration,
  className,
}) => {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const days = duration?.days || 0;
  const hours = duration?.hours || 0;
  const minutes = duration?.minutes || 0;
  const seconds = duration?.seconds || 0;
  const milliseconds = duration?.milliseconds || 0;

  const clock = [];

  if (days && days > 0) {
    clock.push(`${days}`);
  }

  if ((hours && hours > 0) || clock.length > 0) {
    clock.push(`${pad(hours)}`);
  }

  if (clock.length > 0) {
    clock.push(`${pad(minutes)}`);
  } else {
    clock.push(`${minutes}`);
  }

  clock.push(`${pad(seconds)}`);

  if (!clock) { 
    return (    <div className={cn("mx-auto flex items-center", className ?? "")}>
      <span className="text-5xl md:text-6xl">--:--.-</span>
    </div>
    );
  }
  return (
    <div className={cn("mx-auto flex items-center", className ?? "")}>
      <span className="text-5xl md:text-6xl">{clock.join(":")}</span>
      <span className="text-gray-600 text-4xl">.{pad(milliseconds).substring(0, 1)}</span>
    </div>
  );
};

export interface ClockAnchorProps {
  clock:  RuntimeSpan | undefined;
  className?: string;
  /** When true, shows remaining time instead of elapsed time (for countdown) */
  showRemaining?: boolean;
  /** Optional label text to display with the time */
  label?: string;
  /** When true, shows effort/exercise information alongside the timer */
  showEffort?: boolean;
  /** Optional custom render function */
  render?: (duration: IDuration | undefined, label?: string, effort?: string) => React.ReactNode;
}

export const ClockAnchor: React.FC<ClockAnchorProps> = ({
  clock,
  className,
  showRemaining = false,
  label,
  showEffort = false,
  render,
}) => {
  
  // Extract effort text from the RuntimeSpan metrics if showEffort is true
  const effort = showEffort ? clock?.metrics?.[0]?.effort : undefined;  // Calculate duration from RuntimeSpan timeSpans
  const calculateDuration = (span: RuntimeSpan | undefined): IDuration | undefined => {
    if (!span?.timeSpans || span.timeSpans.length === 0) return undefined;
    
    const totalMs = span.timeSpans.reduce((total, timeSpan) => {
      const startTime = timeSpan.start?.timestamp;
      if (!startTime) return total;
      
      // Calculate elapsed time from timeSpans
      const stopTime = timeSpan.stop?.timestamp ?? new Date();
      return total + (stopTime.getTime() - startTime.getTime());
    }, 0);
    
    // For countdown timers (when showRemaining is true), we need the target duration
    // and subtract the elapsed time. For now, we'll show elapsed time until
    // we have access to the target duration from the runtime context.
    let displayMs = totalMs;
    if (showRemaining) {
      // TODO: Implement countdown logic when target duration is available
      // This would require: targetDuration - elapsedTime
      displayMs = totalMs; // Fallback to elapsed time for now
    }
    
    // Convert milliseconds to Duration-like object
    const totalSeconds = Math.floor(displayMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = displayMs % 1000;
    
    return {
      days: 0,
      hours,
      minutes,
      seconds,
      milliseconds
    };
  };  const displayDuration = calculateDuration(clock);

  // Use custom render function if provided
  if (render) {
    return <>{render(displayDuration, label, effort)}</>;
  }
  // Default rendering with optional label
  return (
    <div className={cn("flex flex-col", className ?? "")}>
      {label && <div className="text-sm uppercase tracking-wide text-gray-600">{label}</div>}
      <div className="flex items-center">
        <ClockDisplay duration={displayDuration} />
      </div>
    </div>
  );
};