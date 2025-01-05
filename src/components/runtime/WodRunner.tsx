import React, { useState, useEffect } from "react";
import { Block, CurrentBlock } from "./WodRows";
import { RuntimeBlock, Timestamp } from "../../lib/timer.types";
import { EmptyWod } from "../rows/EmptyWod";
import { WodTimer } from "../timer/WodTimer";
import { WodControl } from "./WodControl";
import { TimerSequencer } from "../../lib/timer.runtime";
import { LapTimes } from "../timer/LapTimes";

export interface WodRunnerProps {
  blocks: RuntimeBlock[];
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
  useEffect(() => {
    setSequence(new TimerSequencer(blocks));
  }, [blocks]);

  const [sequence, setSequence] = useState<TimerSequencer>(
    new TimerSequencer(blocks)
  );
  const [currentBlock, setCurrentBlock] = useState<RuntimeBlock>();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTimestamp, setCurrentTimestamp] = useState<Timestamp[]>();
  const [runtimeState, setRuntimeState] = useState<string>(WodRuntimeState.builder);

  const handleTimerEvent = (event: string) => {
    const nextBlock = sequence.handleTimerEvent(
      event as "completed" | "stop" | "started" | "lap"
    );

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
    const block = sequence.start();

    setCurrentIndex(block[1]);
    setCurrentBlock(block[0]);

    handleTimerEvent("started");
    setRuntimeState(WodRuntimeState.runner);
    onStateChange(WodRuntimeState.runner);
  }

  function resetTimer(): void {
    handleTimerEvent("stop");
    sequence.reset();

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
        {(!blocks || blocks.length === 0) && <EmptyWod />}
        <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
          <div className="min-w-full divide-y divide-gray-200">
            <div className="bg-white divide-y divide-gray-200">
              {blocks.map((block, index) =>
                currentIndex !== index ? (<>
                  <Block block={block} key={block.id} />
                  {block.timestamps && (
                    <LapTimes timestamps={block.timestamps} />
                 )}
                </>) : (
                  <>
                    <CurrentBlock block={block} key={block.id} />
                    {currentTimestamp && (
                      <LapTimes timestamps={currentTimestamp} />
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
