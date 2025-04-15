import React, { Dispatch, SetStateAction } from "react";
import { ButtonConfig, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";
import { startButton, stopButton, resetButton, resumeButton } from "./timerButtons";

interface RunnerControlsProps {
  runtime: ITimerRuntime;
  setEvents: Dispatch<SetStateAction<RuntimeEvent[]>>;  
}

export const RunnerControls: React.FC<RunnerControlsProps> = ({ 
  runtime, 
  setEvents,   
}) => {
  // Determine which control buttons to show based on runtime state
  const getControlButtons = () => {
    const state = runtime?.current?.getState();
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
        return [];
    }
  };

  const controlButtons = getControlButtons();

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

  return (    
      <div className="flex space-x-2">
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
  );
};
