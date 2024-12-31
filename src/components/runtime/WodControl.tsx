import React from "react";

interface RuntimeControlProps {
  isRunning: boolean;  
  onStart: () => void;
  onReset: () => void;
}

export const WodControl: React.FC<RuntimeControlProps> = ({  
  isRunning,
  onStart,
  onReset,
}) => {
  return (
    <div className="absolute top-2 right-2">
      <button
        onClick={isRunning ? onReset : onStart}        
        className={`px-6 my-3 mx-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
          isRunning
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-green-500 hover:bg-green-600 text-white"
        }`}
      >
        {isRunning ? "Rest" : "Start"}
      </button>
    </div>
  );
};
