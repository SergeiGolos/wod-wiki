import React, { Dispatch, SetStateAction } from "react";
import { ButtonConfig, RuntimeEvent } from "@/core/timer.types";


interface ButtonRibbonProps {
  buttons: ButtonConfig[];
  leftButtons?: ButtonConfig[];
  setEvents: Dispatch<SetStateAction<RuntimeEvent[]>>;
}

export const ButtonRibbon: React.FC<ButtonRibbonProps> = ({ buttons, leftButtons = [], setEvents }) => {
  
  
  /// TODO:  THis should be conifugred at the button not in the ribben
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
  }

  // If we have leftButtons, show them on the left and buttons on the right
  // Otherwise, center all buttons (for use under the timer)
  const hasLeftButtons = leftButtons.length > 0;

  return (
    <div className={`flex ${hasLeftButtons ? 'justify-between' : 'justify-center'} items-center px-2 py-1`}>
      {/* Left-aligned buttons */}
      {hasLeftButtons && (
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
      )}
      
      {/* Buttons - right-aligned if hasLeftButtons, centered otherwise */}
      <div className="flex space-x-2">
        {buttons.map((button, index) => (
          <button
            key={`right-${index}`}
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
