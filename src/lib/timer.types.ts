import { RuntimeBlock } from "./RuntimeBlock";
import { SourceCodeMetadata } from "./SourceDisplayBlock";
import { StatementFragment } from "./StatementFragment";
import { Timestamp } from "./Timestamp";

export interface RuntimeResult {
  id: number;  
  round: number;  
  block: StatementBlock;
  timestamps: Timestamp[];  
}

export interface IRuntimeHandler {
  onTick(timestamp: Date, block: RuntimeBlock): void;
  onStart(timestamp: Date, block: RuntimeBlock): void;
  onStop(timestamp: Date, block: RuntimeBlock): void;
  onLap(timestamp: Date, block: RuntimeBlock): void;
}

export interface StatementBlock {
  id: number;
  parents: number[];
  children: number[];  
  meta: SourceCodeMetadata;
  fragments: StatementFragment[];
}
