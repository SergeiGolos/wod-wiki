import { useRef, useState, useEffect } from "react";
import { IRuntimeEvent, OutputEvent, WodRuntimeScript } from "@/core/timer.types";
import { RuntimeStack } from "@/core/runtime/RuntimeStack";
import { RuntimeJit } from "@/core/runtime/RuntimeJit";
import { TimerRuntime } from "@/core/runtime/timer.runtime";
import { Subject } from "rxjs";






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
  const inputRef = useRef<Subject<IRuntimeEvent>>(new Subject());
  const outputRef = useRef<Subject<OutputEvent>>(new Subject());

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
    }

    try {
      const jit = new RuntimeJit()
      // Create the compiled runtime with handlers
      const stack = new RuntimeStack(script.statements);        
      // Create the timer runtime      
      runtimeRef.current = new TimerRuntime(
        script.source, stack, jit, inputRef.current, outputRef.current
      );      
    } catch (error) {
      console.error("Failed to initialize runtime:", error);
      cleanUp();
    }
    return cleanUp;
  }, [script]);

  return {
    loadScript: handleLoadScript,
    runtimeRef,
    input: inputRef.current,
    output: outputRef.current,
  };
}
