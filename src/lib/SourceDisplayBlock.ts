import { StatementBlock } from "./StatementBlock";
import { IDurationHandler } from "./IDurationHandler";
import { IRuntimeHandler } from "./IRuntimeHandler";
import { RuntimeBlock } from "./RuntimeBlock";
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
