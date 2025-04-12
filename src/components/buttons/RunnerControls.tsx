import React, { Dispatch, SetStateAction } from "react";
import { ButtonConfig, RuntimeEvent } from "@/core/timer.types";
import { startButton, stopButton, resetButton, resumeButton } from "./timerButtons";
import { ChromecastButton } from "@/cast/components/ChromecastButton";

interface RunnerControlsProps {
  state: "idle" | "running" | "paused" | "error" | "done";
  setEvents: Dispatch<SetStateAction<RuntimeEvent[]>>;
  leftButtons?: ButtonConfig[];
}

export const RunnerControls: React.FC<RunnerControlsProps> = ({ 
  state, 
  setEvents, 
  leftButtons = [] 
}) => {
  // Determine which control buttons to show based on state
  const getControlButtons = () => {
    switch (state) {
      case "idle":
        return [startButton];
      case "running":
        return [stopButton];
      case "paused":
        return [resumeButton, resetButton];
      case "done":
        return [resetButton];
      default:
        return [startButton];
    }
  };

  const getButtonStyle = (button: ButtonConfig) => {
    const baseStyle = "flex items-center px-3 py-1 rounded-full transition-all ";
    
    if (button.variant === 'success') {
      return baseStyle + "bg-green-600 text-white hover:bg-green-700 shadow-lg";
    }
    
    if (button.isActive) {
      return baseStyle + "bg-blue-600 text-white shadow-lg transform scale-105";
    }
    
    return baseStyle + "bg-white text-blue-600 hover:bg-blue-50 border border-blue-200";
  };

  const clickEvent = (button: ButtonConfig) => {
    const events = button.onClick();    
    setEvents(events);
  };

  const controlButtons = getControlButtons();

  return (
    <div className="flex justify-between items-center px-2 py-1">
      {/* Left-aligned buttons (sounds, keep awake) */}
      <div className="flex space-x-2">
        {leftButtons.map((button, index) => (
          <button
            key={`left-${index}`}
            onClick={() => clickEvent(button)}
            className={getButtonStyle(button)}
          >
            {button.label && <span className="mr-2">{button.label}</span>}
            <button.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      
      {/* Right-aligned buttons */}
      <div className="flex space-x-2">
        {/* Only show the ChromecastButton when in idle state */}
        {state === "idle" && <ChromecastButton setEvents={setEvents} />}
        
        {/* Control buttons */}
        {controlButtons.map((button, index) => (
          <button
            key={`control-${index}`}
            onClick={() => clickEvent(button)}
            className={getButtonStyle(button)}
          >
            {button.label && <span className="mr-2">{button.label}</span>}
            <button.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
};
