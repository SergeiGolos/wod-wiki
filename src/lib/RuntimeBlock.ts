import { StatementFragment } from "./StatementFragment";
import { StatementBlock } from "./StatementBlock";
import { IDurationHandler } from "./IDurationHandler";
import { IRuntimeHandler } from "./IRuntimeHandler";
import { TimerEvent } from "./timer.runtime";


export interface RuntimeBlock {  
  id: number;  
  depth: number; 
  lap: number;
  block: StatementBlock;
 
  durationHandler?: IDurationHandler;
  runtimeHandler?: IRuntimeHandler;
     
  getParts: (filter?: string[]) => string[];
  getFragment<T extends StatementFragment>(type: string, block?: StatementBlock): T[];
}
