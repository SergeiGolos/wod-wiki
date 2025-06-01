/** @jsxImportSource react */
import { ISpanDuration } from "@/core/ISpanDuration";
import React from "react";
import { cn } from "@/core/utils";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";

export interface WodTimerProps {
  className?: string;
  /** Default primary time span */
  primary?: ISpanDuration;
  /** Default total time span */
  total?: ISpanDuration;
  /** Stream of events for updating clocks */
  events?: IRuntimeEvent[] | undefined;
  /** Child components to render (typically ClockAnchors) */
  children?: React.ReactNode;
}

export const WodTimer: React.FC<WodTimerProps> = ({
  className,
  children,
}) => {
  // Use the clock registry to get the latest durations and states from events
  return (
      <div className={cn("w-full flex flex-col items-center justify-center py-2 pb-2 px-1 bg-white", className ?? "")}>
        {children}
      </div>   
  );
};
