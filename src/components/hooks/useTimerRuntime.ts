import { useRef, useState, useEffect, useMemo } from "react";
import { WodRuntimeScript } from "@/core/timer.types";
import { RuntimeStack } from "@/core/runtime/RuntimeStack";
import { RuntimeJit } from "@/core/runtime/RuntimeJit";
import { TimerRuntime } from "@/core/runtime/timer.runtime";
import { IRuntimeEvent } from "@/core/timer.types";
import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { interval, map, merge, Observable, Subject } from "rxjs";

/**
 * Hook props for useTimerRuntime
 */
export interface UseTimerRuntimeProps {
  /**
   * Called when a script is compiled with the compiled script
   */
  onScriptCompiled?: (script: WodRuntimeScript) => void;  
}

export function useTimerRuntime({
  onScriptCompiled    
}: UseTimerRuntimeProps = {}) {
  
  const runtimeRef = useRef<TimerRuntime>();  
  const input = new Subject<IRuntimeEvent>();      
  const output = new Subject<ChromecastEvent>();  
  const [script, loadScript] = useState<WodRuntimeScript | undefined>();

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
      const stack = new RuntimeStack(script.statements);
      
      // Create the timer runtime      
      runtimeRef.current = new TimerRuntime(script.source, stack, jit, input, output); 
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
    input: input.next,
    output
  };
}
