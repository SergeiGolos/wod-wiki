import { CodeMetadata } from "./CodeMetadata";
import { CodeFragment } from "./CodeFragment";

export abstract class CodeStatement implements ICodeStatement {
  abstract id: number;
  abstract parent?: number;
  abstract children: number[];
  abstract meta: CodeMetadata;
  abstract fragments: CodeFragment[];
  abstract isLeaf?: boolean;
}

export interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[];  
  fragments: CodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
}
