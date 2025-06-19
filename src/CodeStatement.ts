import { CodeMetadata } from "./CodeMetadata";
import { CodeFragment } from "./CodeFragment";
import { ICodeStatement } from "../ICodeStatement";

export abstract class CodeStatement implements ICodeStatement {
  abstract id: number;
  abstract parent?: number;
  abstract children: number[];
  abstract meta: CodeMetadata;
  abstract fragments: CodeFragment[];
  abstract isLeaf?: boolean;
}

