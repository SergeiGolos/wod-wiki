import React from "react";
import { DisplayBlock } from "../../lib/timer.types";

interface ParagraphRowProps {
  block: DisplayBlock;  
}

export const ParagraphRow: React.FC<ParagraphRowProps> = ({ block }) => {
  return (
    <tr>
      <td colSpan={2} className="px-6 py-2 text-gray-600" style={{ paddingLeft: `${block.depth * 20 + 24}px` }}>
        <p className="text-base leading-relaxed">{block.block.text}</p>
      </td>
    </tr>
  );
};
