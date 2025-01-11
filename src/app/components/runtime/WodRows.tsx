import React from "react";
import { ExerciseRow } from "../rows/ExerciseRow";
import { RoundsRow } from "../rows/RoundsRow";
import { RuntimeBlock } from "../../lib/RuntimeBlock";

export interface BlockProps {  
  block: RuntimeBlock;  
}

const renderContent = (block: RuntimeBlock) : any => {
  switch (block.runtimeHandler.type) {
    case "rounds":
      return <RoundsRow block={block} />;      
    default:
      return <ExerciseRow block={block} />;
  }   
}

export const Block: React.FC<BlockProps> = ({ block }) => {  
  // Render the appropriate row component based on block type  
  return (
    <>
      {renderContent(block)}      
    </>
  );
};

export const CurrentBlock: React.FC<BlockProps> = ({ block }) => {  
  return (
    <div className="border-t-2 border-x-2 border-blue-500/50 rounded-t-lg p-2 bg-blue-50/50">      
      {renderContent(block)}      
    </div>
  );
};