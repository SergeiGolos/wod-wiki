/** @jsxImportSource react */
import React from 'react';
import { ClockAnchor } from './ClockAnchor';
import { cn } from '@/core/utils';

interface CustomClockLayoutProps {
  className?: string;
}

// This is an example of a custom layout that shows how flexible the clock anchors can be
export const CustomClockLayout: React.FC<CustomClockLayoutProps> = ({ 
  className 
}) => {
  return (
    <div className={cn("flex flex-col gap-4 w-full", className ?? "")}>      {/* Primary timer centered and large */}
      <div className="flex justify-center">
        <ClockAnchor 
          name="primary" 
          showRemaining={true}
          showEffort={true}
          className="text-center"
          render={(duration, _label, effort) => (
            <div className="text-center">
              {effort && <div className="text-2xl font-medium text-blue-600 mb-2">{effort}</div>}
              <div className="text-8xl font-mono font-bold text-blue-600">
                {duration ? 
                  `${duration.minutes || 0}:${String(duration.seconds || 0).padStart(2, '0')}` : 
                  '--:--'}
              </div>
            </div>
          )}
        />
      </div>
      
      {/* Multiple clocks in a row */}
      <div className="flex justify-between px-4 bg-gray-100 p-2 rounded-lg">
        <ClockAnchor 
          name="total" 
          label="Total" 
          className="text-gray-700"
        />
        
        {/* You can display any named clock from the registry */}
        <ClockAnchor 
          name="round" 
          label="Round Time"
          className="text-green-700" 
        />
        
        <ClockAnchor 
          name="rest" 
          label="Rest" 
          showRemaining={true}
          className="text-red-700"
        />
      </div>
    </div>
  );
};