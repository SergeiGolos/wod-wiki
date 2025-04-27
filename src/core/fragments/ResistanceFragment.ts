import { SourceCodeMetadata, StatementFragment } from "../timer.types";

export class ResistanceFragment implements StatementFragment {
  constructor(public value: string, public units: string, public meta?: SourceCodeMetadata) { }
  type: string = "resistance";  
}
