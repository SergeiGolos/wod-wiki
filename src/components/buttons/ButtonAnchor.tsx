/** @jsxImportSource react */
import React from 'react';
import { IActionButton } from '@/core/IActionButton';
import { IRuntimeEvent } from '@/core/IRuntimeEvent';
import { Subject } from 'rxjs';
import { cn } from '@/core/utils';

export interface ButtonAnchorProps {
  /** The named target for this button anchor (e.g., "system", "runtime", "advanced") */
  buttons: IActionButton[] | undefined;
  /** Optional CSS classes to apply to the container */
  className?: string;
  /** Event input subject for dispatching button events */
  input?: Subject<IRuntimeEvent>;
  /** Optional custom render function for buttons */
  render?: (buttons: IActionButton[], onClick: (button: IActionButton) => void) => React.ReactNode;
}

/**
 * ButtonAnchor component for displaying buttons by named target.
 * Uses the ClockContext to receive target-specific button arrays.
 */
export const ButtonAnchor: React.FC<ButtonAnchorProps> = ({
  buttons,
  className,
  input,
  render
}) => {

  const handleButtonClick = (button: IActionButton) => {
    if (!input) return;
    
    const events = button.onClick();
    for (const event of events) {
      input.next(event);
    }
  };
  // Use custom render function if provided
  if (render) {
    return <>{render(buttons || [], handleButtonClick)}</>;
  }

  // Don't render anything if no buttons
  if (!buttons || buttons.length === 0) {
    // console.log(`[ButtonAnchor] No buttons to render for target: ${name}`);
    return null;
  }
  // console.log(`[ButtonAnchor] Rendering buttons for target: ${name}`, buttons.map(b => b.label));

  // Default button rendering
  return (
    <div className={cn("flex flex-wrap gap-2", className || "")}>
      {buttons.map((button, index) => {
        const baseStyle = "flex items-center px-3 py-2 rounded-md transition-all text-sm font-medium ";
        
        let buttonStyle = baseStyle;
        if (button.variant === 'success') {
          buttonStyle += "bg-green-600 text-white hover:bg-green-700 shadow-lg";
        } else if (button.variant === 'primary') {
          buttonStyle += "bg-blue-600 text-white hover:bg-blue-700 shadow-lg";
        } else if (button.isActive) {
          buttonStyle += "bg-blue-600 text-white shadow-lg transform scale-105";
        } else {
          buttonStyle += "bg-white text-blue-600 hover:bg-blue-50 border border-blue-200";
        }

        const IconComponent = button.icon;

        return (
          <button
            key={index}
            className={buttonStyle}
            onClick={() => handleButtonClick(button)}
          >
            {IconComponent && <IconComponent className="mr-1 w-4 h-4" />}
            {button.label}
          </button>
        );
      })}
    </div>
  );
};
