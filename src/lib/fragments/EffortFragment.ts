import { SourceCodeMetadata } from "../SourceDisplayBlock";
import { StatementFragment } from "../StatementFragment";


export class EffortFragment implements StatementFragment {
  constructor(public effort: string, public meta?: SourceCodeMetadata) { }
  type: string = "effort";
  toPart: () => string = () => this.effort;
}
