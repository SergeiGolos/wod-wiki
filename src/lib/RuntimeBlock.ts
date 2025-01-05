import { StatementFragment } from "./StatementFragment";
import { StatementBlock, IRuntimeHandler } from "./timer.types";
import { Timestamp } from "./Timestamp";


export interface RuntimeBlock {
  id: number;
  block: StatementBlock;
  depth: number;

  type: string;
  runtimeHandler: IRuntimeHandler;

  getFragment<T extends StatementFragment>(type: string, block?: StatementBlock): T[];
  isRunnable(): boolean;

  increment: number;
  duration: number;

  timestamps: Timestamp[];

  round: number;
  laps: number;

  getParts: (filter?: string[]) => string[];
}
