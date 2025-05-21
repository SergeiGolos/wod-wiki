import { CodeFragment } from "./CodeFragment";
import { CodeMetadata } from "./CodeMetadata";
import { ICodeStatement } from "./CodeStatement";
import { ZeroIndexMeta } from "./ZeroIndexMeta";


export class RootStatementNode implements ICodeStatement {
  id: number = -1;
  parent?: number;
  children: number[] = [];
  meta: CodeMetadata = new ZeroIndexMeta();
  fragments: CodeFragment[] = [];
}
