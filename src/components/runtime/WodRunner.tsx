import React, { useState, useEffect } from "react";
import { Block, CurrentBlock } from "./WodRows";
import { DisplayBlock, Timestamp } from "../../lib/timer.types";
import { EmptyWod } from "../rows/EmptyWod";
import { WodTimer } from "../timer/WodTimer";
import { WodControl } from "./WodControl";
import { BlockSequencer } from "../../lib/BlockSequencer";

interface WodRunnerProps {
  blocks: DisplayBlock[];
  onStateChange: (state: string) => void;
}

export const WodRunner: React.FC<WodRunnerProps> = ({
  blocks,
  onStateChange,
}) => {
  const [runnerIndex, setRunnerIndex] = useState<number>(-1);
  const [currentBlock, setCurrentBlock] = useState<DisplayBlock>();
  const sequencer = new BlockSequencer(blocks);
  // Keep runnerIndex in sync with current prop
  useEffect(() => {
    setRunnerIndex(-1);
  }, [blocks]);

  const now = new Date();
  const handleTimerEvent = (event: string) => {
    let index = runnerIndex;
    switch (event) {
      case "completed":
        if (blocks[index]!.timestamps.length > 0) {
          blocks[index]!.timestamps.push({ type: "stop", time: now });
        }
        index = sequencer.getNextBlockIndex(index);
        if (index !== -1) {
          blocks[index].timestamps.push({ type: "start", time: now });
          setRunnerIndex(index);
          setCurrentBlock(blocks[index]);
        } else {
          setRunnerIndex(-1);
        }
        break;
      case "stop":
        if (blocks[index]!.timestamps.length > 0) {
          blocks[index]!.timestamps.push({
            type: "stop",
            time: now,
          });
        }
        break;
      case "started":
        if (index === -1 && blocks.length > 0) {
          index= 0;
          setRunnerIndex(index);
        }
        blocks[index]!.startRound();
        blocks[index]!.timestamps.push({
          type: "start",
          time: now,
        });
        setCurrentBlock(blocks[index]);
        break;
      case "lap":
        blocks[index]!.timestamps.push({
          type: "lap",
          time: now,
        });
        break;        
    }    
  };

  const hasBlocks = blocks.length > 0;

  function startTimer(): void {
    handleTimerEvent("started");
  }

  function resetTimer(): void {
    handleTimerEvent("stopped");
    for (let block of blocks) {
      block.timestamps = [];
    }
    setRunnerIndex(-1);
  }

  return (
    <div className="relative">
      {
        <WodControl
          onStart={startTimer}
          onReset={resetTimer}
          isRunning={runnerIndex !== -1}
        />
      }
      <div className="space-y-4">
        {(!blocks || blocks.length === 0) && <EmptyWod />}
        {hasBlocks && (
          <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="bg-white divide-y divide-gray-200">
                {blocks.map((block, index) =>
                  runnerIndex !== index ? (
                    <Block block={block} key={block.id} />
                  ) : (
                    <>
                      <CurrentBlock block={block} key={block.id} />
                      <WodTimer
                        key={block.id + "-timer"}                        
                        block={currentBlock}
                        onTimerEvent={handleTimerEvent}
                      />
                      {block.timestamps.filter(ts => ts.type === "lap").length > 0 && (
                        <div key={block.id + "-laps"} className="mt-2 p-4 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-2 font-semibold">Lap Times</div>
                          <div className="grid grid-cols-4 gap-2">
                            {block!.timestamps
                              .filter(ts => ts.type === "lap")
                              .map((lap, index) => {
                                const startTime = block!.timestamps.find(ts => ts.type === "start")?.time;
                                const lapTime = lap.time;
                                const timeStr = startTime && lapTime
                                  ? (() => {
                                      const time = (lapTime.getTime() - startTime.getTime()) / 1000;
                                      const minutes = Math.floor(time / 60);
                                      const seconds = Math.floor(time % 60);
                                      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                    })()
                                  : "--:--";
                                
                                return (
                                  <div key={index} className="bg-white px-3 py-2 rounded shadow-sm">
                                    <div className="text-xs text-gray-500">Lap {index + 1}</div>
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
        )}
      </div>
    </div>
  );
};
