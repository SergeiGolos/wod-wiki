import { useRef, useState, useEffect } from "react";
import { IRuntimeScript } from "@/core/WodRuntimeScript";
import { OutputEvent } from "@/core/OutputEvent";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { RuntimeScript } from "@/core/runtime/RuntimeScript";
import { RuntimeJit } from "@/core/runtime/RuntimeJit";
import { TimerRuntime } from "@/core/runtime/TimerRuntime";
import { Subject } from "rxjs";






/**
 * Hook props for useTimerRuntime
 */
export interface UseTimerRuntimeProps {
  /**
   * Called when a script is compiled with the compiled script
   */
  onScriptCompiled?: (script: IRuntimeScript) => void;
}

export function useTimerRuntime({
  onScriptCompiled    
}: UseTimerRuntimeProps = {}) {
  
  const runtimeRef = useRef<TimerRuntime>();  
  const inputRef = useRef<Subject<IRuntimeEvent>>(new Subject());
  const outputRef = useRef<Subject<OutputEvent>>(new Subject());

  const [script, loadScript] = useState<IRuntimeScript | undefined>();

  // Wraps the loadScript function to call onScriptCompiled
  const handleLoadScript = (newScript: IRuntimeScript | undefined) => {
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
      // Create the compiled runtime with handlers
      const stack = new RuntimeScript(script.statements);        
      const jit = new RuntimeJit(stack);
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
    output$: outputRef.current // Add Observable version for ClockProvider
  };
}
