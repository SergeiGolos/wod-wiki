import { StatementFragment } from "./StatementFragment";
import { StatementBlock, IRuntimeHandler } from "./timer.types";
import { Timestamp } from "./Timestamp";


export interface RuntimeBlock {
  lap: number;
  id: number;
  block: StatementBlock;
  depth: number;  

  runtimeHandler: IRuntimeHandler;
  getFragment<T extends StatementFragment>(type: string, block?: StatementBlock): T[];
  timestamps: Timestamp[];

  getParts: (filter?: string[]) => string[];
}
