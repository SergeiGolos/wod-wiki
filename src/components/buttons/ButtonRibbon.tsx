import React from "react";
import { ActionButton, IRuntimeEvent } from "@/core/timer.types";
import { cn } from "@/core/utils";


interface ButtonRibbonProps {
  buttons: ActionButton[] | undefined;  
  setEvent: (events: IRuntimeEvent) => void;
}

export const ButtonRibbon: React.FC<ButtonRibbonProps> = ({ buttons, setEvent }) => {
  
  
  /// TODO:  THis should be conifugred at the button not in the ribben
  const getButtonStyle = (button: ActionButton) => {
    const baseStyle = "flex items-center px-3 py-1 rounded-md transition-all ";
    
    if (button.variant === 'success') {
      return baseStyle + "bg-green-600 text-white hover:bg-green-700 shadow-lg";
    }
    
    if (button.isActive) {
      return baseStyle + "bg-blue-600 text-white shadow-lg transform scale-105";
    }
    
    return baseStyle + "bg-white text-blue-600 hover:bg-blue-50 border border-blue-200";
  };

  const clickEvent = (button: ActionButton) => {
    const events = button.onClick();    
    events.forEach(event => setEvent(event));
  }

  return (
    <div className={`flex justify-center items-center px-2 py-2`}>
      {/* Left-aligned buttons */}
      <div className="flex space-x-4">
        {buttons && buttons.map((button, index) => (
          <button
            key={`right-${index}`}
            onClick={() => clickEvent(button)}
              className={cn(getButtonStyle(button), "shadow-md text-lg sm:text-2xl py-2 px-4")}
            >
              {button.label && <span className="mr-2">{button.label}</span>}
              <button.icon className="w-6 h-6 mt-1" />
            </button>
          ))}
        </div>
    </div>
  );
};
