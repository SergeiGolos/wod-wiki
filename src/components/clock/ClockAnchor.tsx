/** @jsxImportSource react */
import React from 'react';
import { useClockContext, getClockByName } from '@/contexts/ClockContext';
import { IDuration } from '@/core/IDuration';
import { cn } from '@/core/utils';

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
    return (
      <div className={cn("mx-auto flex items-center", className)}>
        <span className="text-5xl md:text-6xl">--:--.-</span>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto flex items-center", className)}>
      <span className="text-5xl md:text-6xl">{clock.join(":")}</span>
      <span className="text-gray-600 text-4xl">.{pad(milliseconds).substring(0, 1)}</span>
    </div>
  );
};

export interface ClockAnchorProps {
  name: string;
  className?: string;
  /** When true, shows remaining time instead of elapsed time (for countdown) */
  showRemaining?: boolean;
  /** Optional label text to display with the time */
  label?: string;
  /** Optional custom render function */
  render?: (duration: IDuration | undefined, label?: string) => React.ReactNode;
}

export const ClockAnchor: React.FC<ClockAnchorProps> = ({
  name,
  className,
  showRemaining = false,
  label,
  render,
}) => {
  const { registry } = useClockContext();
  const spanDuration = getClockByName(registry, name);
  
  // Calculate what to display based on the span duration
  const displayDuration = spanDuration ? 
    (showRemaining && spanDuration.sign === "-" ? 
      spanDuration.remaining() : 
      spanDuration.elapsed()) : 
    undefined;

  // Use custom render function if provided
  if (render) {
    return <>{render(displayDuration, label)}</>;
  }

  // Default rendering with optional label
  return (
    <div className={cn("flex flex-col", className)}>
      {label && <div className="text-sm uppercase tracking-wide text-gray-600">{label}</div>}
      <ClockDisplay duration={displayDuration} />
    </div>
  );
};