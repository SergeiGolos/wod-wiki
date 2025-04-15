"use client";
import React, { useEffect } from "react";
import { WodWiki } from "../editor/WodWiki";
import { useTimerRuntime } from "../hooks/useTimerRuntime";
import { ResultSpan, WodRuntimeScript } from "@/core/timer.types";
import { WodTimer } from "../clock/WodTimer";
import { ButtonRibbon } from "../buttons/ButtonRibbon";
import { RunnerControls } from "../buttons/RunnerControls";
import { ResultsDisplay } from "../analyrics/ResultsDisplay";
import { cn } from "@/core/utils";
import { useSound } from "@/core/contexts/SoundContext";
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/outline";
import { SoundProvider } from "@/core/contexts/SoundContext";
import { ScreenProvider } from "@/core/contexts/ScreenContext";
import { useScreen } from "@/core/contexts/ScreenContext";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ChromecastButton } from "@/cast/components/ChromecastButton";
import { encodeShareString } from "@/core/utils/shareUtils";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";

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
  const [shareStatus, setShareStatus] = React.useState<string | null>(null);
  const editorRef = React.useRef<any>(null);
  const {
    loadScript,
    runtimeRef,
    cursor,
    buttons,
    edits,
    display,
    results,
    setEvents,
    state,
  } = useTimerRuntime({
    onScriptCompiled,
    onResultsUpdated,
  });

  const { soundEnabled, toggleSound } = useSound();
  const { screenOnEnabled, toggleScreenOn, requestWakeLock, releaseWakeLock } =
    useScreen();

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
      const isIdle = runtimeRef.current?.current?.getState() === "idle";

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
        ref={editorRef}
      />
      <div className="top-controls p-1 flex flex-row items-center divider-y border justify-between">
        {/* Left: Sound and screen lock toggles */}
        <div className="flex flex-row space-x-2 items-center">
          {soundToggleButton && (
            <button
              onClick={soundToggleButton.onClick}
              className={
                soundToggleButton.isActive
                  ? "bg-blue-100 text-blue-600 p-2 rounded-full"
                  : "text-gray-500 hover:bg-gray-100 p-2 rounded-full"
              }
            >
              <soundToggleButton.icon className="h-5 w-5" />
            </button>
          )}
          {screenOnToggleButton && (
            <button
              onClick={screenOnToggleButton.onClick}
              className={
                screenOnToggleButton.isActive
                  ? "bg-blue-100 text-blue-600 p-2 rounded-full"
                  : "text-gray-500 hover:bg-gray-100 p-2 rounded-full"
              }
            >
              <screenOnToggleButton.icon className="h-5 w-5" />
            </button>
          )}
          <ChromecastButton setEvents={setEvents} />
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
        <RunnerControls setEvents={setEvents} state={state} />
      </div>
      {runtimeRef.current?.current && display && (
        <>
          <WodTimer display={display} />
          <div className="p-1 flex justify-center">
            <ButtonRibbon buttons={buttons} setEvents={setEvents} />
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
