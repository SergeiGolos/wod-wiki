import { TimerFragment } from "./fragments/TimerFragment";
import { IRuntimeHandler, StatementBlock } from "./timer.types";
import { Timestamp } from "./Timestamp";
import { RuntimeBlock } from "./RuntimeBlock";
import { IncrementFragment } from "./fragments/IncrementFragment";
import { RoundsFragment } from "./fragments/RoundsFragment";
import { StatementFragment } from "./StatementFragment";

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
  onTick(timestamp: Date, block: RuntimeBlock): void {
    throw new Error("Method not implemented.");
  }
  onStart(timestamp: Date, block: RuntimeBlock): void {
    throw new Error("Method not implemented.");
  }
  onStop(timestamp: Date, block: RuntimeBlock): void {
    throw new Error("Method not implemented.");
  }
  onLap(timestamp: Date, block: RuntimeBlock): void {
    throw new Error("Method not implemented.");
  }
}

export class SkippedRuntimeHandler implements IRuntimeHandler {
  increment: number;
  duration: number;
  rounds: number;

  constructor(increment: number, duration: number, rounds: number) {
    this.increment = increment;
    this.duration = duration;
    this.rounds = rounds;
  }
  type: string= "statement";
  onTick(timestamp: Date, block: RuntimeBlock): void {
    throw new Error("Method not implemented.");
  }
  onStart(timestamp: Date, block: RuntimeBlock): void {
    throw new Error("Method not implemented.");
  }
  onStop(timestamp: Date, block: RuntimeBlock): void {
    throw new Error("Method not implemented.");
  }
  onLap(timestamp: Date, block: RuntimeBlock): void {
    throw new Error("Method not implemented.");
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
    internal: StatementBlock,
    runtimeHandler: IRuntimeHandler
  ) {    
    this.id = internal.id;
    this.depth = internal.parents?.length || 0;
    this.block = internal;
    this.runtimeHandler = runtimeHandler;        
    this.timestamps = [];          
    this.round = this.getFragment<RoundsFragment>("rounds", internal)[0]?.count || 0;  
  }
  
  runtimeHandler: IRuntimeHandler;
  timestamps: Timestamp[];
  parent?: StatementBlock | undefined;
  id: number;
  depth: number;
  block: StatementBlock;
  round: number;
  lap: number = 0;

  startRound() {
    this.round += 1;

    //if this.parents?.length > 0 {
    //  foreach
  }

  getDuration(): TimerFragment[] | undefined {
    return this.getFragment<TimerFragment>("duration");
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
