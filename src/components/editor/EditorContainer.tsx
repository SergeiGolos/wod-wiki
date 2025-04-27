"use client";
import React, { useEffect, useState } from "react";
import { WodWiki } from "../editor/WodWiki";
import { useTimerRuntime } from "../hooks/useTimerRuntime";
import { ActionButton, OutputEvent, ResultSpan, RuntimeMetricEdit, WodRuntimeScript } from "@/core/timer.types";
import { WodTimer } from "../clock/WodTimer";
import { RunnerControls } from "../buttons/RunnerControls";
import { ResultsDisplay } from "../analyrics/ResultsDisplay";
import { cn } from "@/core/utils";
import { SoundProvider } from "@/contexts/SoundContext";
import { ScreenProvider } from "@/contexts/ScreenContext";
import { encodeShareString } from "@/core/utils/shareUtils";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { ButtonRibbon } from "../buttons/ButtonRibbon";
import { useLocalCursorSync, useClockDisplaySync, useLocalResultSync } from "@/core/runtime/syncs/LocalDisplaySync";


interface EditorContainerProps {
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

export const EditorContainer: React.FC<EditorContainerProps> = ({
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
  const [label, setLabel] = useState<string>("Round");
  const [results, setResults] = useLocalResultSync();
  const [cursor, setCursor] = useLocalCursorSync();


  const [edits, setEdits] = useState<RuntimeMetricEdit[]>([]);  
 

  const [buttons, setButtons] = useState<ActionButton[]>([]);
  
  const handleScriptChange = (script?: WodRuntimeScript) => {
    if (script) {
      // Pass to runtime
      loadScript(script);
    }
  };

  useEffect(() => {      
    const dispose = output?.subscribe((event) => {      
      setPrimary(event);
      setTotal(event);
      setResults(event);
      setCursor(event);
      outbound?.(event);

    });      
    return () => {
      dispose?.unsubscribe();
    };
  }, [output, outbound]);


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
        cursor={cursor}        
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
        <RunnerControls input={input} state={"idle"} />
      </div>
      {runtimeRef.current?.current && primary && (
        <>
          <WodTimer label={label} primary={primary} total={total} />
          <div className="p-1 flex justify-center">
            <ButtonRibbon buttons={buttons} setEvent={input.next!} />
          </div> 
        </>
      )}
      <ResultsDisplay className="border-t border-gray-200" runtime={runtimeRef} results={results} edits={edits} />
    </div>
  );
};

// Export a wrapped version that includes the SoundProvider
export const EditorContainerWithProviders: React.FC<EditorContainerProps> = (
  props
) => {
  return (
    <ScreenProvider>
      <SoundProvider>
        <EditorContainer {...props} />
      </SoundProvider>
    </ScreenProvider>
  );
};
