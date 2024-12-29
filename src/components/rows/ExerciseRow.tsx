import React from "react";
import { DisplayBlock, StatementFragment } from "../../lib/timer.types";


interface ExerciseRowProps {
  block: DisplayBlock;
}

export const ExerciseRow: React.FC<ExerciseRowProps> = ({ 
  block 
}) => {  
  const parts = block.getParts();
  return (    
    <div className="w-full flex px-6 py-2" style={{ paddingLeft: `${block.depth * 20 + 24}px` }}>
      <div className="flex-1 flex justify-between items-center">
        <div>
          {parts.length > 0 && (
            <div className="flex gap-2 items-center text-gray-700 font-mono mb-1">
              {parts.map((part, index) => (
                <React.Fragment key={index}>
                  <span>{part}</span>
                  {index < parts.length - 1 && <span className="text-gray-400">•</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>              
    </div>
  );
};
