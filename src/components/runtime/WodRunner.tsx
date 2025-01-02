import React, { useState, useEffect } from "react";
import { Block, CurrentBlock } from "./WodRows";
import { DisplayBlock } from "../../lib/timer.types";
import { EmptyWod } from "../rows/EmptyWod";
import { WodTimer } from "../timer/WodTimer";
import { WodControl } from "./WodControl";
import { TimerSequencer } from "../../lib/timer.runtime";

export interface WodRunnerProps {
  blocks: DisplayBlock[];
  onStateChange: (state: string) => void;
}

export const WodRunner: React.FC<WodRunnerProps> = ({
  blocks,
  onStateChange,
}) => {
  let state = "";  
  useEffect(() => {
    setSequence(new TimerSequencer(blocks));  
  }, [blocks]);
  
  const [sequence, setSequence] = useState<TimerSequencer>(new TimerSequencer(blocks));
  const [currentBlock, setCurrentBlock] = useState<DisplayBlock>();
  const [currentIndex, setCurrentIndex] = useState(-1);    

  const handleTimerEvent = (event: string) => {
    const nextBlock = sequence.handleTimerEvent(
      event as "completed" | "stop" | "started" | "lap"
    );

    if (currentIndex !== nextBlock[1]) {
      setCurrentBlock(nextBlock[0]);
      setCurrentIndex(nextBlock[1]);
    }    

    if (event !== state)
    {
      onStateChange(event);
      state = event;
    }
  };  

  function startTimer(): void {
    const block = sequence.start();

    setCurrentIndex(block[1]);
    setCurrentBlock(block[0]);   

    handleTimerEvent("started");
    onStateChange("running");    
  }
  
  function resetTimer(): void {
    handleTimerEvent("stop");
    sequence.reset();    

    setCurrentIndex(-1);
    setCurrentBlock(undefined);    

    onStateChange("idle");
  }

  return (
    <div className="relative">
      {
        <WodControl
          onStart={startTimer}
          onReset={resetTimer}
          isRunning={currentIndex !== -1}
        />
      }
      <div className="space-y-4">
        {(!blocks || blocks.length === 0) && <EmptyWod />}        
          <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="bg-white divide-y divide-gray-200">
                {blocks.map((block, index) =>
                  currentIndex !== index ? (
                    <Block block={block} key={block.id} />
                  ) : (
                    <>
                      <CurrentBlock block={block} key={block.id} />
                      <WodTimer
                        key={block.id + "-timer"}
                        block={currentBlock}
                        onTimerEvent={handleTimerEvent}
                      />
                      {block.timestamps.filter((ts) => ts.type === "lap")
                        .length > 0 && (
                        <div
                          key={block.id + "-laps"}
                          className="mt-2 p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="text-sm text-gray-600 mb-2 font-semibold">
                            Lap Times
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {block!.timestamps
                              .filter((ts) => ts.type === "lap")
                              .map((lap, index) => {
                                const startTime = block!.timestamps.find(
                                  (ts) => ts.type === "start"
                                )?.time;
                                const lapTime = lap.time;
                                const timeStr =
                                  startTime && lapTime
                                    ? (() => {
                                        const time =
                                          (lapTime.getTime() -
                                            startTime.getTime()) /
                                          1000;
                                        const minutes = Math.floor(time / 60);
                                        const seconds = Math.floor(time % 60);
                                        return `${minutes}:${seconds
                                          .toString()
                                          .padStart(2, "0")}`;
                                      })()
                                    : "--:--";

                                return (
                                  <div
                                    key={index}
                                    className="bg-white px-3 py-2 rounded shadow-sm"
                                  >
                                    <div className="text-xs text-gray-500">
                                      Lap {index + 1}
                                    </div>
                                    <div className="font-medium">{timeStr}</div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
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
