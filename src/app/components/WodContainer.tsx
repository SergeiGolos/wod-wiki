"use client";
import React, { useState, useEffect } from "react";
import {
  PlayIcon,
  TableCellsIcon,
  ArrowPathIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { ButtonRibbon, ButtonConfig } from "./ButtonRibbon";
import { WodWiki } from "./editor/WodWiki";
import { TimerRuntime } from "../../lib/timer.runtime";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { WodRuntimeScript } from "../../lib/md-timer";
import { WodCompiler } from "../../lib/timer.compiler";
import { editor } from "monaco-editor";
import { WodTimer } from "./timer/WodTimer";
import { WodTable } from "./runtime/WodTable";
import { WodResults } from "./runtime/WodResults";
import { TimerFromSeconds } from "@/lib/fragments/TimerFromSeconds";

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
    
  function valueChangedHandler(editor: editor.IStandaloneCodeEditor, event: editor.IModelContentChangedEvent, classObject?: WodRuntimeScript | undefined): void {    
    const compiledBlocks = WodCompiler.compileCode(classObject);       
    setBlocks(compiledBlocks);
    setTimerBlock([undefined, -1]);
  }
  const emptyTimer = ["", ""] as [string, string];
  function handleTimerEvent(event: string, data?: any): [string, string] {        
    const [block, index] = blocks.current;    
    if (!block) return emptyTimer;

    const events = blocks.events.filter((e) => e.blockId === block.id);        
    const elapsed = block.durationHandler!.elapsed(new Date(), block, events);
    const time = new TimerFromSeconds(elapsed.elapsed);

    if (elapsed.remaining! <= 0) {
      blocks.push('complete');
      const nextBlock = blocks.goToNext();
      if  (nextBlock) {
        blocks.push('start');
      }
      setTimerBlock(nextBlock);
      return emptyTimer;
    }

    return time.toClock();

    
    // switch (event) {
    //   case 'started':
    //     blocks.push('start');
    //     break;
    //   case 'lap':
    //     blocks.push('lap');
    //     break;
    //   case 'stop':
    //     blocks.push('stop');
    //     break;
    //   case 'completed':
    //     blocks.push('completed');
    //     break;
    // }
    // const onBlockEvent = (event: string, block: RuntimeBlock, index: number) => {
    //   if (event === 'completed') {
    //     const nextBlock = blocks.goToNext();
    //     setTimerBlock(nextBlock);
    //   }    
    
    // //throw new Error("Function not implemented.");
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
      <WodWiki code={code} onCursorMoved={cursorMovedHandler} onValueChange={valueChangedHandler} />                    
      {blocks.events && blocks.events.length > -1 && (<div className="mb-4">
        <WodResults  runtime={blocks} results={blocks?.events} />
      </div>)}
      { blocks && (<div className="">
      <WodTable runtime={blocks} />
      </div>   )}        
    </div>
  );
};
