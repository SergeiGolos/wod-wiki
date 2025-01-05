import React from "react";
import { StatementBlock } from "../../lib/timer.types";
import { TextFragment } from "../../lib/fragments/TextFragment";

interface HeaderRowProps {
  block: StatementBlock;
}

export const HeaderRow: React.FC<HeaderRowProps> = ({ block }) => {
  const fragment = block.fragments.find(f => f.type === 'text') as TextFragment;
  return (
    <div className="w-full px-6 py-3 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {fragment?.text}
        </h1>
      </div>
    </div>
  );
};
