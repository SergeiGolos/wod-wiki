import React from "react";
import { StatementBlock } from "../../lib/timer.types";

interface HeaderRowProps {
  block: StatementBlock;
}

export const HeaderRow: React.FC<HeaderRowProps> = ({ block }) => {
  return (
    <tr>
      <td colSpan={2} className="px-6 py-3 border-b border-gray-200">
        <h1 className="text-2xl font-bold mb-4">
          {block.text}
        </h1>
      </td>
    </tr>
  );
};
