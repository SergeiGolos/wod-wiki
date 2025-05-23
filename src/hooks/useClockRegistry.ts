import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { OutputEvent } from "@/core/OutputEvent";
import { useEffect, useState } from "react";
import { ISpanDuration } from "@/core/ISpanDuration";
import { TimerState } from "@/core/runtime/outputs/SetTimerStateAction";

/**
 * Interface for the clock registry state
 */
interface ClockRegistryState {
  durations: Map<string, ISpanDuration>;
  states: Map<string, TimerState>;
}

/**
 * A React hook that listens for SET_CLOCK and SET_TIMER_STATE events
 * and maintains a map of the current state of all clocks.
 * 
 * @param eventStream$ Stream of output events from the timer runtime
 * @returns An object mapping clock names to their current ISpanDuration objects
 */
export function useClockRegistry(eventStream$: OutputEvent[]) {
  // Create state to track clock registry
  const [clockRegistryState, setClockRegistryState] = useState<ClockRegistryState>({
    durations: new Map<string, ISpanDuration>(),
    states: new Map<string, TimerState>()
  });

  // Process any incoming events
  useEffect(() => {
    if (!eventStream$ || eventStream$.length === 0) return;

    // Create new maps to avoid mutating state directly
    const newDurations = new Map(clockRegistryState.durations);
    const newStates = new Map(clockRegistryState.states);
    let hasChanges = false;

    // Process each event in the stream
    for (const event of eventStream$) {
      // Check if this is a SET_CLOCK event with a target and duration
      if (event.eventType === 'SET_CLOCK' && 
          event.bag?.target && 
          event.bag?.duration) {
        
        // Update the registry with the new duration
        newDurations.set(event.bag.target, event.bag.duration);
        hasChanges = true;
        
        // If the event includes a resultSpan, we can store additional metadata if needed
        if (event.bag.resultSpan) {
          // Additional processing of ResultSpan data could happen here
          // For example, storing metrics, adding to a history, etc.
        }
      }

      // Handle SET_TIMER_STATE events
      if (event.eventType === 'SET_TIMER_STATE' && 
          event.bag?.target && 
          event.bag?.state) {
        
        // Update the state registry with the new timer state
        newStates.set(event.bag.target, event.bag.state);
        hasChanges = true;
      }
    }

    // Only update state if changes were made
    if (hasChanges) {
      setClockRegistryState({
        durations: newDurations,
        states: newStates
      });
    }
  }, [eventStream$]);

  // Setup interval for continuous updates (elapsed/remaining times change)
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Force re-render to update displayed times
      setClockRegistryState(prev => ({
        durations: new Map(prev.durations),
        states: prev.states
      }));
    }, 100);
    
    return () => clearInterval(intervalId);
  }, []);

  // Return both duration and state maps
  return {
    durations: clockRegistryState.durations,
    states: clockRegistryState.states
  };
}

/**
 * Get the current duration for a specific clock name
 * 
 * @param clockRegistry The registry of clock states
 * @param clockName The name of the clock to retrieve
 * @returns The current duration for the specified clock, or undefined if not found
 */
export function getClockDuration(clockRegistry: { durations: Map<string, ISpanDuration> }, clockName: string): ISpanDuration | undefined {
  return clockRegistry.durations.get(clockName);
}

/**
 * Get the current state for a specific clock name
 * 
 * @param clockRegistry The registry of clock states
 * @param clockName The name of the clock to retrieve
 * @returns The current timer state for the specified clock, or undefined if not found
 */
export function getClockState(clockRegistry: { states: Map<string, TimerState> }, clockName: string): TimerState | undefined {
  return clockRegistry.states.get(clockName);
}