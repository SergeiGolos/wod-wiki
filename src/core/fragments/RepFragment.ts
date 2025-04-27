import { SourceCodeMetadata, StatementFragment } from "../timer.types";

export class RepFragment implements StatementFragment {
  constructor(public reps?: number, public meta?: SourceCodeMetadata) { }
  type: string = "rep";  
}
