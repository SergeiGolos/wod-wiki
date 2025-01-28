import React, { ExoticComponent } from "react";

export interface ButtonConfig {
  label?: string;
  icon: React.ForwardRefExoticComponent<ExoticComponent>;
  onClick: () => void;
  isActive?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
}

interface ButtonRibbonProps {
  buttons: ButtonConfig[];
}

export const ButtonRibbon: React.FC<ButtonRibbonProps> = ({ buttons }) => {
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

  return (
    <div className="flex justify-end space-x-2 px-2 py-1">
      {buttons.map((button, index) => (
        <button
          key={index}
          onClick={button.onClick}
          className={getButtonStyle(button)}
        >
          {button.label && <span className="mr-2">{button.label}</span>}
          <button.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};
