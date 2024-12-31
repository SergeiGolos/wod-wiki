import React, { useState, useEffect } from "react";
import { Block } from "./WodRows";
import { DisplayBlock } from "../../lib/timer.types";
import { EmptyWod } from "../rows/EmptyWod";
import { WodTimer } from "../timer/WodTimer";

interface WodRunnerProps {
  blocks: DisplayBlock[];
}

export const WodRunner: React.FC<WodRunnerProps> = ({ blocks }) => {
  const [runnerIndex, setRunnerIndex] = useState<number>(-1);

  // Keep runnerIndex in sync with current prop
  useEffect(() => {
    setRunnerIndex(-1);
  }, [blocks]);

  const handleTimerEvent = (event: string) => {
    const now = new Date();
    if (runnerIndex < 0 || runnerIndex >= blocks.length) return;

    const currentBlock = blocks[runnerIndex];
    if (!currentBlock.timestamps) {
      currentBlock.timestamps = [];
    }
    const timestamps = currentBlock.timestamps;

    switch (event) {
      case "complete":
        if (timestamps.length > 0) {
          timestamps.push({ type: "stop", time: now });
        }

        const nextBlockIndex = blocks.findIndex(
          (block, idx) => idx > runnerIndex && block.duration !== undefined
        );

        if (nextBlockIndex !== -1) {
          const nextBlock = blocks[nextBlockIndex];
          if (!nextBlock.timestamps) {
            nextBlock.timestamps = [];
          }
          nextBlock.timestamps.push({ type: "start", time: now });
          setRunnerIndex(nextBlockIndex);
        } else {
          setRunnerIndex(-1);
        }
        break;
      case "stop":
        if (timestamps.length > 0) {
          timestamps.push({
            type: "stop",
            time: now,
          });
        }
        break;
      case "started":
        if (runnerIndex === -1 && blocks.length > 0) {
          setRunnerIndex(0);
          const currentBlock = blocks[0];
          if (!currentBlock.timestamps) {
            currentBlock.timestamps = [];
          }
        }
        currentBlock.startRound?.();
        timestamps.push({
          type: "start",
          time: now,
        });
        break;
      case "lap":
        timestamps.push({
          type: "lap",
          time: now,
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
                runnerIndex !== index ? (
                  <Block block={block} key={block.id} />
                ) : (
                  <WodTimer
                    key={block.id}
                    timestamps={block.timestamps}
                    onTimerEvent={handleTimerEvent}
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
