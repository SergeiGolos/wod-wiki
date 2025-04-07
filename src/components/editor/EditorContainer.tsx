"use client";
import React from "react";
import { WodWiki } from "../editor/WodWiki";
import { useTimerRuntime } from "../hooks/useTimerRuntime";
import { ResultSpan, WodRuntimeScript } from "@/core/timer.types";
import { WodTimer } from "../clock/WodTimer";
import { ButtonRibbon } from "../buttons/ButtonRibbon";
import { ResultsDisplay } from "../analyrics/ResultsDisplay";
import { cn } from "@/core/utils";
import { SoundToggle } from "../buttons/SoundToggle";
import { useSound } from "@/core/contexts/SoundContext";
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/outline";
import { SoundProvider } from "@/core/contexts/SoundContext";

interface EditorContainerProps {
  id: string;
  code: string;
  className?: string;
  /**
   * Optional callback when script is compiled
   */
  onScriptCompiled?: (script: WodRuntimeScript) => void;
  /**
   * Optional callback when results are updated
   */
  onResultsUpdated?: (results: ResultSpan[]) => void;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  id,
  code = "",
  className = "",
  onScriptCompiled,
  onResultsUpdated,
}) => {
  const {
    loadScript,
    runtimeRef,
    buttons,
    display,
    results, 
    setStack   
  } = useTimerRuntime({
    onScriptCompiled,
    onResultsUpdated,
  });

  const { soundEnabled, toggleSound } = useSound();

  // Create sound toggle button
  const soundToggleButton = {
    icon: soundEnabled ? SpeakerWaveIcon : SpeakerXMarkIcon,
    onClick: () => {
      toggleSound();
      return [];
    },
    isActive: soundEnabled,
  };

  return (
    <div className={cn(`border border-gray-200 rounded-lg divide-y ${className}`, className)}>
      <div className="timer-controls p-4">
        <ButtonRibbon 
          buttons={buttons} 
          leftButtons={[soundToggleButton]} 
          setEvents={setStack} 
        />              
      </div>      
      {display && <WodTimer display={display} />}
      <WodWiki id={id} code={code} onValueChange={loadScript} />      
      <ResultsDisplay runtime={runtimeRef} results={results} />
    </div>
  );
};

// Export a wrapped version that includes the SoundProvider
export const EditorContainerWithProviders: React.FC<EditorContainerProps> = (props) => {
  return (
    <SoundProvider>
      <EditorContainer {...props} />
    </SoundProvider>
  );
};
