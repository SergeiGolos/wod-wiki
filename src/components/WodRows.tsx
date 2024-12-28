import React from "react";
import { DisplayBlock } from "../lib/timer.types";
import { WodRowClassifier } from "../lib/WodRowClassifier";
import { NotificationRow } from "./rows/NotificationRow";
import { HeaderRow } from "./rows/HeaderRow";
import { ParagraphRow } from "./rows/ParagraphRow";
import { ExerciseRow } from "./rows/ExerciseRow";

export interface BlockProps {  
  block: DisplayBlock;  
}

export const Block: React.FC<BlockProps> = ({ block }) => {  
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