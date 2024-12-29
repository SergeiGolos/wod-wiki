import React from "react";
import { DisplayBlock, TextFragment } from "../../lib/timer.types";

interface ParagraphRowProps {
  block: DisplayBlock;  
}

export const ParagraphRow: React.FC<ParagraphRowProps> = ({ block }) => {
  const fragment = block.block.fragments.find(f => f.type === 'text') as TextFragment;
  return (
    <div 
      className="w-full px-6 py-2 text-gray-600" 
      style={{ paddingLeft: `${block.depth * 20 + 24}px` }}
    >
      <p className="text-base leading-relaxed">{fragment.text}</p>
    </div>
  );
};
