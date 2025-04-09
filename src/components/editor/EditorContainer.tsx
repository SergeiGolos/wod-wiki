"use client";
import React, { useEffect, useState } from "react";
import { WodWiki } from "../editor/WodWiki";
import { useTimerRuntime } from "../hooks/useTimerRuntime";
import { ResultSpan, WodRuntimeScript, RuntimeMetric, RuntimeMetricEdit, MetricValue } from "@/core/timer.types";
import { WodTimer } from "../clock/WodTimer";
import { ButtonRibbon } from "../buttons/ButtonRibbon";
import { ResultsDisplay } from "../analyrics/ResultsDisplay";
import { cn } from "@/core/utils";
import { useSound } from "@/core/contexts/SoundContext";
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/outline";
import { SoundProvider } from "@/core/contexts/SoundContext";
import { ScreenProvider } from "@/core/contexts/ScreenContext";
import { useScreen } from "@/core/contexts/ScreenContext";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

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
    cursor,
    buttons,
    display,
    results, 
    setStack
  } = useTimerRuntime({
    onScriptCompiled,
  });

  const { soundEnabled, toggleSound } = useSound();
  const { screenOnEnabled, toggleScreenOn, requestWakeLock, releaseWakeLock } = useScreen();  

  // Custom onValueChange handler to track cursor position from script
  const handleScriptChange = (script?: WodRuntimeScript) => {
    if (script) {            
      // Pass to runtime
      loadScript(script);
    }
  };

  // Monitor runtime state to control screen wake lock
  useEffect(() => {
    if (!runtimeRef.current) return;

    const handleRuntimeStateChange = async () => {
      const isIdle = runtimeRef.current?.current?.type === "idle";
      
      if (screenOnEnabled) {
        if (!isIdle) {
          // Runtime is active, request wake lock
          await requestWakeLock();
        } else {
          // Runtime is idle, release wake lock
          await releaseWakeLock();
        }
      }
    };

    // Initial check
    handleRuntimeStateChange();

    // Set up an interval to check for state changes
    const intervalId = setInterval(handleRuntimeStateChange, 1000);

    return () => {
      clearInterval(intervalId);
      releaseWakeLock();
    };
  }, [runtimeRef, screenOnEnabled, requestWakeLock, releaseWakeLock]);

  // Create sound toggle button
  const soundToggleButton = {
    icon: soundEnabled ? SpeakerWaveIcon : SpeakerXMarkIcon,
    onClick: () => {
      toggleSound();
      return [];
    },
    isActive: soundEnabled,
  };

  // Create screen on toggle button
  const screenOnToggleButton = {
    icon: screenOnEnabled ? EyeIcon : EyeSlashIcon,
    onClick: () => {
      toggleScreenOn();
      return [];
    },
    isActive: screenOnEnabled,
  };

  // State to hold the list of metric update instructions
  const [metricUpdates, setMetricUpdates] = useState<RuntimeMetricEdit[]>([]);

  // Function to add a new metric update instruction
  const handleAddMetricUpdate = (update: RuntimeMetricEdit) => {
    setMetricUpdates(prevUpdates => {
      const newUpdates = [...prevUpdates, update];
      console.log('Metric Updates:', newUpdates); // Log the list
      return newUpdates;
    });
  };

  return (
    <div className={cn(`border border-gray-200 rounded-lg divide-y ${className}`, className)}>                  
      <WodWiki id={id} code={code} onValueChange={handleScriptChange} cursor={cursor} />      
      <div className="timer-controls p-1">
        <ButtonRibbon 
          buttons={buttons} 
          leftButtons={[soundToggleButton, screenOnToggleButton]} 
          setEvents={setStack} 
        />              
      </div>      
      {display && display.label !== 'idle' && <WodTimer display={display} />}      
      <ResultsDisplay 
        runtime={runtimeRef} 
        results={results} 
        onAddMetricUpdate={handleAddMetricUpdate} 
      />
    </div>
  );
};

// Export a wrapped version that includes the SoundProvider
export const EditorContainerWithProviders: React.FC<EditorContainerProps> = (props) => {
  return (
    <ScreenProvider>
      <SoundProvider>
        <EditorContainer {...props} />
      </SoundProvider>
    </ScreenProvider>
  );
};
