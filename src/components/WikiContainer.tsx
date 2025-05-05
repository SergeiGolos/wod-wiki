"use client";
import React, { useEffect, useState } from "react";
import { WodWiki } from "./editor/WodWiki";
import { useTimerRuntime } from "./useTimerRuntime";
import { OutputEvent, ResultSpan, RuntimeMetricEdit, WodRuntimeScript } from "@/core/timer.types";
import { WodTimer } from "./clock/WodTimer";
import { ResultsDisplay } from "./metrics/ResultsDisplay";
import { cn } from "@/core/utils";
import { encodeShareString } from "@/core/utils";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { ButtonRibbon } from "./buttons/ButtonRibbon";
import { useLocalResultSync } from "@/components/syncs/useLocalResultSync";
import { useClockDisplaySync } from "@/components/syncs/useClockDisplaySync";
import { useLocalCursorSync } from "@/components/syncs/useLocalCursorSync";
import { useButtonSync } from "@/components/syncs/useButtonSync";
import { startButton } from "./buttons/timerButtons";
import { useTextSync } from "./syncs/useTextSync";

interface WikiContainerProps {
  id: string;
  code: string;
  className?: string;
  outbound?: (event: OutputEvent) => Promise<void>;
  /**
   * Optional callback when script is compiled
   */
  onScriptCompiled?: (script: WodRuntimeScript) => void;
  /**
   * Optional callback when results are updated
   */
  onResultsUpdated?: (results: ResultSpan[]) => void;
  children: React.ReactNode[];
}

export const WikiContainer: React.FC<WikiContainerProps> = ({
  id,
  code = "",
  className = "",
  onScriptCompiled,
  outbound,
  children
}) => {
  const [shareStatus, setShareStatus] = React.useState<string | null>(null);
  const editorRef = React.useRef<any>(null);
  const { loadScript, runtimeRef, input, output } = useTimerRuntime({
    onScriptCompiled,
  });
  
  const [primary, setPrimary] = useClockDisplaySync("primary");
  const [total, setTotal] = useClockDisplaySync("total");
  const [label, setLabel] = useTextSync("label");
  const [results, setResults] = useLocalResultSync();
  const [cursor, setCursor] = useLocalCursorSync();  
  const [systemButtons, setSystemButtons] = useButtonSync("system");
  const [runtimeButtons, setRuntimeButtons] = useButtonSync("runtime");

  const [edits, setEdits] = useState<RuntimeMetricEdit[]>([]);   
  
  const handleScriptChange = (script?: WodRuntimeScript) => {
    if (script) {
      // Pass to runtime
      loadScript(script);
    }
  };

  useEffect(() => {      
    console.debug('WikiContainer: Setting up output subscription');
    
    const dispose = output?.subscribe((event) => {        
      console.debug('WikiContainer received output event:', {
        type: event.eventType,
        target: event.bag?.target,
        timestamp: new Date().toISOString()
      });
      console.debug("WikiContainer received output event:", event);
      // Handle SET_CLOCK events specifically
      if (event.eventType === 'SET_CLOCK') {
        console.debug('WikiContainer processing SET_CLOCK event:', {
          target: event.bag?.target,
          duration: event.bag?.duration
        });
      }
      
      // Process the event through all handlers
      setPrimary(event);
      setLabel(event);
      setTotal(event);
      setResults(event);
      setCursor(event);      
      setSystemButtons(event);
      setRuntimeButtons(event);
      outbound?.(event);
    });
    
    return () => {
      console.debug('WikiContainer: Cleaning up output subscription');
      dispose?.unsubscribe();
    };
  }, [output, outbound, setPrimary, setTotal, setResults, setCursor, setSystemButtons, setRuntimeButtons]);


  // Create Chromecast button (now managed independently)
  return (
    <div
      className={cn(
        `border border-gray-200 rounded-lg ${className}`,
        className
      )}
    >
      <WodWiki
        id={id}
        code={code}
        onValueChange={handleScriptChange}
        cursor={cursor ?? undefined}        
      />
      <div className="top-controls p-1 flex flex-row items-center divider-y border justify-between">
        {/* Left: Sound and screen lock toggles */}
        <div className="flex flex-row space-x-2 items-center">
          {children}
        </div>
        {/* Right: Share Button */}
        <div className="flex flex-row items-center space-x-2">
          <button
            title="Share Workout"
            className="text-gray-500 hover:bg-gray-100 p-2 rounded-full flex items-center"
            onClick={async () => {
              let workoutCode = code;
              // Try to get latest code from the editor if possible
              if (editorRef.current && editorRef.current.getValue) {
                workoutCode = editorRef.current.getValue();
              }
              const encoded = encodeShareString(workoutCode);
              const url = `${window.location.origin}/?path=/story/live--link&code=${encoded}`;
              await navigator.clipboard.writeText(url);
              setShareStatus("Link copied!");
              setTimeout(() => setShareStatus(null), 2000);
            }}
          >
            <ClipboardDocumentIcon className="h-5 w-5 mr-1" />
            <span className="hidden md:inline">Share</span>
          </button>
          {shareStatus && (
            <span className="ml-2 text-green-600 text-sm">{shareStatus}</span>
          )}
        </div>
        <ButtonRibbon buttons={systemButtons && systemButtons.length > 0 ? systemButtons : [startButton]} 
        setEvent={event => input.next(event)} />
      </div>
      {runtimeRef.current && (
        <>
          <WodTimer label={label} primary={primary} total={total} />
          <div className="p-1 flex justify-center">
          <ButtonRibbon buttons={runtimeButtons ?? []} setEvent={event => input.next(event)} />
          </div> 
        </>
      )}
      <ResultsDisplay className="border-t border-gray-200" runtime={runtimeRef} results={results ?? []} edits={edits} />
    </div>
  );
};