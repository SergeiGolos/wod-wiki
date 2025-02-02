import { SourceCodeMetadata } from "./SourceDisplayBlock";
import { StatementFragment } from "./StatementFragment";


export interface StatementBlock {
  id: number;
  type: string;
  parents: number[];
  children: number[];
  meta: SourceCodeMetadata;
  fragments: StatementFragment[];
}
