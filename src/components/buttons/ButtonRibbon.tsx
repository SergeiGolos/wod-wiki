
import React, { Dispatch, SetStateAction } from "react";
import { ButtonConfig, RuntimeEvent } from "@/core/timer.types";


interface ButtonRibbonProps {
  buttons: ButtonConfig[];
  setEvents: Dispatch<SetStateAction<RuntimeEvent[]>>;
}

export const ButtonRibbon: React.FC<ButtonRibbonProps> = ({ buttons, setEvents }) => {
  
  
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

  return (
    <div className="flex justify-end space-x-2 px-2 py-1">
      {buttons.map((button, index) => (
        <button
          key={index}
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
