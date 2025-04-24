import { useRef, useState, useEffect } from "react";
import { IRuntimeEvent, WodRuntimeScript } from "@/core/timer.types";
import { RuntimeStack } from "@/core/runtime/RuntimeStack";
import { RuntimeJit } from "@/core/runtime/RuntimeJit";
import { TimerRuntime } from "@/core/runtime/timer.runtime";
import { RuntimeTrace } from "@/core/RuntimeTrace";
import { Subject } from "rxjs";
import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { NotifyRuntimeAction } from "@/core/runtime/actions/NotifyRuntimeAction";

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
  const inputRef = useRef<Subject<IRuntimeEvent>>();
  const outputRef = useRef<Subject<ChromecastEvent>>();

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
    function cleanUp() {
      runtimeRef.current?.dispose?.unsubscribe();
      runtimeRef.current = undefined;
      inputRef.current = undefined;
      outputRef.current = undefined;
    }

    try {
      const jit = new RuntimeJit()
      // Create the compiled runtime with handlers
      const stack = new RuntimeStack(script.statements);
      const trace = new RuntimeTrace();
      // Create the timer runtime      
      runtimeRef.current = new TimerRuntime(script.source, stack, jit, [], trace); 
      inputRef.current = runtimeRef.current.input$;
      outputRef.current = runtimeRef.current.output$;
    } catch (error) {
      console.error("Failed to initialize runtime:", error);
      cleanUp();
    }
    return cleanUp;
  }, [script]);

  return {
    loadScript: handleLoadScript,
    runtimeRef,
    input: inputRef,
    output: outputRef,
  };
}
