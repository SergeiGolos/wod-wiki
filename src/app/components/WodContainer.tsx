"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  PencilSquareIcon,
  PlayIcon,
  TableCellsIcon,
  ArrowPathIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { ButtonRibbon, ButtonConfig } from "./ButtonRibbon";
import { WodWiki } from "./editor/WodWiki";
import { WodRunner, WodRuntimeState } from "./runtime/WodRunner";
import { TimerRuntime } from "../../lib/timer.runtime";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { WodRuntimeScript } from "../../lib/md-timer";
import { WodCompiler } from "../../lib/timer.compiler";
import { editor } from "monaco-editor";
import { WodTimer } from "./timer/WodTimer";
import { WodTable } from "./runtime/WodTable";
import { WodResults } from "./runtime/WodResults";
import { RuntimeResult } from "@/lib/RuntimeResult";

interface WodContainerProps {
  code: string;
}

export const WodContainer: React.FC<WodContainerProps> = ({ code = "" }) => {    
  const [blocks, setBlocks] = useState<TimerRuntime>(new TimerRuntime([]));  
  const [timerBlock, setTimerBlock] = useState<[RuntimeBlock | undefined, number]>();    
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);

  useEffect(() => {    
    console.log('Code:effect');
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
    console.log('Stop:', block[0]?.id, block[1], timerBlock);
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
    console.log('Complete:', block[0]?.id, block[1], timerBlock);
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
    console.log('Reset');
  }

  function cursorMovedHandler(editor: editor.IStandaloneCodeEditor, event: editor.ICursorPositionChangedEvent, classObject?: WodRuntimeScript | undefined): void {
    // throw new Error("Function not implemented.");
    console.log("Cursor moved: ", event);
  }

  
  

  




  // const buttons = useMemo((): ButtonConfig[] => {
  //   if (selectedIndex === 1) {
  //     return [
  //       {
  //         icon: ArrowPathIcon,
  //         onClick: () => setSelectedIndex(0)
  //       },
  //       {
  //         label: "Pause",
  //         icon: StopIcon,
  //         onClick: () => setSelectedIndex(2)
  //       },
  //       {
  //         label: "Complete",
  //         icon: TableCellsIcon,
  //         onClick: () => setSelectedIndex(3),
  //         variant: 'success'
  //       }
  //     ];
  //   }

  //   if (selectedIndex === 2) {
  //     return [
  //       {
  //         icon: ArrowPathIcon,
  //         onClick: () => setSelectedIndex(0)
  //       },
  //       {
  //         label: "Run",
  //         icon: PlayIcon,
  //         onClick: () => setSelectedIndex(1)
  //       },
  //       {
  //         label: "Complete",
  //         icon: TableCellsIcon,
  //         onClick: () => setSelectedIndex(3),
  //         variant: 'success'
  //       }
  //     ];
  //   }

  //   if (selectedIndex === 0) {
  //     return [
  //       {
  //         label: "Editor",
  //         icon: PencilSquareIcon,
  //         onClick: () => setSelectedIndex(0),
  //         isActive: true
  //       },
  //       {
  //         label: "Run",
  //         icon: PlayIcon,
  //         onClick: () => setSelectedIndex(1)
  //       }
  //     ];
  //   }

  //   return [];
  // }, [selectedIndex]);

  function valueChangedHandler(editor: editor.IStandaloneCodeEditor, event: editor.IModelContentChangedEvent, classObject?: WodRuntimeScript | undefined): void {    
    const compiledBlocks = WodCompiler.compileCode(classObject);      
    console.log("Set blocks:", compiledBlocks.blocks.length);
    setBlocks(compiledBlocks);
  }

  function handleTimerEvent(event: string, data?: any): void {
    //throw new Error("Function not implemented.");
  }

  return (
    <div className="border border-gray-200 rounded-lg divide-y">
      <ButtonRibbon buttons={buttons} />
      {timerBlock && timerBlock[1] > -1 && (<WodTimer
        key={(timerBlock?.[0]?.id || -1) + "-timer"}
        block={timerBlock![0]}        
        onTimerEvent={handleTimerEvent} />)}      
      <WodWiki code={code} onCursorMoved={cursorMovedHandler} onValueChange={valueChangedHandler} />                    
      {blocks.events && blocks.events.length > -1 && (<div className="mb-4">
        <WodResults results={blocks?.events} />
      </div>)}
      { blocks && (<div className="">
      <WodTable runtime={blocks} />
      </div>   )}        
    </div>
  );
};
