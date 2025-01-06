import { StatementFragment } from "./StatementFragment";
import { StatementBlock } from "./StatementBlock";
import { IDurationHandler } from "./IDurationHandler";
import { IRuntimeHandler } from "./IRuntimeHandler";
import { Timestamp } from "./Timestamp";


export interface RuntimeBlock {  
  id: number;  
  depth: number; 
  lap: number;
  block: StatementBlock;
 
  durationHandler?: IDurationHandler;
  runtimeHandler?: IRuntimeHandler;
   
  timestamps: Timestamp[];
  getParts: (filter?: string[]) => string[];
  getFragment<T extends StatementFragment>(type: string, block?: StatementBlock): T[];
}
