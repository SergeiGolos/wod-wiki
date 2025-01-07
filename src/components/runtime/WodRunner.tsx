import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Block, CurrentBlock } from "./WodRows";
import { Timestamp } from "../../lib/Timestamp";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { EmptyWod } from "../rows/EmptyWod";
import { WodTimer } from "../timer/WodTimer";
import { TimerRuntime } from "../../lib/timer.runtime";
import { LapTimes } from "../timer/LapTimes";

export interface WodRunnerProps {
  blocks: TimerRuntime;
  currentBlock: [RuntimeBlock | undefined, number] | undefined;
  onBlockEvent: (event: string, block: RuntimeBlock, index: number) => void;
}

export const WodRuntimeState = {
  builder: "builder",
  runner: "runner",
  review: "review",
};

export interface WodRunnerHandle {
  handleTimerEvent: (event: string, block?: RuntimeBlock) => void;
}

export const WodRunner = ({
  blocks,
  currentBlock,
  onBlockEvent,
}: WodRunnerProps) => {
  
  const handleTimerEvent = (event: string, block?: RuntimeBlock) => {
   
    const actions = block?.runtimeHandler?.onTimerEvent(new Date(), event, block);
    console.log('Actions:', actions?.length);
    if (!actions || actions.length === 0) {
      return;
    }

    let nextBlock: [RuntimeBlock | undefined, number] = [undefined, -1];  
    for (let action of actions) {      
       nextBlock = action.apply(blocks);
    }    
    console.log('Next Block:', nextBlock[0]?.id);
    onBlockEvent('completed', nextBlock[0]!, nextBlock[1]);
  
  };

  return (
    <div className="relative">
      <div className="space-y-4">
        {(!blocks || blocks.blocks.length === 0) && <EmptyWod />}
        <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
          <div className="min-w-full">
            <div className="bg-white">
              {blocks.blocks.map((block) => (
                <div key={block.id}>
                  {block.id === currentBlock?.[0]?.id ? (
                    <WodTimer
                      key={block.id + "-timer"}
                      block={block}
                      onTimerEvent={handleTimerEvent}
                    />
                  ) : (
                    <Block block={block} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
