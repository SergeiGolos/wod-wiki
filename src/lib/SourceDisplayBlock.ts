import { StatementBlock } from "./StatementBlock";
import { IDurationHandler } from "./IDurationHandler";
import { NextStatementAction, RefreshStatementAction } from "./NextStatementAction";
import { IRuntimeHandler } from "./IRuntimeHandler";
import { IRuntimeAction } from "./IRuntimeAction";
import { Timestamp } from "./Timestamp";
import { RuntimeBlock } from "./RuntimeBlock";
import { RoundsFragment } from "./fragments/RoundsFragment";
import { StatementFragment } from "./StatementFragment";
import { NextChildAction } from "./NextChildAction";

export class StopwatchRuntimeHandler implements IRuntimeHandler {
  constructor() {
  }
  type: string = "statement";
  onTimerEvent(timestamp: Date, event: string, block?: RuntimeBlock): IRuntimeAction[] {
    if (!block) {
      throw new Error("Method not implemented.");
    }
    switch (event) {
      case "started":
        block.timestamps.push({ time: timestamp, type: "start" });
        return [new RefreshStatementAction(block.id)];
      case "lap":
        block.timestamps.push({ time: timestamp, type: "lap" });        
      case "completed":
        block.timestamps.push({ time: timestamp, type: "stop" });
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
  onTimerEvent(timestamp: Date, event: string, block?: RuntimeBlock): IRuntimeAction[] {
    if (!block) {
      throw new Error("Method not implemented.");
    }

    switch (event) {
      case "lap":     
        block.timestamps.push({ time: timestamp, type: "lap" });
        return [new NextChildAction(block.id)];

      case "completed":     
        block.timestamps.push({ time: timestamp, type: "stop" });
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
  onTimerEvent(timestamp: Date, event: string, block?: RuntimeBlock): IRuntimeAction[] {
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
    this.timestamps = [];          
    this.durationHandler = durationHandler;
    this.runtimeHandler = runtimeHandler;
    this.round = this.getFragment<RoundsFragment>("rounds", block)[0]?.count || 0;  
  }

  id: number;
  
  timestamps: Timestamp[];
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
