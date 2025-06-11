import { CodeFragment } from "./types/CodeFragment";
import { CodeMetadata } from "./types/CodeMetadata";


export interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[];
  fragments: CodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
}
