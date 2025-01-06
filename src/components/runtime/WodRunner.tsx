import React, { useState } from "react";
import { Block, CurrentBlock } from "./WodRows";
import { Timestamp } from "../../lib/Timestamp";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { EmptyWod } from "../rows/EmptyWod";
import { WodTimer } from "../timer/WodTimer";
import { WodControl } from "./WodControl";
import { TimerRuntime } from "../../lib/timer.runtime";
import { LapTimes } from "../timer/LapTimes";

export interface WodRunnerProps {
  blocks: TimerRuntime;
  onStateChange: (state: string) => void;
}

export const WodRuntimeState = {
  builder: "builder",
  runner: "runner",
  review: "review",
};

export const WodRunner: React.FC<WodRunnerProps> = ({
  blocks,
  onStateChange,
}) => {
  let state = "";

  const [currentBlock, setCurrentBlock] = useState<RuntimeBlock>();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTimestamp, setCurrentTimestamp] = useState<Timestamp[]>();
  const [runtimeState, setRuntimeState] = useState<string>(WodRuntimeState.builder);

  const handleTimerEvent = (event: string, block?: RuntimeBlock) => {
    const current = (block ||currentBlock);
    const actions = current?.runtimeHandler?.onTimerEvent(new Date(), event, current);
    if (!actions || actions.length === 0) {
      return;
    }
    let nextBlock: [RuntimeBlock | undefined, number] = [undefined, -1];  
    for (let action of actions) {      
       nextBlock = action.apply(blocks);
    }
      
    if (event === "completed" && nextBlock[1] === -1) {
      setCurrentIndex(-1);
      setRuntimeState(WodRuntimeState.review);
      onStateChange(WodRuntimeState.review);
    }
    
    if (currentIndex !== nextBlock[1]) {
      setCurrentBlock(nextBlock[0]);
      setCurrentIndex(nextBlock[1]);
    }

    setCurrentTimestamp([...(nextBlock[0]?.timestamps || [])]);
  };

  function startTimer(): void {
    const block = blocks.start();

    setCurrentIndex(block[1]);
    setCurrentBlock(block[0]);
        
    handleTimerEvent("started", block[0]);
    setRuntimeState(WodRuntimeState.runner);
    onStateChange(WodRuntimeState.runner);
  }

  function resetTimer(): void {
    handleTimerEvent("stop");
    blocks.reset();

    setCurrentIndex(-1);
    setCurrentBlock(undefined);

    setRuntimeState(WodRuntimeState.builder);
    onStateChange(WodRuntimeState.builder);
  }

  return (
    <div className="relative">
      {
        <WodControl
          onStart={startTimer}
          onReset={resetTimer}
          runtimeState={runtimeState as keyof typeof WodRuntimeState}
        />
      }
      <div className="space-y-4">
        {(!blocks || blocks.blocks.length === 0) && <EmptyWod />}
        <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
          <div className="min-w-full">
            <div className="bg-white">
              {blocks.blocks.map((block, index) =>
                currentIndex !== index ? (<>
                  <Block block={block} key={block.id} />
                  {block.timestamps && (
                    <LapTimes timestamps={block.timestamps} block={block} lookup={blocks.get} />
                 )}
                </>) : (
                  <>
                    <CurrentBlock block={block} key={block.id} />
                    {currentTimestamp && (
                      <LapTimes timestamps={currentTimestamp} block={block} lookup={blocks.get} />
                    )}
                    <WodTimer
                      key={block.id + "-timer"}
                      block={currentBlock}
                      onTimerEvent={handleTimerEvent}
                    />
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
