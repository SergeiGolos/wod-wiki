import React from "react";
import { WodBlock } from "../lib/timer.types";
import { WodRowClassifier } from "../lib/WodRowClassifier";
import { NotificationRow } from "./rows/NotificationRow";
import { HeaderRow } from "./rows/HeaderRow";
import { ParagraphRow } from "./rows/ParagraphRow";
import { ExerciseRow } from "./rows/ExerciseRow";
import { WodTimer } from './WodTimer';

interface BlockProps {
  block: WodBlock;
  depth?: number;
  nextBlock?: WodBlock;
  rowIndex: number;
  current?: number;
  timestamps: any[];
  onRowRendered: () => number;
}

const Block: React.FC<BlockProps> = ({ 
  block, 
  depth = 0, 
  nextBlock, 
  current,
  timestamps,
  onRowRendered 
}) => {
  const getNextBlockDepth = (block: WodBlock): number => {
    if (block.blocks && block.blocks.length > 0) {
      return depth + 1;
    }
    return nextBlock ? depth : depth - 1;
  };

  const nextDepth = getNextBlockDepth(block);
  const currentRowIndex = onRowRendered();

  // Render the appropriate row component based on block type
  const renderContent = () => {
    if (WodRowClassifier.isNotification(block)) {
      return <NotificationRow block={block} />;
    }

    if (WodRowClassifier.isHeader(block)) {
      return <HeaderRow block={block} />;
    }

    if (WodRowClassifier.isParagraph(block)) {
      return <ParagraphRow block={block} depth={depth} />;
    }

    return (
      <ExerciseRow 
        block={block} 
        depth={depth} 
        current={current} 
        currentRowIndex={currentRowIndex}
        timestamps={timestamps}
      />
    );
  };

  return (
    <>
      {renderContent()}
      {block.blocks && block.blocks.length > 0 && (
        block.blocks.map((child, index) => (
          <Block
            key={index}
            block={child}
            depth={depth + 1}
            nextBlock={index < block.blocks.length - 1 ? block.blocks[index + 1] : undefined}
            current={current}
            timestamps={timestamps}
            onRowRendered={onRowRendered}
            rowIndex={0}
          />
        ))
      )}
      {currentRowIndex === current && (
        <tr>
          <td colSpan={2} className="px-6 py-2">
            <WodTimer                                 
              onTimerUpdate={() => { } }
              onTimerEvent={() => { } }
              timestamps={timestamps} 
              block={block} />
          </td>
        </tr>
      )}
    </>
  );
};

export const WodRuntime: React.FC<{ 
  data?: WodBlock[];
  current?: number;
  timestamps?: any[];
}> = ({ 
  data = [], 
  current,
  timestamps = []
}) => {
  let rowCounter = 0;
  const getNextRowIndex = () => rowCounter++;

  if (!data || data.length === 0) {
    return (
      <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={2} className="text-center p-8">
                <p className="text-gray-500">No workout data available</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((block, index) => (
            <Block
              key={index}
              block={block}
              nextBlock={index < data.length - 1 ? data[index + 1] : undefined}
              current={current}
              timestamps={timestamps}
              onRowRendered={getNextRowIndex}
              rowIndex={0}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
