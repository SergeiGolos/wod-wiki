"use client";
import React, { useState, useRef } from "react";
import { WodWiki } from "./editor/WodWiki";
import { WodRunner, WodRuntimeState } from "./runtime/WodRunner";
import * as monaco from "monaco-editor";
import {
  PencilSquareIcon,
  PlayIcon,
  TableCellsIcon,
  ArrowPathIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { TimerRuntime } from "../../lib/timer.runtime";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { WodRuntimeScript } from "../../lib/md-timer";
import { WodCompiler } from "../../lib/timer.compiler";

interface WodContainerProps {
  code: string;
}

export class SyntaxMarker {
  private _markers: monaco.IDisposable[] = [];

  constructor(private lineNumber: number, private message: string) {}

  public markLine(editor: monaco.editor.IStandaloneCodeEditor) {
    this._markers.push(      
      // monaco.editor.createDecorations(
      //   editor,
      //   [
      //     {
      //       range: new monaco.Range(this.lineNumber, 1, this.lineNumber, 1),
      //       options: {
      //         isWholeLine: true,
      //         className: "myContentClass",
      //         hoverMessage: { value: this.message },
      //       },
      //     },
      //   ]
      // )
    );
  }

  public dispose() {
    for (const marker of this._markers) {
      marker.dispose();
    }
  }
}

export const WodContainer: React.FC<WodContainerProps> = ({ code = "" }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [blocks, setBlocks] = useState<TimerRuntime>(new TimerRuntime([]));
  const [timerBlock, setTimerBlock] =
    useState<[RuntimeBlock | undefined, number]>();

  const handleEditorCompile = (
    value: WodRuntimeScript | undefined,
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    if (value) {
      const compiledBlocks = WodCompiler.compileCode(value);
      setBlocks(compiledBlocks);

      // editor.
    }
  };

  const handleBlockEvent = (
    event: any,
    block: RuntimeBlock | undefined,
    index: number
  ) => {
    // setTimerBlock(block);
  };

  const handleSelectedIndexChange = (index: number) => {
    if (index === 0) {
      setTimerBlock(blocks.reset());
    }
    if (index === 1) { // Running
      if (selectedIndex == 0) {
        setTimerBlock(blocks.start());
      }
    }
    if (index === 2) { // Paused
      // setTimerBlock(blocks.pause());
    }
    if (index === 3) { // Complete
      setTimerBlock(blocks.complete());
    }
    setSelectedIndex(index);
  };

  return (
    <>
      <div className="flex justify-end space-x-2 p-2">
        {selectedIndex !== 1 && selectedIndex !== 2 && (
          <button
            onClick={() => handleSelectedIndexChange(0)}
            className={`flex items-center px-4 py-2 rounded-full transition-all ${
              selectedIndex === 0
                ? "bg-blue-600 text-white shadow-lg transform scale-105"
                : "bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
            }`}
          >
            <span className="mr-2">Editor</span>
            <PencilSquareIcon className="w-5 h-5" />
          </button>
        )}

        {(selectedIndex === 1 || selectedIndex === 2) && (
          <button
            onClick={() => handleSelectedIndexChange(0)}
            className="flex items-center px-4 py-2 rounded-full transition-all bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        )}

        {selectedIndex === 2 && ( // Show Run button in Paused state
          <button
            onClick={() => handleSelectedIndexChange(1)}
            className="flex items-center px-4 py-2 rounded-full transition-all bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
          >
            <span className="mr-2">Run</span>
            <PlayIcon className="w-5 h-5" />
          </button>
        )}

        {selectedIndex === 0 && ( // Show initial Run button
          <button
            onClick={() => handleSelectedIndexChange(1)}
            className="flex items-center px-4 py-2 rounded-full transition-all bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
          >
            <span className="mr-2">Run</span>
            <PlayIcon className="w-5 h-5" />
          </button>
        )}

        {selectedIndex === 1 && ( // Show Pause button in Running state
          <button
            onClick={() => handleSelectedIndexChange(2)}
            className="flex items-center px-4 py-2 rounded-full transition-all bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
          >
            <span className="mr-2">Pause</span>
            <StopIcon className="w-5 h-5" />
          </button>
        )}

        {(selectedIndex !== 0) && ( // Show Complete button during run/pause
          <button
            onClick={() => handleSelectedIndexChange(3)}
            className="flex items-center px-4 py-2 rounded-full transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg"
          >
            <span className="mr-2">Complete</span>
            <TableCellsIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      {selectedIndex === 0 && (
      <div className="mt-2">
        <WodWiki code={code} onValueChange={handleEditorCompile} />
      </div>)}
      {(selectedIndex !== 3) && (
        <div className="mt-2">
        <WodRunner
          blocks={blocks}
          currentBlock={timerBlock}
          onBlockEvent={handleBlockEvent}
        />
      </div>)}
      {selectedIndex !== 0 && (<div className="mt-2">        
        <h2>Leaderboard</h2>
        
      </div>)}
    </>
  );
};
