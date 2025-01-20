import { StatementBlock } from "./StatementBlock";
import { IDurationHandler } from "./IDurationHandler";
import { NextStatementAction, RefreshStatementAction } from "./NextStatementAction";
import { IRuntimeHandler } from "./IRuntimeHandler";
import { IRuntimeAction } from "./IRuntimeAction";
import { RuntimeBlock } from "./RuntimeBlock";
import { RoundsFragment } from "./fragments/RoundsFragment";
import { StatementFragment } from "./StatementFragment";
import { TimerRuntime } from "./timer.runtime";

export class StopwatchRuntimeHandler implements IRuntimeHandler {
  constructor() {
  }
  type: string = "statement";
  onTimerEvent(timestamp: Date, event: string, blocks?: TimerRuntime): IRuntimeAction[] {
    const block = blocks?.current[0];
    if (!block) {
      throw new Error("Method not implemented.");
    }
    switch (event) {
      case "started":
        blocks.push("start");
        return [new RefreshStatementAction(block.id)];
      
      case "lap":
        blocks.push("lap");        
        return [new RefreshStatementAction(block.id)];

      case "stop":
        blocks.push("stop");        
        return [new RefreshStatementAction(block.id)];

      case "completed":        
        return [new NextStatementAction(block.id)];
        
      default:
        return [];
    }    
  }  
}

export class RepeatingRuntimeHandler implements IRuntimeHandler {
  increment: number;
  duration: number;
  rounds: number;

  constructor(increment: number, duration: number, rounds: number) {
    this.increment = increment;
    this.duration = duration;
    this.rounds = rounds;
  }
  type: string= "rounds";
  onTimerEvent(timestamp: Date, event: string, blocks?: TimerRuntime): IRuntimeAction[] {
      const block = blocks?.current[0];
    if (!block) {
      throw new Error("Method not implemented.");
    }

    switch (event) {
      case "lap":     
        blocks.push( "lap");
        return [new NextStatementAction(block.id)];

      case "completed":     
        blocks.push( "stop");
        return [new NextStatementAction(block.id)];        

      default:        
        return [];
    }    
  }  
}

export class SkippedRuntimeHandler implements IRuntimeHandler {
  
  constructor() {
  }
  type: string= "statement";
  onTimerEvent(timestamp: Date, event: string, blocks?: TimerRuntime): IRuntimeAction[] {
      const block = blocks?.current[0];
    return [];
  }  
}

export interface SourceCodeMetadata {
  line: number;
  startOffset: number;
  endOffset: number;
  columnStart: number;
  columnEnd: number;
  length: number;
}

export class SourceDisplayBlock implements RuntimeBlock {  
  constructor(
    public block: StatementBlock,
    runtimeHandler?: IRuntimeHandler,
    durationHandler?: IDurationHandler
  ) {    
    this.id = block.id;
    this.depth = block.parents?.length || 0;      
    this.durationHandler = durationHandler;
    this.runtimeHandler = runtimeHandler;
    this.round = this.getFragment<RoundsFragment>("rounds", block)[0]?.count || 0;  
  }

  id: number;
    
  parent?: StatementBlock | undefined;
  
  durationHandler: IDurationHandler | undefined;
  runtimeHandler: IRuntimeHandler | undefined;

  depth: number;  
  round: number;
  lap: number = 0;

  startRound() {
    this.round += 1;
  }
 
  getDuration() {
    return this.durationHandler?.getDuration(this) || 0;
  }

  getFragment<T extends StatementFragment>(type: string, block?: StatementBlock): T[] {
    return (block || this.block)?.fragments?.filter((fragment: StatementFragment) => fragment.type === type
    ) as T[];
  }

  getParts(filter: string[] = []) {
    return this.block?.fragments
      .filter(
        (fragment: StatementFragment) => fragment.toPart !== undefined && !filter.includes(fragment.type)
      )
      .map((fragment: StatementFragment) => {
        return fragment.toPart();
      });
  }  
}
