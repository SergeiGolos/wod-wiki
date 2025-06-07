/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { IDuration } from '@/core/IDuration';
import { cn } from '@/core/utils';
import { RuntimeSpan } from '@/core/RuntimeSpan';
import { Duration, SpanDuration } from '@/core/Duration';

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
  if (!duration) { 
    return (
      <div className={cn("mx-auto flex items-center", className ?? "")}>
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
  label,  
  render,
}) => {
  // State to trigger re-renders every 50ms for real-time updates
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(tick => tick + 1);
    }, 50);
    
    return () => clearInterval(interval);
  }, []);
      
    // Calculate duration from RuntimeSpan timeSpans  
  let displayDuration = new SpanDuration(clock?.timeSpans || []);
  if (clock?.duration) {
    displayDuration = new Duration(clock.duration - (displayDuration?.original || 0));  
  }

  // Use custom render function if provided
  if (render) {
    return <>{render(displayDuration, label)}</>;
  }  // Default rendering with optional label and effort
  return (
    <div className={cn("flex flex-col", className ?? "")}>
      {label && <div className="text-sm uppercase tracking-wide text-gray-600">{label}</div>}
      <div className="flex items-center">
        <ClockDisplay duration={displayDuration} />
      </div>      
    </div>
  );
};