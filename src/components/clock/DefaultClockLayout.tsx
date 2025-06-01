/** @jsxImportSource react */
import React from 'react';
import { ClockAnchor } from './ClockAnchor';
import { cn } from '@/core/utils';

interface DefaultClockLayoutProps {
  label?: string;
  className?: string;
}

export const DefaultClockLayout: React.FC<DefaultClockLayoutProps> = ({
  label = 'Workout',
  className,
}) => {
  return (    <div className={cn("grid md:grid-cols-3 gap-1 md:gap-4 w-full", className ?? "")}>
      {/* Left section - Label */}
      <div className="bg-gray-50/20 p-1 md:p-4">
        <div className="text-2xl font-semibold text-gray-700">{label}</div>
      </div>      {/* Middle section - Primary Timer */}
      <div className="bg-white p-2 md:p-4 rounded-lg flex items-center justify-center">
        <div className="text-5xl md:text-8xl font-mono font-bold text-gray-800 tracking-wider">
          <ClockAnchor 
            name="primary" 
            showRemaining={true}
            showEffort={true}
          />
        </div>
      </div>

      {/* Right section - Total Time */}
      <div className="bg-gray-50/20 p-4">
        <div className="space-y-2 md:space-y-4">
          <ClockAnchor 
            name="total" 
            label="Total Time"
            className="text-gray-600 text-xl font-mono"
          />
        </div>
      </div>
    </div>
  );
};