import React from "react";
import { DisplayBlock } from "../../lib/timer.types";
import { WodRowClassifier } from "../../lib/WodRowClassifier";

interface ExerciseRowProps {
  block: DisplayBlock;
}

export const ExerciseRow: React.FC<ExerciseRowProps> = ({ 
  block 
}) => {
  const parts = WodRowClassifier.getExerciseParts(block.block);

  return (
    <>
      <tr>
        <td 
          className="px-6 py-2 whitespace-nowrap"
          style={{ paddingLeft: `${block.depth * 20 + 24}px` }}
        >
          {parts.length > 0 && (
            <div className="flex gap-2 items-center text-gray-700 font-mono">
              {parts.map((part, index) => (
                <React.Fragment key={index}>
                  <span>{part}</span>
                  {index < parts.length - 1 && <span className="text-gray-400">•</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </td>
        <td className="px-6 py-2 text-gray-900">
          {block.block?.text}
        </td>
      </tr>              
    </>
  );
};
