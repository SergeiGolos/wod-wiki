import { StatementBlock } from "./StatementBlock";
import { Timestamp } from "./Timestamp";


export interface RuntimeResult {
  id: number;
  round: number;  
  block: StatementBlock;
  timestamps: Timestamp[];
}
