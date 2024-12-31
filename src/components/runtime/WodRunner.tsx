import React, { useState } from "react";
import { Block } from "./WodRows";
import { DisplayBlock } from "../../lib/timer.types";
import { EmptyWod } from "../rows/EmptyWod";
import { WodTimer } from "../timer/WodTimer";

interface WodRunnerProps {
  blocks: DisplayBlock[];
  current: number;
  showEditor: boolean;
  onCurrentChange?: (current: number) => void;
}

export const WodRunner: React.FC<WodRunnerProps> = ({
  blocks,
  current = -1,  
  onCurrentChange,
}) => {
  const [runnerIndex, setRunnerIndex] = useState<number>(current);

  const handleTimerEvent = (event: string) => {    
    const now = new Date();
    const timestamps = blocks[runnerIndex].timestamps;
    
    switch (event) {
      case 'complete':      
        timestamps[timestamps.length - 1].stop = now;
        const nextBlockIndex = blocks.findIndex(
          (block, idx) => idx > runnerIndex && block.duration !== undefined
        );
        
        if (nextBlockIndex !== -1) {
          blocks[nextBlockIndex].timestamps.push({
            start: now,
            stop: undefined
          });
          setRunnerIndex(nextBlockIndex);
          onCurrentChange?.(nextBlockIndex);
        } else {
          setRunnerIndex(-1);
          onCurrentChange?.(-1);
        }
        break;
      case 'stop':        
        timestamps[timestamps.length - 1].stop = now;
        break;
      case 'started':        
        blocks[runnerIndex].startRound();
        timestamps.push({
          start: now,
          stop: undefined
        });
        break;
      case 'lap':
        timestamps[timestamps.length - 1].stop = now;
        timestamps.push({
          start: now,
          stop: undefined
        });
        break;
    }
  };

  const hasBlocks = blocks.length > 0;

  return (    
      <div className="space-y-4">
        {(!blocks || blocks.length === 0) && <EmptyWod />}            
        {hasBlocks && (
          <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="bg-white divide-y divide-gray-200">
                {blocks.map((block, index) =>
                  runnerIndex !== index 
                  ? <Block block={block} key={block.id} />                  
                  : <WodTimer 
                      key={block.id}
                      block={block}
                      timestamps={block.timestamps}
                      onTimerUpdate={() => {}}
                      onTimerEvent={handleTimerEvent}
                    />
                )}
              </div>
            </div>
          </div>
        )}
      </div>    
  );
};
