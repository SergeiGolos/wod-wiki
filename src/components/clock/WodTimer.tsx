/** @jsxImportSource react */
import { ISpanDuration } from "@/core/ISpanDuration";
import { Duration } from "@/core/Duration";
import { IDuration } from "@/core/IDuration";
import { TimeSpanDuration } from "@/core/TimeSpanDuration";
import { useClockRegistry, getClockDuration } from "@/hooks";
import { OutputEvent } from "@/core/OutputEvent";
import React, { useState, useEffect } from "react";

export interface WodTimerProps {
  label: string;
  primary: ISpanDuration;
  total: ISpanDuration;
  events?: OutputEvent[]; // Add events prop for integration with useClockRegistry
}

export const ClockDisplay: React.FC<{ duration: IDuration | undefined }> = ({
  duration,
}) => {
  // Implementation of ClockDisplay

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
      <div className="mx-auto flex items-center">
        <span className="text-5xl md:text-6xl">--:--.-</span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex items-center">
      <span className="text-5xl md:text-6xl">{clock.join(":")}</span>
      <span className="text-gray-600 text-4xl">.{pad(milliseconds).substring(0, 1)}</span>
    </div>
  );
};

export const WodTimer: React.FC<WodTimerProps> = ({
  label,
  primary,
  total,
  events = [],
}) => {
  const [primaryDisplay, setPrimaryDisplay] = useState<IDuration | undefined>();
  const [totalDisplay, setTotalDisplay] = useState<IDuration | undefined>();
  
  // Use the clock registry to get the latest durations from events
  const clockRegistry = useClockRegistry(events);

  useEffect(() => {
    // First check if we have updates from ResultSpan events in the registry
    const primaryFromRegistry = getClockDuration(clockRegistry, "primary");
    const totalFromRegistry = getClockDuration(clockRegistry, "total");
    
    // Use ResultSpan updates from registry if available, otherwise fall back to props
    const primarySource = primaryFromRegistry || primary;
    const totalSource = totalFromRegistry || total;
    
    if (primarySource) {
      setPrimaryDisplay(
        primarySource.sign === "+" || primarySource.sign === undefined 
          ? primarySource.elapsed() 
          : primarySource.remaining());
    }
    
    if (totalSource) {
      setTotalDisplay(totalSource.elapsed());
    }

    // Set up interval to continuously update
    const intervalId = setInterval(() => {
      // Re-check registry on each update
      const latestPrimaryFromRegistry = getClockDuration(clockRegistry, "primary");
      const latestTotalFromRegistry = getClockDuration(clockRegistry, "total");
      
      const latestPrimarySource = latestPrimaryFromRegistry || primary;
      const latestTotalSource = latestTotalFromRegistry || total;
      
      if (latestPrimarySource) {
        setPrimaryDisplay(
          latestPrimarySource.sign === "+" || latestPrimarySource.sign === undefined 
            ? latestPrimarySource.elapsed() 
            : latestPrimarySource.remaining());
      }
      
      if (latestTotalSource) {
        setTotalDisplay(latestTotalSource.elapsed());
      }
    }, 100); // Update every 100ms for smooth display

    // Cleanup function to clear the interval
    return () => {
      clearInterval(intervalId);
    };
  }, [primary, total, clockRegistry]); // Re-run effect when registry, primary or total props change

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 pb-2 px-1 bg-white">
      <div className="grid md:grid-cols-3 gap-1 md:gap-4">
        {/* Left section - Rounds */}
        <div className="bg-gray-50/20 p-1 md:p-4">
          <div className="text-2xl font-semibold text-gray-700">{label}</div>
        </div>

        {/* Middle section - Main Timer */}
        <div className="bg-white p-2 md:p-4 rounded-lg flex items-center justify-center">
          <div className="text-5xl md:text-8xl font-mono font-bold text-gray-800 tracking-wider">
            <ClockDisplay duration={primaryDisplay} />
          </div>
        </div>

        <div className="bg-gray-50/20 p-4">
          <div className="space-y-2 md:space-y-4">
            <div className="text-gray-600">
              <div className="text-sm uppercase tracking-wide">Total Time</div>
              <div className="text-xl font-mono">
                <ClockDisplay duration={totalDisplay} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
