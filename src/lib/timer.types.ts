import { TimerFragment } from "./fragments/TimerFragment";

export interface SourceCodeMetadata {
  line: number;
  startOffset: number;
  endOffset: number;
  columnStart: number;
  columnEnd: number;
  length: number;
}

export class SourceDisplayBlock implements DisplayBlock {
  constructor(
    internal: StatementBlock,
    public lookup: (id: number) => StatementBlock
  ) {
    const increments = this.getFragment<IncrementFragment>("increment", internal);
    this.id = internal.id;
    this.depth = internal.parents?.length || 0;
    this.block = internal;    
    this.increment = increments.length > 0 ? increments[0]?.increment || -1 : -1;
    this.round = 0;
    this.timestamps = [];
    this.duration = 0;
    if (internal.children?.length == 0) {
      const blockChain = [internal.id, ...(internal?.parents || [])];
      let inheritedDuration = 0;

      for (const id of blockChain) {
        const currentBlock = lookup(id);
        const fragment = currentBlock?.fragments?.find(
          (f) => f.type === "duration"
        ) as TimerFragment;
        if (Math.abs(fragment?.duration || 0) > 0) {
          inheritedDuration = fragment?.duration || 0;
          break;
        }
      }
      this.duration = inheritedDuration;
    }
  }

  timestamps: Timestamp[];
  duration: number;
  increment: number;
  parent?: StatementBlock | undefined;
  id: number;
  depth: number;
  block: StatementBlock;
  round: number;
  status?: string | undefined;

  startRound() {
    this.round += 1;
    
    //if this.parents?.length > 0 {
    //  foreach
  }
  getIncrement() :IncrementFragment[] | undefined {
    return this.getFragment<IncrementFragment>("increment");
  }

  getDuration() :TimerFragment[] | undefined {
    return this.getFragment<TimerFragment>("duration");
  }

  getFragment<T extends StatementFragment>(type: string, block?: StatementBlock) :  T[] {
    return (block || this.block)?.fragments?.filter((fragment: StatementFragment) =>
        fragment.type === type
    ) as T[];
  }

  getParts(filter: string[] = []) {
    return this.block?.fragments
      .filter(
        (fragment: StatementFragment) =>
          fragment.toPart !== undefined && !filter.includes(fragment.type)
      )
      .map((fragment: StatementFragment) => {
        return fragment.toPart();
      });
  }

  isRunnable(): boolean {
    return this.duration !== undefined && this.duration >= 0;
  }
}

export interface DisplayBlock {
  id: number;  
  block: StatementBlock;
  
  status?: string;  
  increment: number;
  duration: number;
  timestamps: Timestamp[];
  depth: number;    
  
  round: number;  
  
  startRound : () => void;

  getFragment<T extends StatementFragment>(type: string, block?: StatementBlock) :  T[]
  getParts: (filter?: string[]) => string[];
  isRunnable: () => boolean;
} 

export interface StatementFragment {
  type: string;
  meta?: SourceCodeMetadata;
  toPart: () => string;
}

export class RoundsFragment implements StatementFragment {
  constructor(public count: number, public meta?: SourceCodeMetadata) {}
  type: string = "rounds";
  toPart: () => string = () => `${this.count}x`;
}

export class ResistanceFragment implements StatementFragment {
  constructor(public value: string, public units: string, public meta?: SourceCodeMetadata) {}
  type: string = "resistance";
  toPart: () => string = () => `${this.value}${this.units}`;
}

export class EffortFragment implements StatementFragment {
  constructor(public effort: string, public meta?: SourceCodeMetadata) {}
  type: string = "effort";
  toPart: () => string = () => this.effort;
}

export class RepFragment implements StatementFragment {
  constructor(public reps?: number, public meta?: SourceCodeMetadata) {}
  type: string = "rep";
  toPart: () => string = () => this.reps ? `x${this.reps}` : "";
}

export class TextFragment implements StatementFragment {
  constructor(public text: string, public level?: string, public meta?: SourceCodeMetadata) {}
  type: string = "text";
  toPart: () => string = () => this.text;
}

export class IncrementFragment implements StatementFragment {  
  constructor(public image: string, public meta?: SourceCodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
  }  
  type: string = "increment";
  increment: number;
  toPart: () => string = () => this.increment == 1 ? "⬆️" : "⬇️";
}

export interface StatementBlock {
  id: number;
  parents: number[];
  children: number[];  
  meta: SourceCodeMetadata;
  fragments: StatementFragment[];
}

export class Timespan {  
  start?: Timestamp;
  stop?: Timestamp;
  label?: string;
  duration(): number {
    let now = new Date();
    return ((this.stop?.time ?? now).getTime() || 0) - (this.start?.time.getTime() || 0);
  }
}

export interface Timestamp {
  type: string;
  time: Date;
  label?: string;
}
