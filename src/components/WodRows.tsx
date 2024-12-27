import React from 'react';
import { WodTimer } from './WodTimer';

interface WodBlock {
  level?: string;
  text?: string;
  duration?: number;
  effort?: string;
  rounds?: {
    count: number;
    labels: string[];
  };
  resistance?: {
    units: string;
    value: string;
  };
  reps?: number;
  meta: {
    line: number;
    startOffset: number;
    endOffset: number;
    columnStart: number;
    columnEnd: number;
    length: number;
  };
  blocks: WodBlock[];
  type?: string;
}

interface BlockProps {
  block: WodBlock;
  depth?: number;
  nextBlock?: WodBlock;
  rowIndex: number;
  current?: number;
  onRowRendered: () => number;
}

const Block: React.FC<BlockProps> = ({ 
  block, 
  depth = 0, 
  nextBlock, 
  current,
  onRowRendered 
}) => {
  const getNextBlockDepth = (block: WodBlock): number => {
    if (block.blocks && block.blocks.length > 0) {
      return depth + 1; // Next visible block would be a child
    }
    return nextBlock ? depth : depth - 1; // If no children, use next sibling's depth or assume we're returning to parent
  };

  const nextDepth = getNextBlockDepth(block);

  // Render the content of a block
  const renderContent = () => {
    const currentRowIndex = onRowRendered();

    if (block.type === 'notification') {
      return (
        <tr>
          <td colSpan={2} className="text-center p-8 bg-gray-50">
            <p className="text-gray-500">Parsing workout...</p>
          </td>
        </tr>
      );
    }

    if (block.level === '#' || block.type === 'header') {
      return (
        <tr>
          <td colSpan={2} className="px-6 py-3 border-b border-gray-200">
            <h1 className="text-2xl font-bold mb-4">
              {block.text}
            </h1>
          </td>
        </tr>
      );
    }

    if (block.type === 'paragraph') {
      return (
        <tr>
          <td colSpan={2} className="px-6 py-2 text-gray-600" style={{ paddingLeft: `${depth * 20 + 24}px` }}>
            <p className="text-base leading-relaxed">{block.text}</p>
          </td>
        </tr>
      );
    }

    const parts: string[] = [];
    
    if (block.duration) {
      parts.push(`${Math.abs(block.duration)}s`);
    }
    
    if (block.rounds) {
      parts.push(`${block.rounds.count}x`);
    }
    
    if (block.reps) {
      parts.push(`${block.reps} reps`);
    }
    
    if (block.resistance) {
      parts.push(`${block.resistance.value}${block.resistance.units}`);
    }
    
    if (block.effort) {
      parts.push(block.effort);
    }

    return (
      <>
        <tr>
          <td 
            className="px-6 py-2 whitespace-nowrap"
            style={{ paddingLeft: `${depth * 20 + 24}px` }}
          >
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
          </td>
          <td className="px-6 py-2 text-gray-900">
            {block.text}
          </td>
        </tr>
        {currentRowIndex === current && (
          <tr>
            <td colSpan={2} className="px-6 py-2">
              <WodTimer                 
                status="idle"
                onStart={() => {}}
                onPause={() => {}}
                onReset={() => {}}
              />
            </td>
          </tr>
        )}
      </>
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
            onRowRendered={onRowRendered} rowIndex={0}          />
        ))
      )}
    </>
  );
};

export const WodRows: React.FC<{ data?: WodBlock[], current?: number }> = ({ data = [], current }) => {
  let rowCounter = 0;
  const getNextRowIndex = () => rowCounter++;

  if (!data || data.length === 0) {
    return (
      <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td colSpan={2} className="text-center p-8">
                <p className="text-gray-500">Type your workout to see it parsed here...</p>
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
              onRowRendered={getNextRowIndex} rowIndex={0}            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
