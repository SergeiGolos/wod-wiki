"use client";
import React, { useState, useEffect } from "react";
import {
  PlayIcon,
  TableCellsIcon,
  ArrowPathIcon,
  StopIcon,
} from "@heroicons/react/24/outline";

import { WodWiki } from "./WodWiki";
import { TimerRuntime } from "@/lib/timer.runtime";
import { RuntimeBlock } from "@/lib/RuntimeBlock";
import { WodRuntimeScript } from "@/lib/md-timer";
import { WodCompiler } from "@/lib/timer.compiler";
import { editor } from "monaco-editor";
import { WodTimer } from "../timer/WodTimer";
import { WodTable } from "./WodTable";
import { WodResults } from "./WodResults";
import { TimerFromSeconds } from "@/lib/fragments/TimerFromSeconds";
import { StopwatchDurationHandler } from "@/lib/durations/StopwatchDurationHandler";
import { TotalDurationHandler } from "@/lib/durations/TotalDurationHandler";
import { ButtonConfig, ButtonRibbon } from "./ButtonRibbon";

interface WodContainerProps {
  code: string;
}

export const WodContainer: React.FC<WodContainerProps> = ({ code = "" }) => {    
  const [blocks, setBlocks] = useState<TimerRuntime>(new TimerRuntime([]));  
  const [timerBlock, setTimerBlock] = useState<[RuntimeBlock | undefined, number]>();    
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);

  useEffect(() => {        
    setTimerBlock([undefined, -1]);    
    setButtons([        
      {
        label: "Run",
        icon: PlayIcon,
        onClick: () => start()
      }
    ]);
  }, [blocks]);

  function start() {
    const block = timerBlock && timerBlock[1] > -1      
      ? blocks.current
      : blocks.goTo(0);
    
    setTimerBlock(block);    
    setButtons([
      {
        label: "Stop",
        icon: StopIcon,
        onClick: () => stop()
      },
      {
        label: "Complete",
        icon: TableCellsIcon,
        onClick: () => complete()
      }
    ]);
    
    blocks?.push('start');    
  }

  function stop() {
    const block = blocks.current;
    setTimerBlock(block);
    blocks.push('stop');    
    setButtons([
      {
        label: "Run",
        icon: PlayIcon,
        onClick: () => start()
      },
      {
        label: "Complete",
        icon: TableCellsIcon,
        onClick: () => complete()
      }
    ]);
  }

  function complete() {
    blocks.push('complete');
    const block = blocks.complete();    
    setTimerBlock(block);
    setButtons([
      {
        label: "Reset",
        icon: ArrowPathIcon,
        onClick: () => reset()
      }
    ]);    
  }

  function reset() {
    blocks.resest();
    setButtons([
      {
        label: "Start",
        icon: PlayIcon,
        onClick: () => start()
      }
    ]);
  }

  function cursorMovedHandler(editor: editor.IStandaloneCodeEditor, event: editor.ICursorPositionChangedEvent, classObject?: WodRuntimeScript | undefined): void {
    // throw new Error("Function not implemented.");
    console.log("Cursor moved: ", event);
  }
    
  function valueChangedHandler(classObject?: WodRuntimeScript | undefined): void {    
    const compiledBlocks = WodCompiler.compileCode(classObject);       
    setBlocks(compiledBlocks);
    setTimerBlock([undefined, -1]);
  }
  const emptyTimer = ["", ""] as [string, string];
  const totalActive = new StopwatchDurationHandler();
  const totalTimer = new TotalDurationHandler()
  function handleTimerEvent(timestamp: Date): [string, string][] {        
    const [block, index] = blocks.current;    
      
    if (!block) return [emptyTimer, emptyTimer, emptyTimer];
    
    const activeTime = new TimerFromSeconds(totalActive.getTotal(blocks.events, timestamp)?.[0] || 0).toClock();
    const totalTime = new TimerFromSeconds(totalTimer.getTotal(blocks.events, timestamp)?.[0] || 0).toClock();

    const events = blocks.events.filter((e) => e.blockId === block.id);        
    const elapsed = block.durationHandler?.elapsed(timestamp, block, events) 
            || { elapsed: 0, remaining: 0 }; 

    const time = new TimerFromSeconds(elapsed?.elapsed || 0);        
    if (elapsed.remaining! <= 0) {
      const actions = block.runtimeHandler?.onTimerEvent(timestamp, 'completed', blocks);
      let nextBlock = blocks.current;
      
      for (let action of actions || []) {        
        nextBlock = action.apply(blocks);  
      }
      
      setTimerBlock(nextBlock);
      return [emptyTimer, activeTime, totalTime];
    }

    return [time.toClock(), activeTime, totalTime];    
  }

  return (
    <div className="border border-gray-200 rounded-lg divide-y">
      <ButtonRibbon buttons={buttons} />
      {timerBlock && timerBlock[1] > -1 && (<WodTimer
        index={timerBlock[1]}
        key={(timerBlock?.[0]?.id || -1) + "-timer"}
        stack={blocks.blocks}
        totalTime="0:00"
        block={timerBlock![0]}        
        onTimerEvent={handleTimerEvent} />)}      
      <WodWiki code={code} onValueChange={valueChangedHandler} />                    
      {blocks.events && blocks.events.length > -1 && (<div className="mb-4">
        <WodResults runtime={blocks} results={blocks?.events} />
      </div>)}
      { blocks && (<div className="">
      <WodTable runtime={blocks} />
      </div>   )}        
    </div>
  );
};
