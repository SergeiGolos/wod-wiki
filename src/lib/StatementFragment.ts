import { SourceCodeMetadata } from "./SourceDisplayBlock";


export interface StatementFragment {
  type: string;
  meta?: SourceCodeMetadata;
  toPart: () => string;
}
