import { CodeFragment } from "./types/CodeFragment";
import { CodeMetadata } from "./types/CodeMetadata";
import { ICodeStatement } from "./ICodeStatement";
import { ZeroIndexMeta } from "./ZeroIndexMeta";


export class RootStatementNode implements ICodeStatement {
  id: number = -1;
  parent?: number;
  children: number[] = [];
  meta: CodeMetadata = new ZeroIndexMeta();
  fragments: CodeFragment[] = [];
}
