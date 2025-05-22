/** @jsxImportSource react */
/** @jsxImportSource react */
import { ISpanDuration } from "@/core/ISpanDuration";
import { Duration } from "@/core/Duration";
import { IDuration } from "@/core/IDuration";
// TimeSpanDuration might not be directly needed here if ISpanDuration methods are sufficient for props
import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react";

export interface WodTimerProps {
  label?: string; // Made optional if timer can run independently
  primary?: ISpanDuration; // Made optional
  total?: ISpanDuration;   // Made optional
  // Configuration for active mode, e.g., countdown total time
  countdownFrom?: number; // in seconds
  countUpLimit?: number; // in seconds, for future use
}

export interface WodTimerRef {
  start: (startTime?: number) => void; // startTime in seconds
  stop: () => void;
  reset: () => void;
}

export const ClockDisplay: React.FC<{ duration: IDuration | undefined }> = ({
  duration,
}) => {
  const pad = (n: number): string => n.toString().padStart(2, "0");

  const days = Math.floor(duration?.days || 0);
  const hours = Math.floor(duration?.hours || 0);
  const minutes = Math.floor(duration?.minutes || 0);
  const seconds = Math.floor(duration?.seconds || 0);
  const milliseconds = Math.floor(duration?.milliseconds || 0);

  const clock: string[] = [];

  if (days > 0) {
    clock.push(pad(days));
  }

  if (hours > 0 || clock.length > 0) {
    clock.push(pad(hours));
  }

  clock.push(pad(minutes));
  clock.push(pad(seconds));

  if (clock.length === 0) {
    return (
      <div className="mx-auto flex items-center">
        <span className="text-5xl md:text-6xl">00:00</span>
        <span className="text-gray-600 text-4xl">.0</span>
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

export const WodTimer = forwardRef<WodTimerRef, WodTimerProps>((props, ref) => {
  const { label = "Timer", primary, total, countdownFrom } = props;

  // State for prop-driven display (passive mode)
  const [propPrimaryDisplay, setPropPrimaryDisplay] = useState<IDuration | undefined>();
  const [propTotalDisplay, setPropTotalDisplay] = useState<IDuration | undefined>();

  // State for active internal timer
  const [activeCurrentTime, setActiveCurrentTime] = useState<IDuration>(new Duration(0));
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef<"up" | "down">("up"); // 'up' or 'down' for countdown
  const targetTimeRef = useRef<number>(0); // For countdown, target time in ms

  // Effect for prop-driven display (passive mode for primary display)
  useEffect(() => {
    if (!isRunning && primary) {
      setPropPrimaryDisplay(
        primary.sign === "+" || primary.sign === undefined ? primary.elapsed() : primary.remaining()
      );
      const primaryIntervalId = setInterval(() => {
        setPropPrimaryDisplay(
          primary.sign === "+" || primary.sign === undefined ? primary.elapsed() : primary.remaining()
        );
      }, 100);
      return () => clearInterval(primaryIntervalId);
    } else if (isRunning || !primary) {
      // Clear primary display if timer becomes active or primary prop is removed
      setPropPrimaryDisplay(undefined); 
    }
  }, [primary, isRunning]);

  // Effect for prop-driven display (total display - always reflects total prop)
  useEffect(() => {
    if (total) {
      setPropTotalDisplay(total.elapsed());
      const totalIntervalId = setInterval(() => {
        setPropTotalDisplay(total.elapsed());
      }, 100);
      return () => clearInterval(totalIntervalId);
    } else {
      setPropTotalDisplay(undefined); // Clear if total prop is removed
    }
  }, [total]);

  useImperativeHandle(ref, () => ({
    start: (startTimeInSeconds?: number) => {
      clearInterval(intervalRef.current!);
      setIsRunning(true);

      let initialMs = 0;
      if (startTimeInSeconds !== undefined) {
        initialMs = startTimeInSeconds * 1000;
      } else if (countdownFrom !== undefined) {
        initialMs = countdownFrom * 1000;
      }
      
      if (countdownFrom !== undefined) {
        directionRef.current = "down";
        setActiveCurrentTime(new Duration(initialMs));
        targetTimeRef.current = 0; // Target is 0 for countdown
      } else {
        directionRef.current = "up";
        setActiveCurrentTime(new Duration(initialMs));
        // For count up, targetTime could be used for an "up to" limit if needed
      }

      intervalRef.current = setInterval(() => {
        setActiveCurrentTime(prevTime => {
          const currentMs = prevTime.toMilliseconds();
          let nextMs;
          if (directionRef.current === "down") {
            nextMs = Math.max(0, currentMs - 100);
            if (nextMs === 0) {
              clearInterval(intervalRef.current!);
              setIsRunning(false);
              // Potentially emit a 'finished' event here
            }
          } else { // count up
            nextMs = currentMs + 100;
            // Add limit logic here if countUpLimit is implemented
          }
          return new Duration(nextMs);
        });
      }, 100);
    },
    stop: () => {
      clearInterval(intervalRef.current!);
      setIsRunning(false);
    },
    reset: () => {
      clearInterval(intervalRef.current!);
      setIsRunning(false);
      let initialMs = 0;
      if (countdownFrom !== undefined) {
        initialMs = countdownFrom * 1000;
        directionRef.current = "down";
      } else {
        directionRef.current = "up";
      }
      setActiveCurrentTime(new Duration(initialMs));
    },
  }));

  const displayDuration = isRunning ? activeCurrentTime : propPrimaryDisplay;

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 pb-2 px-1 bg-white">
      <div className="grid md:grid-cols-3 gap-1 md:gap-4 items-center">
        <div className="bg-gray-50/20 p-1 md:p-4">
          <div className="text-2xl font-semibold text-gray-700">{label}</div>
        </div>
        <div className="bg-white p-2 md:p-4 rounded-lg flex items-center justify-center">
          <div className="text-5xl md:text-8xl font-mono font-bold text-gray-800 tracking-wider">
            <ClockDisplay duration={displayDuration} />
          </div>
        </div>
        <div className="bg-gray-50/20 p-4">
          <div className="space-y-2 md:space-y-4">
            <div className="text-gray-600">
              <div className="text-sm uppercase tracking-wide">Total Time</div>
              <div className="text-xl font-mono">
                <ClockDisplay duration={propTotalDisplay} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

WodTimer.displayName = "WodTimer";
