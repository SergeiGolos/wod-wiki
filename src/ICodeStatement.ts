import { CodeFragment } from "./CodeFragment";
import { CodeMetadata } from "./CodeMetadata";


export interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[];
  fragments: CodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
}
