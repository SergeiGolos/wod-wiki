import React, { createContext, useContext } from 'react';
import { ISpanDuration } from '@/core/ISpanDuration';

// Define the context interface for our clock data
export interface ClockContextType {
  registry: Map<string, ISpanDuration>;
}

// Create a context with a default empty registry
export const ClockContext = createContext<ClockContextType>({
  registry: new Map<string, ISpanDuration>(),
});

// Custom hook to use the clock context
export const useClockContext = () => {
  return useContext(ClockContext);
};

// Helper function to get a specific clock from the registry
export const getClockByName = (
  registry: Map<string, ISpanDuration>, 
  name: string
): ISpanDuration | undefined => {
  return registry.get(name);
};