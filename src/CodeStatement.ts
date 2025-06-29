import { CodeMetadata } from "./CodeMetadata";
import { ICodeFragment } from "./CodeFragment";
export interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[];
  fragments: ICodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
}

export abstract class CodeStatement implements ICodeStatement {
  abstract id: number;
  abstract parent?: number;
  abstract children: number[];
  abstract meta: CodeMetadata;
  abstract fragments: ICodeFragment[];
  abstract isLeaf?: boolean;
}

