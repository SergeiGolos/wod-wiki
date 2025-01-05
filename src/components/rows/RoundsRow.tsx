import React from "react";
import { RuntimeBlock, RoundsFragment, StatementFragment } from "../../lib/timer.types";


interface RoundsRowProps {
  block: RuntimeBlock;
}

export const RoundsRow: React.FC<RoundsRowProps> = ({ 
  block 
}) => {
    const parts = block.getParts(['rounds']);
    const roundsFragment = block.block?.fragments.find((fragment: StatementFragment) => fragment.type === 'rounds') as RoundsFragment;
    const getBadgeColor = () => {
      if (block.round && block.round === roundsFragment.count) {
        return "bg-green-100 text-green-800";
      } else {
        return "bg-yellow-100 text-green-800";
      }
    };
  return (
    <div className="w-full flex px-6 py-2" style={{ paddingLeft: `${block.depth * 20 + 24}px` }}>
      <div className="flex-1 flex justify-between items-center">
        <div>
          {parts.length > 0 && (
            <div className="flex gap-2 items-center text-gray-700 font-mono mb-1">
              {parts.map((part, index) => (
                <React.Fragment key={index}>
                  <span>{part}</span>
                  {index < parts.length - 1 && <span className="text-gray-400">•</span>}
                </React.Fragment>
              ))}
            </div>
          )}
      </div>
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor()}`}>
        {block.round || 0}/{roundsFragment.count}
      </div>
    </div>
    </div>
  );
};
