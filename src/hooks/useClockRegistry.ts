import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { OutputEvent } from "@/core/OutputEvent";
import { useEffect } from "react";
import { ISpanDuration } from "@/core/ISpanDuration";

/**
 * A React hook that listens for SET_CLOCK events with ResultSpan data
 * and maintains a map of the current state of all clocks.
 * 
 * @param eventStream$ Stream of output events from the timer runtime
 * @returns An object mapping clock names to their current ISpanDuration objects
 */
export function useClockRegistry(eventStream$: OutputEvent[]) {
  // Create a registry to store the current state of all clocks
  const clockRegistry = new Map<string, ISpanDuration>();

  // Process any incoming events
  useEffect(() => {
    if (!eventStream$ || eventStream$.length === 0) return;

    // Process each event in the stream
    for (const event of eventStream$) {
      // Check if this is a SET_CLOCK event with a target and duration
      if (event.eventType === 'SET_CLOCK' && 
          event.bag?.target && 
          event.bag?.duration) {
        
        // Update the registry with the new duration
        clockRegistry.set(event.bag.target, event.bag.duration);
        
        // If the event includes a resultSpan, we can store additional metadata if needed
        if (event.bag.resultSpan) {
          // Additional processing of ResultSpan data could happen here
          // For example, storing metrics, adding to a history, etc.
        }
      }
    }
  }, [eventStream$]);

  return clockRegistry;
}

/**
 * Get the current duration for a specific clock name
 * 
 * @param clockRegistry The registry of clock states
 * @param clockName The name of the clock to retrieve
 * @returns The current duration for the specified clock, or undefined if not found
 */
export function getClockDuration(clockRegistry: Map<string, ISpanDuration>, clockName: string): ISpanDuration | undefined {
  return clockRegistry.get(clockName);
}