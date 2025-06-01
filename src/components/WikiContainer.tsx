"use client";
import React, { useEffect, useState } from "react";
import { WodWiki } from "./editor/WodWiki";
import { useTimerRuntime } from "./useTimerRuntime";
import { WodRuntimeScript } from "@/core/WodRuntimeScript";
import { RuntimeMetricEdit } from "@/core/RuntimeMetricEdit";
import { OutputEvent } from "@/core/OutputEvent";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { WodTimer, ClockFaceLayout } from "./clock";
import { ResultsDisplay } from "./metrics/ResultsDisplay";
import { cn } from "@/core/utils";
import { encodeShareString } from "@/core/utils";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useResultsSync } from "./syncs/useResultsSync";
import { useEventsSync } from "./syncs/useEventsSync";

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
  onResultsUpdated?: (results: RuntimeSpan[]) => void;
  /**
   * Optional callback when the editor is mounted
   */
  onMount?: (editor: any) => void;
  children?: React.ReactNode;
}

export const WikiContainer: React.FC<WikiContainerProps> = ({
  id,
  code = "",
  className = "",
  onScriptCompiled,
  onResultsUpdated,
  onMount,
  outbound,
  children
}) => {
  const [shareStatus, setShareStatus] = React.useState<string | null>(null);
  const editorRef = React.useRef<any>(null);
  const { loadScript, runtimeRef, input, output$ } = useTimerRuntime({
    onScriptCompiled,
  });    
  const [results, setResults] = useResultsSync();    
  // const [cursor, setCursor] = useLocalCursorSync();
  const [outputEvents, setOutputEvents] = useEventsSync();
  const [registered, setRegistered] = useState<((input: OutputEvent) => void)[]>([]);
  const [edits] = useState<RuntimeMetricEdit[]>([]);   
   
  const handleScriptChange = (script?: WodRuntimeScript) => {
    if (script) {
      // Pass to runtime
      loadScript(script);
    }
  };
  useEffect(() => {
    const dispose = output$?.subscribe((event) => {
      // Add event to output events list for timer
      setOutputEvents(event); // Keep last 100 events
      // Process the event through all handlers
      setResults(event);
      // setCursor(event);      
      outbound?.(event);
      registered.forEach((handler) => handler(event));
    });
    
    return () => {
      dispose?.unsubscribe();
    };
  }, [output$, registered]);


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
        onMount={onMount}
        onValueChange={handleScriptChange}        
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
      </div>
            
      {/* Timer events are only passed when runtime exists */}      
      <WodTimer events={outputEvents}>
        <ClockFaceLayout 
          input={input}
          registerSyncs={setRegistered}
          className="border-t border-gray-200"
        />      
      </WodTimer>      
      <ResultsDisplay className="border-t border-gray-200" runtime={runtimeRef} results={results ?? []} edits={edits} />
    </div>
  );
};