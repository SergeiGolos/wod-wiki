import React, { useState, useEffect } from "react";
import { Block } from "./WodRows";
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
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [currentTimestamps, setCurrentTimestamps] = useState<Timestamp[]>([]);
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
          setCurrentDuration(blocks[index]!.duration);
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
        setCurrentDuration(blocks[index]!.duration);
        break;
      case "lap":
        blocks[index]!.timestamps.push({
          type: "lap",
          time: now,
        });
        break;        
    }
    setCurrentTimestamps(index > -1 && index < blocks.length ? blocks[index]!.timestamps : []);
  };

  const hasBlocks = blocks.length > 0;

  function startTimer(): void {
    handleTimerEvent("started");
  }

  function resetTimer(): void {
    handleTimerEvent("stopped");
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
                      <Block block={block} key={block.id} />
                      <WodTimer
                        key={block.id + "-timer"}
                        duration={currentDuration}
                        timestamps={currentTimestamps}
                        onTimerEvent={handleTimerEvent}
                      />
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
