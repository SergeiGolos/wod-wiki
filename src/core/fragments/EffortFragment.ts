import { StatementFragment, SourceCodeMetadata } from "../timer.types";

export class EffortFragment implements StatementFragment {
  constructor(public effort: string, public meta?: SourceCodeMetadata) { }
  type: string = "effort";
}
