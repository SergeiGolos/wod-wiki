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
    <div className="absolute top-1.5 right-1.5">
      <button
        onClick={
          runtimeState === WodRuntimeState.runner ? onReset : onStart
        }        
        className={`px-4 my-1 mx-3 py-1 rounded-full text-sm font-medium transition-colors ${
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
