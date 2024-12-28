import React from "react";
import { DisplayBlock } from "../lib/timer.types";
import { WodRowClassifier } from "../lib/WodRowClassifier";
import { NotificationRow } from "./rows/NotificationRow";
import { HeaderRow } from "./rows/HeaderRow";
import { ParagraphRow } from "./rows/ParagraphRow";
import { ExerciseRow } from "./rows/ExerciseRow";

interface BlockProps {  
  block: DisplayBlock;  
}

const Block: React.FC<BlockProps> = ({ block }) => {  
  // Render the appropriate row component based on block type
  const renderContent = () => {
    if (WodRowClassifier.isNotification(block.block)) {
      return <NotificationRow block={block.block} />;
    }

    if (WodRowClassifier.isHeader(block.block)) {
      return <HeaderRow block={block.block} />;
    }

    if (WodRowClassifier.isParagraph(block.block)) {
      return <ParagraphRow block={block} />;
    }

    return <ExerciseRow block={block} />;
  };

  return (
    <>
      {renderContent()}      
    </>
  );
};

export const WodRuntime: React.FC<{
  data?: DisplayBlock[];    
}> = ({ data = [] }) => {  
    
  if (!data || data.length === 0) {
    //TODO: this should be its own component
    return (
      <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={2} className="text-center p-8">
                <p className="text-gray-500">No workout data available</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((block) => (
            <Block
              block={block}   
              key={block.id}              
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
