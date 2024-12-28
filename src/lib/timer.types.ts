export interface SourceCodeMetadata {
  line: number;
  startOffset: number;
  endOffset: number;
  columnStart: number;
  columnEnd: number;
  length: number;
}

export interface StatementResistance {
  units: string;
  value: string;
}

export interface StatementRounds {
  count: number;
  labels: string[];
}

export interface DisplayBlock {
  block: StatementBlock;   
  timestamps: Timestamp[];
  parent?: StatementBlock;
  id: number;
  depth: number;
}

export interface StatementBlock {
  id: number;
  parents: number[];
  children: number[];

  type: string;  
  meta: SourceCodeMetadata;

  level?: string;
  text?: string;
  duration?: number;
  effort?: string;
  reps?: number;
  rounds?: StatementRounds;
  resistance?: StatementResistance;    
}

export interface Timestamp {
  start: Date;
  stop?: Date;
  label?: string;
}
