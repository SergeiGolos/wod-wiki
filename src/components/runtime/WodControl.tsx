import React from "react";
import { WodRuntimeState } from "./WodRunner";

interface RuntimeControlProps {
  runtimeState: keyof typeof WodRuntimeState;  
  onStart: () => void;
  onReset: () => void;
}

export const WodControl: React.FC<RuntimeControlProps> = ({  
  runtimeState,
  onStart,
  onReset,
}) => {
  return (
    <div className="flex justify-end py-2 px-4 bg-gray-50 border-b">
      <button
        onClick={
          runtimeState === WodRuntimeState.runner ? onReset : onStart
        }        
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          runtimeState === WodRuntimeState.runner
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-green-500 hover:bg-green-600 text-white"
        }`}
      >
        {runtimeState === WodRuntimeState.runner ? "Rest" : "Start"}
      </button>
    </div>
  );
};
