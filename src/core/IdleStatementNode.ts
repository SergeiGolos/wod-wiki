import { CodeFragment } from "./types/CodeFragment";
import { JitStatement } from "./types/JitStatement";
import { CodeMetadata } from "./types/CodeMetadata";
import { ZeroIndexMeta } from "./ZeroIndexMeta";

export class IdleStatementNode extends JitStatement {
  id: number = -1;
  children: number[] = [];
  meta: CodeMetadata = new ZeroIndexMeta();
  fragments: CodeFragment[] = [];
}
