import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { ButtonConfig, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";
import { startButton, resetButton, resumeButton, pauseButton, endButton, saveButton } from "./timerButtons";

interface RunnerControlsProps {
  setEvents: Dispatch<SetStateAction<RuntimeEvent[]>>;  
  state: string;
}

export const RunnerControls: React.FC<RunnerControlsProps> = ({ 
  setEvents,
  state   
}) => {
  // Canonical mapping of state to control buttons
  
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);

  useEffect(() => {
    switch (state) {
      case "idle":
        setButtons([startButton]);
        break;
      case "running":
        setButtons([pauseButton, endButton]);
        break;
      case "paused":
        setButtons([resumeButton, endButton]);
        break;
      case "done":
        setButtons([saveButton, resetButton]);
        break;
      default:
        setButtons([startButton]);
        break;
    }
  }, [state]);

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
        {buttons.map((button: ButtonConfig, index: number) => (
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
