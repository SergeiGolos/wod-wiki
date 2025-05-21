import { CodeFragment } from "./CodeFragment";
import { JitStatement } from "./JitStatement";
import { CodeMetadata } from "./CodeMetadata";
import { ZeroIndexMeta } from "./ZeroIndexMeta";

export class IdleStatementNode extends JitStatement {
  id: number = -1;
  children: number[] = [];
  meta: CodeMetadata = new ZeroIndexMeta();
  fragments: CodeFragment[] = [];
}
