import { SourceCodeMetadata } from "../SourceDisplayBlock";
import { StatementFragment } from "../StatementFragment";


export class RepFragment implements StatementFragment {
  constructor(public reps?: number, public meta?: SourceCodeMetadata) { }
  type: string = "rep";
  toPart: () => string = () => this.reps ? `x${this.reps}` : "";
}
