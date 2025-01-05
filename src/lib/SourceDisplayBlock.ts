import { TimerFragment } from "./fragments/TimerFragment";
import { IRuntimeHandler, StatementBlock } from "./timer.types";
import { Timestamp } from "./Timestamp";
import { RuntimeBlock } from "./RuntimeBlock";
import { IncrementFragment } from "./fragments/IncrementFragment";
import { RoundsFragment } from "./fragments/RoundsFragment";
import { StatementFragment } from "./StatementFragment";

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
    runtimeHandler: IRuntimeHandler,
    public lookup: (id: number) => StatementBlock
  ) {
    const increments = this.getFragment<IncrementFragment>("increment", internal);
    this.id = internal.id;
    this.depth = internal.parents?.length || 0;
    this.block = internal;
    this.runtimeHandler = runtimeHandler;
    this.increment = increments.length > 0 ? increments[0]?.increment || -1 : -1;
    this.round = this.getFragment<RoundsFragment>("rounds", internal)[0]?.count || 0;
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
  type: string = "block";
  runtimeHandler: IRuntimeHandler;
  timestamps: Timestamp[];
  duration: number;
  increment: number;
  parent?: StatementBlock | undefined;
  id: number;
  depth: number;
  block: StatementBlock;
  round: number;
  laps: number = 0;
  status?: string | undefined;

  startRound() {
    this.round += 1;

    //if this.parents?.length > 0 {
    //  foreach
  }
  getIncrement(): IncrementFragment[] | undefined {
    return this.getFragment<IncrementFragment>("increment");
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

  isRunnable(): boolean {
    return this.duration !== undefined && this.duration >= 0;
  }
}
