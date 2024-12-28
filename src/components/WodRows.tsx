import React from "react";
import { DisplayBlock, StatementBlock } from "../lib/timer.types";
import { WodRowClassifier } from "../lib/WodRowClassifier";
import { NotificationRow } from "./rows/NotificationRow";
import { HeaderRow } from "./rows/HeaderRow";
import { ParagraphRow } from "./rows/ParagraphRow";
import { ExerciseRow } from "./rows/ExerciseRow";

interface BlockProps {
  timestamps: any[];
  block: DisplayBlock;  
}

const Block: React.FC<BlockProps> = ({ block, timestamps }) => {  
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

    return <ExerciseRow block={block} timestamps={timestamps} />;
  };

  return (
    <>
      {renderContent()}
      {(block.block?.blocks?.length || 0) > 0 &&
        block.block?.blocks?.map((child: any, index: number) => (
          <Block
            key={index}
            block={child}
            timestamps={timestamps}            
          />
        ))}      
    </>
  );
};

export const WodRuntime: React.FC<{
  data?: DisplayBlock[];
  current?: number;
  timestamps?: any[];
}> = ({ data = [], current, timestamps = [] }) => {
  let rowCounter = 0;
  const getNextRowIndex = () => rowCounter++;

  if (!data || data.length === 0) {
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
          {data.map((block, index) => (
            <Block
              block={block}   
              key={index}
              timestamps={timestamps}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
