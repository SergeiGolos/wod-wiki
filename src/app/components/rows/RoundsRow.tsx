import React from "react";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { RoundsFragment } from "../../lib/fragments/RoundsFragment";
import { StatementFragment } from "../../lib/StatementFragment";


interface RoundsRowProps {
  block: RuntimeBlock;
}

export const RoundsRow: React.FC<RoundsRowProps> = ({ 
  block 
}) => {
    const parts = block.getParts(['rounds']);
    const roundsFragment = block.block?.fragments.find((fragment: StatementFragment) => fragment.type === 'rounds') as RoundsFragment;
    
  return (
    <div className="w-full flex px-6 py-1" style={{ paddingLeft: `${block.depth * 20 + 24}px` }}>
      <div className="flex-1 flex justify-between items-center">
        <div>
          {parts.length > 0 && (
            <div className="flex gap-2 items-center text-gray-700 font-mono">
              {parts.map((part, index) => (
                <React.Fragment key={index}>
                  <span>{part}</span>
                  {index < parts.length - 1 && <span className="text-gray-400">•</span>}
                </React.Fragment>
              ))}
            </div>
          )}
      </div>
      <div className={`px-3 py-1 rounded-full text-sm font-medium`}>
        {block.lap}/{roundsFragment.count}
      </div>
    </div>
    </div>
  );
};
