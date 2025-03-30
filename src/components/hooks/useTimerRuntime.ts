import { useRef, useState, useEffect } from "react";
import { WodRuntimeScript } from "@/core/md-timer";
import { RuntimeStack } from "@/core/runtime/RuntimeStack";
import { RuntimeJit } from "@/core/runtime/RuntimeJit";
import { startButton } from "@/core/runtime/EventAction";
import { TimerRuntime } from "@/core/runtime/timer.runtime";
import { WodResultBlock, TimerDisplay, ButtonConfig, RuntimeEvent } from "@/core/timer.types";

/**
 * Hook props for useTimerRuntime
 */
export interface UseTimerRuntimeProps {
  /**
   * Called when a script is compiled with the compiled script
   */
  onScriptCompiled?: (script: WodRuntimeScript) => void;
  
  /**
   * Called when results are updated
   */
  onResultsUpdated?: (results: WodResultBlock[]) => void;
}

/**
 * Hook that manages the timer runtime lifecycle and state
 * 
 * The runtime is responsible for:
 * 1. Processing workout script
 * 2. Handling timer events (tick, start, pause, etc.)
 * 3. Generating actions that update the UI (display, buttons, results)
 * 
 * This new implementation uses the handler-based approach for workout processing.
 */
export function useTimerRuntime({
  onScriptCompiled,
  onResultsUpdated
}: UseTimerRuntimeProps = {}) {
  const runtimeRef = useRef<TimerRuntime>();
  const intervalRef = useRef<number | null>(null);

  const [stack, setStack] = useState<RuntimeEvent[]>([]);
  const [script, loadScript] = useState<WodRuntimeScript | undefined>();
  const [display, setDisplay] = useState<TimerDisplay | undefined>();

  const [buttons, setButtons] = useState<ButtonConfig[]>([startButton]);
  const [results, setResults] = useState<WodResultBlock[]>([]);

  // Handler for results updates
  useEffect(() => {
    if (onResultsUpdated && results.length > 0) {
      onResultsUpdated(results);
    }
  }, [results, onResultsUpdated]);

  // Triggers the tick event every 100ms
  useEffect(() => {
    if (!runtimeRef.current) return;

    intervalRef.current = setInterval(() => {
      if (runtimeRef.current) {
        // Create the tick event
        const tick = { name: "tick", timestamp: new Date() };  
        // Process all events and get resulting actions
        const actions = runtimeRef.current.tick([...stack, tick]);
        // Clear the event stack after processing
        
        if (stack.length > 0) {
          console.log("clear")
          setStack([]);
        }

        // Apply each action to update the UI state
        for (const action of actions) {
          action.apply(runtimeRef.current, setDisplay, setButtons, setResults);
        }
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  });

  // Wraps the loadScript function to call onScriptCompiled
  const handleLoadScript = (newScript: WodRuntimeScript | undefined) => {
    loadScript(newScript);
    if (newScript && onScriptCompiled) {
      onScriptCompiled(newScript);
    }
  };

  // Loads the script into the runtime.
  useEffect(() => {
    if (!script?.statements) {
      return;
    }

    try {
      const jit = new RuntimeJit()
      // Create the compiled runtime with handlers
      const compiled = new RuntimeStack(script.statements, jit);
      
      // Create the timer runtime
      const timer = new TimerRuntime(compiled);

      runtimeRef.current = timer;

      // Reset state
      setDisplay(undefined);
      setButtons([startButton]);
      setResults([]);
    } catch (error) {
      console.error("Failed to initialize runtime:", error);
    }
    return () => {
      runtimeRef.current = undefined;
    };
  }, [script]);

  
  return {
    loadScript: handleLoadScript,
    runtimeRef,
    buttons,
    display,
    results,
    setStack
  };
}
