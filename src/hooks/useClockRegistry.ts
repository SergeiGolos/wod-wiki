import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { OutputEvent } from "@/core/OutputEvent";
import { useEffect, useState } from "react";
import { ISpanDuration } from "@/core/ISpanDuration";

/**
 * A React hook that listens for SET_CLOCK events with ResultSpan data
 * and maintains a map of the current state of all clocks.
 * 
 * @param eventStream$ Stream of output events from the timer runtime
 * @returns An object mapping clock names to their current ISpanDuration objects
 */
export function useClockRegistry(eventStream$: OutputEvent[]) {
  // Create state to track clock registry
  const [clockRegistry, setClockRegistry] = useState<Map<string, ISpanDuration>>(
    new Map<string, ISpanDuration>()
  );

  // Process any incoming events
  useEffect(() => {
    if (!eventStream$ || eventStream$.length === 0) return;

    // Create a new map to avoid mutating state directly
    const newRegistry = new Map(clockRegistry);
    let hasChanges = false;

    // Process each event in the stream
    for (const event of eventStream$) {
      // Check if this is a SET_CLOCK event with a target and duration
      if (event.eventType === 'SET_CLOCK' && 
          event.bag?.target && 
          event.bag?.duration) {
        
        // Update the registry with the new duration
        newRegistry.set(event.bag.target, event.bag.duration);
        hasChanges = true;
        
        // If the event includes a resultSpan, we can store additional metadata if needed
        if (event.bag.resultSpan) {
          // Additional processing of ResultSpan data could happen here
          // For example, storing metrics, adding to a history, etc.
        }
      }
    }

    // Only update state if changes were made
    if (hasChanges) {
      setClockRegistry(newRegistry);
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