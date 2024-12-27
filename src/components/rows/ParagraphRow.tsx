import React from "react";
import { WodBlock } from "../../lib/timer.types";

interface ParagraphRowProps {
  block: WodBlock;
  depth: number;
}

export const ParagraphRow: React.FC<ParagraphRowProps> = ({ block, depth }) => {
  return (
    <tr>
      <td colSpan={2} className="px-6 py-2 text-gray-600" style={{ paddingLeft: `${depth * 20 + 24}px` }}>
        <p className="text-base leading-relaxed">{block.text}</p>
      </td>
    </tr>
  );
};
