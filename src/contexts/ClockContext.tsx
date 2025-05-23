import React, { createContext, useContext } from 'react';
import { ISpanDuration } from '@/core/ISpanDuration';
import { TimerState } from '@/core/runtime/outputs/SetTimerStateAction';

// Define the context interface for our clock data
export interface ClockContextType {
  registry: {
    durations: Map<string, ISpanDuration>;
    states: Map<string, TimerState>;
  };
  isRunning: boolean;
  isCountdown: boolean;
}

// Create a context with a default empty registry
export const ClockContext = createContext<ClockContextType>({
  registry: {
    durations: new Map<string, ISpanDuration>(),
    states: new Map<string, TimerState>()
  },
  isRunning: false,
  isCountdown: true
});

// Custom hook to use the clock context
export const useClockContext = () => {
  return useContext(ClockContext);
};

// Helper function to get a specific clock duration from the registry
export const getClockByName = (
  registry: { durations: Map<string, ISpanDuration> }, 
  name: string
): ISpanDuration | undefined => {
  return registry.durations.get(name);
};

// Helper function to get a specific clock state from the registry
export const getClockStateName = (
  registry: { states: Map<string, TimerState> }, 
  name: string
): TimerState | undefined => {
  return registry.states.get(name);
};