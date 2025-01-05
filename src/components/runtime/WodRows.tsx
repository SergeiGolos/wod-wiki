import React from "react";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { NotificationRow } from "../rows/NotificationRow";
import { HeaderRow } from "../rows/HeaderRow";
import { ParagraphRow } from "../rows/ParagraphRow";
import { ExerciseRow } from "../rows/ExerciseRow";
import { RoundsRow } from "../rows/RoundsRow";

export interface BlockProps {  
  block: RuntimeBlock;  
}

export const Block: React.FC<BlockProps> = ({ block }) => {  
  // Render the appropriate row component based on block type
  const renderContent = () => {
    switch (block.type) {
      case "notification":
        return <NotificationRow block={block} />;
      case "header":
        return <HeaderRow block={block.block} />;
      case "paragraph":
        return <ParagraphRow block={block} />;      
      case "rounds":
        return <RoundsRow block={block} />;      
      default:
        return <ExerciseRow block={block} />;
    }    
  };

  return (
    <>
      {renderContent()}      
    </>
  );
};

export const CurrentBlock: React.FC<BlockProps> = ({ block }) => {  
  return (
    <div className="border-2 border-blue-500 rounded-lg p-2 bg-blue-50">      
      <Block block={block} />
    </div>
  );
};